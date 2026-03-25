import type { PageServerLoad } from './$types';
import { loadSavedRouteSelectionFromQuery } from '$lib/server/savedRouteSelectionQuery';

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

function isTraceMode(url: URL): boolean {
	const v = url.searchParams.get('trace');
	if (v == null || v === '') return false;
	const lower = v.toLowerCase();
	return v === '1' || lower === 'true' || lower === 'yes';
}

export const load: PageServerLoad = async ({ url, locals: { supabase, safeGetSession } }) => {
	if (isTraceMode(url)) {
		return {
			routeSelectionInvalid: false,
			selectedRoute: null,
			selectedSubscription: null,
			selectedRouteGeometry: null,
			selectedRouteSource: null,
			traceMode: true
		};
	}

	const rawRouteId = url.searchParams.get('route');
	if (!rawRouteId) {
		return {
			routeSelectionInvalid: false,
			selectedRoute: null,
			selectedSubscription: null,
			selectedRouteGeometry: null,
			selectedRouteSource: null,
			traceMode: false
		};
	}

	const { session } = await safeGetSession();
	const selection = await loadSavedRouteSelectionFromQuery(supabase, session, rawRouteId);

	if (selection.routeSelectionInvalid) {
		return {
			routeSelectionInvalid: true,
			selectedRoute: null,
			selectedSubscription: null,
			selectedRouteGeometry: null,
			selectedRouteSource: null,
			traceMode: false
		};
	}

	if (!session) {
		const fallbackRouteGeometry = await loadRouteGeometryById(
			supabase,
			selection.selectedRoute?.geo_route_id ?? null
		);
		return {
			routeSelectionInvalid: false,
			selectedRoute: selection.selectedRoute,
			selectedSubscription: null,
			selectedRouteGeometry: fallbackRouteGeometry,
			selectedRouteSource: selection.selectedRouteSource,
			traceMode: false
		};
	}

	if (!selection.selectedRoute) {
		return {
			routeSelectionInvalid: false,
			selectedRoute: null,
			selectedSubscription: null,
			selectedRouteGeometry: null,
			selectedRouteSource: null,
			traceMode: false
		};
	}

	const selectedRouteGeometry = await loadRouteGeometryById(
		supabase,
		selection.selectedRoute.geo_route_id
	);

	return {
		routeSelectionInvalid: false,
		selectedRoute: selection.selectedRoute,
		selectedSubscription: selection.selectedSubscription,
		selectedRouteGeometry,
		selectedRouteSource: selection.selectedRouteSource,
		traceMode: false
	};
};
