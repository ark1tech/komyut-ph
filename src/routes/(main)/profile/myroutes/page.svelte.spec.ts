import { page } from 'vitest/browser';
import { describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-svelte';
import Page from './+page.svelte';

/* ════════════════════════════════════════════════════════════════
 * MY ROUTES PAGE COMPONENT TESTS
 * ════════════════════════════════════════════════════════════════
 *
 * Tests the /profile/myroutes page which displays:
 *   - "My Routes" subpage header with back link
 *   - List of user's saved routes with attributes
 *   - Empty state when user has no routes
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

function buildMyRoutesData(overrides: Record<string, unknown> = {}) {
	return {
		routes: [],
		...overrides
	} as unknown as import('./$types').PageData;
}

describe('My Routes Page', () => {
	describe('layout', () => {
		it('should render the "My Routes" header', async () => {
			render(Page, { props: { data: buildMyRoutesData() } });

			await expect.element(page.getByText('My Routes')).toBeInTheDocument();
		});

		it('should render the my routes section', async () => {
			render(Page, { props: { data: buildMyRoutesData() } });

			const section = page.getByRole('region', { name: 'My routes' });
			await expect.element(section).toBeInTheDocument();
		});

		it('should render back link to profile', async () => {
			render(Page, { props: { data: buildMyRoutesData() } });

			const back = page.getByRole('link', { name: 'Back to profile' });
			await expect.element(back).toBeInTheDocument();
		});
	});

	describe('empty state', () => {
		it('should show "No routes yet" when routes is empty', async () => {
			render(Page, { props: { data: buildMyRoutesData() } });

			await expect.element(page.getByText('No routes yet')).toBeInTheDocument();
		});

		it('should show helper text in empty state', async () => {
			render(Page, { props: { data: buildMyRoutesData() } });

			await expect
				.element(page.getByText(/When you record or trace a route/))
				.toBeInTheDocument();
		});

		it('should show "Explore the map" link in empty state', async () => {
			render(Page, { props: { data: buildMyRoutesData() } });

			await expect.element(page.getByText('Explore the map')).toBeInTheDocument();
		});
	});

	describe('route cards', () => {
		it('should display route name', async () => {
			render(Page, { props: { data: buildMyRoutesData({ routes: [mockRoute] }) } });

			await expect.element(page.getByText('Morning Commute')).toBeInTheDocument();
		});

		it('should display start and end locations', async () => {
			render(Page, { props: { data: buildMyRoutesData({ routes: [mockRoute] }) } });

			await expect.element(page.getByText('Quezon City')).toBeInTheDocument();
			await expect.element(page.getByText('Makati')).toBeInTheDocument();
		});

		it('should display vehicle type tags', async () => {
			render(Page, { props: { data: buildMyRoutesData({ routes: [mockRoute] }) } });

			await expect.element(page.getByText('Jeepney')).toBeInTheDocument();
			await expect.element(page.getByText('MRT')).toBeInTheDocument();
		});

		it('should display PWD-friendly badge when applicable', async () => {
			render(Page, { props: { data: buildMyRoutesData({ routes: [mockRoute] }) } });

			await expect.element(page.getByText('PWD-friendly')).toBeInTheDocument();
		});

		it('should not display PWD-friendly badge when not applicable', async () => {
			const nonPwdRoute = { ...mockRoute, pwd_friendly: false };
			render(Page, { props: { data: buildMyRoutesData({ routes: [nonPwdRoute] }) } });

			await expect.element(page.getByText('PWD-friendly')).not.toBeInTheDocument();
		});

		it('should display estimated time of arrival', async () => {
			render(Page, { props: { data: buildMyRoutesData({ routes: [mockRoute] }) } });

			await expect.element(page.getByText(/45 min/)).toBeInTheDocument();
		});

		it('should display fare', async () => {
			render(Page, { props: { data: buildMyRoutesData({ routes: [mockRoute] }) } });

			await expect.element(page.getByText(/₱50/)).toBeInTheDocument();
		});

		it('should render route as an article', async () => {
			render(Page, { props: { data: buildMyRoutesData({ routes: [mockRoute] }) } });

			const article = page.getByRole('article');
			await expect.element(article).toBeInTheDocument();
		});
	});
});
