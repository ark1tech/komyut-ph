import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { savedRouteSchema } from '$lib/validation/schemas';
import { getOrSetCached } from '$lib/server/cache';
import { listRouteSubscriptions } from '$lib/server/routeSubscriptions';
import {
	findMockSavedRouteById,
	getMockSavedRoutes,
	toSubscribableSavedRoute
} from '$lib/data/mock_routes';

const ROUTES_TTL_MS = 55_000;

export const load: PageServerLoad = async ({ locals: { supabase, safeGetSession } }) => {
	const { session } = await safeGetSession();
	if (!session) {
		const routes = getMockSavedRoutes();
		return {
			recentRoutes: routes.slice(0, 4),
			subscribedRoutes: [],
			unreadRouteAlerts: 0
		};
	}

	const cacheKey = `routes:user=${session.user.id}`;

	const { recentRoutes, subscribedRoutes, unreadRouteAlerts } = await getOrSetCached(
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

			const routes =
				parsedRoutes.data.length > 0
					? parsedRoutes.data.map(toSubscribableSavedRoute)
					: getMockSavedRoutes();
			const subscriptions = await listRouteSubscriptions(supabase, session.user.id);
			const subscribedRoutes = subscriptions
				.map((subscription) => {
					if (subscription.saved_route) {
						return toSubscribableSavedRoute(subscription.saved_route);
					}

					return findMockSavedRouteById(subscription.saved_route_id ?? subscription.route_id);
				})
				.filter((route): route is NonNullable<typeof route> => route != null);

			// Most recent 6 as "recent"
			const recentRoutes = routes.slice(0, 6);

			return {
				recentRoutes,
				subscribedRoutes,
				unreadRouteAlerts: 0
			};
		}
	);

	return {
		recentRoutes,
		subscribedRoutes,
		unreadRouteAlerts
	};
};
