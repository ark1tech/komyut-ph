import { error } from '@sveltejs/kit';
import { invalidateCache } from '$lib/server/cache';
import {
	createMockRouteChangeEvent,
	fanOutMockRouteChangeEvent,
	getMockRouteChangeEvent,
	getMockRouteNotifications,
	markMockRouteNotificationsRead
} from '$lib/data/mock_route_subscriptions';
import type { SavedRouteRow } from '$lib/types/database';
import { routeChangeTypes } from '$lib/types/routeSubscriptions';
import {
	routeChangeEventCreateSchema,
	routeNotificationSchema,
	routeSubscriptionCreateSchema,
	routeSubscriptionPreferenceSchema,
	routeSubscriptionSchema
} from '$lib/validation/schemas';
import type {
	RouteChangeEventDTO,
	RouteNotificationDTO,
	RouteSubscriptionCreateInput,
	RouteSubscriptionDTO,
	RouteSubscriptionPreferenceInput
} from '$lib/validation/schemas';

type RouteNotificationsStatus = 'all' | 'unread' | 'read';
type RouteSubscriptionRow = Omit<RouteSubscriptionDTO, 'saved_route'> & {
	saved_route?: SavedRouteRow | null;
};

const ROUTE_SUBSCRIPTION_SELECT = `
	subscription_id,
	route_id,
	saved_route_id,
	status,
	notify_in_app,
	notify_push,
	notify_email,
	alert_types,
	created_at,
	updated_at,
	saved_route:saved_route_id (
		saved_route_id,
		geo_route_id,
		route_name,
		start_loc,
		end_loc,
		vehicle_types,
		pwd_friendly,
		est_time_of_arrival,
		fare,
		created_at
	)
`;

function routeSubscriptionTable(supabase: App.Locals['supabase']) {
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	return (supabase as unknown as { from: (table: string) => any }).from('route_subscription');
}

function parseSubscription(payload: unknown): RouteSubscriptionDTO {
	const parsed = routeSubscriptionSchema.safeParse(payload);
	if (!parsed.success) {
		console.error('Invalid route subscription payload from Supabase', parsed.error);
		throw error(500, 'Failed to load route subscription');
	}

	return parsed.data;
}

async function ensureSavedRouteId(
	supabase: App.Locals['supabase'],
	userId: string,
	routeId: number,
	input: RouteSubscriptionCreateInput
): Promise<number | null> {
	if (input.savedRouteId) {
		const { data, error: savedRouteError } = await supabase
			.from('saved_route')
			.select('saved_route_id')
			.eq('saved_route_id', input.savedRouteId)
			.eq('user_id', userId)
			.maybeSingle();

		if (savedRouteError) {
			console.error('Failed to verify saved route ownership', savedRouteError);
			throw error(500, 'Failed to subscribe to route');
		}

		if (data?.saved_route_id) {
			return data.saved_route_id;
		}
	}

	if (!input.savedRoute) {
		return null;
	}

	const { data, error: insertError } = await supabase
		.from('saved_route')
		.insert({
			user_id: userId,
			geo_route_id: input.savedRoute.geo_route_id ?? routeId,
			route_name: input.routeName ?? input.savedRoute.route_name,
			start_loc: input.savedRoute.start_loc,
			end_loc: input.savedRoute.end_loc,
			vehicle_types: input.savedRoute.vehicle_types,
			pwd_friendly: input.savedRoute.pwd_friendly,
			est_time_of_arrival: input.savedRoute.est_time_of_arrival,
			fare: input.savedRoute.fare
		})
		.select('saved_route_id')
		.single();

	if (insertError) {
		console.error('Failed to create saved route for subscription', insertError);
		throw error(500, 'Failed to subscribe to route');
	}

	return data.saved_route_id;
}

async function fetchActiveSubscription(
	supabase: App.Locals['supabase'],
	userId: string,
	routeId: number
) {
	const { data, error: fetchError } = await routeSubscriptionTable(supabase)
		.select(ROUTE_SUBSCRIPTION_SELECT)
		.eq('user_id', userId)
		.eq('route_id', routeId)
		.neq('status', 'unsubscribed')
		.maybeSingle();

	if (fetchError) {
		console.error('Failed to fetch route subscription', fetchError);
		throw error(500, 'Failed to load route subscription');
	}

	return data ? parseSubscription(data as RouteSubscriptionRow) : null;
}

