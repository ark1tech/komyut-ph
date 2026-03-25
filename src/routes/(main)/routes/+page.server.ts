import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { getMockSavedRoutes, toSubscribableSavedRoute } from '$lib/data/mock_routes';
import { getOrSetCached } from '$lib/server/cache';
import { listRouteSubscriptions } from '$lib/server/routeSubscriptions';
import { loadSavedRouteSelectionFromQuery } from '$lib/server/savedRouteSelectionQuery';
import { flattenSavedRouteJoinList, type SavedRouteJoinRow } from '$lib/server/savedRouteJoin';
import { SAVED_ROUTE_SELECT } from '$lib/server/supabaseSelects';

const ROUTES_TTL_MS = 55_000;

export const load: PageServerLoad = async ({ url, locals: { supabase, safeGetSession } }) => {
	const { session } = await safeGetSession();
	const alertsSelection = await loadSavedRouteSelectionFromQuery(
		supabase,
		session,
		url.searchParams.get('route')
	);

	if (!session) {
		const routes = getMockSavedRoutes();
		return {
			recentRoutes: routes.slice(0, 4),
			subscribedRoutes: [],
			unreadRouteAlerts: 0,
			alertsRouteInvalid: alertsSelection.routeSelectionInvalid,
			alertsRoute: alertsSelection.selectedRoute,
			alertsSubscription: alertsSelection.selectedSubscription
		};
	}

	const cacheKey = `routes:user=${session.user.id}`;

	const { recentRoutes, subscribedRoutes, unreadRouteAlerts } = await getOrSetCached(
		cacheKey,
		ROUTES_TTL_MS,
		async () => {
			const { data: allRoutes, error: routesError } = await supabase
				.from('saved_route')
				.select(SAVED_ROUTE_SELECT)
				.eq('user_id', session.user.id)
				.order('created_at', { ascending: false });

			if (routesError) {
				console.error('Failed to load saved routes', routesError);
				throw error(500, 'Failed to load routes');
			}

			const rawRows = (allRoutes ?? []) as SavedRouteJoinRow[];
			const flattened = flattenSavedRouteJoinList(rawRows);
			if (rawRows.length > 0 && flattened.length === 0) {
				console.error('Saved routes failed to join canonical route metadata');
				throw error(500, 'Failed to load routes');
			}

			const routes =
				flattened.length > 0 ? flattened.map(toSubscribableSavedRoute) : getMockSavedRoutes();
			const userSavedRouteIds = new Set(flattened.map((r) => r.saved_route_id));
			const subscriptions = await listRouteSubscriptions(supabase, session.user.id);
			const subscribedRoutes = subscriptions.flatMap((subscription) => {
				const saved = subscription.saved_route;
				if (!saved || !userSavedRouteIds.has(saved.saved_route_id)) return [];
				return [toSubscribableSavedRoute(saved)];
			});

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
		unreadRouteAlerts,
		alertsRouteInvalid: alertsSelection.routeSelectionInvalid,
		alertsRoute: alertsSelection.selectedRoute,
		alertsSubscription: alertsSelection.selectedSubscription
	};
};
