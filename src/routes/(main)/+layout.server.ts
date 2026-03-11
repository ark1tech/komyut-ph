import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ locals: { supabase, safeGetSession } }) => {
	const { session } = await safeGetSession();
	if (!session) return { unreadForum: 0, unreadRoutes: 0 };

	const [{ count: forumCount }, { count: routeCount }] = await Promise.all([
		supabase
			.from('notification')
			.select('*', { count: 'exact', head: true })
			.eq('user_id', session.user.id)
			.eq('is_read', false)
			.in('kind', ['upvote', 'downvote', 'comment']),
		supabase
			.from('notification')
			.select('*', { count: 'exact', head: true })
			.eq('user_id', session.user.id)
			.eq('is_read', false)
			.eq('kind', 'route_alert')
	]);

	return { unreadForum: forumCount ?? 0, unreadRoutes: routeCount ?? 0 };
};
