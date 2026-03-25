export const routeChangeTypes = [
	'road_closure',
	'fare_change',
	'tag_change',
	'accessibility_change',
	'id_requirement_change',
	'incident_update',
	'general_update'
] as const;

export const routeChangeSeverities = ['low', 'medium', 'high', 'critical'] as const;

export const routeSubscriptionStatuses = ['active', 'muted', 'unsubscribed'] as const;

export const routeNotificationChannels = ['in_app', 'push', 'email'] as const;

export type RouteChangeType = (typeof routeChangeTypes)[number];

/** Default route-event filters for new subscriptions and unset preferences. */
export const defaultRouteSubscriptionAlertTypes: RouteChangeType[] = ['road_closure'];

export type RouteChangeSeverity = (typeof routeChangeSeverities)[number];
export type RouteSubscriptionStatus = (typeof routeSubscriptionStatuses)[number];
export type RouteNotificationChannel = (typeof routeNotificationChannels)[number];
