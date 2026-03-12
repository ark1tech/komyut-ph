import { beforeEach, describe, expect, it, vi } from 'vitest';
import { GET } from './+server';

type RpcResponse = {
	data: unknown;
	error: unknown;
};

function mockEvent({
	q = '',
	sessionUserId = '11111111-1111-1111-1111-111111111111',
	rpcResults = {},
	postBodiesById = {}
}: {
	q?: string;
	sessionUserId?: string | null;
	rpcResults?: Record<string, RpcResponse>;
	postBodiesById?: Record<number, string>;
} = {}) {
	const url = new URL('http://localhost/api/search');
	url.searchParams.set('q', q);

	const rpc = vi.fn().mockImplementation((fnName: string) => {
		return Promise.resolve(
			rpcResults[fnName] ?? {
				data: [],
				error: null
			}
		);
	});

	const inFn = vi.fn().mockImplementation((_column: string, values: number[]) => {
		const rows = values
			.map((id) =>
				id in postBodiesById
					? {
							post_id: id,
							body: postBodiesById[id]
						}
					: null
			)
			.filter((row): row is { post_id: number; body: string } => row !== null);

		return Promise.resolve({
			data: rows,
			error: null
		});
	});

	const selectFn = vi.fn().mockReturnValue({
		in: inFn
	});

	const from = vi.fn().mockImplementation((tableName: string) => {
		if (tableName !== 'post') {
			return {
				select: vi.fn().mockReturnValue({
					in: vi.fn().mockResolvedValue({ data: [], error: null })
				})
			};
		}

		return {
			select: selectFn
		};
	});

	return {
		url,
		locals: {
			supabase: { rpc, from },
			safeGetSession: vi.fn().mockResolvedValue({
				session: sessionUserId
					? { user: { id: sessionUserId } }
					: null
			})
		}
	} as unknown as Parameters<typeof GET>[0];
}