function invalidateRouteCaches(userId: string) {
	invalidateCache(`routes:user=${userId}`);
	invalidateCache(`notifications:counts:user=${userId}`);
	invalidateCache(`route-subscriptions:user=${userId}`);
}

export async function listRouteSubscriptions(
	supabase: App.Locals['supabase'],
	userId: string
): Promise<RouteSubscriptionDTO[]> {
	const { data, error: fetchError } = await routeSubscriptionTable(supabase)
		.select(ROUTE_SUBSCRIPTION_SELECT)
		.eq('user_id', userId)
		.neq('status', 'unsubscribed')
		.order('updated_at', { ascending: false });

	if (fetchError) {
		console.error('Failed to list route subscriptions', fetchError);
		throw error(500, 'Failed to load route subscriptions');
	}

	return ((data as unknown[]) ?? []).map(parseSubscription);
}

export async function getRouteSubscription(
	supabase: App.Locals['supabase'],
	userId: string,
	routeId: number
): Promise<RouteSubscriptionDTO | null> {
	return fetchActiveSubscription(supabase, userId, routeId);
}

export async function subscribeToRoute(
	supabase: App.Locals['supabase'],
	userId: string,
	input: RouteSubscriptionCreateInput
): Promise<{ subscription: RouteSubscriptionDTO; created: boolean }> {
	const parsedInput = routeSubscriptionCreateSchema.parse(input);
	const savedRouteId = await ensureSavedRouteId(supabase, userId, parsedInput.routeId, parsedInput);

	const { data: existing, error: existingError } = await routeSubscriptionTable(supabase)
		.select('subscription_id, status')
		.eq('user_id', userId)
		.eq('route_id', parsedInput.routeId)
		.maybeSingle();

	if (existingError) {
		console.error('Failed to check existing route subscription', existingError);
		throw error(500, 'Failed to subscribe to route');
	}

	if (parsedInput.routeName && savedRouteId) {
		const { error: routeNameError } = await supabase
			.from('saved_route')
			.update({
				route_name: parsedInput.routeName
			})
			.eq('saved_route_id', savedRouteId)
			.eq('user_id', userId);

		if (routeNameError) {
			console.error('Failed to update saved route name during subscribe', routeNameError);
			throw error(500, 'Failed to subscribe to route');
		}
	}

	const preferencePayload = parsedInput.preferences;
	const upsertValues: Record<string, unknown> = {
		status: 'active',
		saved_route_id: savedRouteId,
		notify_in_app: preferencePayload?.notifyInApp ?? true,
		notify_push: preferencePayload?.notifyPush ?? true,
		notify_email: preferencePayload?.notifyEmail ?? false,
		alert_types: preferencePayload?.alertTypes ?? [...routeChangeTypes]
	};

	const existingSubscription = existing as {
		subscription_id: number;
		status: RouteSubscriptionDTO['status'];
	} | null;

	if (existingSubscription) {
		const { error: updateError } = await routeSubscriptionTable(supabase)
			.update(upsertValues)
			.eq('subscription_id', existingSubscription.subscription_id);

		if (updateError) {
			console.error('Failed to reactivate route subscription', updateError);
			throw error(500, 'Failed to subscribe to route');
		}
	} else {
		const { error: insertError } = await routeSubscriptionTable(supabase).insert({
			user_id: userId,
			route_id: parsedInput.routeId,
			...upsertValues
		});

		if (insertError) {
			console.error('Failed to create route subscription', insertError);
			throw error(500, 'Failed to subscribe to route');
		}
	}

	const subscription = await fetchActiveSubscription(supabase, userId, parsedInput.routeId);
	if (!subscription) {
		throw error(500, 'Failed to subscribe to route');
	}

	invalidateRouteCaches(userId);
	return {
		subscription,
		created: !existingSubscription || existingSubscription.status === 'unsubscribed'
	};
}

export async function unsubscribeFromRoute(
	supabase: App.Locals['supabase'],
	userId: string,
	routeId: number
) {
	const { error: unsubscribeError } = await routeSubscriptionTable(supabase)
		.update({
			status: 'unsubscribed'
		})
		.eq('user_id', userId)
		.eq('route_id', routeId);

	if (unsubscribeError) {
		console.error('Failed to unsubscribe from route', unsubscribeError);
		throw error(500, 'Failed to unsubscribe from route');
	}

	invalidateRouteCaches(userId);
	return { unsubscribed: true };
}

