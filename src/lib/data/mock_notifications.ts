// src/lib/data/mock_notifications.ts

export type NotificationKind = 'upvote' | 'downvote' | 'comment' | 'route_alert';

export interface NotificationItem {
	notification_id: number;
	kind: NotificationKind;
	created_at: string;
	is_read: boolean;

	// Navigation targets (temporary until backend + details pages land)
	// forum kinds -> post_id, route_alert -> route_id
	post_id?: number;
	route_id?: number;

	message: string;
}

const now = Date.now();

export const mockNotifications: NotificationItem[] = [
	// Forum notifications (no usernames shown)
	{
		notification_id: 1,
		kind: 'upvote',
		created_at: new Date(now - 6 * 60_000).toISOString(),
		is_read: false,
		post_id: 1,
		message: 'Your post received an upvote.'
	},
	{
		notification_id: 2,
		kind: 'comment',
		created_at: new Date(now - 28 * 60_000).toISOString(),
		is_read: false,
		post_id: 11,
		message: 'Someone commented on your post.'
	},
	{
		notification_id: 3,
		kind: 'downvote',
		created_at: new Date(now - 2 * 60 * 60_000).toISOString(),
		is_read: true,
		post_id: 2,
		message: 'Your post received a downvote.'
	},
	{
		notification_id: 4,
		kind: 'comment',
		created_at: new Date(now - 14 * 60 * 60_000).toISOString(),
		is_read: true,
		post_id: 5,
		message: 'New comment activity in a thread you posted in.'
	},

	// Route notifications
	{
		notification_id: 5,
		kind: 'route_alert',
		created_at: new Date(now - 55 * 60_000).toISOString(),
		is_read: false,
		route_id: 7,
		message: 'Road closure reported on route “Fairview to Ortigas via MRT”.'
	},
	{
		notification_id: 6,
		kind: 'route_alert',
		created_at: new Date(now - 22 * 60 * 60_000).toISOString(),
		is_read: true,
		route_id: 1,
		message: 'Delay reported on route “QC to Makati via MRT”.'
	}
];