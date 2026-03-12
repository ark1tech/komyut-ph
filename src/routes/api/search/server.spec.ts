import { beforeEach, describe, expect, it, vi } from 'vitest';
import { GET } from './+server';

type RpcResponse = {
	data: unknown;
	error: unknown;
};

function mockEvent({
	q = '',
	sessionUserId = '11111111-1111-1111-1111-111111111111',
	rpcResults = {}
}: {
	q?: string;
	sessionUserId?: string | null;
	rpcResults?: Record<string, RpcResponse>;
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

	return {
		url,
		locals: {
			supabase: { rpc },
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
