import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async (event) => {
	const {
		url,
		locals: { supabase }
	} = event;

	const search_input = url.searchParams.get('q');

	if (!search_input || search_input.trim() === '') {
		return error(400, 'Invalid location');
	}

	const search_pattern = `%${search_input}%`;

	try {
		const { data, error } = await supabase
			.from('planet_osm_polygon')
			.select('osm_id, name, way')
			.ilike('name', search_pattern)
			.limit(5);

		if (error) throw error;

		return json({
			success: true,
			results: data || [],
			total: data?.length || 0
		});
	} catch (error) {
		console.error('search error: ', error);
		return json({ error: 'Failed to perform search' }, { status: 500 });
	}
};
