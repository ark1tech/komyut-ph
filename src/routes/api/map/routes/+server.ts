import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { mapRouteQuerySchema } from '$lib/validation/schemas';
import { getOrSetCached } from '$lib/server/cache';

const ROUTE_TTL_MS = 10 * 60_000;

export const GET: RequestHandler = async (event) => {
	const {
		url,
		locals: { supabase }
	} = event;

	const start_loc = 371357222;
	const parsed = mapRouteQuerySchema.safeParse({ end: url.searchParams.get('end') ?? '' });
	if (!parsed.success) {
		return error(400, 'Invalid location');
	}
	const end_loc = parsed.data.end;
	const cacheKey = `map:routes:start=${start_loc}:end=${end_loc}`;

	try {
		const results = await getOrSetCached(cacheKey, ROUTE_TTL_MS, async () => {
			const { data, error: dbError } = await supabase
				.from('route')
				.select('route_id, geometry')
				.eq('start_loc_osmid', start_loc)
				.eq('end_loc_osmid', end_loc);

			if (dbError) throw dbError;

			return data ?? [];
		});

		event.setHeaders({
			'Cache-Control': 'public, max-age=600, stale-while-revalidate=3600'
		});

		return json({
			success: true,
			results
		});
	} catch (err) {
		console.error('route error: ', err);
		return json({ error: 'failed to view routes' }, { status: 500 });
	}
};
