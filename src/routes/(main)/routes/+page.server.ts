import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { savedRouteSchema } from '$lib/validation/schemas';
import { getOrSetCached } from '$lib/server/cache';

const ROUTES_TTL_MS = 10_000;

export const load: PageServerLoad = async ({ locals: { supabase, safeGetSession } }) => {
	const { session } = await safeGetSession();
	if (!session) return { recentRoutes: [], savedRoutes: [], unreadRouteAlerts: 0 };

	const cacheKey = `routes:user=${session.user.id}`;

	const { recentRoutes, savedRoutes, unreadRouteAlerts } = await getOrSetCached(
		cacheKey,
		ROUTES_TTL_MS,
		async () => {
			const { data: allRoutes, error: routesError } = await supabase
				.from('saved_route')
				.select(
					'saved_route_id, route_name, start_loc, end_loc, vehicle_types, pwd_friendly, est_time_of_arrival, fare, created_at'
				)
				.eq('user_id', session.user.id)
				.order('created_at', { ascending: false });

			if (routesError) {
				console.error('Failed to load saved routes', routesError);
				throw error(500, 'Failed to load routes');
			}

			const parsedRoutes = savedRouteSchema.array().safeParse(allRoutes ?? []);
			if (!parsedRoutes.success) {
				console.error('Invalid saved route data from Supabase', parsedRoutes.error);
				throw error(500, 'Failed to load routes');
			}

			const routes = parsedRoutes.data;
			// Split: most recent 6 as "recent", next 6 as "saved"
			const recentRoutes = routes.slice(0, 6);
			const savedRoutes = routes.slice(6, 12);

			const { count: unreadRouteAlerts, error: alertsError } = await supabase
				.from('notification')
				.select('*', { count: 'exact', head: true })
				.eq('user_id', session.user.id)
				.eq('kind', 'route_alert')
				.eq('is_read', false);

			if (alertsError) {
				console.error('Failed to count route alerts', alertsError);
				throw error(500, 'Failed to load routes');
			}

			return {
				recentRoutes,
				savedRoutes,
				unreadRouteAlerts: unreadRouteAlerts ?? 0
			};
		}
	);

	return {
		recentRoutes,
		savedRoutes,
		unreadRouteAlerts
	};
};
