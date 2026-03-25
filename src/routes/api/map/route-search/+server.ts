import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { mapRouteSearchHitSchema } from '$lib/validation/schemas';

const MAX_QUERY_LENGTH = 120;
const MAX_RESULTS = 25;

function sanitizeQuery(raw: string | null): string {
	return (raw ?? '').trim().slice(0, MAX_QUERY_LENGTH);
}

function sanitizePrefer(raw: string | null): 'start' | 'end' | 'route_name' | null {
	const v = (raw ?? '').trim().toLowerCase();
	if (v === 'start' || v === 'end' || v === 'route_name') return v;
	return null;
}

/** Escape `%` and `_` for Postgres ILIKE; avoid commas so PostgREST `or` parsing stays valid. */
function ilikePattern(query: string): string {
	const stripped = query.replace(/,/g, ' ').trim();
	const escaped = stripped.replace(/\\/g, '\\\\').replace(/%/g, '\\%').replace(/_/g, '\\_');
	return `%${escaped}%`;
}

export const GET: RequestHandler = async ({ url, locals: { supabase } }) => {
	const query = sanitizeQuery(url.searchParams.get('q'));
	if (!query) {
		return json({ routes: [] });
	}

	const pattern = ilikePattern(query);
	const quotedPattern = `"${pattern.replace(/"/g, '""')}"`;
	const prefer = sanitizePrefer(url.searchParams.get('prefer'));

	let queryBuilder = supabase.from('route').select('route_id, route_name, start_loc, end_loc');

	if (prefer === 'start') {
		queryBuilder = queryBuilder.ilike('start_loc', pattern);
	} else if (prefer === 'end') {
		queryBuilder = queryBuilder.ilike('end_loc', pattern);
	} else if (prefer === 'route_name') {
		queryBuilder = queryBuilder.ilike('route_name', pattern);
	} else {
		queryBuilder = queryBuilder.or(
			`route_name.ilike.${quotedPattern},start_loc.ilike.${quotedPattern},end_loc.ilike.${quotedPattern}`
		);
	}

	const { data, error } = await queryBuilder.limit(MAX_RESULTS);

	if (error) {
		console.error('Map route search failed', error);
		return json({ routes: [] }, { status: 500 });
	}

	const rows = (data ?? []) as Array<{
		route_id: number;
		route_name: string;
		start_loc: string;
		end_loc: string;
	}>;

	const validated = mapRouteSearchHitSchema.array().safeParse(rows);
	if (!validated.success) {
		console.warn('Invalid map route search rows', validated.error);
		return json({ routes: [] });
	}

	return json({ routes: validated.data });
};
