<script lang="ts">
	import { browser } from '$app/environment';
	import {
		AlertCircle,
		ArrowRight,
		Loader2,
		MapPin,
		Navigation2,
		Search,
		X
	} from '@lucide/svelte';

	interface WalkLeg {
		type: 'walk';
		distance_m: number;
		from: [number, number];
		to: [number, number];
	}

	interface RideLeg {
		type: 'ride';
		route_id: number;
		route_name: string;
		mode: string;
		board: [number, number];
		alight: [number, number];
		geometry: GeoJSON.LineString;
	}

	type ItineraryLeg = WalkLeg | RideLeg;
	type NavigateResponse = {
		itinerary: ItineraryLeg[] | null;
		summary?: { transfers: number; walk_distance_m: number };
		message?: string;
	};
	type SearchSuggestionResponse = {
		routes: Array<{
			route_id: number;
			route_name: string;
			start_loc: string;
			end_loc: string;
		}>;
	};
	type ActiveField = 'from' | 'to' | null;

	const DEBOUNCE_MS = 250;
	const CURRENT_LOCATION_SUGGESTION = 'Current location';
	const GEO_TOKEN_PREFIX = 'geo:';
	const GEOLOCATION_TIMEOUT_MS = 10000;

	export interface NavigationResult {
		itinerary: ItineraryLeg[];
		summary: {
			transfers: number;
			walk_distance_m: number;
		};
		fromName: string;
		toName: string;
	}

	interface Props {
		onnav?: (result: NavigationResult) => void;
		onclose?: () => void;
	}

	let { onnav, onclose }: Props = $props();

	let fromQuery = $state('');
	let toQuery = $state('');
	let isNavigating = $state(false);
	let errorMessage = $state<string | null>(null);
	let activeField = $state<ActiveField>(null);
	let isOpen = $state(false);
	let suggestions = $state<string[]>([]);
	let isSearching = $state(false);
	let searchError = $state(false);
	let fromOverrideToken = $state<string | null>(null);
	let toOverrideToken = $state<string | null>(null);

	let debounceTimer: number | null = null;
	let activeController: AbortController | null = null;

	const activeQuery = $derived(
		activeField === 'from' ? fromQuery : activeField === 'to' ? toQuery : ''
	);
	const displaySuggestions = $derived.by(() => {
		const merged = [CURRENT_LOCATION_SUGGESTION];
		const trimmedActiveQuery = activeQuery.trim();
		if (trimmedActiveQuery) {
			merged.push(trimmedActiveQuery);
		}
		merged.push(...suggestions);

		const seen: Record<string, true> = {};
		return merged.filter((entry) => {
			const normalized = entry.trim().toLowerCase();
			if (!normalized || seen[normalized]) return false;
			seen[normalized] = true;
			return true;
		});
	});
	const canSubmit = $derived(
		fromQuery.trim().length > 0 && toQuery.trim().length > 0 && !isNavigating
	);

	function clearResults() {
		suggestions = [];
		searchError = false;
	}

	function buildCoordinateToken(lat: number, lng: number): string {
		return `${GEO_TOKEN_PREFIX}${lat.toFixed(7)},${lng.toFixed(7)}`;
	}

	function clearCoordinateOverride(field: Exclude<ActiveField, null>) {
		if (field === 'from') {
			fromOverrideToken = null;
			return;
		}
		toOverrideToken = null;
	}

	function cancelPendingSearch() {
		if (!browser) return;

		if (debounceTimer) {
			window.clearTimeout(debounceTimer);
			debounceTimer = null;
		}

		if (activeController) {
			activeController.abort();
			activeController = null;
		}
	}

	async function fetchSuggestions(searchQuery: string, signal: AbortSignal) {
		const prefer = activeField === 'to' ? 'end' : 'start';
		const params = new URLSearchParams({
			q: searchQuery,
			prefer
		});
		const response = await fetch(`/api/map/route-search?${params.toString()}`, { signal });
		if (!response.ok) {
			throw new Error(`Search failed: ${response.status}`);
		}

		const data = (await response.json()) as SearchSuggestionResponse;
		const normalized = searchQuery.toLowerCase();
		const source =
			activeField === 'to'
				? (data.routes ?? []).map((route) => route.end_loc)
				: (data.routes ?? []).map((route) => route.start_loc);

		const uniqueSuggestions = Array.from(new Set(source.map((entry) => entry.trim()).filter(Boolean)));
		suggestions = uniqueSuggestions.filter((entry) => entry.toLowerCase() !== normalized);
		searchError = false;
	}

	function closeDropdown() {
		isOpen = false;
		activeField = null;
		cancelPendingSearch();
		isSearching = false;
	}

	function handleFocus(field: Exclude<ActiveField, null>) {
		activeField = field;
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

		const searchQuery = activeQuery.trim();
		if (!isOpen || !searchQuery || !activeField) {
			isSearching = false;
			clearResults();
			return;
		}

		const controller = new AbortController();
		activeController = controller;
		debounceTimer = window.setTimeout(async () => {
			isSearching = true;
			searchError = false;
			try {
				await fetchSuggestions(searchQuery, controller.signal);
			} catch (err) {
				if ((err as Error).name !== 'AbortError') {
					console.error(err);
					clearResults();
					searchError = true;
				}
			} finally {
				isSearching = false;
				activeController = null;
				debounceTimer = null;
			}
		}, DEBOUNCE_MS);
	}

	function applySuggestion(value: string) {
		if (value === CURRENT_LOCATION_SUGGESTION) {
			void applyCurrentLocation();
			return;
		}

		if (activeField === 'from') {
			fromQuery = value;
			clearCoordinateOverride('from');
		} else if (activeField === 'to') {
			toQuery = value;
			clearCoordinateOverride('to');
		}
		closeDropdown();
	}

	function getCurrentPosition(): Promise<GeolocationPosition> {
		return new Promise((resolve, reject) => {
			if (!browser || !('geolocation' in navigator)) {
				reject(new Error('geolocation_unavailable'));
				return;
			}

			navigator.geolocation.getCurrentPosition(resolve, reject, {
				enableHighAccuracy: true,
				timeout: GEOLOCATION_TIMEOUT_MS,
				maximumAge: 0
			});
		});
	}

	async function applyCurrentLocation() {
		if (!activeField) return;

		try {
			errorMessage = null;
			const position = await getCurrentPosition();
			const { latitude, longitude } = position.coords;
			const token = buildCoordinateToken(latitude, longitude);

			if (activeField === 'from') {
				fromQuery = CURRENT_LOCATION_SUGGESTION;
				fromOverrideToken = token;
			} else {
				toQuery = CURRENT_LOCATION_SUGGESTION;
				toOverrideToken = token;
			}

			closeDropdown();
		} catch (error) {
			const geolocationError = error as GeolocationPositionError | Error;
			if ('code' in geolocationError) {
				if (geolocationError.code === geolocationError.PERMISSION_DENIED) {
					errorMessage =
						'Location access is blocked. Allow location permission in your browser to use Current location.';
				} else if (geolocationError.code === geolocationError.TIMEOUT) {
					errorMessage = 'Getting your location took too long. Please try again.';
				} else {
					errorMessage = 'Could not get your current location. You can enter a place manually.';
				}
			} else {
				errorMessage =
					'Current location is not available in this browser. Please enter a place manually.';
			}
		}
	}

	function handleFromInput() {
		clearCoordinateOverride('from');
		scheduleSearch();
	}

	function handleToInput() {
		clearCoordinateOverride('to');
		scheduleSearch();
	}

	function clearField(field: Exclude<ActiveField, null>) {
		if (field === 'from') {
			fromQuery = '';
		} else {
			toQuery = '';
		}
		clearCoordinateOverride(field);
		activeField = field;
		isOpen = true;
		cancelPendingSearch();
		clearResults();
	}

	function swapInputs() {
		const tmp = fromQuery;
		fromQuery = toQuery;
		toQuery = tmp;
		const tokenTmp = fromOverrideToken;
		fromOverrideToken = toOverrideToken;
		toOverrideToken = tokenTmp;
		scheduleSearch();
	}

	async function handleSubmit(e: Event) {
		e.preventDefault();
		if (!canSubmit) return;

		errorMessage = null;
		isNavigating = true;
		closeDropdown();

		try {
			const params = new URLSearchParams({
				from: fromOverrideToken ?? fromQuery.trim(),
				to: toOverrideToken ?? toQuery.trim()
			});
			const res = await fetch(`/api/navigate?${params.toString()}`);
			const data = (await res.json()) as NavigateResponse;

			if (!res.ok || !data.itinerary || data.message === 'no_route_found') {
				if (data.message === 'origin_not_found') {
					errorMessage = `Couldn't find "${fromQuery.trim()}". Try a different starting point.`;
				} else if (data.message === 'destination_not_found') {
					errorMessage = `Couldn't find "${toQuery.trim()}". Try a different destination.`;
				} else if (data.message === 'no_route_found') {
					errorMessage =
						'No route found. Try a different destination or check if routes have been recorded for this area.';
				} else {
					errorMessage = 'Something went wrong. Please try again.';
				}
				return;
			}

			onnav?.({
				itinerary: data.itinerary,
				summary: data.summary ?? { transfers: 0, walk_distance_m: 0 },
				fromName: fromQuery.trim(),
				toName: toQuery.trim()
			});
		} catch {
			errorMessage = 'Network error. Check your connection and try again.';
		} finally {
			isNavigating = false;
		}
	}
