import { describe, expect, it, vi } from 'vitest';
import { GET } from './+server';

function createSupabaseMock(tags: string[]) {
	const routeTagSelectEq = vi.fn().mockResolvedValue({
		data: tags.map((text) => ({ tag: { text } })),
		error: null
	});
	const routeTagSelect = vi.fn().mockReturnValue({ eq: routeTagSelectEq });

	const from = vi.fn((table: string) => {
		if (table === 'route_tag') {
			return {
				select: routeTagSelect
			};
		}

		throw new Error(`Unexpected table: ${table}`);
	});

	return {
		supabase: { from },
		mocks: { from, routeTagSelect, routeTagSelectEq }
	};
}

describe('GET /api/map/routes/[routeId]/tags', () => {
	it('returns tags for a route', async () => {
		const { supabase, mocks } = createSupabaseMock(['pwd-friendly', 'id-required']);
		const event = {
			params: { routeId: '99' },
			locals: { supabase }
		} as unknown as Parameters<typeof GET>[0];

		const response = await GET(event);
		const body = (await response.json()) as { tags: string[] };

		expect(response.status).toBe(200);
		expect(body.tags).toEqual(['id-required', 'pwd-friendly']);
		expect(mocks.from).toHaveBeenCalledWith('route_tag');
		expect(mocks.routeTagSelect).toHaveBeenCalledWith('tag:tag_id(text)');
		expect(mocks.routeTagSelectEq).toHaveBeenCalledWith('route_id', 99);
	});
});
