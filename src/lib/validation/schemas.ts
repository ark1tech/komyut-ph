import { z } from 'zod';
import type {
	CommentRow,
	NotificationKind,
	NotificationRow,
	PostRow,
	UserRow
} from '$lib/types/database';
import {
	routeChangeSeverities,
	routeChangeTypes,
	routeNotificationChannels,
	routeSubscriptionStatuses
} from '$lib/types/routeSubscriptions';

// ---------- Input / params schemas ----------

export const loginEmailSchema = z.string().email().max(255);

export const passwordSchema = z.string().min(8).max(128);

// All forum/thread identifiers are UUIDs now.
// Zod 4 deprecates `z.string().uuid()`; use `z.uuid()` instead.
const postIdSchema = z.uuid();

export const forumPostParamsSchema = z.object({
	username: z.string().min(1).max(255),
	id: postIdSchema
});

export const mapLocationQuerySchema = z.object({
	q: z.string().trim().min(1, 'Search query is required').max(120, 'Search query is too long')
});

export const routeVehicleTypeOptions = [
	'Bus',
	'Jeepney',
	'MRT-3',
	'LRT-1',
	'LRT-2',
	'UV Express',
	'Tricycle',
	'Shuttle',
	'Walk'
] as const;

export const routeVehicleTypeSchema = z.enum(routeVehicleTypeOptions);

export const routeAccessibilityTagOptions = [
	'pwd-friendly',
	'id-required',
	'under-50-pesos',
	'under-100-pesos'
] as const;

export const routeAccessibilityTagSchema = z.enum(routeAccessibilityTagOptions);

export const routeMetadataSchema = z.object({
	route_name: z.string().trim().min(1, 'Route name is required').max(255),
	start_loc: z.string().trim().min(1, 'Start location is required').max(255),
	end_loc: z.string().trim().min(1, 'End location is required').max(255),
	vehicle_types: z.array(routeVehicleTypeSchema).min(1, 'Choose at least one vehicle type'),
	route_tags: z.array(routeAccessibilityTagSchema).default([]),
	pwd_friendly: z.boolean(),
	est_time_of_arrival: z.coerce.number().int().positive('ETA must be a positive whole number'),
	fare: z.coerce.number().nonnegative('Fare must be zero or greater')
});

export const mapRouteQuerySchema = z.object({
	start: z
		.string()
		.regex(/^\d+$/, 'start must be a positive integer')
		.transform((v: string) => Number(v)),
	end: z
		.string()
		.regex(/^\d+$/, 'end must be a positive integer')
		.transform((v: string) => Number(v))
});

export const modeSegmentSchema = z.object({
	mode: routeVehicleTypeSchema,
	from: z.tuple([z.number(), z.number()]),
	to: z.tuple([z.number(), z.number()]),
	start_index: z.number().int().nonnegative().optional(),
	end_index: z.number().int().nonnegative().optional()
});

export const mapRouteCreateSchema = routeMetadataSchema.extend({
	start_loc_osmid: z.number().int(),
	end_loc_osmid: z.number().int(),
	geometry: z.object({
		type: z.literal('LineString'),
		coordinates: z
			.array(z.tuple([z.number(), z.number()]))
			.min(2, 'Route must have at least 2 points')
	}),
	mode_segments: z.array(modeSegmentSchema).optional()
});

export const userProfileUpdateSchema = z.object({
	full_name: z.string().min(1).max(255),
	username: z.string().min(1).max(64),
	email: z.string().email().max(255),
	avatar_url: z.string().url().max(2048).nullable().optional()
});

export const savedRouteCreateSchema = routeMetadataSchema;

export const routeIdParamSchema = z.object({
	routeId: z.coerce.number().int().positive()
});

export const routeChangeTypeSchema = z.enum(routeChangeTypes);
export const routeChangeSeveritySchema = z.enum(routeChangeSeverities);
export const routeNotificationChannelSchema = z.enum(routeNotificationChannels);
export const routeSubscriptionStatusSchema = z.enum(routeSubscriptionStatuses);

