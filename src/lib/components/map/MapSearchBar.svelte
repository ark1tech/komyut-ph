<script lang="ts">
	import { browser } from '$app/environment';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { resolve } from '$app/paths';
	import { Route, Search, X } from '@lucide/svelte';
	import {
		searchMockCanonicalRouteHits,
		type MapSearchPreference
	} from '$lib/data/mock_routes';
	import type { MapRouteSearchHit } from '$lib/validation/schemas';

	type RouteSearchResponse = {
		routes: MapRouteSearchHit[];
	};

	const DEBOUNCE_MS = 250;

	let debounceTimer: number | null = null;
	let activeController: AbortController | null = null;

	let query = $state('');
	let searchPreference = $state<MapSearchPreference>('start');
	let isOpen = $state(false);
	let routes = $state<MapRouteSearchHit[]>([]);
	let isLoading = $state(false);
	let searchError = $state(false);

	const hasQuery = $derived(query.trim().length > 0);
	const hasSession = $derived(Boolean(page.data.session));

	function clearResults() {
		routes = [];
		searchError = false;
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

	async function fetchRouteResults(
		searchQuery: string,
		prefer: MapSearchPreference,
		signal: AbortSignal
	) {
		const params = new URLSearchParams({
			q: searchQuery,
			prefer
		});
		const response = await fetch(`/api/map/route-search?${params.toString()}`, {
			signal
		});
		if (!response.ok) {
			throw new Error(`Search failed: ${response.status}`);
		}

		const data = (await response.json()) as RouteSearchResponse;
		routes = data.routes ?? [];
		searchError = false;
	}

	function closeDropdown() {
		isOpen = false;
	}

	function handleFocus() {
		isOpen = true;
		scheduleSearch();
	}

	function handleFocusOut(event: FocusEvent) {
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

		if (!hasSession) {
			const prefer = searchPreference;
			debounceTimer = window.setTimeout(() => {
				routes = searchMockCanonicalRouteHits(searchQuery, prefer);
				isLoading = false;
				searchError = false;
				debounceTimer = null;
			}, DEBOUNCE_MS);
			isLoading = true;
			return;
		}

		const controller = new AbortController();
		const prefer = searchPreference;
		activeController = controller;
		debounceTimer = window.setTimeout(async () => {
			isLoading = true;
			searchError = false;
			try {
				await fetchRouteResults(searchQuery, prefer, controller.signal);
			} catch (err) {
				if ((err as Error).name !== 'AbortError') {
					console.error(err);
					clearResults();
					searchError = true;
				}
			} finally {
				isLoading = false;
				activeController = null;
				debounceTimer = null;
			}
		}, DEBOUNCE_MS);
	}

	async function selectRoute(route: MapRouteSearchHit) {
		closeDropdown();
		await goto(resolve(`/map?route=${route.route_id}`));
	}

	function clearQuery() {
		query = '';
		isOpen = true;
		cancelPendingSearch();
		clearResults();
	}

	function onSubmit(event: Event) {
		event.preventDefault();
	}
</script>

<section aria-label="Search routes on map" class="absolute right-0 bottom-5 left-0 z-10 px-4 md:px-6">
	<div
		class="relative w-full"
		role="combobox"
		aria-expanded={isOpen}
		aria-controls="map-search-dropdown"
		aria-haspopup="listbox"
		onfocusout={handleFocusOut}
	>
		<div class="rounded-xl border border-border bg-background/95 p-3 shadow-lg backdrop-blur-sm">
			<form onsubmit={onSubmit} class="relative">
				<Search
					class="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
				/>
				<input
					type="text"
					bind:value={query}
					onfocus={handleFocus}
					oninput={scheduleSearch}
					onkeydown={handleInputKeydown}
					placeholder="Search by route name or place…"
					aria-label="Search routes; use preferences below to match route name, start, or end"
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

			<div
				class="mt-3 border-border border-t pt-3"
				role="radiogroup"
				aria-label="Search match: route name, start location, or end location"
			>
				<p class="mb-1.5 text-[0.7rem] font-medium tracking-wide text-muted-foreground uppercase">
					Preferences
				</p>
				<div
					class="grid grid-cols-3 gap-0.5 rounded-lg border border-border bg-muted/35 p-0.5"
				>
					<label
						class="flex min-w-0 cursor-pointer items-center justify-center rounded-md px-1 py-1.5 text-center text-[0.65rem] leading-tight font-medium transition-colors sm:px-1.5 sm:text-xs has-[:checked]:bg-card has-[:checked]:text-foreground has-[:checked]:shadow-sm"
					>
						<input
							type="radio"
							name="map-search-preference"
							value="start"
							bind:group={searchPreference}
							onchange={scheduleSearch}
							class="sr-only"
						/>
						Start Location
					</label>
					<label
						class="flex min-w-0 cursor-pointer items-center justify-center rounded-md px-1 py-1.5 text-center text-[0.65rem] leading-tight font-medium transition-colors sm:px-1.5 sm:text-xs has-[:checked]:bg-card has-[:checked]:text-foreground has-[:checked]:shadow-sm"
					>
						<input
							type="radio"
							name="map-search-preference"
							value="end"
							bind:group={searchPreference}
							onchange={scheduleSearch}
							class="sr-only"
						/>
						End Location
					</label>
					<label
						class="flex min-w-0 cursor-pointer items-center justify-center rounded-md px-1 py-1.5 text-center text-[0.65rem] leading-tight font-medium transition-colors sm:px-1.5 sm:text-xs has-[:checked]:bg-card has-[:checked]:text-foreground has-[:checked]:shadow-sm"
					>
						<input
							type="radio"
							name="map-search-preference"
							value="route_name"
							bind:group={searchPreference}
							onchange={scheduleSearch}
							class="sr-only"
						/>
						Route Name
					</label>
				</div>
			</div>
		</div>

		{#if isOpen}
			<div
				id="map-search-dropdown"
				class="absolute bottom-full left-0 z-50 mb-2 max-h-[min(40vh,20rem)] w-full overflow-y-auto rounded-xl border border-border bg-card p-2 shadow-md"
				role="listbox"
			>
				{#if !hasQuery}
					<p class="px-2 py-2 text-sm text-muted-foreground">Type a route or place name.</p>
				{:else if isLoading}
					<p class="px-2 py-2 text-xs text-muted-foreground">Searching…</p>
				{:else if searchError}
					<p class="px-2 py-2 text-sm text-destructive">Something went wrong. Try again.</p>
				{:else if routes.length === 0}
					<p class="px-2 py-2 text-sm text-muted-foreground">No routes found.</p>
				{:else}
					{#each routes as route (route.route_id)}
						<button
							type="button"
							onclick={() => void selectRoute(route)}
							class="flex w-full items-start gap-2 rounded-lg px-2 py-1.5 text-left hover:bg-accent/70"
						>
							<Route class="mt-0.5 size-4 shrink-0 text-muted-foreground" />
							<span class="min-w-0">
								<span class="block truncate text-sm font-medium text-foreground">{route.route_name}</span>
								<span class="block truncate text-xs text-muted-foreground">
									{route.start_loc}
									<span aria-hidden="true">→</span>
									{route.end_loc}
								</span>
							</span>
						</button>
					{/each}
				{/if}
			</div>
		{/if}
	</div>
</section>
