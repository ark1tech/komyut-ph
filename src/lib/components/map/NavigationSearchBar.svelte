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
			const data = await res.json() as {
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
	class="nav-search-bar absolute bottom-5 left-0 right-0 z-10 px-4 md:px-6"
>
	<div class="nav-card">
		<!-- Header row -->
		<div class="nav-card__header">
			<div class="nav-card__icon-wrap" aria-hidden="true">
				<Navigation2 class="size-4" />
			</div>
			<span class="nav-card__label">Plan your commute</span>
			{#if onclose}
				<button
					type="button"
					class="nav-card__close"
					onclick={onclose}
					aria-label="Close navigation search"
				>
					<X class="size-4" />
				</button>
			{/if}
		</div>

		<!-- Inputs -->
		<form onsubmit={handleSubmit} class="nav-card__form">
			<div class="nav-inputs">
				<!-- From -->
				<div class="nav-input-row">
					<div class="nav-input-dot nav-input-dot--from" aria-hidden="true"></div>
					<input
						bind:this={fromInputEl}
						bind:value={fromQuery}
						type="text"
						id="nav-from"
						placeholder="From: e.g. Cubao"
						class="nav-input"
						autocomplete="off"
						spellcheck="false"
						disabled={isLoading}
					/>
					{#if fromQuery}
						<button
							type="button"
							class="nav-input-clear"
							onclick={() => { fromQuery = ''; fromInputEl?.focus(); }}
							aria-label="Clear from field"
						>
							<X class="size-3" />
						</button>
					{/if}
				</div>

				<!-- Connector + swap -->
				<div class="nav-inputs__connector" aria-hidden="true">
					<div class="nav-inputs__line"></div>
					<button
						type="button"
						class="nav-swap-btn"
						onclick={swapInputs}
						aria-label="Swap from and to"
						title="Swap"
					>
						<ArrowRight class="size-3.5 rotate-90" />
					</button>
				</div>

				<!-- To -->
				<div class="nav-input-row">
					<div class="nav-input-dot nav-input-dot--to" aria-hidden="true">
						<MapPin class="size-2.5" />
					</div>
					<input
						bind:value={toQuery}
						type="text"
						id="nav-to"
						placeholder="To: e.g. Taft Avenue"
						class="nav-input"
						autocomplete="off"
						spellcheck="false"
						disabled={isLoading}
					/>
					{#if toQuery}
						<button
							type="button"
							class="nav-input-clear"
							onclick={() => { toQuery = ''; }}
							aria-label="Clear to field"
						>
							<X class="size-3" />
						</button>
					{/if}
				</div>
			</div>

			<!-- Error message -->
			{#if errorMessage}
				<div class="nav-error" role="alert">
					<AlertCircle class="size-3.5 shrink-0" />
					<span>{errorMessage}</span>
				</div>
			{/if}

			<!-- Submit -->
			<button
				type="submit"
				class="nav-submit"
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

<style>
	/* NavigationSearchBar is positioned by the Map.svelte absolute container */

	.nav-card {
		width: 100%;
		border-radius: 1.25rem;
		border: 1px solid color-mix(in srgb, var(--border) 70%, transparent);
		background: color-mix(in srgb, var(--card) 97%, transparent);
		padding: 1rem;
		box-shadow:
			0 8px 32px rgba(0, 0, 0, 0.18),
			0 1px 3px rgba(0, 0, 0, 0.08);
		backdrop-filter: blur(12px);
		-webkit-backdrop-filter: blur(12px);
	}

	/* ── Header ─────────────────────────────────────────────────────────────── */
	.nav-card__header {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		margin-bottom: 0.875rem;
	}

	.nav-card__icon-wrap {
		display: grid;
		place-items: center;
		width: 1.75rem;
		height: 1.75rem;
		border-radius: 50%;
		background: color-mix(in srgb, var(--brand) 12%, transparent);
		color: var(--brand);
		flex-shrink: 0;
	}

	.nav-card__label {
		font-size: 0.8125rem;
		font-weight: 600;
		color: var(--foreground);
		flex: 1;
		letter-spacing: -0.01em;
	}

	.nav-card__close {
		display: grid;
		place-items: center;
		width: 1.75rem;
		height: 1.75rem;
		border-radius: 0.5rem;
		color: var(--muted-foreground);
		transition: background 150ms, color 150ms;
		background: transparent;
		border: none;
		cursor: pointer;
	}

	.nav-card__close:hover {
		background: var(--muted);
		color: var(--foreground);
	}

	/* ── Form ─────────────────────────────────────────────────────────────────── */
	.nav-card__form {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	/* ── Input group ─────────────────────────────────────────────────────────── */
	.nav-inputs {
		display: flex;
		flex-direction: column;
		gap: 0;
		background: var(--muted);
		border-radius: 0.875rem;
		overflow: hidden;
		border: 1px solid var(--border);
	}

	.nav-input-row {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0 0.75rem;
		position: relative;
		background: var(--background);
	}

	.nav-input-row:first-child {
		border-radius: 0.875rem 0.875rem 0 0;
	}

	.nav-input-dot {
		width: 0.625rem;
		height: 0.625rem;
		border-radius: 50%;
		flex-shrink: 0;
		display: grid;
		place-items: center;
	}

	.nav-input-dot--from {
		background: var(--brand);
		border: 2px solid color-mix(in srgb, var(--brand) 30%, transparent);
		box-shadow: 0 0 0 3px color-mix(in srgb, var(--brand) 15%, transparent);
	}

	.nav-input-dot--to {
		background: #ef4444;
		color: white;
		width: 1rem;
		height: 1rem;
		border-radius: 50%;
		font-size: 0.5rem;
	}

	.nav-input {
		flex: 1;
		padding: 0.7rem 0;
		font-size: 0.8125rem;
		background: transparent;
		border: none;
		outline: none;
		color: var(--foreground);
		min-width: 0;
	}

	.nav-input::placeholder {
		color: var(--muted-foreground);
	}

	.nav-input:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}

	.nav-input-clear {
		display: grid;
		place-items: center;
		width: 1.25rem;
		height: 1.25rem;
		border-radius: 50%;
		background: var(--muted);
		color: var(--muted-foreground);
		border: none;
		cursor: pointer;
		flex-shrink: 0;
		transition: background 120ms, color 120ms;
	}

	.nav-input-clear:hover {
		background: color-mix(in srgb, var(--muted-foreground) 20%, transparent);
		color: var(--foreground);
	}

	.nav-inputs__connector {
		display: flex;
		align-items: center;
		padding: 0 0.875rem;
		background: var(--background);
		position: relative;
		height: 0;
		overflow: visible;
		z-index: 1;
	}

	.nav-inputs__line {
		width: 1px;
		height: 1rem;
		background: var(--border);
		position: absolute;
		left: 1.25rem;
		top: -0.5rem;
	}

	.nav-swap-btn {
		position: absolute;
		right: 0.625rem;
		top: -0.875rem;
		display: grid;
		place-items: center;
		width: 1.625rem;
		height: 1.625rem;
		border-radius: 50%;
		background: var(--card);
		border: 1px solid var(--border);
		color: var(--muted-foreground);
		cursor: pointer;
		transition: background 120ms, color 120ms, transform 200ms;
		box-shadow: 0 1px 4px rgba(0, 0, 0, 0.12);
	}

	.nav-swap-btn:hover {
		background: var(--muted);
		color: var(--foreground);
		transform: rotate(180deg);
	}

	/* ── Error ──────────────────────────────────────────────────────────────────── */
	.nav-error {
		display: flex;
		align-items: flex-start;
		gap: 0.4rem;
		padding: 0.5rem 0.625rem;
		border-radius: 0.625rem;
		background: color-mix(in srgb, #ef4444 10%, transparent);
		border: 1px solid color-mix(in srgb, #ef4444 25%, transparent);
		color: #ef4444;
		font-size: 0.75rem;
		line-height: 1.4;
	}

	/* ── Submit button ─────────────────────────────────────────────────────────── */
	.nav-submit {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.5rem;
		width: 100%;
		padding: 0.65rem 1rem;
		border-radius: 0.75rem;
		background: var(--brand);
		color: var(--brand-foreground);
		font-size: 0.8125rem;
		font-weight: 600;
		border: none;
		cursor: pointer;
		transition: opacity 150ms, transform 120ms;
		letter-spacing: 0.01em;
	}

	.nav-submit:hover:not(:disabled) {
		opacity: 0.92;
		transform: translateY(-1px);
	}

	.nav-submit:active:not(:disabled) {
		transform: translateY(0);
	}

	.nav-submit:disabled {
		opacity: 0.45;
		cursor: not-allowed;
	}
</style>
