import { error } from '@sveltejs/kit';
import { mockUsers } from '$lib/data/mock_users';
import { mockPosts } from '$lib/data/mock_posts';
import { mockComments } from '$lib/data/mock_comments';
import type { PageLoad } from './$types';

export const load: PageLoad = ({ params }) => {
	const user = mockUsers.find((u) => u.username === params.username);

	if (!user) error(404, 'User not found');

	const posts = mockPosts
		.filter((p) => p.author_username === user.username)
		.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

	const commentCounts = new Map<number, number>();
	for (const c of mockComments) {
		commentCounts.set(c.parent_id, (commentCounts.get(c.parent_id) ?? 0) + 1);
	}

	return {
		profileUser: user,
		posts,
		commentCounts: Object.fromEntries(commentCounts),
		stats: {
			routes: 0,
			posts: posts.length,
			followers: '—'
		}
	};
};
