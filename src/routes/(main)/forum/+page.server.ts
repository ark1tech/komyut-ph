import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { getOrSetCached } from '$lib/server/cache';

const FORUM_TTL_MS = 15_000;

export const load: PageServerLoad = async ({ locals: { supabase } }) => {
	const cacheKey = 'forum:posts-and-comments';

	const { posts, commentCounts } = await getOrSetCached(
		cacheKey,
		FORUM_TTL_MS,
		async () => {
			const { data: posts, error: postsError } = await supabase
				.from('post')
				.select(
					`
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
				`
				)
				.order('created_at', { ascending: false });

			if (postsError) {
				console.error('Failed to load forum posts', postsError);
				throw error(500, 'Failed to load forum');
			}

			const postIds = (posts ?? []).map((post) => post.post_id as number);
			const countMap: Record<number, number> = {};

			if (postIds.length > 0) {
				const { data: commentCounts, error: commentsError } = await supabase
					.from('comment')
					.select('parent_id')
					.in('parent_id', postIds);

				if (commentsError) {
					console.error('Failed to load forum comment counts', commentsError);
					throw error(500, 'Failed to load forum');
				}

				for (const row of commentCounts ?? []) {
					countMap[row.parent_id] = (countMap[row.parent_id] ?? 0) + 1;
				}
			}

			return {
				posts: posts ?? [],
				commentCounts: countMap
			};
		}
	);

	return {
		posts,
		commentCounts
	};
};
