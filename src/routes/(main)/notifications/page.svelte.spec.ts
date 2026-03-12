import { page } from 'vitest/browser';
import { describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-svelte';
import Page from './+page.svelte';

/* ════════════════════════════════════════════════════════════════
 * NOTIFICATIONS PAGE COMPONENT TESTS
 * ════════════════════════════════════════════════════════════════
 *
 * Tests the /notifications page which displays:
 *   - Back button and "Notifications" title
 *   - Forum / Routes scope tabs
 *   - Notification cards with icons & message
 *   - "Mark all" button
 *   - "Mark as read" per notification
 *   - "All caught up" empty state
 *   - Unread count badge
 *
 * HOW TO RUN:
 *   pnpm test:unit                → Run all unit + component tests
 *   pnpm test:unit -- --watch     → Watch mode
 *
 * DOCS: https://vitest.dev/guide/browser/
 * ════════════════════════════════════════════════════════════════ */

function buildNotificationsData(
	notifications: Array<{
		notification_id: number;
		kind: 'upvote' | 'downvote' | 'comment' | 'route_alert';
		message: string;
		is_read: boolean;
		created_at: string;
		post_id: number | null;
		route_id: number | null;
	}> = []
) {
	return {
		notifications
	} as unknown as import('./$types').PageData;
}

const forumNotifications = [
	{
		notification_id: 1,
		kind: 'upvote' as const,
		message: 'Sarah upvoted your post',
		is_read: false,
		created_at: new Date().toISOString(),
		post_id: 10,
		route_id: null
	},
	{
		notification_id: 2,
		kind: 'comment' as const,
		message: 'James commented on your post',
		is_read: true,
		created_at: new Date(Date.now() - 3600_000).toISOString(),
		post_id: 10,
		route_id: null
	},
	{
		notification_id: 3,
		kind: 'downvote' as const,
		message: 'Someone downvoted your post',
		is_read: false,
		created_at: new Date(Date.now() - 7200_000).toISOString(),
		post_id: 11,
		route_id: null
	}
];

const _routeNotifications = [
	{
		notification_id: 4,
		kind: 'route_alert' as const,
		message: 'Heavy traffic on your saved route',
		is_read: false,
		created_at: new Date().toISOString(),
		post_id: null,
		route_id: 5
	}
];

describe('Notifications Page', () => {
	describe('layout', () => {
		it('should render the "Notifications" title', async () => {
			render(Page, { props: { data: buildNotificationsData(forumNotifications) } });

			await expect.element(page.getByText('Notifications')).toBeInTheDocument();
		});

		it('should render the back link', async () => {
			render(Page, { props: { data: buildNotificationsData(forumNotifications) } });

			const back = page.getByRole('link', { name: 'Back' });
			await expect.element(back).toBeInTheDocument();
		});

		it('should render the notifications section', async () => {
			render(Page, { props: { data: buildNotificationsData(forumNotifications) } });

			const section = page.getByRole('region', { name: 'Notifications' });
			await expect.element(section).toBeInTheDocument();
		});
	});

	describe('scope tabs', () => {
		it('should render Forum scope tab', async () => {
			render(Page, { props: { data: buildNotificationsData(forumNotifications) } });

			const tab = page.getByRole('tab', { name: 'Forum' });
			await expect.element(tab).toBeInTheDocument();
		});

		it('should render Routes scope tab', async () => {
			render(Page, { props: { data: buildNotificationsData(forumNotifications) } });

			const tab = page.getByRole('tab', { name: 'Routes' });
			await expect.element(tab).toBeInTheDocument();
		});

		it('should render tab list', async () => {
			render(Page, { props: { data: buildNotificationsData(forumNotifications) } });

			const tablist = page.getByRole('tablist', { name: 'Notification scope' });
			await expect.element(tablist).toBeInTheDocument();
		});
	});

	describe('forum notifications', () => {
		it('should display forum notification messages', async () => {
			render(Page, { props: { data: buildNotificationsData(forumNotifications) } });

			await expect.element(page.getByText('Sarah upvoted your post')).toBeInTheDocument();
			await expect.element(page.getByText('James commented on your post')).toBeInTheDocument();
		});

		it('should display unread count', async () => {
			render(Page, { props: { data: buildNotificationsData(forumNotifications) } });

			await expect.element(page.getByText('2 unread')).toBeInTheDocument();
		});

		it('should render "Mark as read" button for unread notifications', async () => {
			render(Page, { props: { data: buildNotificationsData(forumNotifications) } });

			const markBtn = page.getByRole('button', { name: 'Mark as read' }).first();
			await expect.element(markBtn).toBeInTheDocument();
		});

		it('should render "Mark all" button', async () => {
			render(Page, { props: { data: buildNotificationsData(forumNotifications) } });

			const markAll = page.getByRole('button', { name: 'Mark all as read' });
			await expect.element(markAll).toBeInTheDocument();
		});
	});

	describe('empty state', () => {
		it('should show "All caught up" when no notifications', async () => {
			render(Page, { props: { data: buildNotificationsData([]) } });

			await expect.element(page.getByText('All caught up')).toBeInTheDocument();
		});

		it('should disable "Mark all" when no notifications', async () => {
			render(Page, { props: { data: buildNotificationsData([]) } });

			const markAll = page.getByRole('button', { name: 'Mark all as read' });
			await expect.element(markAll).toBeDisabled();
		});
	});

	describe('mark as read interaction', () => {
		it('should mark a notification as read on button click', async () => {
			render(Page, { props: { data: buildNotificationsData(forumNotifications) } });

			// Before: 2 unread
			await expect.element(page.getByText('2 unread')).toBeInTheDocument();

			// Click first "Mark as read"
			const markBtn = page.getByRole('button', { name: 'Mark as read' }).first();
			await markBtn.click();

			// After: 1 unread
			await expect.element(page.getByText('1 unread')).toBeInTheDocument();
		});

		it('should mark all as read on "Mark all" click', async () => {
			render(Page, { props: { data: buildNotificationsData(forumNotifications) } });

			const markAll = page.getByRole('button', { name: 'Mark all as read' });
			await markAll.click();

			await expect.element(page.getByText('0 unread')).toBeInTheDocument();
		});
	});
});
