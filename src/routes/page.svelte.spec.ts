import { page } from 'vitest/browser';
import { describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-svelte';
import Page from './+page.svelte';

/* ════════════════════════════════════════════════════════════════
 * PAGE COMPONENT TESTS (Vitest + Playwright Browser Mode)
 * ════════════════════════════════════════════════════════════════
 *
 * This file tests +page.svelte in isolation using Vitest's browser
 * mode with Playwright as the browser provider.
 *
 * FILE NAMING CONVENTIONS:
 *   *.svelte.spec.ts  → Component tests (run in real browser via Playwright)
 *   *.spec.ts         → Unit tests (run in Node.js environment)
 *   e2e/*.test.ts     → End-to-end tests (full Playwright, see e2e/ folder)
 *
 * HOW TO RUN:
 *   pnpm test:unit                → Run all unit + component tests
 *   pnpm test:unit -- --watch     → Watch mode (re-runs on file changes)
 *   pnpm test:unit -- --reporter=verbose  → Detailed output
 *
 * KEY TESTING APIs:
 *   render(Component, { props })  → Mount Svelte component in real browser
 *   page.getByRole(role, opts)    → Query by ARIA role (preferred method)
 *   page.getByText(text)          → Query by visible text content
 *   page.getByTestId(id)          → Query by data-testid attribute
 *   expect.element(el)            → Assert on DOM elements
 *   await el.click()              → Simulate user interaction
 *
 * TESTING BEST PRACTICES:
 *   - Query by role first (getByRole), then text, then testId
 *   - Test behavior, not implementation details
 *   - Each test should be independent (no shared state)
 *   - Name tests by what the USER should see/experience
 *
 * DOCS: https://vitest.dev/guide/browser/
 * ════════════════════════════════════════════════════════════════ */

describe('+page.svelte', () => {
	it('should render the page heading', async () => {
		render(Page);

		const heading = page.getByRole('heading', { level: 1 });
		await expect.element(heading).toBeInTheDocument();
	});

	it('should render the welcome section', async () => {
		render(Page);

		const section = page.getByRole('region', { name: 'Welcome' });
		await expect.element(section).toBeInTheDocument();
	});

	/* ── Add your tests below ──────────────────────────────────
	 *
	 * EXAMPLE — Testing a button interaction:
	 *
	 * it('should open the search modal on button click', async () => {
	 *   render(Page);
	 *
	 *   const button = page.getByRole('button', { name: 'Search Routes' });
	 *   await button.click();
	 *
	 *   const modal = page.getByRole('dialog', { name: 'Search' });
	 *   await expect.element(modal).toBeVisible();
	 * });
	 *
	 * EXAMPLE — Testing with props (from load function):
	 *
	 * it('should display route data', async () => {
	 *   const mockData = {
	 *     data: {
	 *       routes: [{ name: 'EDSA Busway', status: 'active' }]
	 *     }
	 *   };
	 *   render(Page, { props: mockData });
	 *
	 *   await expect.element(page.getByText('EDSA Busway')).toBeInTheDocument();
	 * });
	 *
	 * EXAMPLE — Testing responsive visibility:
	 *
	 * it('should show mobile CTA on small screens', async () => {
	 *   render(Page);
	 *
	 *   const cta = page.getByRole('link', { name: 'Get Started' });
	 *   await expect.element(cta).toBeVisible();
	 * });
	 * ────────────────────────────────────────────────────────── */
});
