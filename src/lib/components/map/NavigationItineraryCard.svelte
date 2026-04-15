<script lang="ts">
	import {
		Footprints,
		Bus,
		ChevronRight,
		Navigation2,
		X,
		Flag,
		ArrowLeftRight,
		MapPin
	} from '@lucide/svelte';

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

	interface Props {
		itinerary: ItineraryLeg[];
		summary: { transfers: number; walk_distance_m: number };
		fromName: string;
		toName: string;
		/** True once user has tapped Start Navigation */
		navigating?: boolean;
		onstart?: () => void;
		onarrived?: () => void;
		onclose?: () => void;
		/** Index of the current active ride leg (during navigation) */
		activeLegIndex?: number;
	}

	let {
		itinerary,
		summary,
		fromName,
		toName,
		navigating = false,
		onstart,
		onarrived,
		onclose,
		activeLegIndex = 0
	}: Props = $props();

	// ── helpers ───────────────────────────────────────────────────────────────────

	const MODE_COLOURS: Record<string, string> = {
		Walk: '#6b7280',
		Jeepney: '#f59e0b',
		Bus: '#3b82f6',
		'MRT-3': '#8b5cf6',
		'LRT-1': '#10b981',
		'LRT-2': '#ef4444',
		'UV Express': '#06b6d4',
		Tricycle: '#f97316',
		Shuttle: '#84cc16'
	};

	function modeColor(mode: string) {
		return MODE_COLOURS[mode] ?? '#3b82f6';
	}

	function formatDist(m: number): string {
		if (m < 1000) return `${m} m`;
		return `${(m / 1000).toFixed(1)} km`;
	}

	// Ride legs only, for summary
	const rideLegs = $derived(itinerary.filter((l): l is RideLeg => l.type === 'ride'));

	// Current leg label during navigation
	const currentLeg = $derived(
		navigating ? itinerary[activeLegIndex] ?? null : null
	);
	const currentLegLabel = $derived(() => {
		if (!currentLeg) return null;
		if (currentLeg.type === 'walk')
			return `Walk ${formatDist(currentLeg.distance_m)}`;
		return `${currentLeg.mode} · ${currentLeg.route_name}`;
	});
</script>

<div
	class="itinerary-card"
	class:itinerary-card--navigating={navigating}
	role="region"
	aria-label="Navigation itinerary"
