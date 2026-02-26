import { page } from 'vitest/browser';
import { describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-svelte';
import Page from './+page.svelte';

/* ════════════════════════════════════════════════════════════════
 * ROOT PAGE COMPONENT TESTS
 * ════════════════════════════════════════════════════════════════
 *
 * Tests the root / landing page which displays:
 *   - Welcome section with heading
 *   - Introductory text
 *
 * HOW TO RUN:
 *   pnpm test:unit                → Run all unit + component tests
 *   pnpm test:unit -- --watch     → Watch mode
 *
 * DOCS: https://vitest.dev/guide/browser/
 * ════════════════════════════════════════════════════════════════ */

describe('Root Page', () => {
	it('should render the page heading', async () => {
		render(Page);

		const heading = page.getByRole('heading', { level: 1 });
		await expect.element(heading).toBeInTheDocument();
	});

	it('should display "Komyut PH" in the heading', async () => {
		render(Page);

		await expect.element(page.getByText('Komyut PH')).toBeInTheDocument();
	});

	it('should render the welcome section', async () => {
		render(Page);

		const section = page.getByRole('region', { name: 'Welcome' });
		await expect.element(section).toBeInTheDocument();
	});

	it('should display introductory text', async () => {
		render(Page);

		await expect
			.element(page.getByText(/Start building your page here/))
			.toBeInTheDocument();
	});

	it('should mention the file path to edit', async () => {
		render(Page);

		await expect
			.element(page.getByText('src/routes/+page.svelte'))
			.toBeInTheDocument();
	});
});
