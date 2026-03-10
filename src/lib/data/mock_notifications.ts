// Legacy interface kept for reference. Data is now served from Supabase.
export type NotificationKind = 'upvote' | 'downvote' | 'comment' | 'route_alert';

export interface NotificationItem {
	notification_id: number;
	kind: NotificationKind;
	created_at: string;
	is_read: boolean;
	post_id?: number;
	route_id?: number;
	message: string;
}