export async function updateRouteSubscriptionPreferences(
	supabase: App.Locals['supabase'],
	userId: string,
	routeId: number,
	input: RouteSubscriptionPreferenceInput
): Promise<RouteSubscriptionDTO> {
	const preferences = routeSubscriptionPreferenceSchema.parse(input);
	const currentSubscription = await fetchActiveSubscription(supabase, userId, routeId);
	if (!currentSubscription) {
		throw error(404, 'Route subscription not found');
	}

	if (preferences.routeName !== undefined && currentSubscription.saved_route_id) {
		const { error: routeNameError } = await supabase
			.from('saved_route')
			.update({
				route_name: preferences.routeName
			})
			.eq('saved_route_id', currentSubscription.saved_route_id)
			.eq('user_id', userId);

		if (routeNameError) {
			console.error('Failed to update saved route name', routeNameError);
			throw error(500, 'Failed to update route subscription');
		}
	}

	const nextValues: Record<string, unknown> = {};
	if (preferences.notifyInApp !== undefined) nextValues.notify_in_app = preferences.notifyInApp;
	if (preferences.notifyPush !== undefined) nextValues.notify_push = preferences.notifyPush;
	if (preferences.notifyEmail !== undefined) nextValues.notify_email = preferences.notifyEmail;
	if (preferences.alertTypes !== undefined) nextValues.alert_types = preferences.alertTypes;

	if (Object.keys(nextValues).length > 0) {
		const { error: updateError } = await routeSubscriptionTable(supabase)
			.update(nextValues)
			.eq('user_id', userId)
			.eq('route_id', routeId);

		if (updateError) {
			console.error('Failed to update route subscription preferences', updateError);
			throw error(500, 'Failed to update route subscription');
		}
	}

	const subscription = await fetchActiveSubscription(supabase, userId, routeId);
	if (!subscription) {
		throw error(404, 'Route subscription not found');
	}

	invalidateRouteCaches(userId);
	return subscription;
}

export async function listRouteNotifications(
	_supabase: App.Locals['supabase'],
	userId: string,
	options: {
		status?: RouteNotificationsStatus;
		routeId?: number | null;
		limit?: number;
	} = {}
): Promise<RouteNotificationDTO[]> {
	const notifications = getMockRouteNotifications(userId, options);
	const parsed = routeNotificationSchema.array().safeParse(notifications);
	if (!parsed.success) {
		console.error('Invalid mock route notifications payload', parsed.error);
		throw error(500, 'Failed to load route notifications');
	}

	return parsed.data;
}

export async function markRouteNotificationsRead(
	_supabase: App.Locals['supabase'],
	userId: string,
	input: {
		notificationIds?: number[];
		markAll?: boolean;
	}
) {
	const result = markMockRouteNotificationsRead(userId, input);
	invalidateRouteCaches(userId);
	return result;
}

export async function markNotificationsRead(
	_supabase: App.Locals['supabase'],
	userId: string,
	input: {
		notificationIds?: number[];
		markAll?: boolean;
		kind?: 'all' | 'forum' | 'routes';
	}
) {
	if (input.kind === 'forum') {
		return { updated: true };
	}

	const result = markMockRouteNotificationsRead(userId, input);
	invalidateRouteCaches(userId);
	return result;
}

export async function createRouteChangeEvent(
	_supabase: App.Locals['supabase'],
	input: unknown
): Promise<RouteChangeEventDTO> {
	const eventInput = routeChangeEventCreateSchema.parse(input);

	return createMockRouteChangeEvent({
		route_id: eventInput.routeId,
		change_type: eventInput.changeType,
		severity: eventInput.severity,
		title: eventInput.title,
		summary: eventInput.summary,
		dedupe_key: eventInput.dedupeKey,
		changed_fields: eventInput.changedFields,
		previous_snapshot: eventInput.previousSnapshot ?? null,
		current_snapshot: eventInput.currentSnapshot ?? null,
		metadata: eventInput.metadata,
		occurred_at: eventInput.occurredAt ?? new Date().toISOString(),
		expires_at: eventInput.expiresAt ?? null,
		batch_window_start: eventInput.batchWindowStart ?? null,
		batch_window_end: eventInput.batchWindowEnd ?? null
	});
}

export async function fanOutRouteChangeEvent(
	_supabase: App.Locals['supabase'],
	event: RouteChangeEventDTO
) {
	const sourceEvent = getMockRouteChangeEvent(event.route_change_event_id) ?? event;
	return fanOutMockRouteChangeEvent(sourceEvent);
}
