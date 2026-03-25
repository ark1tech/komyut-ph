import { savedRouteSchema, type SavedRouteDTO } from '$lib/validation/schemas';

/** Supabase select: `saved_route` row + joined `route` commute metadata via `geo_route_id`. */
export const SAVED_ROUTE_WITH_ROUTE_SELECT = `
	saved_route_id,
	geo_route_id,
	created_at,
	route:geo_route_id (
		route_name,
		start_loc,
		end_loc,
		vehicle_types,
		pwd_friendly,
		est_time_of_arrival,
		fare
	)
`;

export type SavedRouteJoinRow = {
	saved_route_id: number;
	geo_route_id: number | null;
	created_at: string;
	user_id?: string;
	route:
		| {
				route_name: string;
				start_loc: string;
				end_loc: string;
				vehicle_types: string[];
				pwd_friendly: boolean;
				est_time_of_arrival: number;
				fare: number;
		  }
		| {
				route_name: string;
				start_loc: string;
				end_loc: string;
				vehicle_types: string[];
				pwd_friendly: boolean;
				est_time_of_arrival: number;
				fare: number;
		  }[]
		| null;
};

export function flattenSavedRouteJoin(
	row: SavedRouteJoinRow | null | undefined
): SavedRouteDTO | null {
	if (!row?.geo_route_id) return null;

	const routePayload = row.route;
	const routeRow = Array.isArray(routePayload) ? routePayload[0] : routePayload;
	if (!routeRow) return null;

	const merged = {
		saved_route_id: row.saved_route_id,
		geo_route_id: row.geo_route_id,
		created_at: row.created_at,
		route_name: routeRow.route_name,
		start_loc: routeRow.start_loc,
		end_loc: routeRow.end_loc,
		vehicle_types: routeRow.vehicle_types,
		pwd_friendly: routeRow.pwd_friendly,
		est_time_of_arrival: routeRow.est_time_of_arrival,
		fare: routeRow.fare
	};

	const parsed = savedRouteSchema.safeParse(merged);
	if (!parsed.success) {
		console.error('Invalid flattened saved route', parsed.error);
		return null;
	}

	return parsed.data;
}

export function flattenSavedRouteJoinList(rows: SavedRouteJoinRow[]): SavedRouteDTO[] {
	return rows.map((r) => flattenSavedRouteJoin(r)).filter((r): r is SavedRouteDTO => r != null);
}
