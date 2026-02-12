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

describe('unit tests for Login Page', () => {
    it('should render the logo', async () => {
        render(Page);

        const logo = page.getByRole('region', { name: 'Logo' });
        await expect.element(logo).toBeInTheDocument();
    });

    it('should render the input fields', async () => {
        render(Page);

        const inputFields = page.getByRole('region', { name: 'Input fields' });
        await expect.element(inputFields).toBeInTheDocument();
    });

    it('should render the login button', async () => {
        render(Page);

        const loginButton = page.getByRole('button', { name: 'Login button' });
        await expect.element(loginButton).toBeInTheDocument();
    });


    // it('should render the page heading', async () => {
    // 	render(Page);

    // 	const heading = page.getByRole('heading', { level: 1 });
    // 	await expect.element(heading).toBeInTheDocument();
    // });

    // it('should render the welcome section', async () => {
    // 	render(Page);

    // 	const section = page.getByRole('region', { name: 'Welcome' });
    // 	await expect.element(section).toBeInTheDocument();
    // });
});
