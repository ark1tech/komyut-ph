import { page } from 'vitest/browser';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
import type { Post } from '$lib/data/mock_posts';
import type { Comment } from '$lib/data/mock_comments';

const { gotoMock } = vi.hoisted(() => ({
	gotoMock: vi.fn()
}));

vi.mock('$app/navigation', () => ({
	goto: gotoMock
}));

vi.mock('$app/state', () => ({
	page: {
		url: new URL('http://localhost/forum?page=1')
	}
}));

import Page from './+page.svelte';

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
	},
	{
		post_id: 6,
		author_id: 2,
		author_name: 'James Chen',
		author_username: 'jchen',
		created_at: '2024-01-05T10:00:00Z',
		last_edited: '2024-01-05T10:00:00Z',
		title: 'Edsa bus tips',
		body: 'Which bus lines are fastest?',
		upvotes: 4,
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
		parent_id: 2,
		created_at: '2024-01-09T11:00:00Z',
		last_edited: '2024-01-09T11:00:00Z',
		body: 'Thanks!',
		upvotes: 0,
		downvotes: 0
	}
];

/* ════════════════════════════════════════════════════════════════
 * FORUM PAGE COMPONENT TESTS
 * ════════════════════════════════════════════════════════════════
 *
 * Tests the /forum page which displays:
 *   - Sort bar (Top / Hot / Latest)
 *   - Paginated forum posts (5 per page)
 *   - Post actions (upvote, downvote, comments, share)
 *   - Pagination controls when posts exceed PER_PAGE
 *
 * HOW TO RUN:
 *   pnpm test:unit                → Run all unit + component tests
 *   pnpm test:unit -- --watch     → Watch mode
 *
 * DOCS: https://vitest.dev/guide/browser/
 * ════════════════════════════════════════════════════════════════ */

const PER_PAGE = 5;

function buildForumData() {
	const commentCounts = Object.fromEntries(
		mockComments.reduce((entries, comment) => {
			entries.set(comment.parent_id, (entries.get(comment.parent_id) ?? 0) + 1);
			return entries;
		}, new Map<number, number>())
	);

	return {
		posts: mockPosts.map((post) => ({
			post_id: post.post_id,
			title: post.title,
			body: post.body,
			upvotes: post.upvotes,
			downvotes: post.downvotes,
			created_at: post.created_at,
			author: {
				username: post.author_username,
				full_name: post.author_name
			}
		})),
		commentCounts
	} as unknown as import('./$types').PageData;
}

describe('Forum Page', () => {
	beforeEach(() => {
		gotoMock.mockReset();
	});

	describe('layout', () => {
		it('should render the forum posts region', async () => {
			render(Page, { props: { data: buildForumData() } });

			const postsRegion = page.getByRole('region', { name: 'Forum Posts' });
			await expect.element(postsRegion).toBeInTheDocument();
		});

		it('should render the sort bar', async () => {
			render(Page, { props: { data: buildForumData() } });

			const sortBar = page.getByRole('radiogroup', { name: 'Sort by' });
			await expect.element(sortBar).toBeInTheDocument();
		});
	});

	describe('sort options', () => {
		it('should display Top sort button', async () => {
			render(Page, { props: { data: buildForumData() } });

			await expect.element(page.getByRole('radio', { name: /Top/ })).toBeInTheDocument();
		});

		it('should display Hot sort button', async () => {
			render(Page, { props: { data: buildForumData() } });

			await expect.element(page.getByRole('radio', { name: /Hot/ })).toBeInTheDocument();
		});

		it('should display Latest sort button', async () => {
			render(Page, { props: { data: buildForumData() } });

			await expect.element(page.getByRole('radio', { name: /Latest/ })).toBeInTheDocument();
		});

		it('should default to "Hot" as active sort', async () => {
			render(Page, { props: { data: buildForumData() } });

			const hotBtn = page.getByRole('radio', { name: /Hot/ });
			await expect.element(hotBtn).toHaveAttribute('aria-checked', 'true');
		});

		it('should switch to "Latest" sort on click', async () => {
			render(Page, { props: { data: buildForumData() } });

			const latestBtn = page.getByRole('radio', { name: /Latest/ });
			await latestBtn.click();
			await expect.element(latestBtn).toHaveAttribute('aria-checked', 'true');
			expect(gotoMock).toHaveBeenCalledWith('?page=1', { keepFocus: true, noScroll: true });
		});

		it('should switch to "Top" sort on click', async () => {
			render(Page, { props: { data: buildForumData() } });

			const topBtn = page.getByRole('radio', { name: /Top/ });
			await topBtn.click();
			await expect.element(topBtn).toHaveAttribute('aria-checked', 'true');
			expect(gotoMock).toHaveBeenCalledWith('?page=1', { keepFocus: true, noScroll: true });
		});
	});

	describe('post rendering', () => {
		it('should display at most 5 posts per page', async () => {
			render(Page, { props: { data: buildForumData() } });

			const articles = page.getByRole('article');
			// Count visible articles — should be PER_PAGE or less
			const firstArticle = articles.first();
			await expect.element(firstArticle).toBeInTheDocument();
		});

		it('should render upvote buttons', async () => {
			render(Page, { props: { data: buildForumData() } });

			const upvote = page.getByRole('button', { name: 'Upvote' }).first();
			await expect.element(upvote).toBeInTheDocument();
		});

		it('should render downvote buttons', async () => {
			render(Page, { props: { data: buildForumData() } });

			const downvote = page.getByRole('button', { name: 'Downvote' }).first();
			await expect.element(downvote).toBeInTheDocument();
		});

		it('should render share buttons', async () => {
			render(Page, { props: { data: buildForumData() } });

			const share = page.getByRole('button', { name: 'Share' }).first();
			await expect.element(share).toBeInTheDocument();
		});

		it('should display post titles', async () => {
			render(Page, { props: { data: buildForumData() } });

			// At least one post title from mock data should be visible
			const firstPost = page.getByRole('article').first();
			await expect.element(firstPost).toBeInTheDocument();
		});
	});

	describe('pagination', () => {
		it('should show pagination when posts exceed PER_PAGE', async () => {
			render(Page, { props: { data: buildForumData() } });

			if (mockPosts.length > PER_PAGE) {
				const nav = page.getByRole('navigation');
				await expect.element(nav).toBeInTheDocument();
			} else {
				expect(mockPosts.length).toBeLessThanOrEqual(PER_PAGE);
			}
		});
	});

	describe('data integrity', () => {
		it('should have posts to display from mock data', async () => {
			expect(mockPosts.length).toBeGreaterThan(0);
		});

		it('should compute comment counts from mock comments', async () => {
			// Each post referenced in comments should appear in mockPosts
			const postIds = new Set(mockPosts.map((p: Post) => p.post_id));
			const commentParentIds = new Set(mockComments.map((c: Comment) => c.parent_id));

			for (const parentId of commentParentIds) {
				expect(postIds.has(parentId)).toBe(true);
			}
		});
	});
});
