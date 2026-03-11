import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals: { supabase } }) => {
	const { data: posts } = await supabase
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

	const { data: commentCounts } = await supabase.from('comment').select('parent_id');

	const countMap: Record<number, number> = {};
	for (const row of commentCounts ?? []) {
		countMap[row.parent_id] = (countMap[row.parent_id] ?? 0) + 1;
	}

	return {
		posts: posts ?? [],
		commentCounts: countMap
	};
};
