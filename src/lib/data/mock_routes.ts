// src/lib/data/mock_routes.ts
export interface SavedRoute {
	route_id: number;
	route_name: string;
	start_loc: string;
	end_loc: string;
	vehicle_types: string[];
	pwd_friendly: boolean;
	est_time_of_arrival: number; // in minutes
	fare: number; // in pesos
}

export const mockRoutes: SavedRoute[] = [
	{
		route_id: 1,
		route_name: 'QC to Makati via MRT',
		start_loc: 'SM North EDSA, Quezon City',
		end_loc: 'Ayala Avenue, Makati',
		vehicle_types: ['Walk', 'MRT'],
		pwd_friendly: true,
		est_time_of_arrival: 60,
		fare: 28
	},
	{
		route_id: 2,
		route_name: 'Cubao to MOA via P2P Bus',
		start_loc: 'Gateway Mall, Cubao',
		end_loc: 'Mall of Asia, Pasay',
		vehicle_types: ['P2P Bus'],
		pwd_friendly: true,
		est_time_of_arrival: 90,
		fare: 75
	},
	{
		route_id: 3,
		route_name: 'Cubao to MOA via Train Transfer',
		start_loc: 'Araneta Center, Cubao',
		end_loc: 'Mall of Asia, Pasay',
		vehicle_types: ['MRT', 'Walk', 'LRT-1', 'Jeep'],
		pwd_friendly: false,
		est_time_of_arrival: 120,
		fare: 150
	},
	{
		route_id: 4,
		route_name: 'Manila to Tagaytay via Bus',
		start_loc: 'Manila City Hall',
		end_loc: 'Olivarez Plaza, Tagaytay',
		vehicle_types: ['Jeep', 'Bus'],
		pwd_friendly: false,
		est_time_of_arrival: 180,
		fare: 175
	},
	{
		route_id: 5,
		route_name: 'BGC to NAIA T3 Early Morning',
		start_loc: 'Bonifacio Global City',
		end_loc: 'NAIA Terminal 3',
		vehicle_types: ['Taxi'],
		pwd_friendly: true,
		est_time_of_arrival: 30,
		fare: 350
	},
	{
		route_id: 6,
		route_name: 'Fairview to Ortigas Express',
		start_loc: 'Fairview Terminal',
		end_loc: 'Ortigas Center',
		vehicle_types: ['Bus'],
		pwd_friendly: true,
		est_time_of_arrival: 75,
		fare: 50
	},
	{
		route_id: 7,
		route_name: 'Fairview to Ortigas via MRT',
		start_loc: 'Fairview, Quezon City',
		end_loc: 'Ortigas Center, Pasig',
		vehicle_types: ['Jeep', 'Walk', 'MRT'],
		pwd_friendly: true,
		est_time_of_arrival: 90,
		fare: 45
	},
	{
		route_id: 8,
		route_name: 'Pasay to UP Diliman',
		start_loc: 'Pasay Rotonda',
		end_loc: 'University of the Philippines Diliman',
		vehicle_types: ['LRT-1', 'MRT', 'Jeep'],
		pwd_friendly: false,
		est_time_of_arrival: 75,
		fare: 65
	},
	{
		route_id: 9,
		route_name: 'Alabang to Antipolo via Cubao',
		start_loc: 'Alabang Town Center',
		end_loc: 'Antipolo City',
		vehicle_types: ['Bus', 'UV Express'],
		pwd_friendly: false,
		est_time_of_arrival: 150,
		fare: 225
	},
	{
		route_id: 10,
		route_name: 'España to Bacoor Budget Route',
		start_loc: 'España Boulevard, Manila',
		end_loc: 'Bacoor, Cavite',
		vehicle_types: ['Jeep', 'LRT-1', 'Bus'],
		pwd_friendly: false,
		est_time_of_arrival: 120,
		fare: 85
	},
	{
		route_id: 11,
		route_name: 'Eastwood to Greenhills',
		start_loc: 'Eastwood City',
		end_loc: 'Greenhills Shopping Center',
		vehicle_types: ['Jeep'],
		pwd_friendly: false,
		est_time_of_arrival: 35,
		fare: 25
	},
	{
		route_id: 12,
		route_name: 'QC to Manila Ocean Park Accessible',
		start_loc: 'Quezon Avenue',
		end_loc: 'Manila Ocean Park',
		vehicle_types: ['MRT', 'Accessible Taxi'],
		pwd_friendly: true,
		est_time_of_arrival: 50,
		fare: 350
	},
	{
		route_id: 13,
		route_name: 'BGC to Fairview Late Night',
		start_loc: 'Bonifacio High Street, BGC',
		end_loc: 'Fairview, Quezon City',
		vehicle_types: ['Bus', 'Taxi'],
		pwd_friendly: false,
		est_time_of_arrival: 90,
		fare: 450
	},
	{
		route_id: 14,
		route_name: 'Marikina to BGC via Ayala',
		start_loc: 'Marikina City Hall',
		end_loc: 'Bonifacio High Street, BGC',
		vehicle_types: ['UV Express', 'BGC Bus'],
		pwd_friendly: true,
		est_time_of_arrival: 70,
		fare: 95
	},
	{
		route_id: 15,
		route_name: 'Marikina to BGC via Shaw',
		start_loc: 'Sta. Lucia Mall, Marikina',
		end_loc: 'Bonifacio Global City',
		vehicle_types: ['Jeep', 'Bus', 'BGC Bus'],
		pwd_friendly: false,
		est_time_of_arrival: 85,
		fare: 90
	}
];
