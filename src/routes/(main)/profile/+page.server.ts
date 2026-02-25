import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals: { supabase, safeGetSession } }) => {
	const { session } = await safeGetSession();

	if (!session) {
		return {
			session: null,
			user: null
		};
	}

	const { data: user } = await supabase
		.from('user')
		.select(`full_name, username, email, avatar_url`)
		.eq('uid', session.user.id)
		.single();

	return { session, user };
};
