import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import {
	getRouteSubscription,
	unsubscribeFromRoute,
	updateRouteSubscriptionPreferences
} from '$lib/server/routeSubscriptions';
import {
	routeIdParamSchema,
	routeSubscriptionPreferenceSchema
} from '$lib/validation/schemas';

async function requireUser(
	safeGetSession: App.Locals['safeGetSession']
): Promise<string> {
	const { session } = await safeGetSession();
	if (!session) {
		throw error(401, 'Authentication required');
	}

	return session.user.id;
}

function getRouteId(routeIdParam: string) {
	return routeIdParamSchema.parse({ routeId: routeIdParam }).routeId;
}

export const GET: RequestHandler = async ({
	params,
	locals: { supabase, safeGetSession }
}) => {
	const userId = await requireUser(safeGetSession);
	const routeId = getRouteId(params.routeId);
	const subscription = await getRouteSubscription(supabase, userId, routeId);
	return json({ subscription });
};

export const PATCH: RequestHandler = async ({
	params,
	request,
	locals: { supabase, safeGetSession }
}) => {
	const userId = await requireUser(safeGetSession);
	const routeId = getRouteId(params.routeId);
	const body = routeSubscriptionPreferenceSchema.parse(await request.json());
	const subscription = await updateRouteSubscriptionPreferences(
		supabase,
		userId,
		routeId,
		body
	);

	return json({ subscription });
};

export const DELETE: RequestHandler = async ({
	params,
	locals: { supabase, safeGetSession }
}) => {
	const userId = await requireUser(safeGetSession);
	const routeId = getRouteId(params.routeId);
	const result = await unsubscribeFromRoute(supabase, userId, routeId);
	return json(result);
};
