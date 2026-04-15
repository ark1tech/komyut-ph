import { page } from 'vitest/browser';
import { describe, expect, it, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';

const { gotoMock } = vi.hoisted(() => ({
	gotoMock: vi.fn()
}));

vi.mock('$lib/components/map/Map.svelte', () => import('$lib/components/map/Map.stub.svelte'));

vi.mock('$app/navigation', () => ({
	goto: gotoMock,
	invalidateAll: vi.fn().mockResolvedValue(undefined)
}));

vi.mock('$app/state', () => ({
	page: {
		url: new URL('http://localhost/map'),
		data: { session: null }
	}
}));

import Page from './+page.svelte';

function buildMapPageData() {
	return {
		routeSelectionInvalid: false,
		selectedRoute: null,
		selectedRouteTags: [],
		selectedSubscription: null,
		selectedRouteGeometry: null,
		selectedRouteSource: null,
		traceMode: false
	} as unknown as import('./$types').PageData;
}

/* ════════════════════════════════════════════════════════════════
 * MAP PAGE COMPONENT TESTS
 * ════════════════════════════════════════════════════════════════
 *
 * Tests the /map page which displays:
 *   - Map component
 *   - MapSearchBar (search + preferences: start / end / route name)
 *
 * HOW TO RUN:
 *   pnpm test:unit                → Run all unit + component tests
 *   pnpm test:unit -- --watch     → Watch mode
 *
 * DOCS: https://vitest.dev/guide/browser/
 * ════════════════════════════════════════════════════════════════ */

describe('Map Page', () => {
	describe('layout', () => {
		it('should render the search section', async () => {
			render(Page, { props: { data: buildMapPageData() } });

			const searchSection = page.getByRole('region', { name: 'Search routes on map' });
			await expect.element(searchSection).toBeInTheDocument();
		});

		it('should render the route search input placeholder', async () => {
			render(Page, { props: { data: buildMapPageData() } });

			const input = page.getByPlaceholder('Search by route name or place…');
			await expect.element(input).toBeInTheDocument();
		});

		it('should render the search input as text type', async () => {
			render(Page, { props: { data: buildMapPageData() } });

			const input = page.getByPlaceholder('Search by route name or place…');
			await expect.element(input).toHaveAttribute('type', 'text');
		});

		it('should render search preference controls', async () => {
			render(Page, { props: { data: buildMapPageData() } });

			const group = page.getByRole('radiogroup', {
				name: 'Search match: route name, start location, or end location'
			});
			await expect.element(group).toBeInTheDocument();
		});
	});
});
