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
	linked_route_id,
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

export { SAVED_ROUTE_WITH_ROUTE_SELECT as SAVED_ROUTE_SELECT } from '$lib/server/savedRouteJoin';

export const USER_PROFILE_SELECT = 'full_name, username, email, avatar_url';
