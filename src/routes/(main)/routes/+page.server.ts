import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals: { supabase, safeGetSession } }) => {
	const { session } = await safeGetSession();
	if (!session) return { recentRoutes: [], savedRoutes: [], unreadRouteAlerts: 0 };

	const { data: allRoutes } = await supabase
		.from('saved_route')
		.select(
			'saved_route_id, route_name, start_loc, end_loc, vehicle_types, pwd_friendly, est_time_of_arrival, fare, created_at'
		)
		.eq('user_id', session.user.id)
		.order('created_at', { ascending: false });

	const routes = allRoutes ?? [];
	// Split: most recent 6 as "recent", next 6 as "saved"
	const recentRoutes = routes.slice(0, 6);
	const savedRoutes = routes.slice(6, 12);

	const { count: unreadRouteAlerts } = await supabase
		.from('notification')
		.select('*', { count: 'exact', head: true })
		.eq('user_id', session.user.id)
		.eq('kind', 'route_alert')
		.eq('is_read', false);

	return {
		recentRoutes,
		savedRoutes,
		unreadRouteAlerts: unreadRouteAlerts ?? 0
	};
};
