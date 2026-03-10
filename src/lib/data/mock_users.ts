// Legacy interface kept for reference. Data is now served from Supabase.
export interface User {
	uid: number;
	email: string;
	username: string;
	first_name: string;
	last_name: string;
	middle_name: string | null;
}
