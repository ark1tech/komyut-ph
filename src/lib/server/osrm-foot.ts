/**
 * Foot routing via OSRM (same upstream as `/api/osrm/route`).
 * Used server-side for navigation walk distance and geometry.
 */

const OSRM_BASE = 'https://router.project-osrm.org/route/v1';

export interface OsrmFootRouteResult {
	distance_m: number;
	geometry: {
		type: 'LineString';
		coordinates: [number, number][];
	};
}

export async function osrmFootRoute(
	from: [number, number],
	to: [number, number]
): Promise<OsrmFootRouteResult | null> {
	const coords = `${from[0]},${from[1]};${to[0]},${to[1]}`;
	const url = `${OSRM_BASE}/foot/${coords}?overview=full&geometries=geojson`;
	try {
		const response = await fetch(url, { signal: AbortSignal.timeout(6_000) });
		const data = (await response.json()) as {
			code?: string;
			routes?: Array<{ distance: number; geometry: { coordinates: [number, number][] } }>;
		};
		if (data.code !== 'Ok' || !data.routes?.[0]) return null;
		const r = data.routes[0];
		return {
			distance_m: r.distance,
			geometry: { type: 'LineString', coordinates: r.geometry.coordinates }
		};
	} catch {
		return null;
	}
}
