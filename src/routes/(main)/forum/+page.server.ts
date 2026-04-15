import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { getOrSetCached } from '$lib/server/cache';
import { POST_WITH_AUTHOR_SELECT } from '$lib/server/supabaseSelects';

const FORUM_TTL_MS = 55_000;

export const load: PageServerLoad = async ({ locals: { supabase } }) => {
	const cacheKey = 'forum:posts-and-comments';

	const { posts, commentCounts } = await getOrSetCached(
		cacheKey,
		FORUM_TTL_MS,
		async () => {
			const { data: posts, error: postsError } = await supabase
				.from('post')
				.select(POST_WITH_AUTHOR_SELECT)
				.order('created_at', { ascending: false });

			if (postsError) {
				console.error('Failed to load forum posts', postsError);
				throw error(500, 'Failed to load forum');
			}

			const postIds = (posts ?? []).map((post) => post.post_id);
			const countMap: Record<string, number> = {};

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

// +layout.server.ts
export const actions = {
  createPost: async ({ request, locals }) => {
    const { session, user } = await locals.safeGetSession();

    if (!session || !user) {
      return { error: 'Not logged in' };
    }

    const formData = await request.formData();

	const title = formData.get('title') as string;
    const body = formData.get('body') as string;



    const { error: insertError } = await locals.supabase
		.from('post')
		.insert([
			{
				author_id: user.id,
				title,
				body
			}
		]);
	
	if (insertError) {
		console.error(insertError);
		return { error: 'Insert failed' };
	}

    return { success: true };
  }
};