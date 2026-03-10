import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals: { supabase, safeGetSession } }) => {
	const { session } = await safeGetSession();
	if (!session) return { notifications: [] };

	const { data: notifications } = await supabase
		.from('notification')
		.select('notification_id, kind, message, is_read, created_at, post_id, route_id')
		.eq('user_id', session.user.id)
		.order('created_at', { ascending: false });

	return { notifications: notifications ?? [] };
};
