import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { z } from 'zod';
import { dev } from '$app/environment';
import { savedRouteSchema } from '$lib/validation/schemas';

const MAX_QUERY_LENGTH = 120;
const searchPathSchema = z.enum(['fts', 'trigram', 'ilike']);

const postSearchResultSchema = z.object({
	post_id: z.number().int(),
	title: z.string(),
	description: z.string().optional(),
	author: z.object({
		username: z.string()
	}).nullable()
});

const postSearchRpcRowSchema = z.object({
	search_path: searchPathSchema,
	post_id: z.coerce.number().int(),
	title: z.string(),
	author_username: z.string().nullable(),
	body: z.string().nullish(),
	description: z.string().nullish(),
	content: z.string().nullish()
});

const DESCRIPTION_MAX_LENGTH = 120;

function toOneLineDescription(raw: string | undefined): string | undefined {
	if (raw == null || raw === '') return undefined;
	const stripped = raw.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
	if (!stripped) return undefined;
	return stripped.length > DESCRIPTION_MAX_LENGTH
		? `${stripped.slice(0, DESCRIPTION_MAX_LENGTH)}…`
		: stripped;
}

const routeSearchRpcRowSchema = z.object({
	search_path: searchPathSchema,
	saved_route_id: z.coerce.number().int(),
	route_name: z.string(),
	start_loc: z.string(),
	end_loc: z.string(),
	vehicle_types: z.array(z.string()),
	pwd_friendly: z.boolean(),
	est_time_of_arrival: z.coerce.number(),
	fare: z.coerce.number(),
	created_at: z.string()
});

function sanitizeQuery(raw: string | null): string {
	return (raw ?? '').trim().slice(0, MAX_QUERY_LENGTH);
}

async function searchRoutes(
	supabase: App.Locals['supabase'],
	userId: string,
	query: string
) {
	const { data, error } = await (supabase as typeof supabase & {
		rpc: (fn: string, params?: Record<string, unknown>) => Promise<{ data: unknown; error: unknown }>;
	}).rpc('search_routes', {
		p_user_id: userId,
		p_query: query
	});

	if (error) {
		console.error('Route search RPC failed', error);
		return { routes: [], searchPath: null };
	}

	const parsed = routeSearchRpcRowSchema.array().safeParse(data ?? []);
	if (!parsed.success) {
		console.warn('Invalid route search RPC payload', parsed.error);
		return { routes: [], searchPath: null };
	}

	const searchPath = parsed.data[0]?.search_path ?? null;
	const mappedRoutes = parsed.data.map(({ search_path: _searchPath, ...route }) => route);
	const validatedRoutes = savedRouteSchema.array().safeParse(mappedRoutes);
	if (!validatedRoutes.success) {
		console.warn('Invalid mapped route payload', validatedRoutes.error);
		return { routes: [], searchPath: null };
	}

	return { routes: validatedRoutes.data, searchPath };
}

async function searchPosts(supabase: App.Locals['supabase'], query: string) {
	const { data, error } = await (supabase as typeof supabase & {
		rpc: (fn: string, params?: Record<string, unknown>) => Promise<{ data: unknown; error: unknown }>;
	}).rpc('search_posts', {
		p_query: query
	});

	if (error) {
		console.error('Post search RPC failed', error);
		return { posts: [], searchPath: null };
	}

	const parsed = postSearchRpcRowSchema.array().safeParse(data ?? []);
	if (!parsed.success) {
		console.warn('Invalid post search RPC payload', parsed.error);
		return { posts: [], searchPath: null };
	}

	const postIdsNeedingBody = parsed.data
		.filter((post) => !post.body && !post.description && !post.content)
		.map((post) => post.post_id);
	const bodyByPostId = new Map<number, string | undefined>();

	if (postIdsNeedingBody.length > 0) {
		const supabaseWithFrom = supabase as App.Locals['supabase'] & {
			from?: (table: string) => {
				select: (columns: string) => {
					in: (
						column: string,
						values: number[]
					) => Promise<{ data: Array<{ post_id: number; body: string | null }> | null; error: unknown }>;
				};
			};
		};

		if (typeof supabaseWithFrom.from === 'function') {
			const { data: bodyRows, error: bodyError } = await supabaseWithFrom
				.from('post')
				.select('post_id, body')
				.in('post_id', postIdsNeedingBody);

			if (bodyError) {
				console.error('Post body lookup failed', bodyError);
			} else {
				for (const row of bodyRows ?? []) {
					bodyByPostId.set(row.post_id, row.body ?? undefined);
				}
			}
		}
	}

	const mappedPosts = parsed.data.map((post) => ({
		post_id: post.post_id,
		title: post.title,
		description: toOneLineDescription(
			post.body ?? post.description ?? post.content ?? bodyByPostId.get(post.post_id)
		),
		author: post.author_username ? { username: post.author_username } : null
	}));
	const validatedPosts = postSearchResultSchema.array().safeParse(mappedPosts);
	if (!validatedPosts.success) {
		console.warn('Invalid mapped post payload', validatedPosts.error);
		return { posts: [], searchPath: null };
	}

	return {
		posts: validatedPosts.data,
		searchPath: parsed.data[0]?.search_path ?? null
	};
}

export const GET: RequestHandler = async ({ url, locals: { supabase, safeGetSession } }) => {
	const query = sanitizeQuery(url.searchParams.get('q'));
	if (!query) {
		return json({ suggestions: [], routes: [], posts: [] });
	}

	const suggestions = [query];
	const { session } = await safeGetSession();

	const [postResult, routeResult] = await Promise.all([
		searchPosts(supabase, query),
		session ? searchRoutes(supabase, session.user.id, query) : Promise.resolve({ routes: [], searchPath: null })
	]);

	if (dev) {
		console.info('[search]', {
			query,
			posts_path: postResult.searchPath,
			routes_path: routeResult.searchPath,
			posts_count: postResult.posts.length,
			routes_count: routeResult.routes.length
		});
	}

	return json({
		suggestions,
		routes: routeResult.routes,
		posts: postResult.posts
	});
};
