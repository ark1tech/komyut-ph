import { error } from '@sveltejs/kit';
import { invalidateCache } from '$lib/server/cache';
import {
	createMockRouteChangeEvent,
	fanOutMockRouteChangeEvent,
	getMockRouteChangeEvent,
	getMockRouteNotifications,
	getMockRouteSubscription,
	getMockRouteSubscriptions,
	markMockRouteNotificationsRead,
	unsubscribeMockRoute,
	updateMockRouteSubscription,
	upsertMockRouteSubscription
} from '$lib/data/mock_route_subscriptions';
import {
	routeChangeEventCreateSchema,
	routeNotificationSchema,
	routeSubscriptionCreateSchema,
	routeSubscriptionPreferenceSchema
} from '$lib/validation/schemas';
import type {
	RouteChangeEventDTO,
	RouteNotificationDTO,
	RouteSubscriptionCreateInput,
	RouteSubscriptionDTO,
	RouteSubscriptionPreferenceInput
} from '$lib/validation/schemas';

type RouteNotificationsStatus = 'all' | 'unread' | 'read';

function invalidateRouteCaches(userId: string) {
	invalidateCache(`routes:user=${userId}`);
	invalidateCache(`notifications:counts:user=${userId}`);
	invalidateCache(`route-subscriptions:user=${userId}`);
}

export async function listRouteSubscriptions(
	_supabase: App.Locals['supabase'],
	userId: string
): Promise<RouteSubscriptionDTO[]> {
	return getMockRouteSubscriptions(userId);
}

export async function getRouteSubscription(
	_supabase: App.Locals['supabase'],
	userId: string,
	routeId: number
): Promise<RouteSubscriptionDTO | null> {
	return getMockRouteSubscription(userId, routeId);
}

export async function subscribeToRoute(
	_supabase: App.Locals['supabase'],
	userId: string,
	input: RouteSubscriptionCreateInput
): Promise<{ subscription: RouteSubscriptionDTO; created: boolean }> {
	const parsedInput = routeSubscriptionCreateSchema.parse(input);

	const result = upsertMockRouteSubscription(userId, {
		routeId: parsedInput.routeId,
		savedRouteId: parsedInput.savedRouteId ?? null,
		routeName: parsedInput.routeName,
		savedRoute: parsedInput.savedRoute,
		preferences: parsedInput.preferences
			? {
					notify_in_app: parsedInput.preferences.notifyInApp,
					notify_push: parsedInput.preferences.notifyPush,
					notify_email: parsedInput.preferences.notifyEmail,
					alert_types: parsedInput.preferences.alertTypes
				}
			: undefined
	});

	invalidateRouteCaches(userId);
	return result;
}

export async function unsubscribeFromRoute(
	_supabase: App.Locals['supabase'],
	userId: string,
	routeId: number
) {
	const result = unsubscribeMockRoute(userId, routeId);
	invalidateRouteCaches(userId);
	return result;
}

export async function updateRouteSubscriptionPreferences(
	_supabase: App.Locals['supabase'],
	userId: string,
	routeId: number,
	input: RouteSubscriptionPreferenceInput
): Promise<RouteSubscriptionDTO> {
	const preferences = routeSubscriptionPreferenceSchema.parse(input);
	const nextValues: Partial<RouteSubscriptionDTO> = {};
	if (preferences.notifyInApp !== undefined) nextValues.notify_in_app = preferences.notifyInApp;
	if (preferences.notifyPush !== undefined) nextValues.notify_push = preferences.notifyPush;
	if (preferences.notifyEmail !== undefined) nextValues.notify_email = preferences.notifyEmail;
	if (preferences.alertTypes !== undefined) nextValues.alert_types = preferences.alertTypes;
	if (preferences.routeName !== undefined) {
		const currentSubscription = getMockRouteSubscription(userId, routeId);
		if (!currentSubscription) {
			throw error(404, 'Route subscription not found');
		}

		nextValues.saved_route = currentSubscription.saved_route
			? {
					...currentSubscription.saved_route,
					route_name: preferences.routeName
				}
			: undefined;
	}

	const subscription = updateMockRouteSubscription(userId, routeId, nextValues);

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
