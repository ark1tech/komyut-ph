<script lang="ts">
	import { browser } from '$app/environment';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { resolve } from '$app/paths';
	import { MessageCircle, Route, Search, X } from '@lucide/svelte';
	import type { SavedRouteDTO } from '$lib/validation/schemas';

	type SearchType = 'forum' | 'route' | 'keyword';

	type RecentSearchItem = {
		query: string;
		type: SearchType;
		id?: number;
		label?: string;
		username?: string;
	};

	type PostSearchItem = {
		post_id: number;
		title: string;
		author: {
			username: string;
		} | null;
	};

	type SearchResponse = {
		suggestions: string[];
		routes: SavedRouteDTO[];
		posts: PostSearchItem[];
	};

	const STORAGE_KEY = 'komyut-recent-search';
	const MAX_RECENT_ITEMS = 10;
	const DEBOUNCE_MS = 250;

	let debounceTimer: number | null = null;
	let activeController: AbortController | null = null;

	let query = $state('');
	let isOpen = $state(false);
	let recent = $state<RecentSearchItem[]>([]);
	let suggestions = $state<string[]>([]);
	let routes = $state<SavedRouteDTO[]>([]);
	let posts = $state<PostSearchItem[]>([]);
	let isLoading = $state(false);
	let searchReturnedEmpty = $state(false);
	let removingRecent = $state(false);

	const hasQuery = $derived(query.trim().length > 0);
	const trimmedQuery = $derived(query.trim());
	/** While typing/loading: show user's query first so they can select it. After search with no results: don't show query, only the "No results" subsection. */
	const effectiveSuggestions = $derived(
		!trimmedQuery
			? []
			: searchReturnedEmpty
				? suggestions.filter(
						(s) => s.toLowerCase() !== trimmedQuery.toLowerCase()
					)
				: [
						trimmedQuery,
						...suggestions.filter(
							(s) => s.toLowerCase() !== trimmedQuery.toLowerCase()
						)
					]
			);

	const isForumPage = $derived(page.url.pathname.startsWith('/forum'));

	if (browser) {
		readRecent();
	}

	function readRecent() {
		if (!browser) return;

		try {
			const raw = localStorage.getItem(STORAGE_KEY);
			if (!raw) {
				recent = [];
				return;
			}

			const parsed = JSON.parse(raw) as unknown;
			if (!Array.isArray(parsed)) {
				recent = [];
				return;
			}

			recent = parsed
				.filter((entry): entry is RecentSearchItem => {
					return (
						typeof entry === 'object' &&
						entry !== null &&
						'type' in entry &&
						'query' in entry &&
						typeof (entry as { type: unknown }).type === 'string' &&
						typeof (entry as { query: unknown }).query === 'string'
					);
				})
				.slice(0, MAX_RECENT_ITEMS);
		} catch (err) {
			console.warn('Unable to parse recent searches', err);
			recent = [];
		}
	}

	function saveRecent(nextItems: RecentSearchItem[]) {
		recent = nextItems.slice(0, MAX_RECENT_ITEMS);
		if (!browser) return;
		localStorage.setItem(STORAGE_KEY, JSON.stringify(recent));
	}

	function addRecent(item: RecentSearchItem) {
		const normalized = item.query.trim();
		if (!normalized) return;

		const deduped = recent.filter((entry) => {
			if (entry.type === item.type && entry.id && item.id) {
				return !(entry.id === item.id);
			}

			return !(entry.type === item.type && entry.query.toLowerCase() === normalized.toLowerCase());
		});

		saveRecent([{ ...item, query: normalized }, ...deduped]);
	}

	function removeRecent(index: number) {
		removingRecent = true;
		saveRecent(recent.filter((_, i) => i !== index));
	}

	function clearResults() {
		suggestions = [];
		routes = [];
		posts = [];
		searchReturnedEmpty = false;
	}

	function cancelPendingSearch() {
		if (debounceTimer) {
			window.clearTimeout(debounceTimer);
			debounceTimer = null;
		}

		if (activeController) {
			activeController.abort();
			activeController = null;
		}
	}

	async function fetchSearchResults(searchQuery: string, signal: AbortSignal) {
		const response = await fetch(`/api/search?q=${encodeURIComponent(searchQuery)}`, { signal });
		if (!response.ok) {
			throw new Error(`Search failed: ${response.status}`);
		}

		const data = (await response.json()) as SearchResponse;
		suggestions = data.suggestions ?? [];
		routes = data.routes ?? [];
		posts = data.posts ?? [];
		// No results = no routes and no posts (API always returns query in suggestions)
		searchReturnedEmpty = routes.length === 0 && posts.length === 0;
	}

	function closeDropdown() {
		isOpen = false;
	}

	function handleFocus() {
		isOpen = true;
		if (!hasQuery) {
			readRecent();
		}
		scheduleSearch();
	}

	function handleFocusOut(event: FocusEvent) {
		if (removingRecent) {
			removingRecent = false;
			return;
		}
		const next = event.relatedTarget as Node | null;
		const current = event.currentTarget as HTMLElement | null;
		if (!next || !current?.contains(next)) {
			closeDropdown();
		}
	}

	function handleInputKeydown(event: KeyboardEvent) {
		if (event.key === 'Escape') {
			closeDropdown();
			const element = event.currentTarget as HTMLElement | null;
			element?.blur();
		}
	}

	function scheduleSearch() {
		if (!browser) return;
		cancelPendingSearch();

		const searchQuery = query.trim();
		if (!isOpen || !searchQuery) {
			isLoading = false;
			clearResults();
			return;
		}

		const controller = new AbortController();
		activeController = controller;
		debounceTimer = window.setTimeout(async () => {
			isLoading = true;
			searchReturnedEmpty = false;
			try {
				await fetchSearchResults(searchQuery, controller.signal);
			} catch (err) {
				if ((err as Error).name !== 'AbortError') {
					console.error(err);
					clearResults();
				}
			} finally {
				isLoading = false;
				activeController = null;
				debounceTimer = null;
			}
		}, DEBOUNCE_MS);
	}

	async function selectRoute(route: SavedRouteDTO) {
		addRecent({
			query: route.route_name,
			type: 'route',
			id: route.saved_route_id,
			label: route.route_name
		});

		closeDropdown();
		await goto(resolve(`/map?route=${route.saved_route_id}`));
	}

	async function selectPost(post: PostSearchItem) {
		const username = post.author?.username;
		if (!username) return;

		addRecent({
			query: post.title,
			type: 'forum',
			id: post.post_id,
			label: post.title,
			username
		});

		closeDropdown();
		await goto(resolve(`/forum/${username}/${post.post_id}`));
	}

	function selectKeyword(keyword: string) {
		query = keyword;
		addRecent({ query: keyword, type: 'keyword', label: keyword });
		closeDropdown();
	}

	function clearQuery() {
		query = '';
		readRecent();
		isOpen = true;
		cancelPendingSearch();
		clearResults();
	}

	function onSubmit(event: Event) {
		event.preventDefault();
		const normalized = query.trim();
		if (!normalized) return;

		selectKeyword(normalized);
	}

	function selectRecent(item: RecentSearchItem) {
		if (item.type === 'route' && item.id) {
			addRecent(item);
			closeDropdown();
			void goto(resolve(`/map?route=${item.id}`));
			return;
		}

		if (item.type === 'forum' && item.id && item.username) {
			addRecent(item);
			closeDropdown();
			void goto(resolve(`/forum/${item.username}/${item.id}`));
			return;
		}

		selectKeyword(item.query);
	}
