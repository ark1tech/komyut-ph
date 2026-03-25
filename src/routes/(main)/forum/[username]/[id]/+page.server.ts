import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import {
	commentWithAuthorSchema,
	forumPostParamsSchema,
	postDetailSchema
} from '$lib/validation/schemas';
import {
	COMMENT_WITH_AUTHOR_SELECT,
	LINKED_POST_SELECT,
	POST_WITH_AUTHOR_SELECT
} from '$lib/server/supabaseSelects';

export const load: PageServerLoad = async ({ params, locals: { supabase } }) => {
	const parsedParams = forumPostParamsSchema.safeParse(params);
	if (!parsedParams.success) {
		throw error(404, 'Post not found');
	}
	const postId = parsedParams.data.id;

	const { data: post, error: postError } = await supabase
		.from('post')
		.select(POST_WITH_AUTHOR_SELECT)
		.eq('post_id', postId)
		.maybeSingle();

	if (postError) {
		throw error(500, 'Failed to load post');
	}

	if (!post) {
		throw error(404, 'Post not found');
	}

	const parsedPost = postDetailSchema.safeParse(post);
	if (!parsedPost.success) {
		console.error('Invalid post data from Supabase', parsedPost.error);
		throw error(500, 'Failed to load post');
	}

	const { data: rawComments, error: commentsError } = await supabase
		.from('comment')
		.select(COMMENT_WITH_AUTHOR_SELECT)
		.eq('parent_id', postId)
		.order('created_at', { ascending: true });

	if (commentsError) {
		throw error(500, 'Failed to load comments');
	}

	const parsedComments = commentWithAuthorSchema.array().safeParse(rawComments ?? []);
	if (!parsedComments.success) {
		console.error('Invalid comment data from Supabase', parsedComments.error);
		throw error(500, 'Failed to load comments');
	}

	const comments = parsedComments.data;

	const linkedPostIds = Array.from(
		new Set(
			comments
				.map((c) => c.linked_post_id)
				.filter((id): id is string => id != null)
		)
	);

	const linkedPosts: Record<
		string,
		{ post_id: string; title: string; author?: { username: string } | null }
	> =
		{};

	if (linkedPostIds.length > 0) {
		const { data: linkedRows, error: linkedError } = await supabase
			.from('post')
			.select(LINKED_POST_SELECT)
			.in('post_id', linkedPostIds);

		if (linkedError) {
			throw error(500, 'Failed to load linked posts');
		}

		for (const row of linkedRows ?? []) {
			linkedPosts[row.post_id] = {
				post_id: row.post_id,
				title: row.title,
				author: row.author
			};
		}
	}

	return {
		post,
		comments,
		linkedPosts
	};
};

