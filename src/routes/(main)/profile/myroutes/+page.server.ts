import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { SAVED_ROUTE_SELECT } from '$lib/server/supabaseSelects';
import { flattenSavedRouteJoinList, type SavedRouteJoinRow } from '$lib/server/savedRouteJoin';

export const load: PageServerLoad = async ({ locals: { supabase, safeGetSession } }) => {
	const { session } = await safeGetSession();
	if (!session) return { routes: [] };

	const { data: routes, error: routesError } = await supabase
		.from('saved_route')
		.select(SAVED_ROUTE_SELECT)
		.eq('user_id', session.user.id)
		.order('created_at', { ascending: false });

	if (routesError) {
		console.error('Failed to load saved routes', routesError);
		throw error(500, 'Failed to load routes');
	}

	const rawRows = (routes ?? []) as SavedRouteJoinRow[];
	const flattened = flattenSavedRouteJoinList(rawRows);
	if (rawRows.length > 0 && flattened.length === 0) {
		console.error('My routes: join to route failed');
		throw error(500, 'Failed to load routes');
	}

	return { routes: flattened };
};
