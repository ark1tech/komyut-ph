import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import {
	listRouteSubscriptions,
	subscribeToRoute
} from '$lib/server/routeSubscriptions';
import { routeSubscriptionCreateSchema } from '$lib/validation/schemas';

async function requireUser(
	safeGetSession: App.Locals['safeGetSession']
): Promise<string> {
	const { session } = await safeGetSession();
	if (!session) {
		throw error(401, 'Authentication required');
	}

	return session.user.id;
}

export const GET: RequestHandler = async ({ locals: { supabase, safeGetSession } }) => {
	const userId = await requireUser(safeGetSession);
	const subscriptions = await listRouteSubscriptions(supabase, userId);
	return json({ subscriptions });
};

export const POST: RequestHandler = async ({ request, locals: { supabase, safeGetSession } }) => {
	const userId = await requireUser(safeGetSession);
	const body = routeSubscriptionCreateSchema.parse(await request.json());
	const result = await subscribeToRoute(supabase, userId, body);

	return json(result, {
		status: result.created ? 201 : 200
	});
};
