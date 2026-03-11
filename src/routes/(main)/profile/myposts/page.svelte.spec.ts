import { page } from 'vitest/browser';
import { describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-svelte';
import Page from './+page.svelte';

/* ════════════════════════════════════════════════════════════════
 * MY POSTS PAGE COMPONENT TESTS
 * ════════════════════════════════════════════════════════════════
 *
 * Tests the /profile/myposts page which displays:
 *   - "My Posts" subpage header with back link
 *   - List of user's forum posts
 *   - Empty state when user has no posts
 *
 * HOW TO RUN:
 *   pnpm test:unit                → Run all unit + component tests
 *   pnpm test:unit -- --watch     → Watch mode
 *
 * DOCS: https://vitest.dev/guide/browser/
 * ════════════════════════════════════════════════════════════════ */

const mockPost = {
	post_id: 1,
	title: 'How to get from Quezon City to Makati?',
	body: 'Looking for the best route.',
	upvotes: 10,
	downvotes: 2,
	created_at: '2024-01-10T10:00:00Z',
	last_edited: '2024-01-10T10:00:00Z',
	author: { uid: 'u1', username: 'sarahm', full_name: 'Sarah Martinez' }
};

function buildMyPostsData(overrides: Record<string, unknown> = {}) {
	return {
		posts: [],
		commentCounts: {},
		...overrides
	} as unknown as import('./$types').PageData;
}

describe('My Posts Page', () => {
	describe('layout', () => {
		it('should render the "My Posts" header', async () => {
			render(Page, { props: { data: buildMyPostsData() } });

			await expect.element(page.getByText('My Posts')).toBeInTheDocument();
		});

		it('should render the my posts section', async () => {
			render(Page, { props: { data: buildMyPostsData() } });

			const section = page.getByRole('region', { name: 'My posts' });
			await expect.element(section).toBeInTheDocument();
		});

		it('should render back link to profile', async () => {
			render(Page, { props: { data: buildMyPostsData() } });

			const back = page.getByRole('link', { name: 'Back to profile' });
			await expect.element(back).toBeInTheDocument();
		});
	});

	describe('empty state', () => {
		it('should show "No posts yet" when posts is empty', async () => {
			render(Page, { props: { data: buildMyPostsData() } });

			await expect.element(page.getByText('No posts yet')).toBeInTheDocument();
		});

		it('should show helper text in empty state', async () => {
			render(Page, { props: { data: buildMyPostsData() } });

			await expect
				.element(page.getByText(/When you post in the forum/))
				.toBeInTheDocument();
		});

		it('should show "Browse forum" link in empty state', async () => {
			render(Page, { props: { data: buildMyPostsData() } });

			await expect.element(page.getByText('Browse forum')).toBeInTheDocument();
		});
	});

	describe('posts list', () => {
		it('should display post title', async () => {
			render(Page, {
				props: { data: buildMyPostsData({ posts: [mockPost], commentCounts: { 1: 3 } }) }
			});

			await expect
				.element(page.getByText('How to get from Quezon City to Makati?'))
				.toBeInTheDocument();
		});

		it('should render posts as articles', async () => {
			render(Page, {
				props: { data: buildMyPostsData({ posts: [mockPost] }) }
			});

			const article = page.getByRole('article');
			await expect.element(article).toBeInTheDocument();
		});

		it('should render upvote and downvote buttons', async () => {
			render(Page, {
				props: { data: buildMyPostsData({ posts: [mockPost] }) }
			});

			await expect
				.element(page.getByRole('button', { name: 'Upvote' }))
				.toBeInTheDocument();
			await expect
				.element(page.getByRole('button', { name: 'Downvote' }))
				.toBeInTheDocument();
		});
	});
});
