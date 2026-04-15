import { beforeEach, describe, expect, it, vi } from 'vitest';
import { invalidateCache } from '$lib/server/cache';
import { GET, POST } from './+server';

/* ════════════════════════════════════════════════════════════════
 * API UNIT TESTS — /api/map/routes
 * ════════════════════════════════════════════════════════════════
 *
 * Tests the GET handler for route lookup:
 *   - Returns 400 for missing/empty start/end params
 *   - Returns matching routes from supabase
 *   - Returns 500 on supabase error
 *   - Uses provided start and end locations
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
function mockEvent(
	queryParams: Record<string, string> = {},
	supabaseOverrides: Record<string, unknown> = {}
) {
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
		locals: { supabase },
		setHeaders: vi.fn()
	} as unknown as Parameters<typeof GET>[0];
}

describe('GET /api/map/routes', () => {
	beforeEach(() => {
		invalidateCache('map:routes:');
	});

	describe('input validation', () => {
		it('should return 400 when start param is missing', async () => {
			const event = mockEvent({ end: '123456' });

			await expect(GET(event)).rejects.toThrow();
		});

		it('should return 400 when end param is missing', async () => {
			const event = mockEvent({ start: '371357222' });

			await expect(GET(event)).rejects.toThrow();
		});

		it('should return 400 when start param is empty string', async () => {
			const event = mockEvent({ start: '', end: '123456' });

			await expect(GET(event)).rejects.toThrow();
		});

		it('should return 400 when end param is empty string', async () => {
			const event = mockEvent({ start: '371357222', end: '' });

			await expect(GET(event)).rejects.toThrow();
		});

		it('should return 400 when start param is only whitespace', async () => {
			const event = mockEvent({ start: '   ', end: '123456' });

			await expect(GET(event)).rejects.toThrow();
		});

		it('should return 400 when end param is only whitespace', async () => {
			const event = mockEvent({ start: '371357222', end: '   ' });

			await expect(GET(event)).rejects.toThrow();
		});
	});

	describe('successful route lookups', () => {
		it('should return routes for valid start and end locations', async () => {
			const mockResults = [
				{ route_id: 1, geometry: '{"type":"LineString","coordinates":[[0,0],[1,1]]}' }
			];

			const event = mockEvent({ start: '371357222', end: '123456' }, { data: mockResults });
			const response = await GET(event);
			const body = await response.json();

			expect(body.success).toBe(true);
			expect(body.results).toHaveLength(1);
		});

		it('should return empty results when no routes found', async () => {
			const event = mockEvent({ start: '371357222', end: '999999' }, { data: [] });
			const response = await GET(event);
			const body = await response.json();

			expect(body.success).toBe(true);
			expect(body.results).toHaveLength(0);
		});

		it('should query supabase with provided start_loc and end_loc', async () => {
			const event = mockEvent({ start: '371357222', end: '123456' }, { data: [] });
			await GET(event);

			const fromCall = event.locals.supabase.from as ReturnType<typeof vi.fn>;
			expect(fromCall).toHaveBeenCalledWith('route');

			const selectCall = fromCall.mock.results[0].value.select;
			expect(selectCall).toHaveBeenCalledWith('route_id, geometry');

			// First .eq() is start_loc_osmid (schema transforms string -> number)
			const firstEq = selectCall.mock.results[0].value.eq;
			expect(firstEq).toHaveBeenCalledWith('start_loc_osmid', 371357222);

			// Second .eq() is end_loc_osmid (schema transforms string -> number)
			const secondEq = firstEq.mock.results[0].value.eq;
			expect(secondEq).toHaveBeenCalledWith('end_loc_osmid', 123456);
		});

		it('should return multiple routes when available', async () => {
			const mockResults = [
				{ route_id: 1, geometry: '...' },
				{ route_id: 2, geometry: '...' },
				{ route_id: 3, geometry: '...' }
			];

			const event = mockEvent({ start: '371357222', end: '123456' }, { data: mockResults });
			const response = await GET(event);
			const body = await response.json();

			expect(body.success).toBe(true);
			expect(body.results).toHaveLength(3);
		});
	});

	describe('error handling', () => {
		it('should return 500 when supabase throws an error', async () => {
			const event = mockEvent(
				{ start: '371357222', end: '123456' },
				{ error: { message: 'Database error' }, data: null }
			);
			const response = await GET(event);
			const body = await response.json();

			expect(body.error).toBe('failed to view routes');
		});
	});
});

type MockPostEvent = Parameters<typeof POST>[0] & {
	_tagSelectIn: ReturnType<typeof vi.fn>;
	_routeTagInsert: ReturnType<typeof vi.fn>;
};

/**
 * Creates a mock RequestEvent for the POST handler
 */
