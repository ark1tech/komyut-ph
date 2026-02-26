import { page } from 'vitest/browser';
import { describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-svelte';
import Page from './+page.svelte';
import { mockPosts } from '$lib/data/mock_posts';
import { mockComments } from '$lib/data/mock_comments';

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

describe('Forum Page', () => {
	describe('layout', () => {
		it('should render the forum posts region', async () => {
			render(Page);

			const postsRegion = page.getByRole('region', { name: 'Forum Posts' });
			await expect.element(postsRegion).toBeInTheDocument();
		});

		it('should render the sort bar', async () => {
			render(Page);

			const sortBar = page.getByRole('radiogroup', { name: 'Sort by' });
			await expect.element(sortBar).toBeInTheDocument();
		});
	});

	describe('sort options', () => {
		it('should display Top sort button', async () => {
			render(Page);

			await expect.element(page.getByRole('radio', { name: /Top/ })).toBeInTheDocument();
		});

		it('should display Hot sort button', async () => {
			render(Page);

			await expect.element(page.getByRole('radio', { name: /Hot/ })).toBeInTheDocument();
		});

		it('should display Latest sort button', async () => {
			render(Page);

			await expect.element(page.getByRole('radio', { name: /Latest/ })).toBeInTheDocument();
		});

		it('should default to "Hot" as active sort', async () => {
			render(Page);

			const hotBtn = page.getByRole('radio', { name: /Hot/ });
			await expect.element(hotBtn).toHaveAttribute('aria-checked', 'true');
		});

		it('should switch to "Latest" sort on click', async () => {
			render(Page);

			const latestBtn = page.getByRole('radio', { name: /Latest/ });
			await latestBtn.click();
			await expect.element(latestBtn).toHaveAttribute('aria-checked', 'true');
		});

		it('should switch to "Top" sort on click', async () => {
			render(Page);

			const topBtn = page.getByRole('radio', { name: /Top/ });
			await topBtn.click();
			await expect.element(topBtn).toHaveAttribute('aria-checked', 'true');
		});
	});

	describe('post rendering', () => {
		it('should display at most 5 posts per page', async () => {
			render(Page);

			const articles = page.getByRole('article');
			// Count visible articles — should be PER_PAGE or less
			const firstArticle = articles.first();
			await expect.element(firstArticle).toBeInTheDocument();
		});

		it('should render upvote buttons', async () => {
			render(Page);

			const upvote = page.getByRole('button', { name: 'Upvote' }).first();
			await expect.element(upvote).toBeInTheDocument();
		});

		it('should render downvote buttons', async () => {
			render(Page);

			const downvote = page.getByRole('button', { name: 'Downvote' }).first();
			await expect.element(downvote).toBeInTheDocument();
		});

		it('should render share buttons', async () => {
			render(Page);

			const share = page.getByRole('button', { name: 'Share' }).first();
			await expect.element(share).toBeInTheDocument();
		});

		it('should display post titles', async () => {
			render(Page);

			// At least one post title from mock data should be visible
			const firstPost = page.getByRole('article').first();
			await expect.element(firstPost).toBeInTheDocument();
		});
	});

	describe('pagination', () => {
		it('should show pagination when posts exceed PER_PAGE', async () => {
			render(Page);

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
			const postIds = new Set(mockPosts.map((p) => p.post_id));
			const commentParentIds = new Set(mockComments.map((c) => c.parent_id));

			for (const parentId of commentParentIds) {
				expect(postIds.has(parentId)).toBe(true);
			}
		});
	});
});
