import { error } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ locals: { supabase, safeGetSession } }) => {
	const { session } = await safeGetSession();
	if (!session) return { unreadForum: 0, unreadRoutes: 0 };

	const [{ count: forumCount, error: forumError }, { count: routeCount, error: routeError }] =
		await Promise.all([
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

	if (forumError || routeError) {
		console.error('Failed to load notification counts', { forumError, routeError });
		throw error(500, 'Failed to load notifications');
	}

	return { unreadForum: forumCount ?? 0, unreadRoutes: routeCount ?? 0 };
};
