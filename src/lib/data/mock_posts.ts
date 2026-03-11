// Legacy interface kept for reference. Data is now served from Supabase.
export interface Post {
	post_id: number;
	author_id: number;
	author_name: string;
	author_username: string;
	created_at: string;
	last_edited: string;
	title: string;
	body: string;
	upvotes: number;
	downvotes: number;
}
