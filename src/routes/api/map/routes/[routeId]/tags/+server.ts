import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { routeIdParamSchema } from '$lib/validation/schemas';
import { listRouteTags } from '$lib/server/routeTags';

function getRouteId(routeIdParam: string) {
	return routeIdParamSchema.parse({ routeId: routeIdParam }).routeId;
}

export const GET: RequestHandler = async ({ params, locals: { supabase } }) => {
	const routeId = getRouteId(params.routeId);
	const tags = await listRouteTags(supabase, routeId);
	return json({ tags });
};
