import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import type { Json } from '$lib/types/database';
import { osrmFootRoute } from '$lib/server/osrm-foot';
import {
	distanceAlongPolylineToPoint,
	modeSegmentDistanceIntervalOnPolyline
} from '$lib/utils/modeSegmentPolyline';
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

/**
 * Max walking distance for the whole itinerary (ingress + transfers + egress), in meters.
 * Must match `radius_m` for `get_routes_near_*` — both bound how far you walk from/to transit.
 */
const MAX_WALK_M = 800;

/** Spec §2b / GPS: treat origin and destination as the same trip when this close (meters). */
const TRIVIAL_OD_THRESHOLD_M = 100;

/** Below this length (meters), skip OSRM and use `get_walk_distance_m` only for walk legs. */
const WALK_STRAIGHTLINE_THRESHOLD_M = 50;

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
	/** Pedestrian path from OSRM; omitted when routing failed and we fall back to a straight segment. */
	geometry?: GeoJsonLineString;
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

/** Memoized `get_walk_distance_m` per request (dedupes repeated segment pairs in BFS). */
function createGetWalkDistanceM(supabase: SupabaseClient) {
	const cache = new Map<string, Promise<number>>();
	const call = rpc(supabase);
	return async function getWalkDistanceM(from: Json, to: Json): Promise<number> {
		if (isGeoJsonPoint(from as unknown) && isGeoJsonPoint(to as unknown)) {
			const a = from as unknown as GeoJsonPoint;
			const b = to as unknown as GeoJsonPoint;
			const key = `${a.coordinates[0]},${a.coordinates[1]}|${b.coordinates[0]},${b.coordinates[1]}`;
			let pending = cache.get(key);
			if (pending) return pending;
			pending = (async () => {
				const r = await call('get_walk_distance_m', { from_geojson: from, to_geojson: to });
				return typeof r.data === 'number' ? r.data : 0;
			})();
			cache.set(key, pending);
			return pending;
		}
		const r = await call('get_walk_distance_m', { from_geojson: from, to_geojson: to });
		return typeof r.data === 'number' ? r.data : 0;
	};
}

// ── Primary mode from vehicle_types / mode_segments ──────────────────────────

/** Normalize legacy DB labels to RouteVehicleType / map keys (spec §2d examples use MRT-3). */
function normalizeTransitModeLabel(mode: string): string {
	if (mode === 'MRT') return 'MRT-3';
	return mode;
}

/**
 * Mode for this ride leg on the clipped route line. Uses **distance along the polyline** so
 * segment bounds match traced from/to and do not bleed into adjacent modes (unlike nearest-vertex).
 */
function primaryModeForSegment(
	vehicleTypes: string[],
	modeSegments: Json | null,
	routeCoords: [number, number][],
	boardCoord: [number, number],
	alightCoord: [number, number]
): string {
	if (Array.isArray(modeSegments) && modeSegments.length > 0 && routeCoords.length >= 2) {
		const dBoard = distanceAlongPolylineToPoint(routeCoords, boardCoord);
		const dAlight = distanceAlongPolylineToPoint(routeCoords, alightCoord);
		const legLo = Math.min(dBoard, dAlight);
		const legHi = Math.max(dBoard, dAlight);
		const midDist = (legLo + legHi) / 2;
		/** Projection / float noise along path (meters). */
		const EPS = 0.35;

		type SegRow = {
			mode: string;
			start_index?: number;
			end_index?: number;
			from: [number, number];
			to: [number, number];
		};
		const rows = modeSegments as SegRow[];

		for (const seg of rows) {
			if (!seg.mode) continue;
			const { lo, hi } = modeSegmentDistanceIntervalOnPolyline(routeCoords, seg.from, seg.to);
			if (midDist >= lo - EPS && midDist <= hi + EPS) {
				return normalizeTransitModeLabel(seg.mode);
			}
		}

		let bestOverlap = -1;
		let bestMode = '';
		for (const seg of rows) {
			if (!seg.mode) continue;
			const { lo, hi } = modeSegmentDistanceIntervalOnPolyline(routeCoords, seg.from, seg.to);
			const overlap = Math.max(0, Math.min(legHi, hi) - Math.max(legLo, lo));
			if (overlap > bestOverlap) {
				bestOverlap = overlap;
				bestMode = seg.mode;
			}
		}
		if (bestMode) return normalizeTransitModeLabel(bestMode);
	}
	const first = vehicleTypes.find((v) => v !== 'Walk');
	return normalizeTransitModeLabel(first ?? vehicleTypes[0] ?? 'Transit');
}

