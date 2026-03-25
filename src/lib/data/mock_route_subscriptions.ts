import type {
	RouteChangeEventDTO,
	RouteNotificationDTO,
	RouteSubscriptionDTO,
	SavedRouteDTO
} from '$lib/validation/schemas';
import { defaultRouteSubscriptionAlertTypes } from '$lib/types/routeSubscriptions';
import { findMockSavedRouteById } from '$lib/data/mock_routes';

function cloneSubscription(subscription: RouteSubscriptionDTO): RouteSubscriptionDTO {
	return {
		...subscription,
		alert_types: [...subscription.alert_types],
		saved_route: subscription.saved_route
			? {
					...subscription.saved_route,
					vehicle_types: [...subscription.saved_route.vehicle_types]
				}
			: null
	};
}

function cloneNotification(notification: RouteNotificationDTO): RouteNotificationDTO {
	return {
		...notification,
		metadata: { ...notification.metadata }
	};
}

const templateSubscriptions: RouteSubscriptionDTO[] = [
	{
		subscription_id: 11,
		route_id: 42,
		saved_route_id: 1,
		status: 'active',
		notify_in_app: true,
		notify_push: true,
		notify_email: false,
		alert_types: ['road_closure', 'fare_change', 'incident_update'],
		created_at: '2026-03-24T18:00:00.000Z',
		updated_at: '2026-03-24T18:00:00.000Z',
		saved_route: findMockSavedRouteById(1)
	},
	{
		subscription_id: 12,
		route_id: 87,
		saved_route_id: 2,
		status: 'active',
		notify_in_app: true,
		notify_push: false,
		notify_email: false,
		alert_types: ['accessibility_change', 'incident_update', 'general_update'],
		created_at: '2026-03-23T06:30:00.000Z',
		updated_at: '2026-03-23T06:30:00.000Z',
		saved_route: findMockSavedRouteById(2)
	}
];

const templateNotifications: RouteNotificationDTO[] = [
	{
		notification_id: 9001,
		kind: 'route_alert',
		title: 'Fare update on your route',
		message: 'Cubao to Taft via MRT now starts at PHP 28.',
		is_read: false,
		created_at: '2026-03-25T08:30:00.000Z',
		read_at: null,
		route_id: 42,
		route_subscription_id: 11,
		route_change_event_id: 501,
		batch_key: 'route:42:window:2026-03-25T08:30:00.000Z',
		metadata: {
			changeType: 'fare_change',
			severity: 'medium'
		}
	},
	{
		notification_id: 9002,
		kind: 'route_alert',
		title: 'Incident update on your route',
		message: 'A lane closure is slowing down travel near Guadalupe.',
		is_read: true,
		created_at: '2026-03-24T16:10:00.000Z',
		read_at: '2026-03-24T18:00:00.000Z',
		route_id: 87,
		route_subscription_id: 12,
		route_change_event_id: 502,
		batch_key: 'route:87:window:2026-03-24T16:00:00.000Z',
		metadata: {
			changeType: 'incident_update',
			severity: 'high'
		}
	}
];

const subscriptionStateByUser = new Map<string, RouteSubscriptionDTO[]>();
const notificationStateByUser = new Map<string, RouteNotificationDTO[]>();
const routeChangeEventsById = new Map<number, RouteChangeEventDTO>();

let nextSubscriptionId = 100;
let nextNotificationId = 10_000;
let nextRouteChangeEventId = 1_000;

function ensureUserState(userId: string) {
	if (!subscriptionStateByUser.has(userId)) {
		subscriptionStateByUser.set(userId, templateSubscriptions.map(cloneSubscription));
	}

	if (!notificationStateByUser.has(userId)) {
		notificationStateByUser.set(userId, templateNotifications.map(cloneNotification));
	}
}