function mockPostEvent(body: unknown, supabaseOverrides: Record<string, unknown> = {}) {
	const mockData = supabaseOverrides.data ?? { route_id: 1 };
	const mockError = supabaseOverrides.error ?? null;
	const mockTagLookupError = supabaseOverrides.tagLookupError ?? null;
	const mockTagRows =
		supabaseOverrides.tagRows ??
		[
			{ tag_id: 1, text: 'pwd-friendly' },
			{ tag_id: 2, text: 'under-50-pesos' }
		];
	const mockRouteTagInsertError = supabaseOverrides.routeTagInsertError ?? null;
	const mockTagInsertError = supabaseOverrides.tagInsertError ?? null;

	const routeInsert = vi.fn().mockReturnValue({
		select: vi.fn().mockReturnValue({
			single: vi.fn().mockResolvedValue({
				data: mockData,
				error: mockError
			})
		})
	});

	const tagSelectIn =
		(supabaseOverrides.tagSelectIn as ReturnType<typeof vi.fn> | undefined) ??
		vi.fn().mockResolvedValue({
			data: mockTagRows,
			error: mockTagLookupError
		});
	const tagSelect = vi.fn().mockReturnValue({ in: tagSelectIn });
	const tagInsert = vi.fn().mockResolvedValue({ error: mockTagInsertError });
	const routeTagInsert = vi.fn().mockResolvedValue({ error: mockRouteTagInsertError });

	const supabase = {
		from: vi.fn((table: string) => {
			if (table === 'route') return { insert: routeInsert };
			if (table === 'tag') return { select: tagSelect, insert: tagInsert };
			if (table === 'route_tag') return { insert: routeTagInsert };
			throw new Error(`Unexpected table: ${table}`);
		})
	};

	return {
		request: {
			json: async () => body
		},
		locals: { supabase },
		_tagSelectIn: tagSelectIn,
		_routeTagInsert: routeTagInsert
	} as unknown as MockPostEvent;
}

function buildValidRouteCreateBody(overrides: Record<string, unknown> = {}) {
	return {
		route_name: 'Cubao to Alabang',
		start_loc: 'Cubao',
		end_loc: 'Alabang',
		vehicle_types: ['Bus', 'Jeepney'],
		pwd_friendly: true,
		est_time_of_arrival: 45,
		fare: 35,
		start_loc_osmid: 100,
		end_loc_osmid: 200,
		geometry: {
			type: 'LineString',
			coordinates: [
				[0, 0],
				[1, 1]
			]
		},
		...overrides
	};
}

describe('POST /api/map/routes', () => {
	describe('input validation', () => {
		it('should return 400 when body is missing required fields', async () => {
			const event = mockPostEvent({});

			await expect(POST(event)).rejects.toThrow();
		});

		it('should return 400 when vehicle types include an unsupported value', async () => {
			const event = mockPostEvent(buildValidRouteCreateBody({ vehicle_types: ['MRT'] }));

			await expect(POST(event)).rejects.toThrow();
		});

		it('should return 400 when geometry has fewer than 2 points', async () => {
			const event = mockPostEvent({
				...buildValidRouteCreateBody(),
				start_loc_osmid: 1,
				end_loc_osmid: 2,
				geometry: { type: 'LineString', coordinates: [[0, 0]] }
			});

			await expect(POST(event)).rejects.toThrow();
		});

		it('should return 400 when geometry type is not LineString', async () => {
			const event = mockPostEvent({
				...buildValidRouteCreateBody(),
				start_loc_osmid: 1,
				end_loc_osmid: 2,
				geometry: { type: 'Point', coordinates: [0, 0] }
			});

			await expect(POST(event)).rejects.toThrow();
		});
	});

	describe('successful creation', () => {
		it('should create a route and return 201', async () => {
			const event = mockPostEvent(buildValidRouteCreateBody(), { data: { route_id: 42 } });
			const response = await POST(event);
			const body = await response.json();

			expect(response.status).toBe(201);
			expect(body.success).toBe(true);
			expect(body.route_id).toBe(42);
		});

		it('should call supabase insert with correct data', async () => {
			const event = mockPostEvent(buildValidRouteCreateBody(), { data: { route_id: 1 } });
			await POST(event);

			const fromCall = event.locals.supabase.from as ReturnType<typeof vi.fn>;
			expect(fromCall).toHaveBeenCalledWith('route');

			const insertCall = fromCall.mock.results[0].value.insert;
			expect(insertCall).toHaveBeenCalledWith({
				route_name: 'Cubao to Alabang',
				start_loc: 'Cubao',
				end_loc: 'Alabang',
				vehicle_types: ['Bus', 'Jeepney'],
				pwd_friendly: true,
				est_time_of_arrival: 45,
				fare: 35,
				start_loc_osmid: 100,
				end_loc_osmid: 200,
				geometry: {
					type: 'LineString',
					coordinates: [
						[0, 0],
						[1, 1]
					]
				}
			});
		});

		it('should attach tags when route_tags are provided during route creation', async () => {
			const event = mockPostEvent(
				buildValidRouteCreateBody({ route_tags: ['pwd-friendly', 'under-50-pesos'] }),
				{ data: { route_id: 77 } }
			);

			await POST(event);

			expect(event._tagSelectIn).toHaveBeenCalledWith('text', [
				'pwd-friendly',
				'under-50-pesos'
			]);
			expect(event._routeTagInsert).toHaveBeenCalledWith([
				{ route_id: 77, tag_id: 1 },
				{ route_id: 77, tag_id: 2 }
			]);
		});
	});

	describe('error handling', () => {
		it('should return 500 when supabase insert fails', async () => {
			const event = mockPostEvent(buildValidRouteCreateBody(), {
				error: { message: 'Insert failed' },
				data: null
			});
			const response = await POST(event);
			const body = await response.json();

			expect(body.error).toBe('failed to create route');
		});

		it('should return 400 when route tags cannot be resolved after ensure', async () => {
			const tagSelectIn = vi
				.fn()
				.mockResolvedValueOnce({ data: [], error: null })
				.mockResolvedValueOnce({ data: [], error: null });

			const event = mockPostEvent(
				buildValidRouteCreateBody({ route_tags: ['pwd-friendly'] }),
				{
					data: { route_id: 88 },
					tagRows: [],
					tagSelectIn,
					tagInsertError: null
				}
			);
			const response = await POST(event);
			const body = await response.json();

			expect(response.status).toBe(400);
			expect(body.error).toBe('failed to create route tags');
		});
	});
});
