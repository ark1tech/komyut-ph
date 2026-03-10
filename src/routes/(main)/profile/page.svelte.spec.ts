import { page } from 'vitest/browser';
import { describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-svelte';
import Page from './+page.svelte';

/* ════════════════════════════════════════════════════════════════
 * PROFILE PAGE COMPONENT TESTS
 * ════════════════════════════════════════════════════════════════
 *
 * Tests the /profile page which displays:
 *   - ProfileCard with user info (name, username, email, avatar, stats)
 *   - Menu sections (My Routes, My Posts, Settings, Help, Privacy)
 *   - Log Out button
 *
 * The page receives data from +page.server.ts:
 *   { supabase, session, user: { full_name, username, email, avatar_url } }
 *
 * HOW TO RUN:
 *   pnpm test:unit                → Run all unit + component tests
 *   pnpm test:unit -- --watch     → Watch mode
 *
 * DOCS: https://vitest.dev/guide/browser/
 * ════════════════════════════════════════════════════════════════ */

/** Minimal supabase mock to prevent runtime errors */
function mockSupabase() {
	return {
		auth: {
			signOut: async () => ({ error: null }),
			getSession: async () => ({ data: { session: null }, error: null }),
			onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } })
		}
	};
}

function buildProfileData(overrides: Record<string, unknown> = {}) {
	return {
		supabase: mockSupabase(),
		session: { user: { id: 'test-uid' } },
		unreadForum: 0,
		unreadRoutes: 0,
		user: {
			full_name: 'Sarah Martinez',
			username: 'sarahm',
			email: 'sarah.martinez@email.com',
			avatar_url: ''
		},
		...overrides
	} as unknown as import('./$types').PageData;
}

describe('Profile Page', () => {
	describe('layout sections', () => {
		it('should render the profile header region', async () => {
			render(Page, { props: { data: buildProfileData() } });

			const header = page.getByRole('region', { name: 'Profile Header' });
			await expect.element(header).toBeInTheDocument();
		});

		it('should render the user information region', async () => {
			render(Page, { props: { data: buildProfileData() } });

			const userInfo = page.getByRole('region', { name: 'User Information' });
			await expect.element(userInfo).toBeInTheDocument();
		});

		it('should render the user stats region', async () => {
			render(Page, { props: { data: buildProfileData() } });

			const userStats = page.getByRole('region', { name: 'User Stats' });
			await expect.element(userStats).toBeInTheDocument();
		});

		it('should render the menu sections region', async () => {
			render(Page, { props: { data: buildProfileData() } });

			const menuSections = page.getByRole('region', { name: 'Menu Sections' });
			await expect.element(menuSections).toBeInTheDocument();
		});
	});

	describe('user info display', () => {
		it('should display the user full name', async () => {
			render(Page, { props: { data: buildProfileData() } });

			await expect.element(page.getByText('Sarah Martinez')).toBeInTheDocument();
		});

		it('should display the username with @ prefix', async () => {
			render(Page, { props: { data: buildProfileData() } });

			await expect.element(page.getByText('@sarahm')).toBeInTheDocument();
		});

		it('should display the user email', async () => {
			render(Page, { props: { data: buildProfileData() } });

			await expect.element(page.getByText('sarah.martinez@email.com')).toBeInTheDocument();
		});

		it('should display Guest when no session', async () => {
			const guestData = buildProfileData({ session: null, user: null });
			render(Page, { props: { data: guestData } });

			await expect
				.element(page.getByRole('heading', { level: 1, name: 'Guest' }))
				.toBeInTheDocument();
		});
	});

	describe('menu items', () => {
		it('should display My Routes link', async () => {
			render(Page, { props: { data: buildProfileData() } });

			await expect.element(page.getByText('My Routes')).toBeInTheDocument();
		});

		it('should display My Posts link', async () => {
			render(Page, { props: { data: buildProfileData() } });

			await expect.element(page.getByText('My Posts')).toBeInTheDocument();
		});

		it('should display Settings link', async () => {
			render(Page, { props: { data: buildProfileData() } });

			await expect.element(page.getByText('Settings')).toBeInTheDocument();
		});

		it('should display Help & Support link', async () => {
			render(Page, { props: { data: buildProfileData() } });

			await expect.element(page.getByText('Help & Support')).toBeInTheDocument();
		});

		it('should display Privacy link', async () => {
			render(Page, { props: { data: buildProfileData() } });

			await expect.element(page.getByText('Privacy')).toBeInTheDocument();
		});

		it('should display Log Out link', async () => {
			render(Page, { props: { data: buildProfileData() } });

			await expect.element(page.getByText('Log Out')).toBeInTheDocument();
		});

		it('should link My Routes to /profile/myroutes', async () => {
			render(Page, { props: { data: buildProfileData() } });

			const link = page.getByRole('link', { name: /My Routes/ });
			await expect.element(link).toHaveAttribute('href', '/profile/myroutes');
		});

		it('should link My Posts to /profile/myposts', async () => {
			render(Page, { props: { data: buildProfileData() } });

			const link = page.getByRole('link', { name: /My Posts/ });
			await expect.element(link).toHaveAttribute('href', '/profile/myposts');
		});
	});
});
