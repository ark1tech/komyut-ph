import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import type { Json } from '$lib/types/database';
import { z } from 'zod';

// ── Query param schema ────────────────────────────────────────────────────────

const navigateQuerySchema = z.object({
	from: z.string().trim().min(1).max(120),
	to: z.string().trim().min(1).max(120)
});

// ── GeoJSON point helpers ─────────────────────────────────────────────────────

interface GeoJsonPoint {
	type: 'Point';
	coordinates: [number, number]; // [lng, lat]
}

interface GeoJsonLineString {
	type: 'LineString';
	coordinates: [number, number][];
}

const GEO_TOKEN_PREFIX = 'geo:';

/** Spec §2c Step 5 — max 3 transfers (4 ride legs). BFS expansion iterations: 0..MAX_TRANSFERS-1 from seeded frontier. */
const MAX_TRANSFERS = 3;

/** Spec §2b / GPS: treat origin and destination as the same trip when this close (meters). */
const TRIVIAL_OD_THRESHOLD_M = 100;

function isGeoJsonPoint(val: unknown): val is GeoJsonPoint {
	return (
		typeof val === 'object' &&
		val !== null &&
		(val as Record<string, unknown>)['type'] === 'Point' &&
		Array.isArray((val as Record<string, unknown>)['coordinates'])
	);
}

function toCoord(geoJsonPoint: GeoJsonPoint): [number, number] {
	return [geoJsonPoint.coordinates[0], geoJsonPoint.coordinates[1]];
}

type ParsedLocationInput =
	| { kind: 'text'; value: string }
	| { kind: 'coord_token'; point: GeoJsonPoint }
	| { kind: 'invalid_token' };