function collectPath(node: BfsNode): BfsNode[] {
	const path: BfsNode[] = [];
	let current: BfsNode | null = node;
	while (current !== null) {
		path.unshift(current);
		current = current.parent;
	}
	return path;
}

/** Walk segments for a path (same geometry as `buildResponse` uses). */
function getWalkSegmentEndpoints(
	path: BfsNode[],
	originGeoJson: Json,
	destGeoJson: Json
): Array<{ from: Json; to: Json }> {
	const segments: Array<{ from: Json; to: Json }> = [];
	if (path.length === 0) return segments;

	const firstBoard = path[0].board_point;
	if (isGeoJsonPoint(originGeoJson as unknown) && isGeoJsonPoint(firstBoard as unknown)) {
		segments.push({ from: originGeoJson, to: firstBoard });
	}

	for (let i = 0; i < path.length - 1; i++) {
		const alight = path[i + 1].parent_alight;
		const nextBoard = path[i + 1].board_point;
		if (isGeoJsonPoint(alight as unknown) && isGeoJsonPoint(nextBoard as unknown)) {
			segments.push({ from: alight, to: nextBoard });
		}
	}

	const last = path[path.length - 1];
	const lastSnap =
		last.alight_point != null && isGeoJsonPoint(last.alight_point as unknown)
			? last.alight_point
			: destGeoJson;
	if (isGeoJsonPoint(lastSnap as unknown) && isGeoJsonPoint(destGeoJson as unknown)) {
		segments.push({ from: lastSnap, to: destGeoJson });
	}

	return segments;
}

/**
 * Fast total walk estimate via PostGIS only (no OSRM). Used for BFS / tie-break; actual
 * walk distance and geometry come from OSRM in `buildResponse` (except short legs).
 */
async function estimateTotalWalkDbOnly(
	path: BfsNode[],
	originGeoJson: Json,
	destGeoJson: Json,
	getWalkDistanceM: (from: Json, to: Json) => Promise<number>
): Promise<number> {
	const segments = getWalkSegmentEndpoints(path, originGeoJson, destGeoJson);
	if (segments.length === 0) return 0;
	const parts = await Promise.all(segments.map(({ from, to }) => getWalkDistanceM(from, to)));
	return parts.reduce((a, b) => a + b, 0);
}

async function pickBestNodeByWalk(
	candidates: BfsNode[],
	originGeoJson: Json,
	destGeoJson: Json,
	getWalkDistanceM: (from: Json, to: Json) => Promise<number>
): Promise<BfsNode> {
	if (candidates.length === 1) return candidates[0];
	const paths = candidates.map((c) => collectPath(c));
	const walks = await Promise.all(
		paths.map((p) => estimateTotalWalkDbOnly(p, originGeoJson, destGeoJson, getWalkDistanceM))
	);
	let bestIdx = 0;
	for (let i = 1; i < candidates.length; i++) {
		const w = walks[i];
		const bestWalk = walks[bestIdx];
		const lenB = paths[bestIdx].length;
		const lenC = paths[i].length;
		if (
			w < bestWalk ||
			(w === bestWalk && lenC < lenB) ||
			(w === bestWalk && lenC === lenB && candidates[i].route_id < candidates[bestIdx].route_id)
		) {
			bestIdx = i;
		}
	}
	return candidates[bestIdx];
}

