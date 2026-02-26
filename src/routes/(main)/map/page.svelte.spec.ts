import { page } from 'vitest/browser';
import { describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-svelte';
import Page from './+page.svelte';

/* ════════════════════════════════════════════════════════════════
 * MAP PAGE COMPONENT TESTS
 * ════════════════════════════════════════════════════════════════
 *
 * Tests the /map page which displays:
 *   - Map component (Leaflet map)
 *   - Search bar with input
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

		it('should render search input with placeholder', async () => {
			render(Page);

			const input = page.getByPlaceholder('Where to komyut?');
			await expect.element(input).toBeInTheDocument();
		});

		it('should render the search input as text type', async () => {
			render(Page);

			const input = page.getByPlaceholder('Where to komyut?');
			await expect.element(input).toHaveAttribute('type', 'text');
		});
	});

	describe('drawer', () => {
		it('should render the drawer trigger button', async () => {
			render(Page);

			const trigger = page.getByText('Open');
			await expect.element(trigger).toBeInTheDocument();
		});
	});
});
