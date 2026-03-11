import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import {
	commentWithAuthorSchema,
	forumPostParamsSchema,
	postDetailSchema
} from '$lib/validation/schemas';

export const load: PageServerLoad = async ({ params, locals: { supabase } }) => {
	const parsedParams = forumPostParamsSchema.safeParse(params);
	if (!parsedParams.success) {
		throw error(404, 'Post not found');
	}
	const postId = parsedParams.data.id;

	const { data: post, error: postError } = await supabase
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
		.select(
			`
			comment_id,
			parent_id,
			created_at,
			last_edited,
			body,
			upvotes,
			downvotes,
			linked_post_id,
			author:user!comment_author_id_fkey (
				uid,
				username,
				full_name
			)
		`
		)
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
				.filter((id): id is number => typeof id === 'number')
		)
	);

	const linkedPosts: Record<number, { post_id: number; title: string; author?: { username: string } | null }> =
		{};

	if (linkedPostIds.length > 0) {
		const { data: linkedRows, error: linkedError } = await supabase
			.from('post')
			.select(
				`
				post_id,
				title,
				author:user!post_author_id_fkey (
					username
				)
			`
			)
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

