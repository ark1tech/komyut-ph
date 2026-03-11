import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, locals: { supabase } }) => {
	const { data: profileUser, error: userError } = await supabase
		.from('user')
		.select('uid, username, full_name, first_name, last_name, middle_name, avatar_url')
		.eq('username', params.username)
		.single();

	if (userError) {
		console.error('Failed to load profile user', userError);
		throw error(500, 'Failed to load user profile');
	}

	if (!profileUser) {
		throw error(404, 'User not found');
	}

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
		.eq('author_id', profileUser.uid)
		.order('created_at', { ascending: false });

	if (postsError) {
		console.error('Failed to load user posts', postsError);
		throw error(500, 'Failed to load user posts');
	}

	const postIds = (posts ?? []).map((post) => post.post_id as number);
	const countMap: Record<number, number> = {};

	if (postIds.length > 0) {
		const { data: commentCounts, error: commentsError } = await supabase
			.from('comment')
			.select('parent_id')
			.in('parent_id', postIds);

		if (commentsError) {
			console.error('Failed to load comment counts', commentsError);
			throw error(500, 'Failed to load user posts');
		}

		for (const row of commentCounts ?? []) {
			countMap[row.parent_id] = (countMap[row.parent_id] ?? 0) + 1;
		}
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
