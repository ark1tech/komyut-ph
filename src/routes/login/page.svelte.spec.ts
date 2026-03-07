import { page } from 'vitest/browser';
import { describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-svelte';
import Page from './+page.svelte';

/* ════════════════════════════════════════════════════════════════
 * LOGIN PAGE COMPONENT TESTS
 * ════════════════════════════════════════════════════════════════
 *
 * Tests the /login page which displays:
 *   - Logo section (icon + text + tagline)
 *   - Input fields section (email + password)
 *   - Log In button (Google OAuth)
 *   - Log In as Guest button
 *   - Create Account link
 *
 * The page receives data with { supabase, session } from layout.
 *
 * HOW TO RUN:
 *   pnpm test:unit                → Run all unit + component tests
 *   pnpm test:unit -- --watch     → Watch mode
 *
 * DOCS: https://vitest.dev/guide/browser/
 * ════════════════════════════════════════════════════════════════ */

/** Minimal supabase mock for login page */
function mockSupabase() {
	return {
		auth: {
			signInWithOAuth: async () => ({ data: null, error: null }),
			getSession: async () => ({ data: { session: null }, error: null }),
			onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } })
		}
	};
}

function buildLoginData() {
	return {
		supabase: mockSupabase(),
		session: null
	};
}

describe('Login Page', () => {
	describe('layout sections', () => {
		it('should render the logo section', async () => {
			render(Page, { props: { data: buildLoginData() } });

			const logo = page.getByRole('region', { name: 'Logo' });
			await expect.element(logo).toBeInTheDocument();
		});

		it('should render the input fields section', async () => {
			render(Page, { props: { data: buildLoginData() } });

			const fields = page.getByRole('region', { name: 'Input fields' });
			await expect.element(fields).toBeInTheDocument();
		});
	});

	describe('logo section', () => {
		it('should display the Komyut icon image', async () => {
			render(Page, { props: { data: buildLoginData() } });

			const icon = page.getByAltText('Komyut Logo (Blue)');
			await expect.element(icon).toBeInTheDocument();
		});

		it('should display the Komyut text image', async () => {
			render(Page, { props: { data: buildLoginData() } });

			const text = page.getByAltText('Komyut Text (Blue)');
			await expect.element(text).toBeInTheDocument();
		});

		it('should display the tagline', async () => {
			render(Page, { props: { data: buildLoginData() } });

			await expect
				.element(page.getByText('Ang Komyut ng Komyuniti'))
				.toBeInTheDocument();
		});
	});

	describe('form inputs', () => {
		it('should render email input with placeholder', async () => {
			render(Page, { props: { data: buildLoginData() } });

			const email = page.getByPlaceholder('Email');
			await expect.element(email).toBeInTheDocument();
			await expect.element(email).toHaveAttribute('type', 'email');
		});

		it('should render password input with placeholder', async () => {
			render(Page, { props: { data: buildLoginData() } });

			const password = page.getByPlaceholder('Password');
			await expect.element(password).toBeInTheDocument();
			await expect.element(password).toHaveAttribute('type', 'password');
		});
	});

	describe('buttons', () => {
		it('should render the login button', async () => {
			render(Page, { props: { data: buildLoginData() } });

			const btn = page.getByRole('button', { name: 'Login button' });
			await expect.element(btn).toBeInTheDocument();
		});

		it('should display "Log In" text on the button', async () => {
			render(Page, { props: { data: buildLoginData() } });

			await expect.element(page.getByText(/^Log In$/)).toBeInTheDocument();
		});

		it('should render the "Log In as Guest" button', async () => {
			render(Page, { props: { data: buildLoginData() } });

			const guestBtn = page.getByRole('button', { name: 'Log in as guest' });
			await expect.element(guestBtn).toBeInTheDocument();
		});

		it('should display "Create Account" link', async () => {
			render(Page, { props: { data: buildLoginData() } });

			await expect.element(page.getByText('Create Account')).toBeInTheDocument();
		});
	});
});
