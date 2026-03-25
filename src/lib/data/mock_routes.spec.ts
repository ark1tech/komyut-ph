import { describe, expect, it } from 'vitest';
import { searchMockCanonicalRouteHits } from './mock_routes';

describe('searchMockCanonicalRouteHits', () => {
	it('matches only start location when preference is start', () => {
		const hits = searchMockCanonicalRouteHits('Quezon', 'start');
		expect(hits.some((h) => h.route_name === 'Morning Commute')).toBe(true);
	});

	it('does not match end-only place when preference is start', () => {
		const hits = searchMockCanonicalRouteHits('Makati', 'start');
		expect(hits.some((h) => h.route_name === 'Morning Commute')).toBe(false);
	});

	it('does not match route name when preference is start', () => {
		const hits = searchMockCanonicalRouteHits('Cubao to Taft', 'start');
		expect(hits.some((h) => h.route_name === 'Cubao to Taft via MRT')).toBe(false);
	});

	it('matches only end location when preference is end', () => {
		const hits = searchMockCanonicalRouteHits('BGC', 'end');
		expect(hits.some((h) => h.end_loc === 'BGC')).toBe(true);
	});

	it('does not match start-only place when preference is end', () => {
		const hits = searchMockCanonicalRouteHits('Quezon', 'end');
		expect(hits.some((h) => h.route_name === 'Morning Commute')).toBe(false);
	});

	it('matches only route name when preference is route_name', () => {
		const hits = searchMockCanonicalRouteHits('Cubao to Taft', 'route_name');
		expect(hits.some((h) => h.route_name === 'Cubao to Taft via MRT')).toBe(true);
	});

	it('does not match start location when preference is route_name', () => {
		const hits = searchMockCanonicalRouteHits('Quezon', 'route_name');
		expect(hits.some((h) => h.route_name === 'Morning Commute')).toBe(false);
	});
});