describe('GET /api/search', () => {
	beforeEach(() => {
		vi.restoreAllMocks();
	});

	it('returns empty payload for empty query', async () => {
		const event = mockEvent({ q: '   ' });
		const response = await GET(event);
		const body = await response.json();

		expect(body).toEqual({ suggestions: [], routes: [], posts: [] });
		expect(event.locals.supabase.rpc).not.toHaveBeenCalled();
	});

	it('returns exact keyword results for PWD', async () => {
		const event = mockEvent({
			q: 'PWD',
			rpcResults: {
				search_posts: {
					data: [
						{
							search_path: 'fts',
							post_id: 10,
							title: 'PWD access on EDSA Carousel',
							author_username: 'ray'
						}
					],
					error: null
				},
				search_routes: {
					data: [
						{
							search_path: 'fts',
							saved_route_id: 21,
							route_name: 'PWD route to Cubao',
							start_loc: 'SM North',
							end_loc: 'Cubao',
							vehicle_types: ['bus'],
							pwd_friendly: true,
							est_time_of_arrival: 34,
							fare: 20,
							created_at: '2026-03-10T10:00:00.000Z'
						}
					],
					error: null
				}
			}
		});

		const response = await GET(event);
		const body = await response.json();

		expect(body.suggestions).toEqual(['PWD']);
		expect(body.posts).toEqual([
			{
				post_id: 10,
				title: 'PWD access on EDSA Carousel',
				author: { username: 'ray' }
			}
		]);
		expect(body.routes).toHaveLength(1);
		expect(event.locals.supabase.rpc).toHaveBeenCalledWith('search_posts', { p_query: 'PWD' });
		expect(event.locals.supabase.rpc).toHaveBeenCalledWith('search_routes', {
			p_user_id: '11111111-1111-1111-1111-111111111111',
			p_query: 'PWD'
		});
	});

	it('returns fuzzy typo results for PWDD', async () => {
		const event = mockEvent({
			q: 'PWDD',
			rpcResults: {
				search_posts: {
					data: [
						{
							search_path: 'trigram',
							post_id: 11,
							title: 'PWD-friendly bus stops',
							author_username: 'alice'
						}
					],
					error: null
				},
				search_routes: { data: [], error: null }
			}
		});

		const response = await GET(event);
		const body = await response.json();

		expect(body.suggestions).toEqual(['PWDD']);
		expect(body.posts).toEqual([
			{
				post_id: 11,
				title: 'PWD-friendly bus stops',
				author: { username: 'alice' }
			}
		]);
	});

	it('does not call route RPC when unauthenticated', async () => {
		const event = mockEvent({
			q: 'PWD',
			sessionUserId: null,
			rpcResults: {
				search_posts: {
					data: [
						{
							search_path: 'fts',
							post_id: 12,
							title: 'PWD guide',
							author_username: 'bob'
						}
					],
					error: null
				}
			}
		});

		const response = await GET(event);
		const body = await response.json();

		expect(event.locals.supabase.rpc).toHaveBeenCalledTimes(1);
		expect(event.locals.supabase.rpc).toHaveBeenCalledWith('search_posts', { p_query: 'PWD' });
		expect(body.routes).toEqual([]);
		expect(body.posts).toHaveLength(1);
	});

	it('returns truncated one-line description for posts when body is provided by RPC', async () => {
		const event = mockEvent({
			q: 'test',
			rpcResults: {
				search_posts: {
					data: [
						{
							search_path: 'fts',
							post_id: 1,
							title: 'A post',
							author_username: 'alice',
							body: '<p>First line of content.</p><p>Second paragraph with more text.</p>'
						}
					],
					error: null
				},
				search_routes: { data: [], error: null }
			}
		});

		const response = await GET(event);
		const body = await response.json();

		expect(body.posts).toHaveLength(1);
		expect(body.posts[0].description).toBe('First line of content. Second paragraph with more text.');
	});

	it('uses RPC description as post description when body is not provided', async () => {
		const event = mockEvent({
			q: 'forum',
			rpcResults: {
				search_posts: {
					data: [
						{
							search_path: 'fts',
							post_id: 13,
							title: 'Bus commute tips',
							author_username: 'carlo',
							description: 'Ride MRT first, then transfer to EDSA Carousel.'
						}
					],
					error: null
				},
				search_routes: { data: [], error: null }
			}
		});

		const response = await GET(event);
		const body = await response.json();

		expect(body.posts).toHaveLength(1);
		expect(body.posts[0]).toMatchObject({
			post_id: 13,
			title: 'Bus commute tips',
			description: 'Ride MRT first, then transfer to EDSA Carousel.',
			author: { username: 'carlo' }
		});
	});

	it('fetches post body by post_id when RPC result has no body field', async () => {
		const event = mockEvent({
			q: 'PWD',
			rpcResults: {
				search_posts: {
					data: [
						{
							search_path: 'fts',
							post_id: 10,
							title: 'PWD-friendly route to Manila Ocean Park',
							author_username: 'ryant'
						}
					],
					error: null
				},
				search_routes: { data: [], error: null }
			},
			postBodiesById: {
				10: 'Looking for wheelchair-accessible transportation from Quezon Avenue to Manila Ocean Park.'
			}
		});

		const response = await GET(event);
		const body = await response.json();

		expect(body.posts).toHaveLength(1);
		expect(body.posts[0]).toMatchObject({
			post_id: 10,
			title: 'PWD-friendly route to Manila Ocean Park',
			description: 'Looking for wheelchair-accessible transportation from Quezon Avenue to Manila Ocean Park.',
			author: { username: 'ryant' }
		});
	});

	it('keeps response section ordering deterministic', async () => {
		const event = mockEvent({
			q: 'PWD',
			rpcResults: {
				search_posts: { data: [], error: null },
				search_routes: { data: [], error: null }
			}
		});

		const response = await GET(event);
		const body = await response.json();

		expect(Object.keys(body)).toEqual(['suggestions', 'routes', 'posts']);
		expect(Array.isArray(body.suggestions)).toBe(true);
		expect(Array.isArray(body.routes)).toBe(true);
		expect(Array.isArray(body.posts)).toBe(true);
	});
});
