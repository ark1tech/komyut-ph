import { error } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';
import { getOrSetCached } from '$lib/server/cache';

const NOTIFICATION_COUNT_TTL_MS = 5_000;

export const load: LayoutServerLoad = async ({ locals: { supabase, safeGetSession } }) => {
	const { session } = await safeGetSession();
	if (!session) return { unreadForum: 0, unreadRoutes: 0 };

	const cacheKey = `notifications:counts:user=${session.user.id}`;

	try {
		const { unreadForum, unreadRoutes } = await getOrSetCached(
			cacheKey,
			NOTIFICATION_COUNT_TTL_MS,
			async () => {
				const [
					{ count: forumCount, error: forumError },
					{ count: routeCount, error: routeError }
				] = await Promise.all([
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

				return {
					unreadForum: forumCount ?? 0,
					unreadRoutes: routeCount ?? 0
				};
			}
		);

		return { unreadForum, unreadRoutes };
	} catch (err) {
		console.error('Failed to load notification counts (cached)', err);
		throw error(500, 'Failed to load notifications');
	}
};
