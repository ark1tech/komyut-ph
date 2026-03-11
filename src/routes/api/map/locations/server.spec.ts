import { beforeEach, describe, expect, it, vi } from 'vitest';
import { invalidateCache } from '$lib/server/cache';
import { GET } from './+server';

/* ════════════════════════════════════════════════════════════════
 * API UNIT TESTS — /api/map/locations
 * ════════════════════════════════════════════════════════════════
 *
 * Tests the GET handler for location search:
 *   - Returns 400 for missing/empty query param
 *   - Returns matching results from supabase
 *   - Returns 500 on supabase error
 *   - Limits results to 5
 *
 * These run in Node.js (*.spec.ts, not *.svelte.spec.ts).
 *
 * HOW TO RUN:
 *   pnpm test:unit                → Run all unit + component tests
 *   pnpm test:unit -- --watch     → Watch mode
 * ════════════════════════════════════════════════════════════════ */

/**
 * Creates a mock RequestEvent for the locations endpoint
 */
function mockEvent(
	queryParams: Record<string, string> = {},
	supabaseOverrides: Record<string, unknown> = {}
) {
	const url = new URL('http://localhost/api/map/locations');
	for (const [key, val] of Object.entries(queryParams)) {
		url.searchParams.set(key, val);
	}

	const mockData = supabaseOverrides.data ?? [];
	const mockError = supabaseOverrides.error ?? null;

	const supabase = {
		from: vi.fn().mockReturnValue({
			select: vi.fn().mockReturnValue({
				ilike: vi.fn().mockReturnValue({
					limit: vi.fn().mockResolvedValue({
						data: mockData,
						error: mockError
					})
				})
			})
		})
	};

	return {
		url,
		locals: { supabase },
		setHeaders: vi.fn()
	} as unknown as Parameters<typeof GET>[0];
}

describe('GET /api/map/locations', () => {
	beforeEach(() => {
		invalidateCache('map:locations:');
	});

	describe('input validation', () => {
		it('should return 400 when q param is missing', async () => {
			const event = mockEvent();

			await expect(GET(event)).rejects.toThrow();
		});

		it('should return 400 when q param is empty string', async () => {
			const event = mockEvent({ q: '' });

			await expect(GET(event)).rejects.toThrow();
		});

		it('should return 400 when q param is only whitespace', async () => {
			const event = mockEvent({ q: '   ' });

			await expect(GET(event)).rejects.toThrow();
		});
	});

	describe('successful searches', () => {
		it('should return results for a valid query', async () => {
			const mockResults = [
				{ osm_id: 1, name: 'Quezon City Hall', way: 'POLYGON(...)' },
				{ osm_id: 2, name: 'Quezon Avenue', way: 'POLYGON(...)' }
			];

			const event = mockEvent({ q: 'Quezon' }, { data: mockResults });
			const response = await GET(event);
			const body = await response.json();

			expect(body.success).toBe(true);
			expect(body.results).toHaveLength(2);
			expect(body.total).toBe(2);
		});

		it('should return empty results when no match', async () => {
			const event = mockEvent({ q: 'nonexistent' }, { data: [] });
			const response = await GET(event);
			const body = await response.json();

			expect(body.success).toBe(true);
			expect(body.results).toHaveLength(0);
			expect(body.total).toBe(0);
		});

		it('should call supabase with correct ilike pattern', async () => {
			const event = mockEvent({ q: 'Makati' }, { data: [] });
			await GET(event);

			const fromCall = event.locals.supabase.from as ReturnType<typeof vi.fn>;
			expect(fromCall).toHaveBeenCalledWith('planet_osm_polygon');

			const selectCall = fromCall.mock.results[0].value.select;
			expect(selectCall).toHaveBeenCalledWith('osm_id, name, way');

			const ilikeCall = selectCall.mock.results[0].value.ilike;
			expect(ilikeCall).toHaveBeenCalledWith('name', '%Makati%');
		});

		it('should limit results to 5', async () => {
			const event = mockEvent({ q: 'test' }, { data: [] });
			await GET(event);

			const fromCall = event.locals.supabase.from as ReturnType<typeof vi.fn>;
			const limitCall =
				fromCall.mock.results[0].value.select.mock.results[0].value.ilike.mock.results[0].value
					.limit;
			expect(limitCall).toHaveBeenCalledWith(5);
		});
	});

	describe('error handling', () => {
		it('should return 500 when supabase throws an error', async () => {
			const event = mockEvent({ q: 'test' }, { error: { message: 'Database error' }, data: null });
			const response = await GET(event);
			const body = await response.json();

			expect(response.status).toBe(500);
			expect(body.error).toBe('Failed to perform search');
		});
	});
});