/** O≈D: single walk leg, no graph search (spec §2b). */
async function trivialOdResponse(originGeoJson: Json, destGeoJson: Json, distance_m: number): Promise<Response> {
	const from = toCoord(originGeoJson as unknown as GeoJsonPoint);
	const to = toCoord(destGeoJson as unknown as GeoJsonPoint);
	const osrm = await osrmFootRoute(from, to);
	const rounded = osrm ? Math.round(osrm.distance_m) : Math.round(distance_m);
	const leg: WalkLeg = {
		type: 'walk',
		distance_m: rounded,
		from,
		to,
		...(osrm ? { geometry: osrm.geometry } : {})
	};
	const summaryWalk = osrm ? Math.round(osrm.distance_m) : rounded;
	if (summaryWalk > MAX_WALK_M) {
		return json({ itinerary: null, message: 'no_route_found' });
	}

	return json({
		itinerary: [leg],
		summary: {
			transfers: 0,
			walk_distance_m: summaryWalk
		},
		origin: from,
		destination: to
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
	const getWalkDistanceM = createGetWalkDistanceM(supabase);

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
		return await trivialOdResponse(originGeoJson, destGeoJson, odWalkM);
	}

	// ── Step 2: Seed the BFS frontier ─────────────────────────────────────────

	const seedRes = await call('get_routes_near_point', {
		origin_geojson: originGeoJson,
		dest_geojson: destGeoJson,
		radius_m: MAX_WALK_M
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
		dest_snap_point: Json | null;
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
			alight_point:
				row.is_direct && row.dest_snap_point != null && isGeoJsonPoint(row.dest_snap_point as unknown)
					? row.dest_snap_point
					: null,
			parent: null,
			parent_alight: null
		};
		visitedIds.add(row.route_id);
		frontier.push(node);

		if (row.is_direct) {
			directCandidates.push(node);
		}
	}

	// Zero-transfer direct route (spec §2c Step 2): only if total walk ≤ MAX_WALK_M, then lowest walk among ties
	if (directCandidates.length > 0) {
		const directWalks = await Promise.all(
			directCandidates.map((node) =>
				estimateTotalWalkDbOnly(collectPath(node), originGeoJson, destGeoJson, getWalkDistanceM)
			)
		);
		const withinBudget = directCandidates.filter((_, i) => directWalks[i] <= MAX_WALK_M);
		if (withinBudget.length > 0) {
			const bestDirect = await pickBestNodeByWalk(
				withinBudget,
				originGeoJson,
				destGeoJson,
				getWalkDistanceM
			);
			return buildResponse(supabase, collectPath(bestDirect), originGeoJson, destGeoJson, getWalkDistanceM);
		}
	}

	// ── Step 3–5: BFS expansion with direction constraint and depth cap ────────
	// RPC contract (spec §2): MAX_WALK_M ST_DWithin, direction via ST_LineLocatePoint — see Supabase functions.

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
					radius_m: MAX_WALK_M
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
					dest_snap_point: Json | null;
				};

				return {
					parentNode,
					rows: (expandRes.data as NearGeomRow[] | null) ?? []
				};
			})
		);

		const destinationHitsThisDepth: BfsNode[] = [];

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
					alight_point:
						row.is_destination_hit &&
						row.dest_snap_point != null &&
						isGeoJsonPoint(row.dest_snap_point as unknown)
							? row.dest_snap_point
							: null,
					parent: parentNode,
					parent_alight: row.alight_point
				};

				visitedIds.add(row.route_id);
				nextFrontier.push(childNode);

				if (row.is_destination_hit) {
					destinationHitsThisDepth.push(childNode);
				}
			}
		}

		if (destinationHitsThisDepth.length > 0) {
			const hitWalks = await Promise.all(
				destinationHitsThisDepth.map((node) =>
					estimateTotalWalkDbOnly(collectPath(node), originGeoJson, destGeoJson, getWalkDistanceM)
				)
			);
			const withinBudget = destinationHitsThisDepth.filter((_, i) => hitWalks[i] <= MAX_WALK_M);
			if (withinBudget.length > 0) {
				foundNode = await pickBestNodeByWalk(
					withinBudget,
					originGeoJson,
					destGeoJson,
					getWalkDistanceM
				);
				break;
			}
		}
		frontier = nextFrontier;
		if (frontier.length === 0) break;
	}

	if (!foundNode) {
		return json({ itinerary: null, message: 'no_route_found' });
	}

	// ── Step 6: Path reconstruction ───────────────────────────────────────────

	return buildResponse(supabase, collectPath(foundNode), originGeoJson, destGeoJson, getWalkDistanceM);
};

