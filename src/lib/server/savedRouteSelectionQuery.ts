import { error } from '@sveltejs/kit';
import type { Session, SupabaseClient } from '@supabase/supabase-js';
import { findMockSavedRouteById, toSubscribableSavedRoute } from '$lib/data/mock_routes';
import { getRouteSubscription } from '$lib/server/routeSubscriptions';
import { flattenSavedRouteJoin, type SavedRouteJoinRow } from '$lib/server/savedRouteJoin';
import { SAVED_ROUTE_SELECT } from '$lib/server/supabaseSelects';
import type { Database } from '$lib/types/database';
import {
	routeIdParamSchema,
	savedRouteSchema,
	type RouteSubscriptionDTO,
	type SavedRouteDTO
} from '$lib/validation/schemas';

export type SavedRouteSelectionSource = 'saved' | 'canonical';

function toSavedRouteDtoFromRouteRow(
	row: Database['public']['Tables']['route']['Row']
): SavedRouteDTO {
	return savedRouteSchema.parse({
		saved_route_id: row.route_id,
		geo_route_id: row.route_id,
		route_name: row.route_name,
		start_loc: row.start_loc,
		end_loc: row.end_loc,
		vehicle_types: row.vehicle_types,
		pwd_friendly: row.pwd_friendly,
		est_time_of_arrival: row.est_time_of_arrival,
		fare: row.fare,
		created_at: row.created_at
	});
}

export async function loadSavedRouteSelectionFromQuery(
	supabase: SupabaseClient<Database>,
	session: Session | null,
	rawRouteId: string | null
): Promise<{
	routeSelectionInvalid: boolean;
	selectedRoute: SavedRouteDTO | null;
	selectedSubscription: RouteSubscriptionDTO | null;
	selectedRouteSource: SavedRouteSelectionSource | null;
}> {
	if (!rawRouteId) {
		return {
			routeSelectionInvalid: false,
			selectedRoute: null,
			selectedSubscription: null,
			selectedRouteSource: null
		};
	}

	const parsedRouteId = routeIdParamSchema.safeParse({ routeId: rawRouteId });
	if (!parsedRouteId.success) {
		return {
			routeSelectionInvalid: true,
			selectedRoute: null,
			selectedSubscription: null,
			selectedRouteSource: null
		};
	}

	const routeId = parsedRouteId.data.routeId;

	if (!session) {
		const fallbackRoute = findMockSavedRouteById(routeId);
		return {
			routeSelectionInvalid: fallbackRoute == null,
			selectedRoute: fallbackRoute,
			selectedSubscription: null,
			selectedRouteSource: fallbackRoute ? 'saved' : null
		};
	}

	const { data: savedRow, error: routeError } = await supabase
		.from('saved_route')
		.select(SAVED_ROUTE_SELECT)
		.eq('user_id', session.user.id)
		.or(`saved_route_id.eq.${routeId},geo_route_id.eq.${routeId}`)
		.maybeSingle();

	if (routeError) {
		console.error('Failed to load selected route', routeError);
		throw error(500, 'Failed to load route details');
	}

	const flattened = savedRow ? flattenSavedRouteJoin(savedRow as SavedRouteJoinRow) : null;
	const routeFromSaved = flattened
		? toSubscribableSavedRoute({
				...flattened,
				geo_route_id: flattened.geo_route_id ?? flattened.saved_route_id
			})
		: null;

	if (routeFromSaved) {
		const parsedSelectedRoute = savedRouteSchema.safeParse(routeFromSaved);
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
			selectedSubscription,
			selectedRouteSource: 'saved'
		};
	}

	const { data: canonicalRoute, error: canonicalError } = await supabase
		.from('route')
		.select('*')
		.eq('route_id', routeId)
		.maybeSingle();

	if (canonicalError) {
		console.error('Failed to load canonical route', canonicalError);
		throw error(500, 'Failed to load route details');
	}

	if (!canonicalRoute) {
		return {
			routeSelectionInvalid: true,
			selectedRoute: null,
			selectedSubscription: null,
			selectedRouteSource: null
		};
	}

	const parsedCanonical = toSavedRouteDtoFromRouteRow(
		canonicalRoute as Database['public']['Tables']['route']['Row']
	);
	const selectedSubscription = await getRouteSubscription(
		supabase,
		session.user.id,
		parsedCanonical.geo_route_id!
	);

	return {
		routeSelectionInvalid: false,
		selectedRoute: parsedCanonical,
		selectedSubscription,
		selectedRouteSource: 'canonical'
	};
}
