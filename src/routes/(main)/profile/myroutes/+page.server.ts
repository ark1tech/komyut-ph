import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals: { supabase, safeGetSession } }) => {
	const { session } = await safeGetSession();
	if (!session) return { routes: [] };

	const { data: routes } = await supabase
		.from('saved_route')
		.select(
			'saved_route_id, route_name, start_loc, end_loc, vehicle_types, pwd_friendly, est_time_of_arrival, fare'
		)
		.eq('user_id', session.user.id)
		.order('created_at', { ascending: false });

	return { routes: routes ?? [] };
};