// ── Build the final itinerary response ───────────────────────────────────────

function alightPointForRideLeg(path: BfsNode[], i: number, destGeoJson: Json): Json {
	if (i === path.length - 1) {
		// `clip_route_geometry` projects destination onto the route via ST_LineLocatePoint
		return destGeoJson;
	}
	return path[i + 1].parent_alight ?? destGeoJson;
}

async function buildWalkLegFromEndpoints(
	from: Json,
	to: Json,
	fromPt: [number, number],
	toPt: [number, number],
	getWalkDistanceM: (from: Json, to: Json) => Promise<number>
): Promise<{ leg: WalkLeg; distance_m: number } | null> {
	const distM = await getWalkDistanceM(from, to);
	if (distM <= 1) return null;

	if (distM < WALK_STRAIGHTLINE_THRESHOLD_M) {
		return {
			leg: {
				type: 'walk',
				distance_m: Math.round(distM),
				from: fromPt,
				to: toPt
			},
			distance_m: distM
		};
	}

	const osrm = await osrmFootRoute(fromPt, toPt);
	if (osrm != null && osrm.distance_m > 1) {
		return {
			leg: {
				type: 'walk',
				distance_m: Math.round(osrm.distance_m),
				from: fromPt,
				to: toPt,
				geometry: osrm.geometry
			},
			distance_m: osrm.distance_m
		};
	}

	return {
		leg: {
			type: 'walk',
			distance_m: Math.round(distM),
			from: fromPt,
			to: toPt
		},
		distance_m: distM
	};
}

