import { describe, expect, it, vi } from 'vitest';
import { GET } from './+server';

/* ════════════════════════════════════════════════════════════════
 * API UNIT TESTS — /api/map/routes
 * ════════════════════════════════════════════════════════════════
 *
 * Tests the GET handler for route lookup:
 *   - Returns 400 for missing/empty end param
 *   - Returns matching routes from supabase
 *   - Returns 500 on supabase error
 *   - Uses hardcoded start_loc "371357222"
 *
 * These run in Node.js (*.spec.ts, not *.svelte.spec.ts).
 *
 * HOW TO RUN:
 *   pnpm test:unit                → Run all unit + component tests
 *   pnpm test:unit -- --watch     → Watch mode
 * ════════════════════════════════════════════════════════════════ */

/**
 * Creates a mock RequestEvent for the routes endpoint
 */
function mockEvent(queryParams: Record<string, string> = {}, supabaseOverrides: Record<string, unknown> = {}) {
	const url = new URL('http://localhost/api/map/routes');
	for (const [key, val] of Object.entries(queryParams)) {
		url.searchParams.set(key, val);
	}

	const mockData = supabaseOverrides.data ?? [];
	const mockError = supabaseOverrides.error ?? null;

	const supabase = {
		from: vi.fn().mockReturnValue({
			select: vi.fn().mockReturnValue({
				eq: vi.fn().mockReturnValue({
					eq: vi.fn().mockResolvedValue({
						data: mockData,
						error: mockError
					})
				})
			})
		})
	};

	return {
		url,
		locals: { supabase }
	} as unknown as Parameters<typeof GET>[0];
}

describe('GET /api/map/routes', () => {
	describe('input validation', () => {
		it('should return 400 when end param is missing', async () => {
			const event = mockEvent();

			await expect(GET(event)).rejects.toThrow();
		});

		it('should return 400 when end param is empty string', async () => {
			const event = mockEvent({ end: '' });

			await expect(GET(event)).rejects.toThrow();
		});

		it('should return 400 when end param is only whitespace', async () => {
			const event = mockEvent({ end: '   ' });

			await expect(GET(event)).rejects.toThrow();
		});
	});

	describe('successful route lookups', () => {
		it('should return routes for a valid end location', async () => {
			const mockResults = [
				{ route_id: 1, geometry: '{"type":"LineString","coordinates":[[0,0],[1,1]]}' }
			];

			const event = mockEvent({ end: '123456' }, { data: mockResults });
			const response = await GET(event);
			const body = await response.json();

			expect(body.success).toBe(true);
			expect(body.results).toHaveLength(1);
		});

		it('should return empty results when no routes found', async () => {
			const event = mockEvent({ end: '999999' }, { data: [] });
			const response = await GET(event);
			const body = await response.json();

			expect(body.success).toBe(true);
			expect(body.results).toHaveLength(0);
		});

		it('should query supabase with hardcoded start_loc and provided end_loc', async () => {
			const event = mockEvent({ end: '123456' }, { data: [] });
			await GET(event);

			const fromCall = event.locals.supabase.from as ReturnType<typeof vi.fn>;
			expect(fromCall).toHaveBeenCalledWith('route');

			const selectCall = fromCall.mock.results[0].value.select;
			expect(selectCall).toHaveBeenCalledWith('route_id, geometry');

			// First .eq() is start_loc_osmid
			const firstEq = selectCall.mock.results[0].value.eq;
			expect(firstEq).toHaveBeenCalledWith('start_loc_osmid', '371357222');

			// Second .eq() is end_loc_osmid
			const secondEq = firstEq.mock.results[0].value.eq;
			expect(secondEq).toHaveBeenCalledWith('end_loc_osmid', '123456');
		});

		it('should return multiple routes when available', async () => {
			const mockResults = [
				{ route_id: 1, geometry: '...' },
				{ route_id: 2, geometry: '...' },
				{ route_id: 3, geometry: '...' }
			];

			const event = mockEvent({ end: '123456' }, { data: mockResults });
			const response = await GET(event);
			const body = await response.json();

			expect(body.success).toBe(true);
			expect(body.results).toHaveLength(3);
		});
	});

	describe('error handling', () => {
		it('should return 500 when supabase throws an error', async () => {
			const event = mockEvent(
				{ end: '123456' },
				{ error: { message: 'Database error' }, data: null }
			);
			const response = await GET(event);
			const body = await response.json();

			expect(body.error).toBe('failed to view routes');
		});
	});
});
