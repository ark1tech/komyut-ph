import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { mapRouteQuerySchema } from '$lib/validation/schemas';

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

	try {
		const { data, error } = await supabase
			.from('route')
			.select('route_id, geometry')
			.eq('start_loc_osmid', start_loc)
			.eq('end_loc_osmid', end_loc);

		if (error) throw error;

		return json({
			success: true,
			results: data || []
		});
	} catch (error) {
		console.error('route error: ', error);
		return json({ error: 'failed to view routes' }, { status: 500 });
	}
};