>
	<!-- ── Header ─────────────────────────────────────────────────────────────── -->
	<div class="itinerary-card__header">
		<div class="itinerary-card__route-labels">
			<span class="itinerary-card__from">
				<span class="dot dot--from" aria-hidden="true"></span>
				{fromName}
			</span>
			<ChevronRight class="size-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
			<span class="itinerary-card__to">
				<MapPin class="size-3 shrink-0" fill="currentColor" aria-hidden="true" />
				{toName}
			</span>
		</div>
		{#if !navigating && onclose}
			<button
				type="button"
				class="itinerary-card__close"
				onclick={onclose}
				aria-label="Close itinerary"
			>
				<X class="size-4" />
			</button>
		{/if}
	</div>

	<!-- ── Summary bar ────────────────────────────────────────────────────────── -->
	<div class="itinerary-summary" aria-label="Route summary">
		<div class="itinerary-summary__chip">
			<ArrowLeftRight class="size-3" aria-hidden="true" />
			<span>{summary.transfers} transfer{summary.transfers !== 1 ? 's' : ''}</span>
		</div>
		<div class="itinerary-summary__chip">
			<Footprints class="size-3" aria-hidden="true" />
			<span>{formatDist(summary.walk_distance_m)} walk</span>
		</div>
		{#each rideLegs as leg (leg.route_id)}
			<div
				class="itinerary-summary__chip itinerary-summary__chip--mode"
				style="--mode-color: {modeColor(leg.mode)}"
			>
				<Bus class="size-3" aria-hidden="true" />
				<span>{leg.mode}</span>
			</div>
		{/each}
	</div>

	<!-- ── Active leg indicator (navigating) ─────────────────────────────────── -->
	{#if navigating && currentLeg}
		<div class="active-leg-banner" aria-live="polite" aria-label="Current leg">
			{#if currentLeg.type === 'walk'}
				<div class="active-leg-banner__icon" style="background: #6b728022; color: #6b7280">
					<Footprints class="size-4" />
				</div>
				<span class="active-leg-banner__text">
					Walk <strong>{formatDist(currentLeg.distance_m)}</strong>
				</span>
			{:else}
				<div
					class="active-leg-banner__icon"
					style="background: {modeColor(currentLeg.mode)}22; color: {modeColor(currentLeg.mode)}"
				>
					<Bus class="size-4" />
				</div>
				<div class="active-leg-banner__text">
					<span class="active-leg-banner__mode">{currentLeg.mode}</span>
					<span class="active-leg-banner__name">{currentLeg.route_name}</span>
				</div>
			{/if}
		</div>
	{/if}

	<!-- ── Step-by-step legs ──────────────────────────────────────────────────── -->
	<ol class="itinerary-steps" aria-label="Step-by-step directions">
		{#each itinerary as leg, i (i)}
			{@const isActive = navigating && i === activeLegIndex}
			{@const isCompleted = navigating && i < activeLegIndex}
			<li
				class="itinerary-step"
				class:itinerary-step--active={isActive}
				class:itinerary-step--completed={isCompleted}
				class:itinerary-step--dimmed={navigating && !isActive && !isCompleted}
			>
				{#if leg.type === 'walk'}
					<!-- Walk leg -->
					<div class="step-icon step-icon--walk" aria-hidden="true">
						<Footprints class="size-3.5" />
					</div>
					<div class="step-content">
						<span class="step-label step-label--walk">
							Walk {formatDist(leg.distance_m)}
						</span>
					</div>
				{:else}
					<!-- Ride leg -->
					<div
						class="step-icon step-icon--ride"
						style="--mode-color: {modeColor(leg.mode)}"
						aria-hidden="true"
					>
						<Bus class="size-3.5" />
					</div>
					<div class="step-content">
						<span class="step-mode" style="color: {modeColor(leg.mode)}">{leg.mode}</span>
						<span class="step-route-name">{leg.route_name}</span>
					</div>
				{/if}
			</li>
		{/each}

		<!-- Destination -->
		<li class="itinerary-step itinerary-step--dest">
			<div class="step-icon step-icon--dest" aria-hidden="true">
				<Flag class="size-3.5" />
			</div>
			<div class="step-content">
				<span class="step-label">Arrive at <strong>{toName}</strong></span>
			</div>
		</li>
	</ol>

	<!-- ── Actions ───────────────────────────────────────────────────────────── -->
	<div class="itinerary-actions">
		{#if navigating}
			<button type="button" class="itinerary-btn itinerary-btn--arrived" onclick={onarrived}>
				<Flag class="size-4" />
				I've arrived
			</button>
		{:else}
			<button type="button" class="itinerary-btn itinerary-btn--start" onclick={onstart}>
				<Navigation2 class="size-4" />
				Start Navigation
			</button>
		{/if}
	</div>
</div>

<style>
	/* ── Card shell ─────────────────────────────────────────────────────────── */
	.itinerary-card {
		border-radius: 1.25rem;
		border: 1px solid color-mix(in srgb, var(--border) 70%, transparent);
		background: color-mix(in srgb, var(--card) 97%, transparent);
		padding: 1rem;
		box-shadow:
			0 8px 32px rgba(0, 0, 0, 0.18),
			0 1px 3px rgba(0, 0, 0, 0.08);
		backdrop-filter: blur(12px);
		-webkit-backdrop-filter: blur(12px);
		max-height: min(80vh, 32rem);
		overflow-y: auto;
		overscroll-behavior: contain;
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	/* ── Header ─────────────────────────────────────────────────────────────── */
	.itinerary-card__header {
		display: flex;
		align-items: flex-start;
		gap: 0.5rem;
	}

	.itinerary-card__route-labels {
		display: flex;
		align-items: center;
		gap: 0.375rem;
		flex: 1;
		min-width: 0;
		flex-wrap: wrap;
	}

	.itinerary-card__from,
	.itinerary-card__to {
		display: flex;
		align-items: center;
		gap: 0.3rem;
		font-size: 0.8rem;
		font-weight: 600;
		color: var(--foreground);
		min-width: 0;
		max-width: 45%;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.itinerary-card__to {
		color: #ef4444;
	}

	.dot {
		display: inline-block;
		width: 0.5rem;
		height: 0.5rem;
		border-radius: 50%;
		flex-shrink: 0;
	}

	.dot--from {
		background: var(--brand);
	}

	.itinerary-card__close {
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
		flex-shrink: 0;
	}

	.itinerary-card__close:hover {
		background: var(--muted);
		color: var(--foreground);
	}

	/* ── Summary chips ──────────────────────────────────────────────────────── */
	.itinerary-summary {
		display: flex;
		flex-wrap: wrap;
		gap: 0.375rem;
	}

	.itinerary-summary__chip {
		display: inline-flex;
		align-items: center;
		gap: 0.3rem;
		padding: 0.25rem 0.625rem;
		border-radius: 99px;
		background: var(--muted);
		color: var(--muted-foreground);
		font-size: 0.7rem;
		font-weight: 500;
		border: 1px solid var(--border);
	}

	.itinerary-summary__chip--mode {
		background: color-mix(in srgb, var(--mode-color) 12%, transparent);
		color: var(--mode-color);
		border-color: color-mix(in srgb, var(--mode-color) 25%, transparent);
	}

	/* ── Active leg banner ─────────────────────────────────────────────────── */
	.active-leg-banner {
		display: flex;
		align-items: center;
		gap: 0.625rem;
		padding: 0.625rem 0.75rem;
		border-radius: 0.75rem;
		background: color-mix(in srgb, var(--brand) 8%, transparent);
		border: 1px solid color-mix(in srgb, var(--brand) 20%, transparent);
	}

	.active-leg-banner__icon {
		display: grid;
		place-items: center;
		width: 2rem;
		height: 2rem;
		border-radius: 50%;
		flex-shrink: 0;
	}

	.active-leg-banner__text {
		flex: 1;
		min-width: 0;
		font-size: 0.8125rem;
		color: var(--foreground);
		font-weight: 500;
	}

	.active-leg-banner__mode {
		display: block;
		font-size: 0.7rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: var(--muted-foreground);
	}

	.active-leg-banner__name {
		display: block;
		font-size: 0.8125rem;
		font-weight: 600;
		color: var(--foreground);
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	/* ── Steps ──────────────────────────────────────────────────────────────── */
	.itinerary-steps {
		display: flex;
		flex-direction: column;
		gap: 0;
		list-style: none;
		padding: 0;
		margin: 0;
	}

	.itinerary-step {
		display: flex;
		align-items: flex-start;
		gap: 0.625rem;
		padding: 0.5rem 0;
		border-bottom: 1px solid color-mix(in srgb, var(--border) 50%, transparent);
		transition: opacity 250ms;
	}

	.itinerary-step:last-child {
		border-bottom: none;
	}

	.itinerary-step--active {
		opacity: 1;
	}

	.itinerary-step--completed {
		opacity: 0.45;
	}

	.itinerary-step--dimmed {
		opacity: 0.6;
	}

	.step-icon {
		display: grid;
		place-items: center;
		width: 1.75rem;
		height: 1.75rem;
		border-radius: 50%;
		flex-shrink: 0;
		margin-top: 0.1rem;
	}

	.step-icon--walk {
		background: color-mix(in srgb, #6b7280 15%, transparent);
		color: #6b7280;
	}

	.step-icon--ride {
		background: color-mix(in srgb, var(--mode-color) 15%, transparent);
		color: var(--mode-color);
	}

	.step-icon--dest {
		background: color-mix(in srgb, #ef4444 15%, transparent);
		color: #ef4444;
	}

	.step-content {
		flex: 1;
		min-width: 0;
		display: flex;
		flex-direction: column;
		justify-content: center;
	}

	.step-label {
		font-size: 0.8rem;
		color: var(--foreground);
		line-height: 1.35;
	}

	.step-label--walk {
		color: #6b7280;
		font-style: italic;
	}

	.step-mode {
		font-size: 0.65rem;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.06em;
		line-height: 1;
	}

	.step-route-name {
		font-size: 0.8125rem;
		font-weight: 500;
		color: var(--foreground);
		margin-top: 0.1rem;
		display: block;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	/* ── Actions ─────────────────────────────────────────────────────────────── */
	.itinerary-actions {
		display: flex;
		gap: 0.5rem;
	}

	.itinerary-btn {
		flex: 1;
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.5rem;
		padding: 0.65rem 1rem;
		border-radius: 0.75rem;
		font-size: 0.8125rem;
		font-weight: 600;
		border: none;
		cursor: pointer;
		transition: opacity 150ms, transform 120ms;
		letter-spacing: 0.01em;
	}

	.itinerary-btn:hover {
		opacity: 0.9;
		transform: translateY(-1px);
	}

	.itinerary-btn:active {
		transform: translateY(0);
	}

	.itinerary-btn--start {
		background: var(--brand);
		color: var(--brand-foreground);
	}

	.itinerary-btn--arrived {
		background: var(--success, #16a34a);
		color: white;
	}
</style>
