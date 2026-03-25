import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { getRouteSubscription } from '$lib/server/routeSubscriptions';
import { routeIdParamSchema, savedRouteSchema } from '$lib/validation/schemas';
import { findMockSavedRouteById, toSubscribableSavedRoute } from '$lib/data/mock_routes';

interface RouteGeometryResult {
	route_id: number;
	geometry: string | GeoJSON.LineString;
}

function isLineStringGeometry(value: unknown): value is GeoJSON.LineString {
	if (typeof value !== 'object' || value === null) return false;
	const candidate = value as { type?: unknown; coordinates?: unknown };
	return (
		candidate.type === 'LineString' &&
		Array.isArray(candidate.coordinates) &&
		candidate.coordinates.every(
			(point) =>
				Array.isArray(point) &&
				point.length >= 2 &&
				typeof point[0] === 'number' &&
				typeof point[1] === 'number'
		)
	);
}

async function loadRouteGeometryById(
	supabase: Parameters<PageServerLoad>[0]['locals']['supabase'],
	routeId: number | null
): Promise<RouteGeometryResult | null> {
	if (!routeId) return null;

	const { data, error: geometryError } = await supabase
		.from('route')
		.select('route_id, geometry')
		.eq('route_id', routeId)
		.maybeSingle();

	if (geometryError) {
		console.error('Failed to load selected route geometry', geometryError);
		return null;
	}

	if (!data) return null;
	if (typeof data.geometry === 'string' || isLineStringGeometry(data.geometry)) {
		return {
			route_id: data.route_id,
			geometry: data.geometry
		};
	}
	return null;
}

export const load: PageServerLoad = async ({ url, locals: { supabase, safeGetSession } }) => {
	const rawRouteId = url.searchParams.get('route');
	if (!rawRouteId) {
		return {
			routeSelectionInvalid: false,
			selectedRoute: null,
			selectedSubscription: null,
			selectedRouteGeometry: null
		};
	}

	const parsedRouteId = routeIdParamSchema.safeParse({ routeId: rawRouteId });
	if (!parsedRouteId.success) {
		return {
			routeSelectionInvalid: true,
			selectedRoute: null,
			selectedSubscription: null,
			selectedRouteGeometry: null
		};
	}

	const { session } = await safeGetSession();
	if (!session) {
		const fallbackRoute = findMockSavedRouteById(parsedRouteId.data.routeId);
		const fallbackRouteGeometry = await loadRouteGeometryById(
			supabase,
			fallbackRoute?.geo_route_id ?? null
		);
		return {
			routeSelectionInvalid: fallbackRoute == null,
			selectedRoute: fallbackRoute,
			selectedSubscription: null,
			selectedRouteGeometry: fallbackRouteGeometry
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
			selectedSubscription: null,
			selectedRouteGeometry: null
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
	const selectedRouteGeometry = await loadRouteGeometryById(
		supabase,
		parsedSelectedRoute.data.geo_route_id
	);

	return {
		routeSelectionInvalid: false,
		selectedRoute: parsedSelectedRoute.data,
		selectedSubscription,
		selectedRouteGeometry
	};
};
