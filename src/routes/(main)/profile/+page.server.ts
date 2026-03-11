import { error, redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { userProfileSchema } from '$lib/validation/schemas';

export const load: PageServerLoad = async ({ locals: { supabase, safeGetSession } }) => {
	const { session } = await safeGetSession();

	if (!session) {
		throw redirect(302, '/login');
	}

	let user: unknown = null;
	try {
		const { data, error: userError } = await supabase
			.from('user')
			.select(`full_name, username, email, avatar_url`)
			.eq('uid', session.user.id)
			.single();

		if (userError) {
			console.error('Failed to load profile user', userError);
			throw error(500, 'Failed to load profile');
		}

		user = data;
	} catch (err) {
		console.error('Failed to load profile user (unexpected)', err);
		throw error(500, 'Failed to load profile');
	}

	if (!user) {
		throw error(500, 'Failed to load profile');
	}

	const parsed = userProfileSchema.safeParse(user);
	if (!parsed.success) {
		console.error('Invalid profile user data from Supabase', parsed.error);
		throw error(500, 'Failed to load profile');
	}

	return { user: parsed.data, session };
};
