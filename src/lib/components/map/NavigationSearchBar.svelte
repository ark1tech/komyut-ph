<script lang="ts">
	import { Search, ArrowRight, X, MapPin, Navigation2, Loader2, AlertCircle } from '@lucide/svelte';

	// ── Types ─────────────────────────────────────────────────────────────────────

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

	export interface NavigationResult {
		itinerary: ItineraryLeg[];
		summary: {
			transfers: number;
			walk_distance_m: number;
		};
		fromName: string;
		toName: string;
	}

	// ── Props ─────────────────────────────────────────────────────────────────────

	interface Props {
		onnav?: (result: NavigationResult) => void;
		onclose?: () => void;
	}

	let { onnav, onclose }: Props = $props();

	// ── State ─────────────────────────────────────────────────────────────────────

	let fromQuery = $state('');
	let toQuery = $state('');
	let isLoading = $state(false);
	let errorMessage = $state<string | null>(null);
	let fromInputEl: HTMLInputElement | undefined = $state();

	const canSubmit = $derived(fromQuery.trim().length > 0 && toQuery.trim().length > 0 && !isLoading);

	function swapInputs() {
		const tmp = fromQuery;
		fromQuery = toQuery;
		toQuery = tmp;
	}

	async function handleSubmit(e: Event) {
		e.preventDefault();
		if (!canSubmit) return;

		errorMessage = null;
		isLoading = true;

		try {
			const params = new URLSearchParams({
				from: fromQuery.trim(),
				to: toQuery.trim()
			});
			const res = await fetch(`/api/navigate?${params.toString()}`);
			const data = (await res.json()) as {
				itinerary: ItineraryLeg[] | null;
				summary?: { transfers: number; walk_distance_m: number };
				message?: string;
			};

			if (!res.ok || !data.itinerary || data.message === 'no_route_found') {
				if (data.message === 'origin_not_found') {
					errorMessage = `Couldn't find "${fromQuery.trim()}". Try a different starting point.`;
				} else if (data.message === 'destination_not_found') {
					errorMessage = `Couldn't find "${toQuery.trim()}". Try a different destination.`;
				} else if (data.message === 'no_route_found') {
					errorMessage = 'No route found. Try a different destination or check if routes have been recorded for this area.';
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
			isLoading = false;
		}
	}
</script>

<section
	aria-label="Plan your navigation route"
	class="absolute bottom-5 left-0 right-0 z-10 px-4 md:px-6"
>
	<div
		class="w-full rounded-[1.25rem] border border-border/70 bg-card/97 p-4 shadow-[0_8px_32px_rgba(0,0,0,0.18),0_1px_3px_rgba(0,0,0,0.08)] backdrop-blur-xl"
	>
		<!-- Header row -->
		<div class="mb-3.5 flex items-center gap-2">
			<div
				class="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-brand/12 text-brand"
				aria-hidden="true"
			>
				<Navigation2 class="size-4" />
			</div>
			<span class="flex-1 text-[0.8125rem] font-semibold tracking-tight text-foreground">
				Plan your commute
			</span>
			{#if onclose}
				<button
					type="button"
					class="grid h-7 w-7 cursor-pointer place-items-center rounded-lg border-none bg-transparent text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
					onclick={onclose}
					aria-label="Close navigation search"
				>
					<X class="size-4" />
				</button>
			{/if}
		</div>

		<!-- Inputs -->
		<form onsubmit={handleSubmit} class="flex flex-col gap-3">
			<div class="flex flex-col overflow-hidden rounded-[0.875rem] border border-border bg-muted">
				<!-- From -->
				<div class="relative flex items-center gap-2 bg-background px-3 first:rounded-t-[0.875rem]">
					<div
						class="h-2.5 w-2.5 shrink-0 rounded-full bg-brand border-2 border-brand/30 ring-[3px] ring-brand/15"
						aria-hidden="true"
					></div>
					<input
						bind:this={fromInputEl}
						bind:value={fromQuery}
						type="text"
						id="nav-from"
						placeholder="From: e.g. Cubao"
						class="min-w-0 flex-1 border-none bg-transparent py-[0.7rem] text-[0.8125rem] text-foreground outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-60"
						autocomplete="off"
						spellcheck="false"
						disabled={isLoading}
					/>
					{#if fromQuery}
						<button
							type="button"
							class="grid h-5 w-5 shrink-0 cursor-pointer place-items-center rounded-full border-none bg-muted text-muted-foreground transition-colors hover:bg-muted-foreground/20 hover:text-foreground"
							onclick={() => {
								fromQuery = '';
								fromInputEl?.focus();
							}}
							aria-label="Clear from field"
						>
							<X class="size-3" />
						</button>
					{/if}
				</div>

				<!-- Connector + swap -->
				<div
					class="relative z-[1] flex h-0 items-center overflow-visible bg-background px-3.5"
					aria-hidden="true"
				>
					<div class="absolute left-5 -top-2 h-4 w-px bg-border"></div>
					<button
						type="button"
						class="absolute right-2.5 -top-3.5 grid h-[1.625rem] w-[1.625rem] cursor-pointer place-items-center rounded-full border border-border bg-card text-muted-foreground shadow-[0_1px_4px_rgba(0,0,0,0.12)] transition-all hover:rotate-180 hover:bg-muted hover:text-foreground"
						onclick={swapInputs}
						aria-label="Swap from and to"
						title="Swap"
					>
						<ArrowRight class="size-3.5 rotate-90" />
					</button>
				</div>

				<!-- To -->
				<div class="relative flex items-center gap-2 bg-background px-3">
					<div
						class="grid h-4 w-4 shrink-0 place-items-center rounded-full bg-red-500 text-[0.5rem] text-white"
						aria-hidden="true"
					>
						<MapPin class="size-2.5" />
					</div>
					<input
						bind:value={toQuery}
						type="text"
						id="nav-to"
						placeholder="To: e.g. Taft Avenue"
						class="min-w-0 flex-1 border-none bg-transparent py-[0.7rem] text-[0.8125rem] text-foreground outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-60"
						autocomplete="off"
						spellcheck="false"
						disabled={isLoading}
					/>
					{#if toQuery}
						<button
							type="button"
							class="grid h-5 w-5 shrink-0 cursor-pointer place-items-center rounded-full border-none bg-muted text-muted-foreground transition-colors hover:bg-muted-foreground/20 hover:text-foreground"
							onclick={() => {
								toQuery = '';
							}}
							aria-label="Clear to field"
						>
							<X class="size-3" />
						</button>
					{/if}
				</div>
			</div>

			<!-- Error message -->
			{#if errorMessage}
				<div
					class="flex items-start gap-1.5 rounded-[0.625rem] border border-red-500/25 bg-red-500/10 p-2 text-xs leading-[1.4] text-red-500"
					role="alert"
				>
					<AlertCircle class="size-3.5 shrink-0" />
					<span>{errorMessage}</span>
				</div>
			{/if}

			<!-- Submit -->
			<button
				type="submit"
				class="flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl border-none bg-brand px-4 py-[0.65rem] text-[0.8125rem] font-semibold tracking-wide text-brand-foreground transition-all hover:enabled:-translate-y-px hover:enabled:opacity-90 active:enabled:translate-y-0 disabled:cursor-not-allowed disabled:opacity-45"
				disabled={!canSubmit}
				aria-busy={isLoading}
			>
				{#if isLoading}
					<Loader2 class="size-4 animate-spin" />
					<span>Finding routes…</span>
				{:else}
					<Search class="size-4" />
					<span>Find route</span>
				{/if}
			</button>
		</form>
	</div>
</section>