function fallbackSavedRoute(
	routeId: number,
	savedRouteId: number | null,
	savedRoute?: SavedRouteDTO | null,
	routeName?: string | null
) {
	const preferredRoute = savedRouteId ?? routeId;
	const fromMockRoutes = findMockSavedRouteById(preferredRoute);
	const baseRoute = savedRoute ??
		fromMockRoutes ?? {
			saved_route_id: savedRouteId ?? routeId * 10,
			geo_route_id: routeId,
			route_name: `Route ${routeId}`,
			start_loc: 'Origin',
			end_loc: 'Destination',
			vehicle_types: ['bus'],
			pwd_friendly: false,
			est_time_of_arrival: 30,
			fare: 25,
			created_at: new Date().toISOString()
		};

	const normalizedRouteName = routeName?.trim();
	if (!normalizedRouteName) {
		return baseRoute;
	}

	return {
		...baseRoute,
		route_name: normalizedRouteName,
		vehicle_types: [...baseRoute.vehicle_types]
	};
}

export function getMockRouteSubscriptions(userId: string) {
	ensureUserState(userId);
	return subscriptionStateByUser
		.get(userId)!
		.filter((subscription) => subscription.status !== 'unsubscribed')
		.map(cloneSubscription);
}

export function getMockRouteSubscription(userId: string, routeId: number) {
	ensureUserState(userId);
	const subscription = subscriptionStateByUser
		.get(userId)!
		.find((item) => item.route_id === routeId && item.status !== 'unsubscribed');

	return subscription ? cloneSubscription(subscription) : null;
}

export function upsertMockRouteSubscription(
	userId: string,
	input: {
		routeId: number;
		savedRouteId?: number | null;
		savedRoute?: SavedRouteDTO | null;
		routeName?: string | null;
		preferences?: Partial<RouteSubscriptionDTO>;
	}
) {
	ensureUserState(userId);

	const subscriptions = subscriptionStateByUser.get(userId)!;
	const existing = subscriptions.find((subscription) => subscription.route_id === input.routeId);

	if (existing && existing.status !== 'unsubscribed') {
		return {
			subscription: cloneSubscription(existing),
			created: false
		};
	}

	const nextSavedRoute = fallbackSavedRoute(
		input.routeId,
		input.savedRouteId ?? existing?.saved_route_id ?? null,
		input.savedRoute ?? existing?.saved_route ?? null,
		input.routeName ?? existing?.saved_route?.route_name ?? null
	);

	const base: RouteSubscriptionDTO = existing ?? {
		subscription_id: nextSubscriptionId++,
		route_id: input.routeId,
		saved_route_id: nextSavedRoute.saved_route_id,
		status: 'active',
		notify_in_app: true,
		notify_push: true,
		notify_email: false,
		alert_types: [...defaultRouteSubscriptionAlertTypes],
		created_at: new Date().toISOString(),
		updated_at: new Date().toISOString(),
		saved_route: nextSavedRoute
	};

	const nextSubscription: RouteSubscriptionDTO = {
		...base,
		saved_route_id: nextSavedRoute.saved_route_id,
		status: 'active',
		alert_types: [...(input.preferences?.alert_types ?? base.alert_types)],
		notify_in_app: input.preferences?.notify_in_app ?? base.notify_in_app,
		notify_push: input.preferences?.notify_push ?? base.notify_push,
		notify_email: input.preferences?.notify_email ?? base.notify_email,
		updated_at: new Date().toISOString(),
		saved_route: nextSavedRoute
	};

	if (existing) {
		const index = subscriptions.findIndex(
			(subscription) => subscription.route_id === input.routeId
		);
		subscriptions[index] = nextSubscription;
	} else {
		subscriptions.unshift(nextSubscription);
	}

	return {
		subscription: cloneSubscription(nextSubscription),
		created: !existing
	};
}

export function updateMockRouteSubscription(
	userId: string,
	routeId: number,
	update: Partial<RouteSubscriptionDTO>
) {
	ensureUserState(userId);

	const subscriptions = subscriptionStateByUser.get(userId)!;
	const index = subscriptions.findIndex(
		(subscription) => subscription.route_id === routeId && subscription.status !== 'unsubscribed'
	);
	if (index === -1) return null;

	const current = subscriptions[index];
	subscriptions[index] = {
		...current,
		status: update.status ?? current.status,
		saved_route_id: update.saved_route_id ?? current.saved_route_id,
		notify_in_app: update.notify_in_app ?? current.notify_in_app,
		notify_push: update.notify_push ?? current.notify_push,
		notify_email: update.notify_email ?? current.notify_email,
		alert_types: update.alert_types ? [...update.alert_types] : current.alert_types,
		updated_at: new Date().toISOString(),
		saved_route: update.saved_route ?? current.saved_route
	};

	return cloneSubscription(subscriptions[index]);
}

