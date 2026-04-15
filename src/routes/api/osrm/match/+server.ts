/**
 * GET /api/osrm/match
 *
 * Proxy for the OSRM Map Matching endpoint used during live-GPS recording.
 * Accepts:
 *   - coords    semicolon-separated "lng,lat;lng,lat;…" string
 *   - radiuses  semicolon-separated per-point radii (defaults all to 30 m)
 *   - profile   defaults to "driving"
 *   - overview  defaults to "full"
 *   - geometries defaults to "geojson"
 *
 * Radiuses are applied to account for urban GPS drift in dense areas like
 * Metro Manila.
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

const OSRM_BASE = 'https://router.project-osrm.org/match/v1';

export const GET: RequestHandler = async ({ url }) => {
	const coords = url.searchParams.get('coords');

	if (!coords) {
		return json({ error: 'coords query param is required' }, { status: 400 });
	}

	const profile = url.searchParams.get('profile') ?? 'driving';
	const overview = url.searchParams.get('overview') ?? 'full';
	const geometries = url.searchParams.get('geometries') ?? 'geojson';

	// Build default radiuses (30 m per point) if none supplied.
	const pointCount = coords.split(';').length;
	const radiuses = url.searchParams.get('radiuses') ?? Array(pointCount).fill('30').join(';');

	const upstream =
		`${OSRM_BASE}/${encodeURIComponent(profile)}/${coords}` +
		`?overview=${overview}&geometries=${geometries}&radiuses=${encodeURIComponent(radiuses)}`;

	try {
		const response = await fetch(upstream, { signal: AbortSignal.timeout(15_000) });
		const data = await response.json();
		return json(data, { status: response.status });
	} catch (err) {
		console.error('[osrm/match] upstream error:', err);
		return json({ error: 'osrm_unavailable' }, { status: 502 });
	}
};
