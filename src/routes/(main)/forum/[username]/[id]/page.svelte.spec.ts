import { page } from 'vitest/browser';
import { describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-svelte';
import Page from './+page.svelte';

/* ════════════════════════════════════════════════════════════════
 * FORUM POST DETAIL PAGE COMPONENT TESTS
 * ════════════════════════════════════════════════════════════════
 *
 * Tests the /forum/[username]/[id] page which displays:
 *   - Full post (non-truncated)
 *   - Comment input area
 *   - Comment sort bar (Top / Hot / Latest)
 *   - List of comments
 *   - Empty state for no comments
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
	body: 'Looking for the best route from QC to Makati during rush hour.',
	upvotes: 10,
	downvotes: 2,
	created_at: '2024-01-10T10:00:00Z',
	last_edited: '2024-01-10T10:00:00Z',
	author: { uid: 'u1', username: 'sarahm', full_name: 'Sarah Martinez' }
};

const mockComments = [
	{
		comment_id: 1,
		parent_id: 1,
		created_at: '2024-01-10T11:00:00Z',
		last_edited: '2024-01-10T11:00:00Z',
		body: 'MRT then jeepney is the fastest!',
		upvotes: 5,
		downvotes: 0,
		linked_post_id: null,
		author: { uid: 'u2', username: 'jchen', full_name: 'James Chen' }
	},
	{
		comment_id: 2,
		parent_id: 1,
		created_at: '2024-01-10T12:00:00Z',
		last_edited: '2024-01-10T12:00:00Z',
		body: 'Bus is cheaper if you have time.',
		upvotes: 3,
		downvotes: 1,
		linked_post_id: null,
		author: { uid: 'u3', username: 'emilyjay', full_name: 'Emily Johnson' }
	}
];

function buildPostDetailData(overrides: Record<string, unknown> = {}) {
	return {
		post: mockPost,
		comments: mockComments,
		linkedPosts: {},
		...overrides
	} as unknown as import('./$types').PageData;
}

describe('Forum Post Detail Page', () => {
	describe('post display', () => {
		it('should display the post title', async () => {
			render(Page, { props: { data: buildPostDetailData() } });

			await expect
				.element(page.getByText('How to get from Quezon City to Makati?'))
				.toBeInTheDocument();
		});

		it('should display the full post body (non-truncated)', async () => {
			render(Page, { props: { data: buildPostDetailData() } });

			await expect
				.element(page.getByText(/Looking for the best route from QC to Makati/))
				.toBeInTheDocument();
		});

		it('should render the post as an article', async () => {
			render(Page, { props: { data: buildPostDetailData() } });

			const article = page.getByRole('article');
			await expect.element(article).toBeInTheDocument();
		});
	});

	describe('comment input', () => {
		it('should render the comment input area', async () => {
			render(Page, { props: { data: buildPostDetailData() } });

			const input = page.getByRole('textbox', { name: 'Forum Comment Input' });
			await expect.element(input).toBeInTheDocument();
		});

		it('should render comment textarea with placeholder', async () => {
			render(Page, { props: { data: buildPostDetailData() } });

			const textarea = page.getByPlaceholder('Add a comment...');
			await expect.element(textarea).toBeInTheDocument();
		});

		it('should render send button', async () => {
			render(Page, { props: { data: buildPostDetailData() } });

			const send = page.getByRole('button', { name: 'Send comment' });
			await expect.element(send).toBeInTheDocument();
		});

		it('should disable send button when input is empty', async () => {
			render(Page, { props: { data: buildPostDetailData() } });

			const send = page.getByRole('button', { name: 'Send comment' });
			await expect.element(send).toBeDisabled();
		});

		it('should render link-a-post button', async () => {
			render(Page, { props: { data: buildPostDetailData() } });

			const link = page.getByRole('button', { name: 'Link a post' });
			await expect.element(link).toBeInTheDocument();
		});
	});

	describe('comments list', () => {
		it('should render the comments region', async () => {
			render(Page, { props: { data: buildPostDetailData() } });

			const region = page.getByRole('region', { name: 'Forum Comments' });
			await expect.element(region).toBeInTheDocument();
		});

		it('should display comment text', async () => {
			render(Page, { props: { data: buildPostDetailData() } });

			await expect
				.element(page.getByText('MRT then jeepney is the fastest!'))
				.toBeInTheDocument();
			await expect
				.element(page.getByText('Bus is cheaper if you have time.'))
				.toBeInTheDocument();
		});

		it('should render upvote buttons for comments', async () => {
			render(Page, { props: { data: buildPostDetailData() } });

			const upvote = page.getByRole('button', { name: 'Upvote comment' }).first();
			await expect.element(upvote).toBeInTheDocument();
		});

		it('should render downvote buttons for comments', async () => {
			render(Page, { props: { data: buildPostDetailData() } });

			const downvote = page.getByRole('button', { name: 'Downvote comment' }).first();
			await expect.element(downvote).toBeInTheDocument();
		});
	});

	describe('comment sort bar', () => {
		it('should render sort bar when comments exist', async () => {
			render(Page, { props: { data: buildPostDetailData() } });

			const sortBar = page.getByRole('radiogroup', { name: 'Sort by' });
			await expect.element(sortBar).toBeInTheDocument();
		});

		it('should not render sort bar when no comments', async () => {
			render(Page, { props: { data: buildPostDetailData({ comments: [] }) } });

			await expect
				.element(page.getByRole('radiogroup', { name: 'Sort by' }))
				.not.toBeInTheDocument();
		});
	});

	describe('empty comments state', () => {
		it('should not render comments region when there are no comments', async () => {
			render(Page, { props: { data: buildPostDetailData({ comments: [] }) } });

			await expect
				.element(page.getByRole('region', { name: 'Forum Comments' }))
				.not.toBeInTheDocument();
		});
	});
});
