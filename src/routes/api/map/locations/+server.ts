import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { mapLocationQuerySchema } from '$lib/validation/schemas';
import { getOrSetCached } from '$lib/server/cache';

const LOCATION_TTL_MS = 60_000;

export const GET: RequestHandler = async (event) => {
	const {
		url,
		locals: { supabase }
	} = event;

	const parseResult = mapLocationQuerySchema.safeParse({ q: url.searchParams.get('q') ?? '' });
	if (!parseResult.success) {
		return error(400, 'Invalid location');
	}

	const query = parseResult.data.q.trim();
	const cacheKey = `map:locations:q=${query.toLowerCase()}`;
	const search_pattern = `%${query}%`;

	try {
		const results = await getOrSetCached(cacheKey, LOCATION_TTL_MS, async () => {
			const { data, error: dbError } = await supabase
				.from('planet_osm_polygon')
				.select('osm_id, name, way')
				.ilike('name', search_pattern)
				.limit(5);

			if (dbError) throw dbError;

			return data ?? [];
		});

		event.setHeaders({
			'Cache-Control': 'public, max-age=60, stale-while-revalidate=300'
		});

		return json({
			success: true,
			results,
			total: results.length
		});
	} catch (err) {
		console.error('search error: ', err);
		return json({ error: 'Failed to perform search' }, { status: 500 });
	}
};
