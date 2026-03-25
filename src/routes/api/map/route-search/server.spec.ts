import { describe, expect, it, vi } from 'vitest';
import { GET } from './+server';

function mockEvent(searchParams: Record<string, string>) {
	const url = new URL('http://localhost/api/map/route-search');
	for (const [k, v] of Object.entries(searchParams)) {
		url.searchParams.set(k, v);
	}

	const limitMock = vi.fn().mockResolvedValue({
		data: [
			{
				route_id: 1,
				route_name: 'Test',
				start_loc: 'A',
				end_loc: 'B'
			}
		],
		error: null
	});
	const ilikeMock = vi.fn().mockReturnValue({ limit: limitMock });
	const orMock = vi.fn().mockReturnValue({ limit: limitMock });
	const selectMock = vi.fn().mockReturnValue({ ilike: ilikeMock, or: orMock });
	const fromMock = vi.fn().mockReturnValue({ select: selectMock });

	const supabase = { from: fromMock };

	return {
		url,
		locals: { supabase },
		_ilikeMock: ilikeMock,
		_orMock: orMock,
		_limitMock: limitMock
	} as const;
}

describe('GET /api/map/route-search', () => {
	it('uses start_loc ilike when prefer=start', async () => {
		const event = mockEvent({ q: 'Quezon', prefer: 'start' });
		const res = await GET(event as unknown as Parameters<typeof GET>[0]);
		expect(res.status).toBe(200);
		expect(event._ilikeMock).toHaveBeenCalledWith(
			'start_loc',
			expect.stringMatching(/Quezon/)
		);
		expect(event._orMock).not.toHaveBeenCalled();
	});

	it('uses end_loc ilike when prefer=end', async () => {
		const event = mockEvent({ q: 'Makati', prefer: 'end' });
		const res = await GET(event as unknown as Parameters<typeof GET>[0]);
		expect(res.status).toBe(200);
		expect(event._ilikeMock).toHaveBeenCalledWith(
			'end_loc',
			expect.stringMatching(/Makati/)
		);
		expect(event._orMock).not.toHaveBeenCalled();
	});

	it('uses route_name ilike when prefer=route_name', async () => {
		const event = mockEvent({ q: 'Carousel', prefer: 'route_name' });
		const res = await GET(event as unknown as Parameters<typeof GET>[0]);
		expect(res.status).toBe(200);
		expect(event._ilikeMock).toHaveBeenCalledWith(
			'route_name',
			expect.stringMatching(/Carousel/)
		);
		expect(event._orMock).not.toHaveBeenCalled();
	});

	it('uses combined or when prefer is omitted', async () => {
		const event = mockEvent({ q: 'x' });
		const res = await GET(event as unknown as Parameters<typeof GET>[0]);
		expect(res.status).toBe(200);
		expect(event._orMock).toHaveBeenCalled();
		const orArg = event._orMock.mock.calls[0][0] as string;
		expect(orArg).toContain('start_loc.ilike.');
		expect(orArg).toContain('end_loc.ilike.');
		expect(orArg).toContain('route_name.ilike.');
		expect(event._ilikeMock).not.toHaveBeenCalled();
	});

	it('returns empty routes when q is empty', async () => {
		const limitMock = vi.fn();
		const ilikeMock = vi.fn().mockReturnValue({ limit: limitMock });
		const orMock = vi.fn().mockReturnValue({ limit: limitMock });
		const selectMock = vi.fn().mockReturnValue({ ilike: ilikeMock, or: orMock });
		const fromMock = vi.fn().mockReturnValue({ select: selectMock });
		const event = {
			url: new URL('http://localhost/api/map/route-search'),
			locals: { supabase: { from: fromMock } }
		} as unknown as Parameters<typeof GET>[0];

		const res = await GET(event);
		expect(res.status).toBe(200);
		const body = (await res.json()) as { routes: unknown[] };
		expect(body.routes).toEqual([]);
		expect(fromMock).not.toHaveBeenCalled();
	});
});
