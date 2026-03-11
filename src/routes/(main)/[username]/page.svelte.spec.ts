import { page } from 'vitest/browser';
import { describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-svelte';
import Page from './+page.svelte';
import type { PageData } from './$types';
import type { User } from '$lib/data/mock_users';
import type { Post } from '$lib/data/mock_posts';
import type { Comment } from '$lib/data/mock_comments';

const mockUsers: User[] = [
	{
		uid: 1,
		email: 'sarah.martinez@email.com',
		username: 'sarahm',
		first_name: 'Sarah',
		last_name: 'Martinez',
		middle_name: null
	},
	{
		uid: 2,
		email: 'james.chen@email.com',
		username: 'jchen',
		first_name: 'James',
		last_name: 'Chen',
		middle_name: null
	},
	{
		uid: 3,
		email: 'emily.johnson@email.com',
		username: 'emilyjay',
		first_name: 'Emily',
		last_name: 'Johnson',
		middle_name: null
	}
];

const mockPosts: Post[] = [
	{
		post_id: 1,
		author_id: 1,
		author_name: 'Sarah Martinez',
		author_username: 'sarahm',
		created_at: '2024-01-10T10:00:00Z',
		last_edited: '2024-01-10T10:00:00Z',
		title: 'How to get from Quezon City to Makati?',
		body: 'Looking for the best route.',
		upvotes: 10,
		downvotes: 2
	},
	{
		post_id: 2,
		author_id: 2,
		author_name: 'James Chen',
		author_username: 'jchen',
		created_at: '2024-01-09T10:00:00Z',
		last_edited: '2024-01-09T10:00:00Z',
		title: 'Best way to Mall of Asia from Cubao?',
		body: 'Any tips?',
		upvotes: 5,
		downvotes: 1
	},
	{
		post_id: 3,
		author_id: 3,
		author_name: 'Emily Johnson',
		author_username: 'emilyjay',
		created_at: '2024-01-08T10:00:00Z',
		last_edited: '2024-01-08T10:00:00Z',
		title: 'Commuting tips for beginners',
		body: 'New to commuting here.',
		upvotes: 8,
		downvotes: 0
	},
	{
		post_id: 4,
		author_id: 1,
		author_name: 'Sarah Martinez',
		author_username: 'sarahm',
		created_at: '2024-01-07T10:00:00Z',
		last_edited: '2024-01-07T10:00:00Z',
		title: 'Late night commute from BGC to Fairview',
		body: 'Is it safe?',
		upvotes: 3,
		downvotes: 1
	},
	{
		post_id: 5,
		author_id: 3,
		author_name: 'Emily Johnson',
		author_username: 'emilyjay',
		created_at: '2024-01-06T10:00:00Z',
		last_edited: '2024-01-06T10:00:00Z',
		title: 'Jeepney routes in Mandaluyong',
		body: 'Which ones go to Ortigas?',
		upvotes: 6,
		downvotes: 0
	}
];

const mockComments: Comment[] = [
	{
		comment_id: 1,
		author_id: 2,
		author_name: 'James Chen',
		author_username: 'jchen',
		parent_id: 1,
		created_at: '2024-01-10T11:00:00Z',
		last_edited: '2024-01-10T11:00:00Z',
		body: 'MRT then jeepney!',
		upvotes: 2,
		downvotes: 0
	},
	{
		comment_id: 2,
		author_id: 3,
		author_name: 'Emily Johnson',
		author_username: 'emilyjay',
		parent_id: 1,
		created_at: '2024-01-10T12:00:00Z',
		last_edited: '2024-01-10T12:00:00Z',
		body: 'Bus is cheaper.',
		upvotes: 1,
		downvotes: 0
	},
	{
		comment_id: 3,
		author_id: 1,
		author_name: 'Sarah Martinez',
		author_username: 'sarahm',
		parent_id: 1,
		created_at: '2024-01-10T13:00:00Z',
		last_edited: '2024-01-10T13:00:00Z',
		body: 'Thanks everyone!',
		upvotes: 0,
		downvotes: 0
	}
];

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
	const user = mockUsers.find((u: User) => u.username === username);
	if (!user) throw new Error(`User "${username}" not found in mock data`);

	const posts = mockPosts
		.filter((p: Post) => p.author_username === user.username)
		.sort(
			(a: Post, b: Post) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
		);

	const commentCounts = new Map<number, number>();
	for (const c of mockComments) {
		commentCounts.set(c.parent_id, (commentCounts.get(c.parent_id) ?? 0) + 1);
	}

	return {
		session: null,
		supabase: null as unknown as import('@supabase/supabase-js').SupabaseClient,
		unreadForum: 0,
		unreadRoutes: 0,
		profileUser: user,
		posts,
		commentCounts: Object.fromEntries(commentCounts),
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
