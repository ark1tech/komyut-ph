/**
 * GET /api/osrm/route
 *
 * Proxy for the OSRM routing endpoint used during manual trace (snap-to-road).
 * Accepts the same query params that OSRM Route Service expects:
 *   - profile   (e.g. "driving" | "foot")
 *   - coords    (e.g. "120.984,14.599;120.990,14.605")
 *   - overview  defaults to "full"
 *   - geometries defaults to "geojson"
 *
 * The client must never call OSRM directly; always go through this proxy so
 * the upstream server can be swapped (e.g. self-hosted) without client changes.
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

const OSRM_BASE = 'https://router.project-osrm.org/route/v1';

export const GET: RequestHandler = async ({ url }) => {
	const profile = url.searchParams.get('profile') ?? 'driving';
	const coords = url.searchParams.get('coords');

	if (!coords) {
		return json({ error: 'coords query param is required' }, { status: 400 });
	}

	const overview = url.searchParams.get('overview') ?? 'full';
	const geometries = url.searchParams.get('geometries') ?? 'geojson';

	const upstream = `${OSRM_BASE}/${encodeURIComponent(profile)}/${coords}?overview=${overview}&geometries=${geometries}`;

	try {
		const response = await fetch(upstream, { signal: AbortSignal.timeout(10_000) });
		const data = await response.json();
		return json(data, { status: response.status });
	} catch (err) {
		console.error('[osrm/route] upstream error:', err);
		return json({ error: 'osrm_unavailable' }, { status: 502 });
	}
};
