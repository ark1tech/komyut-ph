import { error } from '@sveltejs/kit';
import { mockPosts } from '$lib/data/mock_posts';
import { mockComments } from '$lib/data/mock_comments';
import type { PageLoad } from './$types';

export const load: PageLoad = ({ params }) => {
	const post = mockPosts.find((p) => p.post_id === Number(params.id));

	if (!post) error(404, 'Post not found');

	const comments = mockComments.filter((c) => c.parent_id === post.post_id);

	return { post, comments };
};
