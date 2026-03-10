import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, locals: { supabase } }) => {
	const { data: profileUser } = await supabase
		.from('user')
		.select('uid, username, full_name, first_name, last_name, middle_name, avatar_url')
		.eq('username', params.username)
		.single();

	if (!profileUser) error(404, 'User not found');

	const { data: posts } = await supabase
		.from('post')
		.select('post_id, title, body, upvotes, downvotes, created_at, last_edited')
		.eq('author_id', profileUser.uid)
		.order('created_at', { ascending: false });

	const { data: commentCounts } = await supabase.from('comment').select('parent_id');

	const countMap: Record<number, number> = {};
	for (const row of commentCounts ?? []) {
		countMap[row.parent_id] = (countMap[row.parent_id] ?? 0) + 1;
	}

	return {
		profileUser,
		posts: posts ?? [],
		commentCounts: countMap,
		stats: {
			routes: 0,
			posts: posts?.length ?? 0,
			followers: '—'
		}
	};
};
