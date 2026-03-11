import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { savedRouteSchema } from '$lib/validation/schemas';

export const load: PageServerLoad = async ({ locals: { supabase, safeGetSession } }) => {
	const { session } = await safeGetSession();
	if (!session) return { routes: [] };

	const { data: routes, error: routesError } = await supabase
		.from('saved_route')
		.select(
			'saved_route_id, route_name, start_loc, end_loc, vehicle_types, pwd_friendly, est_time_of_arrival, fare'
		)
		.eq('user_id', session.user.id)
		.order('created_at', { ascending: false });

	if (routesError) {
		console.error('Failed to load saved routes', routesError);
		throw error(500, 'Failed to load routes');
	}

	const parsed = savedRouteSchema.array().safeParse(routes ?? []);
	if (!parsed.success) {
		console.error('Invalid saved route data from Supabase', parsed.error);
		throw error(500, 'Failed to load routes');
	}

	return { routes: parsed.data };
};
