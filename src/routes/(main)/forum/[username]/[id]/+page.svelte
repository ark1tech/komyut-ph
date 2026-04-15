<script lang="ts">
	import { SendHorizontal, Link2, Search, X, MapPin } from '@lucide/svelte';
	import ForumComment from '$lib/components/forum/ForumComment.svelte';
	import ForumPost from '$lib/components/forum/ForumPost.svelte';
	import ForumSortBar from '$lib/components/forum/ForumSortBar.svelte';
	import type { MapRouteSearchHit } from '$lib/validation/schemas';

	let { data } = $props();
	let post = $derived(data.post);
	let comments = $derived(data.comments ?? []);
	let linkedPosts = $derived(data.linkedPosts ?? {});

	let commentText = $state('');
	let routePickerOpen = $state(false);
	let routeSearchQuery = $state('');
	let routeResults = $state<MapRouteSearchHit[]>([]);
	let routeSearchLoading = $state(false);
	let routeSearchError = $state<string | null>(null);
	let selectedRoute = $state<MapRouteSearchHit | null>(null);

	type SortOption = 'top' | 'hot' | 'latest';
	let commentSort = $state<SortOption>('top');

	let sortedComments = $derived.by(() => {
		const list = [...comments];
		switch (commentSort) {
			case 'top':
			case 'hot':
				return list.sort((a, b) => b.upvotes - b.downvotes - (a.upvotes - a.downvotes));
			case 'latest':
				return list.sort(
					(a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
				);
			default:
				return list;
		}
	});

	function handleRoutePickerKeydown(event: KeyboardEvent) {
		if (event.key === 'Escape' && routePickerOpen) {
			routePickerOpen = false;
		}
	}

	function openRoutePicker() {
		routePickerOpen = true;
		routeSearchQuery = selectedRoute?.route_name ?? '';
	}

	function clearSelectedRoute() {
		selectedRoute = null;
	}

	function selectRoute(route: MapRouteSearchHit) {
		selectedRoute = route;
		routePickerOpen = false;
		routeSearchQuery = route.route_name;
	}

	async function fetchRouteOptions(query: string) {
		routeSearchLoading = true;
		routeSearchError = null;

		try {
			const trimmedQuery = query.trim();
			const endpoint = trimmedQuery
				? `/api/forum/route-links?q=${encodeURIComponent(trimmedQuery)}`
				: '/api/forum/route-links';
			const response = await fetch(endpoint);
			if (!response.ok) {
				throw new Error('Failed to load routes');
			}

			const payload = (await response.json()) as { routes?: MapRouteSearchHit[] };
			routeResults = payload.routes ?? [];
		} catch {
			routeResults = [];
			routeSearchError = 'Unable to load routes right now.';
		} finally {
			routeSearchLoading = false;
		}
	}

	$effect(() => {
		if (!routePickerOpen) return;
		const currentQuery = routeSearchQuery;
		const debounceTimer = setTimeout(() => {
			void fetchRouteOptions(currentQuery);
		}, 250);

		return () => {
			clearTimeout(debounceTimer);
		};
	});
</script>

<svelte:window onkeydown={handleRoutePickerKeydown} />

<svelte:head>
	<title>{post.title} | Komyut PH</title>
</svelte:head>
<div class="flex flex-col">
	<ForumPost
		{post}
		commentCount={comments.length}
		truncate={false}
		linked={false}
		class="rounded-none border-0 bg-primary-foreground p-fluid-md"
		titleClass="text-xl"
	/>

	<!-- comment input -->
	<form
		method="POST"
		action="?/createComment"
		class="m-fluid-sm flex flex-row items-start justify-center gap-3 rounded-2xl border border-border bg-card p-3"
		aria-label="Forum Comment Input"
	>
		<div
			class="grid size-7 shrink-0 place-items-center rounded-full bg-brand/10 text-xs font-semibold text-brand"
		>
			Y
		</div>
		<div class="flex min-w-0 flex-1 flex-col gap-2">
			{#if selectedRoute}
				<div
					class="inline-flex max-w-full items-center gap-2 self-start rounded-full border border-brand/30 bg-brand/10 px-3 py-1.5 text-xs text-brand"
				>
					<MapPin class="size-3.5 shrink-0" />
					<span class="truncate font-medium">{selectedRoute.route_name}</span>
					<button
						type="button"
						onclick={clearSelectedRoute}
						class="rounded-full p-0.5 text-brand/80 transition-colors hover:bg-brand/15 hover:text-brand"
						aria-label="Remove linked route"
					>
						<X class="size-3" />
					</button>
				</div>
			{/if}

			<div class="flex min-w-0 items-center gap-2">
				<textarea
					name="body"
					bind:value={commentText}
					placeholder="Add a comment..."
					rows="1"
					class="flex-1 resize-none bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
				></textarea>

				<input type="hidden" name="parent_id" value={post.post_id} />
				{#if selectedRoute}
					<input type="hidden" name="linked_route_id" value={selectedRoute.route_id} />
				{/if}

				<button
					type="button"
					onclick={openRoutePicker}
					class="shrink-0 rounded-full p-1.5 text-muted-foreground transition-colors hover:text-brand"
					aria-label="Link a route"
				>
					<Link2 class="size-4" />
				</button>
				<button
					type="submit"
					class="shrink-0 rounded-full p-1.5 text-brand transition-opacity disabled:opacity-30"
					disabled={!commentText.trim() && !selectedRoute}
					aria-label="Send comment"
				>
					<SendHorizontal class="size-4" />
				</button>
			</div>
		</div>
	</form>

	{#if comments.length > 0}
		<ForumSortBar active={commentSort} onchange={(v) => (commentSort = v)} class="px-fluid-sm" />

		<div class="space-y-2 pt-2" role="region" aria-label="Forum Comments">
			{#each sortedComments as comment (comment.comment_id)}
				<ForumComment {comment} {linkedPosts} />
			{/each}
		</div>
	{/if}
</div>

{#if routePickerOpen}
	<div
		class="fixed inset-0 z-50 grid place-items-end bg-black/40 p-4 sm:place-items-center"
		aria-hidden="true"
	>
		<button
			type="button"
			onclick={() => (routePickerOpen = false)}
			class="absolute inset-0 cursor-default"
			aria-label="Close route picker"
		></button>

		<div
			role="dialog"
			aria-modal="true"
			aria-labelledby="route-picker-title"
			class="relative z-10 flex h-[min(85vh,34rem)] w-full max-w-xl flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-2xl"
		>
			<header class="flex items-center justify-between border-b border-border px-4 py-3">
				<div>
					<h2 id="route-picker-title" class="text-sm font-semibold text-foreground">
						Link a route
					</h2>
					<p class="text-xs text-muted-foreground">Select a route to attach to this comment.</p>
				</div>
				<button
					type="button"
					onclick={() => (routePickerOpen = false)}
					class="rounded-full p-1.5 text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground"
					aria-label="Close route picker"
				>
					<X class="size-4" />
				</button>
			</header>

			<div class="border-b border-border px-4 py-3">
				<label class="sr-only" for="route-search-input">Search routes</label>
				<div class="relative">
					<Search
						class="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
					/>
					<input
						id="route-search-input"
						type="text"
						bind:value={routeSearchQuery}
						placeholder="Search route name or location"
						class="w-full rounded-xl border border-border bg-background py-2.5 pr-3 pl-10 text-sm text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-brand/40 focus:outline-none"
					/>
				</div>
			</div>

			<div class="flex-1 overflow-y-auto p-3">
				{#if routeSearchLoading}
					<p class="px-2 py-3 text-sm text-muted-foreground">Loading routes...</p>
				{:else if routeSearchError}
					<p class="px-2 py-3 text-sm text-destructive">{routeSearchError}</p>
				{:else if routeResults.length === 0}
					<p class="px-2 py-3 text-sm text-muted-foreground">
						No routes found. Try another search.
					</p>
				{:else}
					<ul class="space-y-1" role="listbox" aria-label="Available routes">
						{#each routeResults as route (route.route_id)}
							<li>
								<button
									type="button"
									onclick={() => selectRoute(route)}
									class="flex w-full items-start gap-2 rounded-xl border border-transparent px-3 py-2 text-left transition-colors hover:border-brand/30 hover:bg-brand/5"
								>
									<MapPin class="mt-0.5 size-4 shrink-0 text-brand" />
									<span class="min-w-0">
										<span class="block truncate text-sm font-medium text-foreground"
											>{route.route_name}</span
										>
										<span class="block truncate text-xs text-muted-foreground"
											>{route.start_loc} <span aria-hidden="true">→</span> {route.end_loc}</span
										>
									</span>
								</button>
							</li>
						{/each}
					</ul>
				{/if}
			</div>
		</div>
	</div>
{/if}