function parseLocationInput(input: string): ParsedLocationInput {
	const value = input.trim();
	if (!value.startsWith(GEO_TOKEN_PREFIX)) {
		return { kind: 'text', value };
	}

	const payload = value.slice(GEO_TOKEN_PREFIX.length);
	const [latRaw, lngRaw, ...extra] = payload.split(',');
	if (!latRaw || !lngRaw || extra.length > 0) {
		return { kind: 'invalid_token' };
	}

	const lat = Number(latRaw);
	const lng = Number(lngRaw);
	const hasInvalidRange = !Number.isFinite(lat) || !Number.isFinite(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180;
	if (hasInvalidRange) {
		return { kind: 'invalid_token' };
	}

	return {
		kind: 'coord_token',
		point: {
			type: 'Point',
			coordinates: [lng, lat]
		}
	};
}

// ── Itinerary leg types ───────────────────────────────────────────────────────

interface WalkLeg {
	type: 'walk';
	distance_m: number;
	from: [number, number];
	to: [number, number];
}

interface RideLeg {
	type: 'ride';
	route_id: number;
	route_name: string;
	mode: string;
	board: [number, number];
	alight: [number, number];
	geometry: GeoJsonLineString;
}

type ItineraryLeg = WalkLeg | RideLeg;

// ── BFS node tracking ─────────────────────────────────────────────────────────

interface BfsNode {
	route_id: number;
	route_name: string;
	vehicle_types: string[];
	mode_segments: Json | null;
	geometry_json: Json;
	board_point: Json; // GeoJSON Point — where we board this route
	// For the final leg we need the alight point toward the destination
	alight_point: Json | null;
	parent: BfsNode | null;
	parent_alight: Json | null; // alight on parent that connects to this route's board
}

// ── Supabase RPC typed wrapper ────────────────────────────────────────────────
// The project uses a cast pattern for RPCs (see search/+server.ts)

type SupabaseClient = App.Locals['supabase'];

type RpcFn = (
	fn: string,
	params?: Record<string, unknown>
) => Promise<{ data: unknown; error: unknown }>;

function rpc(supabase: SupabaseClient) {
	return (supabase as unknown as { rpc: RpcFn }).rpc.bind(supabase);
}

// ── Primary mode from vehicle_types / mode_segments ──────────────────────────

/** Normalize legacy DB labels to RouteVehicleType / map keys (spec §2d examples use MRT-3). */
function normalizeTransitModeLabel(mode: string): string {
	if (mode === 'MRT') return 'MRT-3';
	return mode;
}

function primaryMode(vehicleTypes: string[], modeSegments: Json | null): string {
	// If mode_segments present, return the first transit mode found (skipping Walk)
	if (Array.isArray(modeSegments) && modeSegments.length > 0) {
		for (const seg of modeSegments as Array<{ mode: string }>) {
			if (seg.mode && seg.mode !== 'Walk') return normalizeTransitModeLabel(seg.mode);
		}
	}
	const first = vehicleTypes.find((v) => v !== 'Walk');
	return normalizeTransitModeLabel(first ?? vehicleTypes[0] ?? 'Transit');
}

/**
 * Sum walking meters for a candidate path (spec §2b walk edges, §2c Step 6 ST_Distance).
 * Used to pick the lowest-walk itinerary among same–transfer-count options.
 */
async function estimateTotalWalkDistanceM(
	supabase: SupabaseClient,
	path: BfsNode[],
	originGeoJson: Json,
	destGeoJson: Json
): Promise<number> {
	const call = rpc(supabase);
	if (path.length === 0) return 0;
	let total = 0;

	const firstBoard = path[0].board_point;
	if (isGeoJsonPoint(originGeoJson as unknown) && isGeoJsonPoint(firstBoard as unknown)) {
		const r = await call('get_walk_distance_m', {
			from_geojson: originGeoJson,
			to_geojson: firstBoard
		});
		total += typeof r.data === 'number' ? r.data : 0;
	}

	for (let i = 0; i < path.length - 1; i++) {
		const alight = path[i + 1].parent_alight;
		const nextBoard = path[i + 1].board_point;
		if (isGeoJsonPoint(alight as unknown) && isGeoJsonPoint(nextBoard as unknown)) {
			const r = await call('get_walk_distance_m', {
				from_geojson: alight,
				to_geojson: nextBoard
			});
			total += typeof r.data === 'number' ? r.data : 0;
		}
	}

	const last = path[path.length - 1];
	const lastSnap =
		last.alight_point != null && isGeoJsonPoint(last.alight_point as unknown)
			? last.alight_point
			: destGeoJson;
	if (isGeoJsonPoint(lastSnap as unknown) && isGeoJsonPoint(destGeoJson as unknown)) {
		const r = await call('get_walk_distance_m', {
			from_geojson: lastSnap,
			to_geojson: destGeoJson
		});
		total += typeof r.data === 'number' ? r.data : 0;
	}

	return total;
}

async function pickBestNodeByWalk(
	supabase: SupabaseClient,
	candidates: BfsNode[],
	originGeoJson: Json,
	destGeoJson: Json
): Promise<BfsNode> {
	if (candidates.length === 1) return candidates[0];
	let best = candidates[0];
	let bestWalk = await estimateTotalWalkDistanceM(supabase, collectPath(best), originGeoJson, destGeoJson);
	for (let i = 1; i < candidates.length; i++) {
		const c = candidates[i];
		const w = await estimateTotalWalkDistanceM(supabase, collectPath(c), originGeoJson, destGeoJson);
		const lenB = collectPath(best).length;
		const lenC = collectPath(c).length;
		if (
			w < bestWalk ||
			(w === bestWalk && lenC < lenB) ||
			(w === bestWalk && lenC === lenB && c.route_id < best.route_id)
		) {
			best = c;
			bestWalk = w;
		}
	}
	return best;
}

/** O≈D: single walk leg, no graph search (spec §2b). */
function trivialOdResponse(originGeoJson: Json, destGeoJson: Json, distance_m: number): Response {
	const from = toCoord(originGeoJson as unknown as GeoJsonPoint);
	const to = toCoord(destGeoJson as unknown as GeoJsonPoint);
	const rounded = Math.round(distance_m);
	return json({
		itinerary: [
			{
				type: 'walk',
				distance_m: rounded,
				from,
				to
			}
		],
		summary: {
			transfers: 0,
			walk_distance_m: rounded
		}
	});
}

// ── Main handler ──────────────────────────────────────────────────────────────

export const GET: RequestHandler = async ({ url, locals: { supabase } }) => {
	// 1. Validate query params
	const parsed = navigateQuerySchema.safeParse({
		from: url.searchParams.get('from') ?? '',
		to: url.searchParams.get('to') ?? ''
	});
	if (!parsed.success) {
		return json({ itinerary: null, message: 'invalid_params' }, { status: 400 });
	}
	const { from: fromName, to: toName } = parsed.data;
	const parsedOrigin = parseLocationInput(fromName);
	const parsedDestination = parseLocationInput(toName);
	if (parsedOrigin.kind === 'invalid_token' || parsedDestination.kind === 'invalid_token') {
		return json({ itinerary: null, message: 'invalid_params' }, { status: 400 });
	}

	const call = rpc(supabase);

	// ── Step 1: Resolve named locations to coordinates ────────────────────────
	const [originRes, destRes] = await Promise.all([
		parsedOrigin.kind === 'text'
			? call('resolve_location_to_point', { search_term: parsedOrigin.value })
			: Promise.resolve({ data: parsedOrigin.point as unknown, error: null }),
		parsedDestination.kind === 'text'
			? call('resolve_location_to_point', { search_term: parsedDestination.value })
			: Promise.resolve({ data: parsedDestination.point as unknown, error: null })
	]);

	if (originRes.error || destRes.error) {
		console.error('[navigate] resolve_location_to_point error', originRes.error ?? destRes.error);
		return json({ itinerary: null, message: 'location_resolve_error' }, { status: 500 });
	}

	const originGeoJson = originRes.data as Json | null;
	const destGeoJson = destRes.data as Json | null;

	if (!originGeoJson || !isGeoJsonPoint(originGeoJson)) {
		return json(
			{ itinerary: null, message: 'origin_not_found', hint: fromName },
			{ status: 404 }
		);
	}
	if (!destGeoJson || !isGeoJsonPoint(destGeoJson)) {
		return json(
			{ itinerary: null, message: 'destination_not_found', hint: toName },
			{ status: 404 }
		);
	}

	// Trivial origin ≈ destination (spec §2b): walk-only, no BFS
	const odWalkRes = await call('get_walk_distance_m', {
		from_geojson: originGeoJson,
		to_geojson: destGeoJson
	});
	const odWalkM = typeof odWalkRes.data === 'number' ? odWalkRes.data : 0;
	if (odWalkM <= TRIVIAL_OD_THRESHOLD_M) {
		return trivialOdResponse(originGeoJson, destGeoJson, odWalkM);
	}

	// ── Step 2: Seed the BFS frontier ─────────────────────────────────────────

	const seedRes = await call('get_routes_near_point', {
		origin_geojson: originGeoJson,
		dest_geojson: destGeoJson,
		radius_m: 800
	});

	if (seedRes.error) {
		console.error('[navigate] get_routes_near_point error', seedRes.error);
		return json({ itinerary: null, message: 'routing_error' }, { status: 500 });
	}

	type NearPointRow = {
		route_id: number;
		route_name: string;
		vehicle_types: string[];
		mode_segments: Json | null;
		geometry_json: Json;
		board_point: Json;
		is_direct: boolean;
	};

	const seedRows = (seedRes.data as NearPointRow[] | null) ?? [];

	if (seedRows.length === 0) {
		return json({ itinerary: null, message: 'no_route_found' });
	}

	// Build initial BFS nodes for the frontier
	const visitedIds = new Set<number>();
	let frontier: BfsNode[] = [];

	const directCandidates: BfsNode[] = [];

	for (const row of seedRows) {
		const node: BfsNode = {
			route_id: row.route_id,
			route_name: row.route_name,
			vehicle_types: row.vehicle_types,
			mode_segments: row.mode_segments,
			geometry_json: row.geometry_json,
			board_point: row.board_point,
			alight_point: null,
			parent: null,
			parent_alight: null
		};
		visitedIds.add(row.route_id);
		frontier.push(node);

		if (row.is_direct) {
			directCandidates.push(node);
		}
	}

	// Zero-transfer direct route (spec §2c Step 2): pick lowest total walk among ties
	if (directCandidates.length > 0) {
		const bestDirect = await pickBestNodeByWalk(
			supabase,
			directCandidates,
			originGeoJson,
			destGeoJson
		);
		return buildResponse(supabase, [bestDirect], originGeoJson, destGeoJson);
	}

	// ── Step 3–5: BFS expansion with direction constraint and depth cap ────────
	// RPC contract (spec §2): 800 m ST_DWithin, direction via ST_LineLocatePoint — see Supabase functions.

	let foundNode: BfsNode | null = null;

	for (let depth = 0; depth < MAX_TRANSFERS && !foundNode; depth++) {
		const nextFrontier: BfsNode[] = [];

		// Expand all nodes at the current depth level in parallel
		const expansionResults = await Promise.all(
			frontier.map(async (parentNode) => {
				const expandRes = await call('get_routes_near_geom', {
					current_geojson: parentNode.geometry_json,
					board_geojson: parentNode.board_point,
					dest_geojson: destGeoJson,
					visited_ids: Array.from(visitedIds),
					radius_m: 800
				});

				if (expandRes.error) {
					console.warn('[navigate] get_routes_near_geom error', expandRes.error);
					return { parentNode, rows: [] };
				}

				type NearGeomRow = {
					route_id: number;
					route_name: string;
					vehicle_types: string[];
					mode_segments: Json | null;
					geometry_json: Json;
					board_point: Json;
					alight_point: Json;
					is_direction_valid: boolean;
					is_destination_hit: boolean;
				};

				return {
					parentNode,
					rows: (expandRes.data as NearGeomRow[] | null) ?? []
				};
			})
		);

		// Process all expansion results at this depth level before advancing
		for (const { parentNode, rows } of expansionResults) {
			for (const row of rows) {
				// Step 4: direction constraint — skip if backtracking
				if (!row.is_direction_valid) continue;

				// Skip already-visited routes
				if (visitedIds.has(row.route_id)) continue;

				const childNode: BfsNode = {
					route_id: row.route_id,
					route_name: row.route_name,
					vehicle_types: row.vehicle_types,
					mode_segments: row.mode_segments,
					geometry_json: row.geometry_json,
					board_point: row.board_point,
					alight_point: row.alight_point,
					parent: parentNode,
					parent_alight: row.alight_point
				};

				visitedIds.add(row.route_id);
				nextFrontier.push(childNode);

				// Check if this route reaches the destination
				if (row.is_destination_hit && foundNode === null) {
					foundNode = childNode;
				}
			}
		}

		if (foundNode) break;
		frontier = nextFrontier;
		if (frontier.length === 0) break;
	}

	if (!foundNode) {
		return json({ itinerary: null, message: 'no_route_found' });
	}

	// ── Step 6: Path reconstruction ───────────────────────────────────────────

	return buildResponse(supabase, collectPath(foundNode), originGeoJson, destGeoJson);
};

// ── Path collection (walk back through parent pointers) ──────────────────────

function collectPath(node: BfsNode): BfsNode[] {
	const path: BfsNode[] = [];
	let current: BfsNode | null = node;
	while (current !== null) {
		path.unshift(current);
		current = current.parent;
	}
	return path;
}

// ── Build the final itinerary response ───────────────────────────────────────

async function buildResponse(
	supabase: SupabaseClient,
	path: BfsNode[],
	originGeoJson: Json,
	destGeoJson: Json
): Promise<Response> {
	const call = rpc(supabase);
	const itinerary: ItineraryLeg[] = [];
	let totalWalkDistance = 0;

	// Walk from user origin → first route board point
	const firstBoard = path[0].board_point;
	if (isGeoJsonPoint(originGeoJson as unknown) && isGeoJsonPoint(firstBoard as unknown)) {
		const walkDistRes = await call('get_walk_distance_m', {
			from_geojson: originGeoJson,
			to_geojson: firstBoard
		});
		const distM = typeof walkDistRes.data === 'number' ? walkDistRes.data : 0;
		if (distM > 1) {
			totalWalkDistance += distM;
			itinerary.push({
				type: 'walk',
				distance_m: Math.round(distM),
				from: toCoord(originGeoJson as unknown as GeoJsonPoint),
				to: toCoord(firstBoard as unknown as GeoJsonPoint)
			});
		}
	}

	for (let i = 0; i < path.length; i++) {
		const node = path[i];

		// Determine alight point for this leg —
		// if this is the last node, alight is nearest point to destination
		// otherwise it is the parent_alight stored on the next node
		let alightPoint: Json;
		if (i === path.length - 1) {
			// For the final leg, use the closest point on this route's geometry to destination
			// We approximate it as the destination itself cast to a GeoJSON point
			// (the geom was already validated as within 800m via is_destination_hit)
			alightPoint = destGeoJson;
		} else {
			// The next node's parent_alight is the alight point on the current route
			alightPoint = path[i + 1].parent_alight ?? destGeoJson;
		}

		// Clip geometry for the ride leg
		const clipRes = await call('clip_route_geometry', {
			route_geojson: node.geometry_json,
			board_geojson: node.board_point,
			alight_geojson: alightPoint
		});

		const clippedGeoJson = clipRes.data as Json | null;
		const lineString: GeoJsonLineString =
			clippedGeoJson &&
			typeof clippedGeoJson === 'object' &&
			(clippedGeoJson as Record<string, unknown>)['type'] === 'LineString'
				? (clippedGeoJson as unknown as GeoJsonLineString)
				: { type: 'LineString', coordinates: [] };

		const boardCoord = isGeoJsonPoint(node.board_point as unknown)
			? toCoord(node.board_point as unknown as GeoJsonPoint)
			: ([0, 0] as [number, number]);
		const alightCoord = isGeoJsonPoint(alightPoint as unknown)
			? toCoord(alightPoint as unknown as GeoJsonPoint)
			: ([0, 0] as [number, number]);

		itinerary.push({
			type: 'ride',
			route_id: node.route_id,
			route_name: node.route_name,
			mode: primaryMode(node.vehicle_types, node.mode_segments),
			board: boardCoord,
			alight: alightCoord,
			geometry: lineString
		});

		// Walk leg between legs (transfer)
		if (i < path.length - 1) {
			const nextBoard = path[i + 1].board_point;
			if (isGeoJsonPoint(alightPoint as unknown) && isGeoJsonPoint(nextBoard as unknown)) {
				const walkDistRes = await call('get_walk_distance_m', {
					from_geojson: alightPoint,
					to_geojson: nextBoard
				});
				const distM = typeof walkDistRes.data === 'number' ? walkDistRes.data : 0;
				if (distM > 1) {
					totalWalkDistance += distM;
					itinerary.push({
						type: 'walk',
						distance_m: Math.round(distM),
						from: toCoord(alightPoint as unknown as GeoJsonPoint),
						to: toCoord(nextBoard as unknown as GeoJsonPoint)
					});
				}
			}
		}
	}

	// Walk from last alight point → user destination
	const lastAlight =
		path.length > 0 && path[path.length - 1].alight_point !== null
			? (path[path.length - 1].alight_point as Json)
			: destGeoJson;

	if (
		isGeoJsonPoint(lastAlight as unknown) &&
		isGeoJsonPoint(destGeoJson as unknown) &&
		lastAlight !== destGeoJson
	) {
		const walkDistRes = await call('get_walk_distance_m', {
			from_geojson: lastAlight,
			to_geojson: destGeoJson
		});
		const distM = typeof walkDistRes.data === 'number' ? walkDistRes.data : 0;
		if (distM > 1) {
			totalWalkDistance += distM;
			itinerary.push({
				type: 'walk',
				distance_m: Math.round(distM),
				from: toCoord(lastAlight as unknown as GeoJsonPoint),
				to: toCoord(destGeoJson as unknown as GeoJsonPoint)
			});
		}
	}

	const rideLegs = itinerary.filter((l): l is RideLeg => l.type === 'ride');
	const transfers = Math.max(0, rideLegs.length - 1);

	return json({
		itinerary,
		summary: {
			transfers,
			walk_distance_m: Math.round(totalWalkDistance)
		}
	});
}
