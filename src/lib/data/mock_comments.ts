// Legacy interface kept for reference. Data is now served from Supabase.
export interface Comment {
	comment_id: number;
	author_id: number;
	author_name: string;
	author_username: string;
	parent_id: number;
	created_at: string;
	last_edited: string;
	body: string;
	upvotes: number;
	downvotes: number;
	linked_post_id?: number;
}
