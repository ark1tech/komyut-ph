import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { mapRouteSearchHitSchema } from '$lib/validation/schemas';

const MAX_RESULTS = 25;
const MAX_QUERY_LENGTH = 120;

function sanitizeQuery(raw: string | null): string {
	return (raw ?? '').trim().slice(0, MAX_QUERY_LENGTH);
}

function ilikePattern(query: string): string {
	const stripped = query.replace(/,/g, ' ').trim();
	const escaped = stripped.replace(/\\/g, '\\\\').replace(/%/g, '\\%').replace(/_/g, '\\_');
	return `%${escaped}%`;
}

export const GET: RequestHandler = async ({ url, locals: { supabase } }) => {
	const query = sanitizeQuery(url.searchParams.get('q'));

	let queryBuilder = supabase
		.from('route')
		.select('route_id, route_name, start_loc, end_loc')
		.order('created_at', { ascending: false })
		.limit(MAX_RESULTS);

	if (query) {
		const pattern = ilikePattern(query);
		const quotedPattern = `"${pattern.replace(/"/g, '""')}"`;
		queryBuilder = queryBuilder.or(
			`route_name.ilike.${quotedPattern},start_loc.ilike.${quotedPattern},end_loc.ilike.${quotedPattern}`
		);
	}

	const { data, error } = await queryBuilder;

	if (error) {
		console.error('Forum route link search failed', error);
		return json({ routes: [] }, { status: 500 });
	}

	const validated = mapRouteSearchHitSchema.array().safeParse(data ?? []);
	if (!validated.success) {
		console.warn('Invalid forum route link rows', validated.error);
		return json({ routes: [] });
	}

	return json({ routes: validated.data });
};
