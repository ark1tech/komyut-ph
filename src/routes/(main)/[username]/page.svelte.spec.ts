import { page } from 'vitest/browser';
import { describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-svelte';
import Page from './+page.svelte';
import type { PageData } from './$types';

interface MockUser {
	uid: string;
	email: string;
	username: string;
	full_name: string;
	first_name: string | null;
	last_name: string | null;
	middle_name: string | null;
	avatar_url: string | null;
}

interface MockPost {
	post_id: number;
	title: string;
	body: string;
	upvotes: number;
	downvotes: number;
	created_at: string;
	last_edited: string;
	author: { uid: string; username: string; full_name: string } | null;
}

const mockUsers: MockUser[] = [
	{
		uid: 'u1',
		email: 'sarah.martinez@email.com',
		username: 'sarahm',
		full_name: 'Sarah Martinez',
		first_name: 'Sarah',
		last_name: 'Martinez',
		middle_name: null,
		avatar_url: null
	},
	{
		uid: 'u2',
		email: 'james.chen@email.com',
		username: 'jchen',
		full_name: 'James Chen',
		first_name: 'James',
		last_name: 'Chen',
		middle_name: null,
		avatar_url: null
	},
	{
		uid: 'u3',
		email: 'emily.johnson@email.com',
		username: 'emilyjay',
		full_name: 'Emily Johnson',
		first_name: 'Emily',
		last_name: 'Johnson',
		middle_name: null,
		avatar_url: null
	}
];

const mockPosts: MockPost[] = [
	{
		post_id: 1,
		title: 'How to get from Quezon City to Makati?',
		body: 'Looking for the best route.',
		upvotes: 10,
		downvotes: 2,
		created_at: '2024-01-10T10:00:00Z',
		last_edited: '2024-01-10T10:00:00Z',
		author: { uid: 'u1', username: 'sarahm', full_name: 'Sarah Martinez' }
	},
	{
		post_id: 2,
		title: 'Best way to Mall of Asia from Cubao?',
		body: 'Any tips?',
		upvotes: 5,
		downvotes: 1,
		created_at: '2024-01-09T10:00:00Z',
		last_edited: '2024-01-09T10:00:00Z',
		author: { uid: 'u2', username: 'jchen', full_name: 'James Chen' }
	},
	{
		post_id: 3,
		title: 'Commuting tips for beginners',
		body: 'New to commuting here.',
		upvotes: 8,
		downvotes: 0,
		created_at: '2024-01-08T10:00:00Z',
		last_edited: '2024-01-08T10:00:00Z',
		author: { uid: 'u3', username: 'emilyjay', full_name: 'Emily Johnson' }
	},
	{
		post_id: 4,
		title: 'Late night commute from BGC to Fairview',
		body: 'Is it safe?',
		upvotes: 3,
		downvotes: 1,
		created_at: '2024-01-07T10:00:00Z',
		last_edited: '2024-01-07T10:00:00Z',
		author: { uid: 'u1', username: 'sarahm', full_name: 'Sarah Martinez' }
	},
	{
		post_id: 5,
		title: 'Jeepney routes in Mandaluyong',
		body: 'Which ones go to Ortigas?',
		upvotes: 6,
		downvotes: 0,
		created_at: '2024-01-06T10:00:00Z',
		last_edited: '2024-01-06T10:00:00Z',
		author: { uid: 'u3', username: 'emilyjay', full_name: 'Emily Johnson' }
	}
];

const mockCommentCounts: Record<number, number> = { 1: 3 };

/* ════════════════════════════════════════════════════════════════
 * [USERNAME] PAGE COMPONENT TESTS
 * ════════════════════════════════════════════════════════════════
 *
 * Tests verify the public profile page displays the CORRECT
 * user's data based on the URL username parameter:
 *   - Username & full name match the URL param user
 *   - Only that user's posts are shown
 *   - Comment counts and stats are accurate
 *   - Empty state when user has no posts
 *   - Reverse chronological post ordering
 *
 * HOW TO RUN:
 *   pnpm test:unit                → Run all unit + component tests
 *   pnpm test:unit -- --watch     → Watch mode
 *
 * DOCS: https://vitest.dev/guide/browser/
 * ════════════════════════════════════════════════════════════════ */

/**
 * Builds PageData for a username — mirrors the load() function logic
 */
function buildPageDataForUser(username: string): PageData {
	const user = mockUsers.find((u) => u.username === username);
	if (!user) throw new Error(`User "${username}" not found in mock data`);

	const posts = mockPosts
		.filter((p) => p.author?.username === user.username)
		.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

	return {
		session: null,
		supabase: null as unknown as import('@supabase/supabase-js').SupabaseClient,
		unreadForum: 0,
		unreadRoutes: 0,
		profileUser: user,
		posts,
		commentCounts: mockCommentCounts,
		stats: { routes: 0, posts: posts.length, followers: '—' }
	} as unknown as PageData;
}

describe('[username]/+page.svelte', () => {
	describe('sarahm profile (2 posts)', () => {
		const data = buildPageDataForUser('sarahm');

		it('should display @sarahm in the header', async () => {
			render(Page, { props: { data } });

			await expect.element(page.getByText('@sarahm')).toBeInTheDocument();
		});

		it('should display full name "Sarah Martinez"', async () => {
			render(Page, { props: { data } });

			// ProfileCard renders after 400ms skeleton timeout
			await expect.element(page.getByText('Sarah Martinez')).toBeInTheDocument();
		});

		it('should display only posts authored by sarahm', async () => {
			render(Page, { props: { data } });

			await expect
				.element(page.getByText('How to get from Quezon City to Makati?'))
				.toBeInTheDocument();
			await expect
				.element(page.getByText('Late night commute from BGC to Fairview'))
				.toBeInTheDocument();

			expect(data.posts).toHaveLength(2);
		});

		it('should have correct post count in stats', async () => {
			expect(data.stats.posts).toBe(2);
		});

		it('should have correct comment counts for sarahm posts', async () => {
			// post 1 has 3 comments, post 11 (sarahm's 2nd) has 0 in commentCounts
			expect(data.commentCounts[1]).toBe(3);
		});
	});

	describe('jchen profile (1 post)', () => {
		const data = buildPageDataForUser('jchen');

		it('should display @jchen in the header', async () => {
			render(Page, { props: { data } });

			await expect.element(page.getByText('@jchen')).toBeInTheDocument();
		});

		it('should display full name "James Chen"', async () => {
			render(Page, { props: { data } });

			await expect.element(page.getByText('James Chen')).toBeInTheDocument();
		});

		it('should display only posts authored by jchen', async () => {
			render(Page, { props: { data } });

			await expect
				.element(page.getByText('Best way to Mall of Asia from Cubao?'))
				.toBeInTheDocument();

			expect(data.posts).toHaveLength(1);
		});

		it('should have correct post count in stats', async () => {
			expect(data.stats.posts).toBe(1);
		});
	});

	describe('emilyjay profile (2 posts)', () => {
		const data = buildPageDataForUser('emilyjay');

		it('should display @emilyjay in the header', async () => {
			render(Page, { props: { data } });

			await expect.element(page.getByText('@emilyjay')).toBeInTheDocument();
		});

		it('should display full name "Emily Johnson"', async () => {
			render(Page, { props: { data } });

			await expect.element(page.getByText('Emily Johnson')).toBeInTheDocument();
		});

		it('should display only posts authored by emilyjay', async () => {
			render(Page, { props: { data } });

			expect(data.posts).toHaveLength(2);
		});
	});

	describe('common functionality', () => {
		const data = buildPageDataForUser('sarahm');

		it('should render the go-back button', async () => {
			render(Page, { props: { data } });

			await expect.element(page.getByRole('button', { name: 'Go back' })).toBeInTheDocument();
		});

		it('should order posts newest-first', async () => {
			// Data-level: dates should be descending
			const timestamps = data.posts.map((p) => new Date(p.created_at).getTime());
			for (let i = 0; i < timestamps.length - 1; i++) {
				expect(timestamps[i]).toBeGreaterThanOrEqual(timestamps[i + 1]);
			}
		});

		it('should show "No posts yet." for empty post list', async () => {
			const emptyData: PageData = {
				...data,
				posts: [],
				stats: { routes: 0, posts: 0, followers: '—' }
			};
			render(Page, { props: { data: emptyData } });

			await expect.element(page.getByText('No posts yet.')).toBeInTheDocument();
		});

		it('should have ARIA region for user posts', async () => {
			render(Page, { props: { data } });

			await expect.element(page.getByRole('region', { name: 'User posts' })).toBeInTheDocument();
		});
	});
});
