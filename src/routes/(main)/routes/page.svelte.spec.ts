import { page } from 'vitest/browser';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';

const { gotoMock } = vi.hoisted(() => ({
	gotoMock: vi.fn()
}));

vi.mock('$app/navigation', () => ({
	goto: gotoMock
}));

vi.mock('$app/state', () => ({
	page: {
		url: new URL('http://localhost/routes?page=1')
	}
}));

import Page from './+page.svelte';

/* ════════════════════════════════════════════════════════════════
 * ROUTES PAGE COMPONENT TESTS
 * ════════════════════════════════════════════════════════════════
 *
 * Tests the /routes page which displays:
 *   - Recents / Saved toggle (radiogroup)
 *   - Route cards with name, locations, attributes
	*   - Empty route list behavior
	*   - Pagination state updates when switching views
 *
 * HOW TO RUN:
 *   pnpm test:unit                → Run all unit + component tests
 *   pnpm test:unit -- --watch     → Watch mode
 *
 * DOCS: https://vitest.dev/guide/browser/
 * ════════════════════════════════════════════════════════════════ */

const mockRoute = {
	saved_route_id: 1,
	route_name: 'Morning Commute',
	start_loc: 'Quezon City',
	end_loc: 'Makati',
	vehicle_types: ['Jeepney', 'MRT'],
	pwd_friendly: true,
	est_time_of_arrival: 45,
	fare: 50,
	created_at: '2024-01-10T08:00:00Z'
};

function buildRoutesData(overrides: Record<string, unknown> = {}) {
	return {
		recentRoutes: [],
		savedRoutes: [],
		unreadRouteAlerts: 0,
		...overrides
	} as unknown as import('./$types').PageData;
}

describe('Routes Page', () => {
	beforeEach(() => {
		gotoMock.mockReset();
	});

	describe('layout', () => {
		it('should render the routes section', async () => {
			render(Page, { props: { data: buildRoutesData() } });

			const section = page.getByRole('region', { name: 'Routes' });
			await expect.element(section).toBeInTheDocument();
		});
	});

	describe('view toggle', () => {
		it('should render Recents toggle button', async () => {
			render(Page, { props: { data: buildRoutesData() } });

			const recents = page.getByRole('radio', { name: /Recents/ });
			await expect.element(recents).toBeInTheDocument();
		});

		it('should render Saved toggle button', async () => {
			render(Page, { props: { data: buildRoutesData() } });

			const saved = page.getByRole('radio', { name: /Saved/ });
			await expect.element(saved).toBeInTheDocument();
		});

		it('should default to Recents view', async () => {
			render(Page, { props: { data: buildRoutesData() } });

			const recents = page.getByRole('radio', { name: /Recents/ });
			await expect.element(recents).toHaveAttribute('aria-checked', 'true');
		});

		it('should switch to Saved view on click', async () => {
			render(Page, { props: { data: buildRoutesData() } });

			const saved = page.getByRole('radio', { name: /Saved/ });
			await saved.click();
			await expect.element(saved).toHaveAttribute('aria-checked', 'true');
			expect(gotoMock).toHaveBeenCalledWith('?page=1', { keepFocus: true, noScroll: true });
		});

		it('should render "Routes list" radiogroup', async () => {
			render(Page, { props: { data: buildRoutesData() } });

			const group = page.getByRole('radiogroup', { name: 'Routes list' });
			await expect.element(group).toBeInTheDocument();
		});
	});

	describe('empty state', () => {
		it('should render no route cards when recentRoutes is empty', async () => {
			render(Page, { props: { data: buildRoutesData() } });

			await expect.element(page.getByRole('region', { name: 'Routes' })).toBeInTheDocument();
			await expect.element(page.getByRole('article').first()).not.toBeInTheDocument();
		});

		it('should render no route cards when savedRoutes is empty', async () => {
			render(Page, { props: { data: buildRoutesData() } });

			const saved = page.getByRole('radio', { name: /Saved/ });
			await saved.click();

			await expect.element(page.getByRole('article').first()).not.toBeInTheDocument();
		});

		it('should clear recent route cards after switching to an empty saved list', async () => {
			render(
				Page,
				{ props: { data: buildRoutesData({ recentRoutes: [mockRoute], savedRoutes: [] }) } }
			);

			await expect.element(page.getByText('Morning Commute')).toBeInTheDocument();

			const saved = page.getByRole('radio', { name: /Saved/ });
			await saved.click();

			await expect.element(page.getByText('Morning Commute')).not.toBeInTheDocument();
		});
	});

	describe('route cards', () => {
		it('should display route name', async () => {
			render(Page, { props: { data: buildRoutesData({ recentRoutes: [mockRoute] }) } });

			await expect.element(page.getByText('Morning Commute')).toBeInTheDocument();
		});

		it('should display start and end locations', async () => {
			render(Page, { props: { data: buildRoutesData({ recentRoutes: [mockRoute] }) } });

			await expect.element(page.getByText('Quezon City')).toBeInTheDocument();
			await expect.element(page.getByText('Makati')).toBeInTheDocument();
		});

		it('should display vehicle type tags', async () => {
			render(Page, { props: { data: buildRoutesData({ recentRoutes: [mockRoute] }) } });

			await expect.element(page.getByText('Jeepney')).toBeInTheDocument();
			await expect.element(page.getByText('MRT')).toBeInTheDocument();
		});

		it('should display PWD-friendly badge when applicable', async () => {
			render(Page, { props: { data: buildRoutesData({ recentRoutes: [mockRoute] }) } });

			await expect.element(page.getByText('PWD-friendly')).toBeInTheDocument();
		});

		it('should display estimated time of arrival', async () => {
			render(Page, { props: { data: buildRoutesData({ recentRoutes: [mockRoute] }) } });

			await expect.element(page.getByText(/45 min/)).toBeInTheDocument();
		});

		it('should display fare', async () => {
			render(Page, { props: { data: buildRoutesData({ recentRoutes: [mockRoute] }) } });

			await expect.element(page.getByText(/₱50/)).toBeInTheDocument();
		});
	});

});
