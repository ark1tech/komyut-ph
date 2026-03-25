/**
 * Centralized Supabase select fragments.
 * Keep these in one place to avoid field drift across pages.
 */
export const POST_WITH_AUTHOR_SELECT = `
	post_id,
	title,
	body,
	upvotes,
	downvotes,
	created_at,
	last_edited,
	author:user!post_author_id_fkey (
		uid,
		username,
		full_name
	)
`;

export const COMMENT_WITH_AUTHOR_SELECT = `
	comment_id,
	parent_id,
	created_at,
	last_edited,
	body,
	upvotes,
	downvotes,
	linked_post_id,
	author:user!comment_author_id_fkey (
		uid,
		username,
		full_name
	)
`;

export const LINKED_POST_SELECT = `
	post_id,
	title,
	author:user!post_author_id_fkey (
		username
	)
`;

export const SAVED_ROUTE_SELECT =
	'saved_route_id, route_name, start_loc, end_loc, vehicle_types, pwd_friendly, est_time_of_arrival, fare, created_at';

export const USER_PROFILE_SELECT = 'full_name, username, email, avatar_url';
