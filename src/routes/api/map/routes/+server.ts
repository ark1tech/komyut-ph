import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { mapRouteQuerySchema, mapRouteCreateSchema } from '$lib/validation/schemas';
import { getOrSetCached } from '$lib/server/cache';
import { attachRouteTags } from '$lib/server/routeTags';

const ROUTE_TTL_MS = 10 * 60_000;

export const GET: RequestHandler = async (event) => {
	const {
		url,
		locals: { supabase }
	} = event;

	const parsed = mapRouteQuerySchema.safeParse({
		start: url.searchParams.get('start') ?? '',
		end: url.searchParams.get('end') ?? ''
	});
	if (!parsed.success) {
		return error(400, 'Invalid location');
	}
	const start_loc = parsed.data.start;
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

export const POST: RequestHandler = async (event) => {
	const {
		locals: { supabase }
	} = event;

	const body = await event.request.json();
	const parsed = mapRouteCreateSchema.safeParse(body);
	if (!parsed.success) {
		return error(400, 'Invalid route data');
	}

	const {
		route_name,
		start_loc,
		end_loc,
		vehicle_types,
		route_tags,
		pwd_friendly,
		est_time_of_arrival,
		fare,
		start_loc_osmid,
		end_loc_osmid,
		geometry
	} = parsed.data;

	try {
		const { data, error: dbError } = await supabase
			.from('route')
			.insert({
				route_name,
				start_loc,
				end_loc,
				vehicle_types,
				pwd_friendly,
				est_time_of_arrival,
				fare,
				start_loc_osmid,
				end_loc_osmid,
				geometry
			})
			.select('route_id')
			.single();

		if (dbError) throw dbError;

		const tagSaveStatus = await attachRouteTags(supabase, data.route_id, route_tags);
		if (tagSaveStatus === 'unsupported') {
			return json({ error: 'failed to create route tags' }, { status: 400 });
		}
		if (tagSaveStatus === 'failed') {
			return json({ error: 'failed to create route tags' }, { status: 500 });
		}

		return json({ success: true, route_id: data.route_id }, { status: 201 });
	} catch (err) {
		console.error('route create error: ', err);
		return json({ error: 'failed to create route' }, { status: 500 });
	}
};
