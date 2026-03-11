import { PUBLIC_SUPABASE_PUBLISHABLE_KEY, PUBLIC_SUPABASE_URL } from '$env/static/public';
import type { LayoutLoad } from './$types';
import { createBrowserClient, createServerClient, isBrowser } from '@supabase/ssr';

export const load: LayoutLoad = async ({ fetch, data, depends }) => {
	depends('supabase:auth');

	const supabase = isBrowser()
		? createBrowserClient(PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_PUBLISHABLE_KEY, {
				global: {
					fetch
				}
			})
		: createServerClient(PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_PUBLISHABLE_KEY, {
				global: {
					fetch
				},
				cookies: {
					getAll() {
						return data.cookies;
					}
				}
			});

	// Prefer the session already loaded on the server to avoid an extra round-trip,
	// but fall back to fetching it when not present (e.g. during client-side nav).
	let session = data.session ?? null;
	let authError: string | null = null;

	if (!session) {
		try {
			const {
				data: sessionData,
				error: sessionError
			} = await supabase.auth.getSession();

			if (sessionError) {
				console.error('Failed to get auth session', sessionError);
				authError = sessionError.message ?? 'Failed to get auth session';
			} else {
				session = sessionData.session;
			}
		} catch (error) {
			console.error('Failed to get auth session (network or unexpected error)', error);
			authError = 'Failed to contact auth server';
		}
	}

	return { supabase, session, authError };
};
