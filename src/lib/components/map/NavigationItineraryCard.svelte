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
	import { clsx } from 'clsx';

	// ── Types ─────────────────────────────────────────────────────────────────────

	interface WalkLeg {
		type: 'walk';
		distance_m: number;
		from: [number, number];
		to: [number, number];
		geometry?: GeoJSON.LineString;
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
</script>

<div
	class={clsx(
		'flex flex-col gap-3 p-4 rounded-[1.25rem] border border-border/70 bg-card/97 shadow-2xl backdrop-blur-xl max-h-[min(50vh,30rem)] overflow-y-auto overscroll-contain',
		navigating && 'ring-2 ring-brand/20'
	)}
	role="region"
	aria-label="Navigation itinerary"
>
	<!-- ── Header ─────────────────────────────────────────────────────────────── -->
	<div class="flex items-start gap-2">
		<div class="flex items-center gap-1.5 flex-1 min-w-0 flex-wrap">
			<span
				class="flex items-center gap-1.5 text-[0.8rem] font-semibold text-foreground min-w-0 max-w-[45%] truncate"
			>
				<span class="inline-block size-2 rounded-full shrink-0 bg-brand" aria-hidden="true"></span>
				{fromName}
			</span>
			<ChevronRight class="size-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
			<span
				class="flex items-center gap-1.5 text-[0.8rem] font-semibold text-red-500 min-w-0 max-w-[45%] truncate"
			>
				<MapPin class="size-3 shrink-0" fill="currentColor" aria-hidden="true" />
				{toName}
			</span>
		</div>
		{#if !navigating && onclose}
			<button
				type="button"
				class="grid place-items-center size-7 rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground shrink-0"
				onclick={onclose}
				aria-label="Close itinerary"
			>
				<X class="size-4" />
			</button>
		{/if}
	</div>

	<!-- ── Summary bar ────────────────────────────────────────────────────────── -->
	<div class="flex flex-wrap gap-1.5" aria-label="Route summary">
		<div
			class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-muted text-muted-foreground text-[0.7rem] font-medium border border-border"
		>
			<ArrowLeftRight class="size-3" aria-hidden="true" />
			<span>{summary.transfers} transfer{summary.transfers !== 1 ? 's' : ''}</span>
		</div>
		<div
			class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-muted text-muted-foreground text-[0.7rem] font-medium border border-border"
		>
			<Footprints class="size-3" aria-hidden="true" />
			<span>{formatDist(summary.walk_distance_m)} walk</span>
		</div>
		{#each rideLegs as leg (leg.route_id)}
			<div
				class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[0.7rem] font-medium border"
				style="background: color-mix(in srgb, {modeColor(leg.mode)} 12%, transparent); color: {modeColor(
					leg.mode
				)}; border-color: color-mix(in srgb, {modeColor(leg.mode)} 25%, transparent);"
			>
				<Bus class="size-3" aria-hidden="true" />
				<span>{leg.mode}</span>
			</div>
		{/each}
	</div>

	<!-- ── Active leg indicator (navigating) ─────────────────────────────────── -->
	{#if navigating && currentLeg}
		<div
			class="flex items-center gap-2.5 p-3 rounded-xl bg-brand/8 border border-brand/20"
			aria-live="polite"
			aria-label="Current leg"
		>
			{#if currentLeg.type === 'walk'}
				<div
					class="grid place-items-center size-8 rounded-full shrink-0 bg-[#6b728022] text-[#6b7280]"
				>
					<Footprints class="size-4" />
				</div>
				<span class="flex-1 min-w-0 text-[0.8125rem] text-foreground font-medium">
					Walk <strong>{formatDist(currentLeg.distance_m)}</strong>
				</span>
			{:else}
				<div
					class="grid place-items-center size-8 rounded-full shrink-0"
					style="background: {modeColor(currentLeg.mode)}22; color: {modeColor(currentLeg.mode)}"
				>
					<Bus class="size-4" />
				</div>
				<div class="flex-1 min-w-0 flex flex-col">
					<span
						class="block text-[0.7rem] font-semibold uppercase tracking-wider text-muted-foreground"
					>
						{currentLeg.mode}
					</span>
					<span class="block text-[0.8125rem] font-semibold text-foreground truncate">
						{currentLeg.route_name}
					</span>
				</div>
			{/if}
		</div>
	{/if}

	<!-- ── Step-by-step legs ──────────────────────────────────────────────────── -->
	<ol class="flex flex-col list-none p-0 m-0" aria-label="Step-by-step directions">
		{#each itinerary as leg, i (i)}
			{@const isActive = navigating && i === activeLegIndex}
			{@const isCompleted = navigating && i < activeLegIndex}
			<li
				class={clsx(
					'flex items-start gap-2.5 py-2 border-b border-border/50 transition-opacity duration-250',
					isActive ? 'opacity-100' : isCompleted ? 'opacity-45' : navigating ? 'opacity-60' : 'opacity-100'
				)}
			>
				{#if leg.type === 'walk'}
					<!-- Walk leg -->
					<div
						class="grid place-items-center size-7 rounded-full shrink-0 mt-0.5 bg-[#6b728026] text-[#6b7280]"
						aria-hidden="true"
					>
						<Footprints class="size-3.5" />
					</div>
					<div class="flex-1 min-w-0 flex flex-col justify-center">
						<span class="text-[0.8rem] text-[#6b7280] italic leading-relaxed">
							Walk {formatDist(leg.distance_m)}
						</span>
					</div>
				{:else}
					<!-- Ride leg -->
					<div
						class="grid place-items-center size-7 rounded-full shrink-0 mt-0.5"
						style="background: color-mix(in srgb, {modeColor(
							leg.mode
						)} 15%, transparent); color: {modeColor(leg.mode)}"
						aria-hidden="true"
					>
						<Bus class="size-3.5" />
					</div>
					<div class="flex-1 min-w-0 flex flex-col justify-center">
						<span
							class="text-[0.65rem] font-bold uppercase tracking-[0.06em] leading-none"
							style="color: {modeColor(leg.mode)}"
						>
							{leg.mode}
						</span>
						<span class="text-[0.8125rem] font-medium text-foreground mt-0.5 block truncate">
							{leg.route_name}
						</span>
					</div>
				{/if}
			</li>
		{/each}

		<!-- Destination -->
		<li class="flex items-start gap-2.5 py-2 transition-opacity">
			<div
				class="grid place-items-center size-7 rounded-full shrink-0 mt-0.5 bg-red-500/15 text-red-500"
				aria-hidden="true"
			>
				<Flag class="size-3.5" />
			</div>
			<div class="flex-1 min-w-0 flex flex-col justify-center">
				<span class="text-[0.8rem] text-foreground leading-relaxed">
					Arrive at <strong>{toName}</strong>
				</span>
			</div>
		</li>
	</ol>

	<!-- ── Actions ───────────────────────────────────────────────────────────── -->
	<div class="flex gap-2">
		{#if navigating}
			<button
				type="button"
				class="flex-1 flex items-center justify-center gap-2 py-[0.65rem] px-4 rounded-xl text-[0.8125rem] font-semibold text-white bg-green-600 transition-all hover:opacity-90 active:scale-[0.98] tracking-wide"
				onclick={onarrived}
			>
				<Flag class="size-4" />
				I've arrived
			</button>
		{:else}
			<button
				type="button"
				class="flex-1 flex items-center justify-center gap-2 py-[0.65rem] px-4 rounded-xl text-[0.8125rem] font-semibold text-brand-foreground bg-brand transition-all hover:opacity-90 active:scale-[0.98] tracking-wide"
				onclick={onstart}
			>
				<Navigation2 class="size-4" />
				Start Navigation
			</button>
		{/if}
	</div>
</div>

