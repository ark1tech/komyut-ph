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
		new Set(comments.map((c) => c.linked_post_id).filter((id): id is string => id != null))
	);
	const linkedRouteIds = Array.from(
		new Set(
			comments
				.map((c) => c.linked_route_id)
				.filter((id): id is number => typeof id === 'number' && Number.isFinite(id))
		)
	);

	const linkedPosts: Record<
		string,
		{ post_id: string; title: string; author?: { username: string } | null }
	> = {};
	const linkedRoutes: Record<string, { route_id: number; route_name: string }> = {};

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

	if (linkedRouteIds.length > 0) {
		const { data: linkedRouteRows, error: linkedRouteError } = await supabase
			.from('route')
			.select('route_id, route_name')
			.in('route_id', linkedRouteIds);

		if (linkedRouteError) {
			throw error(500, 'Failed to load linked routes');
		}

		for (const row of linkedRouteRows ?? []) {
			linkedRoutes[String(row.route_id)] = {
				route_id: row.route_id,
				route_name: row.route_name
			};
		}
	}

	return {
		post,
		comments: comments.map((comment) => ({
			...comment,
			linked_route:
				comment.linked_route_id != null
					? (linkedRoutes[String(comment.linked_route_id)] ?? null)
					: null
		})),
		linkedPosts
	};
};

export const actions = {
	createComment: async ({ request, locals }) => {
		const { session, user } = await locals.safeGetSession();

		if (!session || !user) {
			return { error: 'Not logged in' };
		}

		const formData = await request.formData();

		const body = String(formData.get('body') ?? '').trim();
		const parent_id = String(formData.get('parent_id') ?? '');
		const linkedRouteIdRaw = String(formData.get('linked_route_id') ?? '').trim();

		let linkedRouteId: number | null = null;
		if (linkedRouteIdRaw !== '') {
			if (!/^\d+$/.test(linkedRouteIdRaw)) {
				return { error: 'Invalid linked route' };
			}

			linkedRouteId = Number(linkedRouteIdRaw);
			const { data: linkedRoute, error: linkedRouteError } = await locals.supabase
				.from('route')
				.select('route_id')
				.eq('route_id', linkedRouteId)
				.maybeSingle();

			if (linkedRouteError) {
				console.error(linkedRouteError);
				return { error: 'Failed to link route' };
			}

			if (!linkedRoute) {
				return { error: 'Linked route not found' };
			}
		}

		if (!body && linkedRouteId == null) {
			return { error: 'Comment cannot be empty' };
		}

		const { error: insertError } = await locals.supabase.from('comment').insert([
			{
				author_id: user.id,
				body,
				linked_route_id: linkedRouteId,
				parent_id
			}
		]);

		if (insertError) {
			console.error(insertError);
			return { error: 'Insert failed' };
		}

		return { success: true };
	}
};
