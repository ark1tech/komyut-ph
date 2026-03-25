import { page } from 'vitest/browser';
import { describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-svelte';
import Page from './+page.svelte';

/* ════════════════════════════════════════════════════════════════
 * MAP PAGE COMPONENT TESTS
 * ════════════════════════════════════════════════════════════════
 *
 * Tests the /map page which displays:
 *   - Map component
 *   - Search controls with start/end OSM ID inputs
 *   - Drawer with trigger/content
 *
 * HOW TO RUN:
 *   pnpm test:unit                → Run all unit + component tests
 *   pnpm test:unit -- --watch     → Watch mode
 *
 * DOCS: https://vitest.dev/guide/browser/
 * ════════════════════════════════════════════════════════════════ */

describe('Map Page', () => {
	describe('layout', () => {
		it('should render the search bar region', async () => {
			render(Page);

			const searchBar = page.getByRole('region', { name: 'Search Bar' });
			await expect.element(searchBar).toBeInTheDocument();
		});

		it('should render start and end OSM ID input placeholders', async () => {
			render(Page);

			const startInput = page.getByPlaceholder('e.g. 371357222');
			const endInput = page.getByPlaceholder('e.g. 28756784');

			await expect.element(startInput).toBeInTheDocument();
			await expect.element(endInput).toBeInTheDocument();
		});

		it('should render start and end inputs as text type', async () => {
			render(Page);

			const startInput = page.getByPlaceholder('e.g. 371357222');
			const endInput = page.getByPlaceholder('e.g. 28756784');

			await expect.element(startInput).toHaveAttribute('type', 'text');
			await expect.element(endInput).toHaveAttribute('type', 'text');
		});
	});

	describe('drawer', () => {
		it('should render the drawer trigger button', async () => {
			render(Page);

			const trigger = page.getByText('View Routes');
			await expect.element(trigger).toBeInTheDocument();
		});
	});
});
