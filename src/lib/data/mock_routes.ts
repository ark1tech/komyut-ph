// added for the sake of testing the subscribed routes page 
import type { SavedRouteDTO } from '$lib/validation/schemas';

export type MockSavedRoute = SavedRouteDTO;

export function toSubscribableSavedRoute(route: SavedRouteDTO): SavedRouteDTO {
	return {
		...route,
		geo_route_id: route.geo_route_id ?? route.saved_route_id,
		vehicle_types: [...route.vehicle_types]
	};
}

export const mockSavedRoutes: MockSavedRoute[] = [
	{
		saved_route_id: 1,
		geo_route_id: 42,
		route_name: 'Morning Commute',
		start_loc: 'Quezon City',
		end_loc: 'Makati',
		vehicle_types: ['Jeepney', 'MRT'],
		pwd_friendly: true,
		est_time_of_arrival: 45,
		fare: 50,
		created_at: '2026-03-20T08:00:00.000Z'
	},
	{
		saved_route_id: 2,
		geo_route_id: 87,
		route_name: 'SM North to BGC via EDSA Carousel',
		start_loc: 'SM North',
		end_loc: 'BGC',
		vehicle_types: ['Bus', 'Jeepney'],
		pwd_friendly: false,
		est_time_of_arrival: 55,
		fare: 42,
		created_at: '2026-03-21T07:15:00.000Z'
	},
	{
		saved_route_id: 3,
		geo_route_id: 103,
		route_name: 'Cubao to Taft via MRT',
		start_loc: 'Cubao',
		end_loc: 'Taft',
		vehicle_types: ['MRT'],
		pwd_friendly: true,
		est_time_of_arrival: 35,
		fare: 28,
		created_at: '2026-03-22T18:00:00.000Z'
	},
	{
		saved_route_id: 4,
		geo_route_id: 104,
		route_name: 'UP Diliman to Katipunan',
		start_loc: 'UP Diliman',
		end_loc: 'Katipunan',
		vehicle_types: ['Jeepney'],
		pwd_friendly: false,
		est_time_of_arrival: 25,
		fare: 15,
		created_at: '2026-03-22T19:00:00.000Z'
	},
	{
		saved_route_id: 5,
		geo_route_id: 105,
		route_name: 'Alabang to Ayala Express',
		start_loc: 'Alabang',
		end_loc: 'Ayala',
		vehicle_types: ['Bus'],
		pwd_friendly: true,
		est_time_of_arrival: 60,
		fare: 65,
		created_at: '2026-03-23T06:45:00.000Z'
	},
	{
		saved_route_id: 6,
		geo_route_id: 106,
		route_name: 'Fairview to Cubao',
		start_loc: 'Fairview',
		end_loc: 'Cubao',
		vehicle_types: ['UV Express', 'Bus'],
		pwd_friendly: false,
		est_time_of_arrival: 50,
		fare: 40,
		created_at: '2026-03-23T08:10:00.000Z'
	},
	{
		saved_route_id: 7,
		geo_route_id: 107,
		route_name: 'Intramuros to España',
		start_loc: 'Intramuros',
		end_loc: 'España',
		vehicle_types: ['Jeepney'],
		pwd_friendly: false,
		est_time_of_arrival: 20,
		fare: 13,
		created_at: '2026-03-23T17:30:00.000Z'
	},
	{
		saved_route_id: 8,
		geo_route_id: 108,
		route_name: 'Pasig to Ortigas Center',
		start_loc: 'Pasig',
		end_loc: 'Ortigas Center',
		vehicle_types: ['Jeepney', 'Bus'],
		pwd_friendly: true,
		est_time_of_arrival: 30,
		fare: 24,
		created_at: '2026-03-24T09:20:00.000Z'
	}
];

export function getMockSavedRoutes() {
	return mockSavedRoutes.map(toSubscribableSavedRoute);
}

export function findMockSavedRouteById(routeId: number) {
	const route = mockSavedRoutes.find(
		(item) => item.saved_route_id === routeId || item.geo_route_id === routeId
	);

	if (!route) return null;

	return toSubscribableSavedRoute(route);
}

export function searchMockSavedRoutes(query: string) {
	const normalized = query.trim().toLowerCase();
	if (!normalized) return [];

	return getMockSavedRoutes().filter(
		(route) =>
			route.route_name.toLowerCase().includes(normalized) ||
			route.start_loc.toLowerCase().includes(normalized) ||
			route.end_loc.toLowerCase().includes(normalized) ||
			route.vehicle_types.some((type) => type.toLowerCase().includes(normalized))
	);
}