export function unsubscribeMockRoute(userId: string, routeId: number) {
	ensureUserState(userId);

	const subscriptions = subscriptionStateByUser.get(userId)!;
	const index = subscriptions.findIndex((subscription) => subscription.route_id === routeId);
	if (index === -1) {
		return { unsubscribed: true };
	}

	subscriptions[index] = {
		...subscriptions[index],
		status: 'unsubscribed',
		updated_at: new Date().toISOString()
	};

	return { unsubscribed: true };
}

export function getMockRouteNotifications(
	userId: string,
	options: {
		status?: 'all' | 'unread' | 'read';
		routeId?: number | null;
		limit?: number;
	} = {}
) {
	ensureUserState(userId);

	let notifications = [...notificationStateByUser.get(userId)!];

	if (options.status === 'unread') {
		notifications = notifications.filter((notification) => !notification.is_read);
	}
	if (options.status === 'read') {
		notifications = notifications.filter((notification) => notification.is_read);
	}
	if (options.routeId) {
		notifications = notifications.filter(
			(notification) => notification.route_id === options.routeId
		);
	}

	notifications.sort((a, b) => b.created_at.localeCompare(a.created_at));

	return notifications.slice(0, options.limit ?? notifications.length).map(cloneNotification);
}

export function markMockRouteNotificationsRead(
	userId: string,
	input: {
		notificationIds?: number[];
		markAll?: boolean;
	}
) {
	ensureUserState(userId);

	const notifications = notificationStateByUser.get(userId)!;
	const idSet = new Set(input.notificationIds ?? []);
	const now = new Date().toISOString();

	for (const notification of notifications) {
		if (input.markAll || idSet.has(notification.notification_id)) {
			notification.is_read = true;
			notification.read_at = now;
		}
	}

	return { updated: true };
}

export function createMockRouteChangeEvent(
	event: Omit<RouteChangeEventDTO, 'route_change_event_id' | 'created_at'>
) {
	const nextEvent: RouteChangeEventDTO = {
		...event,
		route_change_event_id: nextRouteChangeEventId++,
		created_at: new Date().toISOString()
	};

	routeChangeEventsById.set(nextEvent.route_change_event_id, nextEvent);
	return nextEvent;
}

export function getMockRouteChangeEvent(routeChangeEventId: number) {
	return routeChangeEventsById.get(routeChangeEventId) ?? null;
}

export function fanOutMockRouteChangeEvent(event: RouteChangeEventDTO) {
	let processed = 0;

	for (const [userId, subscriptions] of subscriptionStateByUser.entries()) {
		const matchingSubscriptions = subscriptions.filter(
			(subscription) =>
				subscription.route_id === event.route_id &&
				subscription.status === 'active' &&
				subscription.alert_types.includes(event.change_type)
		);

		if (matchingSubscriptions.length === 0) continue;

		ensureUserState(userId);
		const notifications = notificationStateByUser.get(userId)!;

		for (const subscription of matchingSubscriptions) {
			notifications.unshift({
				notification_id: nextNotificationId++,
				kind: 'route_alert',
				title: event.title,
				message: event.summary,
				is_read: false,
				created_at: new Date().toISOString(),
				read_at: null,
				route_id: event.route_id,
				route_subscription_id: subscription.subscription_id,
				route_change_event_id: event.route_change_event_id,
				batch_key: event.batch_window_start
					? `route:${event.route_id}:window:${event.batch_window_start}`
					: `route:${event.route_id}:event:${event.route_change_event_id}`,
				metadata: {
					changeType: event.change_type,
					severity: event.severity
				}
			});
			processed += 1;
		}
	}

	return { processed };
}
