// Legacy interface kept for reference. Data is now served from Supabase.
export interface SavedRoute {
	route_id: number;
	route_name: string;
	start_loc: string;
	end_loc: string;
	vehicle_types: string[];
	pwd_friendly: boolean;
	est_time_of_arrival: number;
	fare: number;
}
