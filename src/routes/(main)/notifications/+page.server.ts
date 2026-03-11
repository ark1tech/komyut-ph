import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { notificationSchema } from '$lib/validation/schemas';

export const load: PageServerLoad = async ({ locals: { supabase, safeGetSession } }) => {
	const { session } = await safeGetSession();
	if (!session) return { notifications: [] };

	const { data: notifications, error: dbError } = await supabase
		.from('notification')
		.select('notification_id, kind, message, is_read, created_at, post_id, route_id')
		.eq('user_id', session.user.id)
		.order('created_at', { ascending: false });

	if (dbError) {
		console.error('Failed to load notifications', dbError);
		throw error(500, 'Failed to load notifications');
	}

	const parsed = notificationSchema.array().safeParse(notifications ?? []);
	if (!parsed.success) {
		console.error('Invalid notification data from Supabase', parsed.error);
		throw error(500, 'Failed to load notifications');
	}

	return { notifications: parsed.data };
};