export const routeSubscriptionPreferenceSchema = z.object({
	notifyInApp: z.boolean().optional(),
	notifyPush: z.boolean().optional(),
	notifyEmail: z.boolean().optional(),
	alertTypes: z.array(routeChangeTypeSchema).min(1).optional(),
	routeName: z.string().trim().min(1).max(255).optional()
});

export const routeSubscriptionCreateSchema = z.object({
	routeId: z.coerce.number().int().positive(),
	savedRouteId: z.coerce.number().int().positive().nullable().optional(),
	routeName: z.string().trim().min(1).max(255).optional(),
	savedRoute: z.lazy(() => savedRouteSchema).optional(),
	preferences: routeSubscriptionPreferenceSchema.optional()
});

export const routeNotificationReadSchema = z
	.object({
		notificationIds: z.array(z.coerce.number().int().positive()).min(1).optional(),
		markAll: z.boolean().optional()
	})
	.refine((value) => value.markAll || (value.notificationIds?.length ?? 0) > 0, {
		message: 'notificationIds or markAll is required'
	});

export const routeChangeEventCreateSchema = z.object({
	routeId: z.coerce.number().int().positive(),
	changeType: routeChangeTypeSchema,
	severity: routeChangeSeveritySchema.default('medium'),
	title: z.string().trim().min(1).max(160),
	summary: z.string().trim().min(1).max(500),
	dedupeKey: z.string().trim().min(1).max(200),
	changedFields: z.array(z.string().trim().min(1).max(80)).default([]),
	previousSnapshot: z.record(z.string(), z.unknown()).nullable().optional(),
	currentSnapshot: z.record(z.string(), z.unknown()).nullable().optional(),
	metadata: z.record(z.string(), z.unknown()).default({}),
	occurredAt: z.string().datetime().optional(),
	expiresAt: z.string().datetime().nullable().optional(),
	batchWindowStart: z.string().datetime().nullable().optional(),
	batchWindowEnd: z.string().datetime().nullable().optional()
});

// ---------- Supabase output DTO schemas ----------

export const postSummarySchema = z.object({
	post_id: postIdSchema,
	title: z.string(),
	body: z.string(),
	upvotes: z.number().int(),
	downvotes: z.number().int(),
	created_at: z.string(),
	last_edited: z.string()
}) satisfies z.ZodType<
	Pick<
		PostRow,
		'post_id' | 'title' | 'body' | 'upvotes' | 'downvotes' | 'created_at' | 'last_edited'
	>
>;

export const postAuthorSchema = z.object({
	uid: z.string(),
	username: z.string(),
	full_name: z.string()
});

export const postDetailSchema = postSummarySchema.extend({
	author: postAuthorSchema.nullable()
});

export const commentAuthorSchema = z.object({
	uid: z.string(),
	username: z.string(),
	full_name: z.string()
});

export const commentSchema = z.object({
	comment_id: z.number().int(),
	parent_id: postIdSchema,
	created_at: z.string(),
	last_edited: z.string(),
	body: z.string(),
	upvotes: z.number().int(),
	downvotes: z.number().int(),
	linked_post_id: postIdSchema.nullable()
}) satisfies z.ZodType<
	Pick<
		CommentRow,
		| 'comment_id'
		| 'parent_id'
		| 'created_at'
		| 'last_edited'
		| 'body'
		| 'upvotes'
		| 'downvotes'
		| 'linked_post_id'
	>
>;

export const commentWithAuthorSchema = commentSchema.extend({
	author: commentAuthorSchema.nullable()
});

export const notificationSchema = z.object({
	notification_id: z.number().int(),
	kind: z.custom<NotificationKind>(),
	message: z.string(),
	is_read: z.boolean(),
	created_at: z.string(),
	post_id: postIdSchema.nullable(),
	route_id: z.number().int().nullable()
}) satisfies z.ZodType<
	Pick<
		NotificationRow,
		'notification_id' | 'kind' | 'message' | 'is_read' | 'created_at' | 'post_id' | 'route_id'
	>
>;

export const savedRouteSchema = z.object({
	saved_route_id: z.coerce.number().int(),
	geo_route_id: z
		.union([z.coerce.number().int(), z.null()])
		.optional()
		.transform((value) => value ?? null),
	route_name: z.string(),
	start_loc: z.string(),
	end_loc: z.string(),
	vehicle_types: z.array(z.string()),
	pwd_friendly: z.boolean(),
	est_time_of_arrival: z.coerce.number().int(),
	fare: z.coerce.number(),
	created_at: z.string()
});

