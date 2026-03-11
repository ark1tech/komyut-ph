import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ locals: { supabase, safeGetSession } }) => {
	const { session } = await safeGetSession();
	if (!session) return { unreadCount: 0 };

	const { count } = await supabase
		.from('notification')
		.select('*', { count: 'exact', head: true })
		.eq('user_id', session.user.id)
		.eq('is_read', false);

	return { unreadCount: count ?? 0 };
};
