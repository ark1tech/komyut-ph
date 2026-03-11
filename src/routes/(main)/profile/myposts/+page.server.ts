import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { postSummarySchema } from '$lib/validation/schemas';

export const load: PageServerLoad = async ({ locals: { supabase, safeGetSession } }) => {
	const { session } = await safeGetSession();
	if (!session) return { posts: [], commentCounts: {} };

	const { data: posts, error: postsError } = await supabase
		.from('post')
		.select('post_id, title, body, upvotes, downvotes, created_at, last_edited')
		.eq('author_id', session.user.id)
		.order('created_at', { ascending: false });

	if (postsError) {
		console.error('Failed to load user posts', postsError);
		throw error(500, 'Failed to load posts');
	}

	const parsedPosts = postSummarySchema.array().safeParse(posts ?? []);
	if (!parsedPosts.success) {
		console.error('Invalid post data from Supabase', parsedPosts.error);
		throw error(500, 'Failed to load posts');
	}

	const postIds = parsedPosts.data.map((p) => p.post_id);
	const countMap: Record<number, number> = {};

	if (postIds.length > 0) {
		const { data: commentCounts, error: commentsError } = await supabase
			.from('comment')
			.select('parent_id')
			.in('parent_id', postIds);

		if (commentsError) {
			console.error('Failed to load comment counts', commentsError);
			throw error(500, 'Failed to load posts');
		}

		for (const row of commentCounts ?? []) {
			countMap[row.parent_id] = (countMap[row.parent_id] ?? 0) + 1;
		}
	}

	return { posts: parsedPosts.data, commentCounts: countMap };
};
