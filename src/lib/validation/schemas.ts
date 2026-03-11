import { z } from 'zod';
import type {
	CommentRow,
	NotificationKind,
	NotificationRow,
	PostRow,
	SavedRouteRow,
	UserRow
} from '$lib/types/database';

// ---------- Input / params schemas ----------

export const loginEmailSchema = z.string().email().max(255);

export const passwordSchema = z.string().min(8).max(128);

export const forumPostParamsSchema = z.object({
	username: z.string().min(1).max(255),
	id: z
		.string()
		.regex(/^\d+$/)
		.transform((v: string) => Number(v))
});

export const mapLocationQuerySchema = z.object({
	q: z
		.string()
		.trim()
		.min(1, 'Search query is required')
		.max(120, 'Search query is too long')
});

export const mapRouteQuerySchema = z.object({
	end: z
		.string()
		.regex(/^\d+$/, 'end must be a positive integer')
		.transform((v: string) => Number(v))
});

export const userProfileUpdateSchema = z.object({
	full_name: z.string().min(1).max(255),
	username: z.string().min(1).max(64),
	email: z.string().email().max(255),
	avatar_url: z.string().url().max(2048).nullable().optional()
});

export const savedRouteCreateSchema = z.object({
	route_name: z.string().min(1).max(255),
	start_loc: z.string().min(1).max(255),
	end_loc: z.string().min(1).max(255),
	vehicle_types: z.array(z.string().min(1)).min(1),
	pwd_friendly: z.boolean().default(false),
	est_time_of_arrival: z.number().int().positive(),
	fare: z.number().nonnegative()
});

// ---------- Supabase output DTO schemas ----------

export const postSummarySchema = z.object({
	post_id: z.number().int(),
	title: z.string(),
	body: z.string(),
	upvotes: z.number().int(),
	downvotes: z.number().int(),
	created_at: z.string(),
	last_edited: z.string()
}) satisfies z.ZodType<Pick<PostRow, 'post_id' | 'title' | 'body' | 'upvotes' | 'downvotes' | 'created_at' | 'last_edited'>>;

export const postAuthorSchema = z.object({
	uid: z.string(),
	username: z.string(),
	full_name: z.string()
});

export const postDetailSchema = postSummarySchema.extend({
	author: postAuthorSchema.nullable()
});

export const commentSchema = z.object({
	comment_id: z.number().int(),
	parent_id: z.number().int(),
	created_at: z.string(),
	last_edited: z.string(),
	body: z.string(),
	upvotes: z.number().int(),
	downvotes: z.number().int(),
	linked_post_id: z.number().int().nullable()
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

export const notificationSchema = z.object({
	notification_id: z.number().int(),
	kind: z.custom<NotificationKind>(),
	message: z.string(),
	is_read: z.boolean(),
	created_at: z.string(),
	post_id: z.number().int().nullable(),
	route_id: z.number().int().nullable()
}) satisfies z.ZodType<
	Pick<
		NotificationRow,
		| 'notification_id'
		| 'kind'
		| 'message'
		| 'is_read'
		| 'created_at'
		| 'post_id'
		| 'route_id'
	>
>;

export const savedRouteSchema = z.object({
	saved_route_id: z.number().int(),
	route_name: z.string(),
	start_loc: z.string(),
	end_loc: z.string(),
	vehicle_types: z.array(z.string()),
	pwd_friendly: z.boolean(),
	est_time_of_arrival: z.number(),
	fare: z.number(),
	created_at: z.string()
}) satisfies z.ZodType<
	Pick<
		SavedRouteRow,
		| 'saved_route_id'
		| 'route_name'
		| 'start_loc'
		| 'end_loc'
		| 'vehicle_types'
		| 'pwd_friendly'
		| 'est_time_of_arrival'
		| 'fare'
		| 'created_at'
	>
>;

export const userProfileSchema = z.object({
	full_name: z.string(),
	username: z.string(),
	email: z.string().email(),
	avatar_url: z.string().url().nullable()
}) satisfies z.ZodType<Pick<UserRow, 'full_name' | 'username' | 'email' | 'avatar_url'>>;

// ---------- Inferred types ----------

export type PostSummary = z.infer<typeof postSummarySchema>;
export type PostDetail = z.infer<typeof postDetailSchema>;
export type CommentDTO = z.infer<typeof commentSchema>;
export type NotificationDTO = z.infer<typeof notificationSchema>;
export type SavedRouteDTO = z.infer<typeof savedRouteSchema>;
export type UserProfileDTO = z.infer<typeof userProfileSchema>;

