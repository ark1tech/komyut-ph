import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { getRouteSubscription } from '$lib/server/routeSubscriptions';
import { routeIdParamSchema, savedRouteSchema } from '$lib/validation/schemas';
import { findMockSavedRouteById, toSubscribableSavedRoute } from '$lib/data/mock_routes';

export const load: PageServerLoad = async ({ url, locals: { supabase, safeGetSession } }) => {
	const rawRouteId = url.searchParams.get('route');
	if (!rawRouteId) {
		return {
			routeSelectionInvalid: false,
			selectedRoute: null,
			selectedSubscription: null
		};
	}

	const parsedRouteId = routeIdParamSchema.safeParse({ routeId: rawRouteId });
	if (!parsedRouteId.success) {
		return {
			routeSelectionInvalid: true,
			selectedRoute: null,
			selectedSubscription: null
		};
	}

	const { session } = await safeGetSession();
	if (!session) {
		const fallbackRoute = findMockSavedRouteById(parsedRouteId.data.routeId);
		return {
			routeSelectionInvalid: fallbackRoute == null,
			selectedRoute: fallbackRoute,
			selectedSubscription: null
		};
	}

	const { data: selectedRoute, error: routeError } = await supabase
		.from('saved_route')
		.select(
			'saved_route_id, geo_route_id, route_name, start_loc, end_loc, vehicle_types, pwd_friendly, est_time_of_arrival, fare, created_at'
		)
		.eq('user_id', session.user.id)
		.or(
			`saved_route_id.eq.${parsedRouteId.data.routeId},geo_route_id.eq.${parsedRouteId.data.routeId}`
		)
		.maybeSingle();

	if (routeError) {
		console.error('Failed to load selected route', routeError);
		throw error(500, 'Failed to load route details');
	}

	const routeSource = selectedRoute
		? toSubscribableSavedRoute({
				...selectedRoute,
				geo_route_id: selectedRoute.geo_route_id ?? selectedRoute.saved_route_id
			})
		: null;

	if (!routeSource) {
		return {
			routeSelectionInvalid: true,
			selectedRoute: null,
			selectedSubscription: null
		};
	}

	const parsedSelectedRoute = savedRouteSchema.safeParse(routeSource);
	if (!parsedSelectedRoute.success) {
		console.error('Invalid selected route payload', parsedSelectedRoute.error);
		throw error(500, 'Failed to load route details');
	}

	const selectedSubscription = parsedSelectedRoute.data.geo_route_id
		? await getRouteSubscription(supabase, session.user.id, parsedSelectedRoute.data.geo_route_id)
		: null;

	return {
		routeSelectionInvalid: false,
		selectedRoute: parsedSelectedRoute.data,
		selectedSubscription
	};
};
