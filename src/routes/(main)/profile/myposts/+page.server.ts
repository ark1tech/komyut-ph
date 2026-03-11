import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals: { supabase, safeGetSession } }) => {
	const { session } = await safeGetSession();
	if (!session) return { posts: [], commentCounts: {} };

	const { data: posts } = await supabase
		.from('post')
		.select('post_id, title, body, upvotes, downvotes, created_at, last_edited')
		.eq('author_id', session.user.id)
		.order('created_at', { ascending: false });

	const postIds = (posts ?? []).map((p) => p.post_id);
	let countMap: Record<number, number> = {};

	if (postIds.length > 0) {
		const { data: commentCounts } = await supabase
			.from('comment')
			.select('parent_id')
			.in('parent_id', postIds);

		for (const row of commentCounts ?? []) {
			countMap[row.parent_id] = (countMap[row.parent_id] ?? 0) + 1;
		}
	}

	return { posts: posts ?? [], commentCounts: countMap };
};