</script>

<div
	class="relative h-full w-full"
	role="combobox"
	aria-expanded={isOpen}
	aria-controls="unified-search-dropdown"
	aria-haspopup="listbox"
	onfocusout={handleFocusOut}
>
	<form onsubmit={onSubmit} class="relative">
		<Search class="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
		<input
			type="text"
			bind:value={query}
			onfocus={handleFocus}
			oninput={scheduleSearch}
			onkeydown={handleInputKeydown}
			placeholder="Search routes and forum..."
			aria-label="Search routes and forum posts"
			class="w-full rounded-xl border border-border bg-card py-2.5 pr-10 pl-10 text-sm text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-brand/40 focus:outline-none"
		/>
		{#if hasQuery}
			<button
				type="button"
				onclick={clearQuery}
				class="absolute top-1/2 right-2 grid size-6 -translate-y-1/2 place-items-center rounded-full text-muted-foreground hover:bg-muted/70 hover:text-foreground"
				aria-label="Clear search"
			>
				<X class="size-4" />
			</button>
		{/if}
	</form>

	{#if isOpen}
		<div
			id="unified-search-dropdown"
			class="absolute top-[calc(100%+0.5rem)] z-50 w-full rounded-xl border border-border bg-card p-2 shadow-md"
			role="listbox"
		>
			{#if !hasQuery}
				<div class="space-y-1">
					<p class="px-2 py-1 text-xs font-semibold tracking-wide text-muted-foreground uppercase">Recent</p>
					{#if recent.length === 0}
						<p class="px-2 py-2 text-sm text-muted-foreground">No recent searches yet.</p>
					{:else}
						{#each recent as item, idx (`${item.type}-${item.id ?? item.query}-${idx}`)}
							<div class="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-accent/70">
								<button
									type="button"
									onclick={() => selectRecent(item)}
									class="flex min-w-0 flex-1 items-center gap-2 text-left"
								>
									<Search class="size-4 shrink-0 text-muted-foreground" />
									<span class="truncate text-sm text-foreground">{item.label ?? item.query}</span>
								</button>
								<button
									type="button"
									onclick={() => removeRecent(idx)}
									class="grid size-6 shrink-0 place-items-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"
									aria-label="Remove recent search"
								>
									<X class="size-3.5" />
								</button>
							</div>
						{/each}
					{/if}
				</div>
			{:else}
				<div class="space-y-2">
					{#if effectiveSuggestions.length > 0}
						<div class="space-y-1">
							<p class="px-2 py-1 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
								Suggestions
							</p>
							{#each effectiveSuggestions as suggestion (suggestion)}
								<button
									type="button"
									onclick={() => selectKeyword(suggestion)}
									class="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left hover:bg-accent/70"
								>
									<Search class="size-4 text-muted-foreground" />
									<span class="truncate text-sm text-foreground">{suggestion}</span>
								</button>
							{/each}
						</div>
					{/if}

					{#if isForumPage}
						{#if !isLoading && posts.length > 0}
							<div class="space-y-1">
								<p class="px-2 py-1 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
									Forum
								</p>
								{#each posts as post (post.post_id)}
									<button
										type="button"
										onclick={() => selectPost(post)}
										class="flex w-full items-start gap-2 rounded-lg px-2 py-1.5 text-left hover:bg-accent/70"
									>
										<MessageCircle class="mt-0.5 size-4 shrink-0 text-muted-foreground" />
										<span class="min-w-0">
											<span class="block truncate text-sm font-medium text-foreground">{post.title}</span>
											<span class="block truncate text-xs text-muted-foreground">
												{post.author?.username ? `@${post.author.username}` : 'Unknown author'}
											</span>
										</span>
									</button>
								{/each}
							</div>
						{/if}
						{#if !isLoading && routes.length > 0}
							<div class="space-y-1">
								<p class="px-2 py-1 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
									Routes
								</p>
								{#each routes as route (route.saved_route_id)}
									<button
										type="button"
										onclick={() => selectRoute(route)}
										class="flex w-full items-start gap-2 rounded-lg px-2 py-1.5 text-left hover:bg-accent/70"
									>
										<Route class="mt-0.5 size-4 shrink-0 text-muted-foreground" />
										<span class="min-w-0">
											<span class="block truncate text-sm font-medium text-foreground">{route.route_name}</span>
											<span class="block truncate text-xs text-muted-foreground">
												{route.start_loc} <span aria-hidden="true">-></span> {route.end_loc}
											</span>
										</span>
									</button>
								{/each}
							</div>
						{/if}
					{:else}
						{#if !isLoading && routes.length > 0}
							<div class="space-y-1">
								<p class="px-2 py-1 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
									Routes
								</p>
								{#each routes as route (route.saved_route_id)}
									<button
										type="button"
										onclick={() => selectRoute(route)}
										class="flex w-full items-start gap-2 rounded-lg px-2 py-1.5 text-left hover:bg-accent/70"
									>
										<Route class="mt-0.5 size-4 shrink-0 text-muted-foreground" />
										<span class="min-w-0">
											<span class="block truncate text-sm font-medium text-foreground">{route.route_name}</span>
											<span class="block truncate text-xs text-muted-foreground">
												{route.start_loc} <span aria-hidden="true">-></span> {route.end_loc}
											</span>
										</span>
									</button>
								{/each}
							</div>
						{/if}
						{#if !isLoading && posts.length > 0}
							<div class="space-y-1">
								<p class="px-2 py-1 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
									Forum
								</p>
								{#each posts as post (post.post_id)}
									<button
										type="button"
										onclick={() => selectPost(post)}
										class="flex w-full items-start gap-2 rounded-lg px-2 py-1.5 text-left hover:bg-accent/70"
									>
										<MessageCircle class="mt-0.5 size-4 shrink-0 text-muted-foreground" />
										<span class="min-w-0">
											<span class="block truncate text-sm font-medium text-foreground">{post.title}</span>
											<span class="block truncate text-xs text-muted-foreground">
												{post.author?.username ? `@${post.author.username}` : 'Unknown author'}
											</span>
										</span>
									</button>
								{/each}
							</div>
						{/if}
					{/if}

					{#if isLoading}
						<p class="px-2 py-1 text-xs text-muted-foreground">Searching...</p>
					{/if}

					{#if !isLoading && searchReturnedEmpty}
						<p class="px-2 py-2 text-sm text-muted-foreground">No results found</p>
					{/if}
				</div>
			{/if}
		</div>
	{/if}
</div>