/** Public `route` table row shape for map search results (canonical routes). */
export const mapRouteSearchHitSchema = z.object({
	route_id: z.coerce.number().int(),
	route_name: z.string(),
	start_loc: z.string(),
	end_loc: z.string()
});

export const userProfileSchema = z.object({
	full_name: z.string(),
	username: z.string(),
	email: z.string().email(),
	avatar_url: z.string().url().nullable()
}) satisfies z.ZodType<Pick<UserRow, 'full_name' | 'username' | 'email' | 'avatar_url'>>;

export const routeSubscriptionSchema = z.object({
	subscription_id: z.number().int(),
	route_id: z.number().int(),
	saved_route_id: z.number().int().nullable(),
	status: routeSubscriptionStatusSchema,
	notify_in_app: z.boolean(),
	notify_push: z.boolean(),
	notify_email: z.boolean(),
	alert_types: z.array(routeChangeTypeSchema),
	created_at: z.string(),
	updated_at: z.string(),
	saved_route: savedRouteSchema.nullable().optional()
});

export const routeNotificationSchema = z.object({
	notification_id: z.number().int(),
	kind: z.literal('route_alert'),
	title: z.string().nullable().optional(),
	message: z.string(),
	is_read: z.boolean(),
	created_at: z.string(),
	read_at: z.string().nullable().optional(),
	route_id: z.number().int().nullable(),
	route_subscription_id: z.number().int().nullable().optional(),
	route_change_event_id: z.number().int().nullable().optional(),
	batch_key: z.string().nullable().optional(),
	metadata: z.record(z.string(), z.unknown()).default({})
});

export const routeChangeEventSchema = z.object({
	route_change_event_id: z.number().int(),
	route_id: z.number().int(),
	change_type: routeChangeTypeSchema,
	severity: routeChangeSeveritySchema,
	title: z.string(),
	summary: z.string(),
	dedupe_key: z.string(),
	changed_fields: z.array(z.string()),
	previous_snapshot: z.record(z.string(), z.unknown()).nullable(),
	current_snapshot: z.record(z.string(), z.unknown()).nullable(),
	metadata: z.record(z.string(), z.unknown()).default({}),
	occurred_at: z.string(),
	expires_at: z.string().nullable(),
	batch_window_start: z.string().nullable(),
	batch_window_end: z.string().nullable(),
	created_at: z.string()
});

// ---------- Inferred types ----------

export type PostSummary = z.infer<typeof postSummarySchema>;
export type PostDetail = z.infer<typeof postDetailSchema>;
export type CommentDTO = z.infer<typeof commentSchema>;
export type CommentWithAuthorDTO = z.infer<typeof commentWithAuthorSchema>;
export type NotificationDTO = z.infer<typeof notificationSchema>;
export type SavedRouteDTO = z.infer<typeof savedRouteSchema>;
export type MapRouteSearchHit = z.infer<typeof mapRouteSearchHitSchema>;
export type UserProfileDTO = z.infer<typeof userProfileSchema>;
export type RouteSubscriptionDTO = z.infer<typeof routeSubscriptionSchema>;
export type RouteSubscriptionPreferenceInput = z.infer<typeof routeSubscriptionPreferenceSchema>;
export type RouteSubscriptionCreateInput = z.infer<typeof routeSubscriptionCreateSchema>;
export type RouteNotificationDTO = z.infer<typeof routeNotificationSchema>;
export type RouteChangeEventDTO = z.infer<typeof routeChangeEventSchema>;
export type RouteVehicleType = z.infer<typeof routeVehicleTypeSchema>;
export type RouteAccessibilityTag = z.infer<typeof routeAccessibilityTagSchema>;
export type RouteMetadataInput = z.infer<typeof routeMetadataSchema>;
export type MapRouteCreateInput = z.infer<typeof mapRouteCreateSchema>;
export type ModeSegment = z.infer<typeof modeSegmentSchema>;