async function buildResponse(
	supabase: SupabaseClient,
	path: BfsNode[],
	originGeoJson: Json,
	destGeoJson: Json,
	getWalkDistanceM: (from: Json, to: Json) => Promise<number>
): Promise<Response> {
	const call = rpc(supabase);
	const clipResults = await Promise.all(
		path.map((node, i) =>
			call('clip_route_geometry', {
				route_geojson: node.geometry_json,
				board_geojson: node.board_point,
				alight_geojson: alightPointForRideLeg(path, i, destGeoJson)
			})
		)
	);

	const lineStrings: GeoJsonLineString[] = clipResults.map((clipRes: { data: unknown }) => {
		const clippedGeoJson = clipRes.data as Json | null;
		return clippedGeoJson &&
			typeof clippedGeoJson === 'object' &&
			(clippedGeoJson as Record<string, unknown>)['type'] === 'LineString'
			? (clippedGeoJson as unknown as GeoJsonLineString)
			: { type: 'LineString', coordinates: [] };
	});

	type WalkSpec = { from: Json; to: Json; fromPt: [number, number]; toPt: [number, number] };
	const walkSpecs: WalkSpec[] = [];

	let hasIngress = false;
	const firstBoard = path[0].board_point;
	if (isGeoJsonPoint(originGeoJson as unknown) && isGeoJsonPoint(firstBoard as unknown)) {
		hasIngress = true;
		walkSpecs.push({
			from: originGeoJson,
			to: firstBoard,
			fromPt: toCoord(originGeoJson as unknown as GeoJsonPoint),
			toPt: toCoord(firstBoard as unknown as GeoJsonPoint)
		});
	}

	for (let i = 0; i < path.length - 1; i++) {
		const lineString = lineStrings[i];
		const alightPoint = alightPointForRideLeg(path, i, destGeoJson);
		const transferFrom: Json =
			lineString.coordinates.length > 0
				? ({
						type: 'Point',
						coordinates: lineString.coordinates[lineString.coordinates.length - 1] as [number, number]
					} as unknown as Json)
				: alightPoint;
		const nextBoard = path[i + 1].board_point;
		if (isGeoJsonPoint(transferFrom as unknown) && isGeoJsonPoint(nextBoard as unknown)) {
			walkSpecs.push({
				from: transferFrom,
				to: nextBoard,
				fromPt: toCoord(transferFrom as unknown as GeoJsonPoint),
				toPt: toCoord(nextBoard as unknown as GeoJsonPoint)
			});
		}
	}

	const lastIdx = path.length - 1;
	const lastLine = lineStrings[lastIdx];
	const lastAlight = alightPointForRideLeg(path, lastIdx, destGeoJson);
	const egressStart: Json | null =
		lastLine.coordinates.length > 0
			? ({
					type: 'Point',
					coordinates: lastLine.coordinates[lastLine.coordinates.length - 1] as [number, number]
				} as unknown as Json)
			: isGeoJsonPoint(lastAlight as unknown)
				? lastAlight
				: null;
	if (
		egressStart != null &&
		isGeoJsonPoint(egressStart as unknown) &&
		isGeoJsonPoint(destGeoJson as unknown)
	) {
		walkSpecs.push({
			from: egressStart,
			to: destGeoJson,
			fromPt: toCoord(egressStart as unknown as GeoJsonPoint),
			toPt: toCoord(destGeoJson as unknown as GeoJsonPoint)
		});
	}

	const walkParts = await Promise.all(
		walkSpecs.map((spec) =>
			buildWalkLegFromEndpoints(spec.from, spec.to, spec.fromPt, spec.toPt, getWalkDistanceM)
		)
	);

	const walkLegBySpec: (WalkLeg | null)[] = walkParts.map((p) => p?.leg ?? null);
	let totalWalkDistance = 0;
	for (const part of walkParts) {
		if (part != null) totalWalkDistance += part.distance_m;
	}

	if (totalWalkDistance > MAX_WALK_M) {
		return json({ itinerary: null, message: 'no_route_found' });
	}

	const itinerary: ItineraryLeg[] = [];
	let wi = 0;

	if (hasIngress) {
		const leg = walkLegBySpec[wi];
		if (leg) itinerary.push(leg);
		wi++;
	}

	for (let i = 0; i < path.length; i++) {
		const node = path[i];
		let lineString = lineStrings[i];
		const alightPoint = alightPointForRideLeg(path, i, destGeoJson);
		const boardCoord = isGeoJsonPoint(node.board_point as unknown)
			? toCoord(node.board_point as unknown as GeoJsonPoint)
			: ([0, 0] as [number, number]);
		const alightCoord: [number, number] =
			lineString.coordinates.length > 0
				? (lineString.coordinates[lineString.coordinates.length - 1] as [number, number])
				: isGeoJsonPoint(alightPoint as unknown)
					? toCoord(alightPoint as unknown as GeoJsonPoint)
					: ([0, 0] as [number, number]);

		if (lineString.coordinates.length < 2 && (boardCoord[0] !== alightCoord[0] || boardCoord[1] !== alightCoord[1])) {
			lineString = { type: 'LineString', coordinates: [boardCoord, alightCoord] };
		}

		const routeCoords = lineString.coordinates as [number, number][];
		itinerary.push({
			type: 'ride',
			route_id: node.route_id,
			route_name: node.route_name,
			mode: primaryModeForSegment(
				node.vehicle_types,
				node.mode_segments,
				routeCoords.length >= 2 ? routeCoords : [boardCoord, alightCoord],
				boardCoord,
				alightCoord
			),
			board: boardCoord,
			alight: alightCoord,
			geometry: lineString
		});

		if (i < path.length - 1) {
			const leg = walkLegBySpec[wi];
			if (leg) itinerary.push(leg);
			wi++;
		}
	}

	while (wi < walkLegBySpec.length) {
		const leg = walkLegBySpec[wi];
		if (leg) itinerary.push(leg);
		wi++;
	}

	const rideLegs = itinerary.filter((l): l is RideLeg => l.type === 'ride');
	const transfers = Math.max(0, rideLegs.length - 1);

	const originCoord = toCoord(originGeoJson as unknown as GeoJsonPoint);
	const destinationCoord = toCoord(destGeoJson as unknown as GeoJsonPoint);

	return json({
		itinerary,
		summary: {
			transfers,
			walk_distance_m: Math.round(totalWalkDistance)
		},
		origin: originCoord,
		destination: destinationCoord
	});
}
