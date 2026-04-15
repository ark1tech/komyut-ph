import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '$lib/types/database';
import {
	routeAccessibilityTagSchema,
	type RouteAccessibilityTag
} from '$lib/validation/schemas';

/**
 * `route_tag` is not in generated DB types yet, so we use runtime validation.
 */
type UntypedSupabase = {
	from: (table: string) => {
		select: (columns: string) => {
			eq: (column: string, value: unknown) => Promise<{ data: unknown; error: unknown }>;
		};
	};
};

function asUntypedClient(supabase: SupabaseClient<Database>): UntypedSupabase {
	return supabase as unknown as UntypedSupabase;
}

export async function listRouteTags(
	supabase: SupabaseClient<Database>,
	routeId: number
): Promise<RouteAccessibilityTag[]> {
	const client = asUntypedClient(supabase);
	const { data, error } = await client
		.from('route_tag')
		.select('tag:tag_id(text)')
		.eq('route_id', routeId);

	if (error) {
		console.error('Failed to load route tags', error);
		return [];
	}

	if (!Array.isArray(data)) {
		return [];
	}

	const tagTextSet = new Set<RouteAccessibilityTag>();
	for (const row of data) {
		const payload = row as { tag?: { text?: unknown } | Array<{ text?: unknown }> | null };
		const tagValue = Array.isArray(payload.tag) ? payload.tag[0]?.text : payload.tag?.text;
		const parsed = routeAccessibilityTagSchema.safeParse(tagValue);
		if (parsed.success) {
			tagTextSet.add(parsed.data);
		}
	}

	return [...tagTextSet].sort((a, b) => a.localeCompare(b));
}

type TagLookupClient = {
	from: (table: string) => {
		select: (columns: string) => {
			in: (column: string, values: unknown[]) => Promise<{ data: unknown; error: unknown }>;
		};
	};
};

type TagInsertClient = {
	from: (table: string) => {
		insert: (values: Array<{ route_id: number; tag_id: number }>) => Promise<{ error: unknown }>;
	};
};

function asTagLookupClient(supabase: SupabaseClient<Database>): TagLookupClient {
	return supabase as unknown as TagLookupClient;
}

function asTagInsertClient(supabase: SupabaseClient<Database>): TagInsertClient {
	return supabase as unknown as TagInsertClient;
}

export async function resolveRouteTagIds(
	supabase: SupabaseClient<Database>,
	tags: RouteAccessibilityTag[]
): Promise<number[] | null> {
	if (tags.length === 0) return [];

	const client = asTagLookupClient(supabase);
	const { data, error } = await client.from('tag').select('tag_id, text').in('text', tags);

	if (error) {
		console.error('Failed to resolve route tags', error);
		return null;
	}

	if (!Array.isArray(data)) {
		return null;
	}

	const idsByTag = new Map<RouteAccessibilityTag, number>();
	for (const row of data) {
		const item = row as { tag_id?: unknown; text?: unknown };
		const parsedText = routeAccessibilityTagSchema.safeParse(item.text);
		if (!parsedText.success || typeof item.tag_id !== 'number') continue;
		idsByTag.set(parsedText.data, item.tag_id);
	}

	if (idsByTag.size !== tags.length) {
		return null;
	}

	return tags.map((tag) => idsByTag.get(tag)!);
}

export async function attachRouteTags(
	supabase: SupabaseClient<Database>,
	routeId: number,
	tags: RouteAccessibilityTag[]
): Promise<'ok' | 'unsupported' | 'failed'> {
	const uniqueTags = [...new Set(tags)];
	if (uniqueTags.length === 0) return 'ok';

	const tagIds = await resolveRouteTagIds(supabase, uniqueTags);
	if (!tagIds) return 'unsupported';

	const client = asTagInsertClient(supabase);
	const { error } = await client.from('route_tag').insert(
		tagIds.map((tag_id) => ({ route_id: routeId, tag_id }))
	);

	if (error) {
		console.error('Failed to attach route tags', error);
		return 'failed';
	}

	return 'ok';
}