</script>

<section aria-label="Plan your navigation route" class="absolute right-0 bottom-5 left-0 z-10 px-4 md:px-6">
	<div
		class="relative w-full"
		role="combobox"
		aria-expanded={isOpen}
		aria-controls="navigation-search-dropdown"
		aria-haspopup="listbox"
		onfocusout={handleFocusOut}
	>
		<div class="max-h-[50vh] overflow-y-auto rounded-xl border border-border bg-background/95 p-3 shadow-lg backdrop-blur-sm">
			<div class="mb-3 flex items-center gap-2">
				<div
					class="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-brand/12 text-brand"
					aria-hidden="true"
				>
					<Navigation2 class="size-4" />
				</div>
				<span class="text-[0.8125rem] font-semibold tracking-tight text-foreground">
					Plan your commute
				</span>
				<button
					type="button"
					class="flex flex-row items-center gap-1 pl-2 pr-3 py-1 rounded-full border border-border bg-card text-muted-foreground shadow-sm transition-colors hover:bg-muted hover:text-foreground"
					onclick={swapInputs}
					aria-label="Swap from and to"
					title="Swap"
				>
					<ArrowRight class="size-4 rotate-90" />
					<span class="text-[0.8125rem] text-muted-foreground font-medium">
						Swap locations
					</span>
				</button>
				{#if onclose}
					<button
						type="button"
						class="ml-auto grid size-7 place-items-center rounded-lg text-muted-foreground hover:bg-muted/70 hover:text-foreground"
						onclick={onclose}
						aria-label="Close navigation search"
					>
						<X class="size-4" />
					</button>
				{/if}
			</div>

			<form onsubmit={handleSubmit} class="space-y-2.5">
				<div class="relative">
					<Search
						class="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
					/>
					<input
						type="text"
						bind:value={fromQuery}
						onfocus={() => handleFocus('from')}
						oninput={handleFromInput}
						onkeydown={handleInputKeydown}
						placeholder="From: e.g. Cubao"
						aria-label="Origin"
						autocomplete="off"
						spellcheck="false"
						disabled={isNavigating}
						class="w-full rounded-xl border border-border bg-card py-2.5 pr-10 pl-10 text-sm text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-brand/40 focus:outline-none disabled:cursor-not-allowed disabled:opacity-60"
					/>
					{#if fromQuery}
						<button
							type="button"
							onclick={() => clearField('from')}
							class="absolute top-1/2 right-2 grid size-6 -translate-y-1/2 place-items-center rounded-full text-muted-foreground hover:bg-muted/70 hover:text-foreground"
							aria-label="Clear from field"
						>
							<X class="size-4" />
						</button>
					{/if}
				</div>

				<div class="relative">
					<MapPin
						class="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
					/>
					<input
						type="text"
						bind:value={toQuery}
						onfocus={() => handleFocus('to')}
						oninput={handleToInput}
						onkeydown={handleInputKeydown}
						placeholder="To: e.g. Taft Avenue"
						aria-label="Destination"
						autocomplete="off"
						spellcheck="false"
						disabled={isNavigating}
						class="w-full rounded-xl border border-border bg-card py-2.5 pr-10 pl-10 text-sm text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-brand/40 focus:outline-none disabled:cursor-not-allowed disabled:opacity-60"
					/>
					{#if toQuery}
						<button
							type="button"
							onclick={() => clearField('to')}
							class="absolute top-1/2 right-2 grid size-6 -translate-y-1/2 place-items-center rounded-full text-muted-foreground hover:bg-muted/70 hover:text-foreground"
							aria-label="Clear to field"
						>
							<X class="size-4" />
						</button>
					{/if}
				</div>

				{#if errorMessage}
					<div
						class="flex items-start gap-1.5 rounded-lg border border-red-500/25 bg-red-500/10 p-2 text-xs leading-[1.4] text-red-500"
						role="alert"
					>
						<AlertCircle class="size-3.5 shrink-0" />
						<span>{errorMessage}</span>
					</div>
				{/if}

				<button
					type="submit"
					class="flex w-full items-center justify-center gap-2 rounded-xl bg-brand px-4 py-[0.65rem] text-[0.8125rem] font-semibold tracking-wide text-brand-foreground transition-opacity hover:enabled:opacity-90 disabled:cursor-not-allowed disabled:opacity-45"
					disabled={!canSubmit}
					aria-busy={isNavigating}
				>
					{#if isNavigating}
						<Loader2 class="size-4 animate-spin" />
						<span>Finding routes…</span>
					{:else}
						<Search class="size-4" />
						<span>Find route</span>
					{/if}
				</button>
			</form>
		</div>

		{#if isOpen}
			<div
				id="navigation-search-dropdown"
				class="absolute bottom-full left-0 z-50 mb-2 max-h-[min(40vh,20rem)] w-full overflow-y-auto rounded-xl border border-border bg-card p-2 shadow-md"
				role="listbox"
			>
				{#if isSearching}
					<p class="px-2 py-2 text-xs text-muted-foreground">Searching…</p>
				{:else if searchError}
					<p class="px-2 py-2 text-sm text-destructive">Something went wrong. Try again.</p>
				{:else if displaySuggestions.length === 0}
					<p class="px-2 py-2 text-sm text-muted-foreground">No suggestions found.</p>
				{:else}
					<div class="space-y-2">
						<div class="space-y-1">
							<p class="px-2 py-1 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
								Suggestions
							</p>
							{#each displaySuggestions as suggestion (suggestion)}
								<button
									type="button"
									onclick={() => applySuggestion(suggestion)}
									class="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left hover:bg-accent/70"
								>
									{#if suggestion === CURRENT_LOCATION_SUGGESTION}
										<MapPin class="size-4 text-muted-foreground" />
									{:else}
										<Search class="size-4 text-muted-foreground" />
									{/if}
									<span class="truncate text-sm text-foreground font-medium">{suggestion}</span>
								</button>
							{/each}
						</div>
					</div>
				{/if}
			</div>
		{/if}
	</div>
</section>
