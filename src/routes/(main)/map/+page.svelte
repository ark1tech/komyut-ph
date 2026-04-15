<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import Map from '$lib/components/map/Map.svelte';
	import MapSearchBar from '$lib/components/map/MapSearchBar.svelte';
	import RouteSubscribeButton from '$lib/components/routes/RouteSubscribeButton.svelte';
	import * as Button from '$lib/components/ui/button';
	import { cn } from '$lib/utils';
	import { type RouteAccessibilityTag } from '$lib/validation/schemas';
	import {
		Accessibility,
		Bell,
		Clock,
		Coins,
		Info,
		MapPin,
		Navigation2,
		Settings2,
		X
	} from '@lucide/svelte';

	let { data } = $props();

	let subscriptionOverride = $state<typeof data.selectedSubscription | 'unset'>('unset');
	$effect(() => {
		void data.selectedSubscription;
		subscriptionOverride = 'unset';
	});

	let subscription = $derived(
		subscriptionOverride !== 'unset' ? subscriptionOverride : data.selectedSubscription
	);

	let isRouteSubscribed = $derived(
		subscription?.status === 'active' || subscription?.status === 'muted'
	);

	let routesPrefsHref = $derived(
		data.selectedRoute?.geo_route_id != null && isRouteSubscribed
			? `${resolve('/routes')}?route=${data.selectedRoute.geo_route_id ?? data.selectedRoute.saved_route_id}`
			: null
	);

	function handleSubscriptionChange(nextSubscription: typeof data.selectedSubscription) {
		subscriptionOverride = nextSubscription;
	}

	interface RouteGeometry {
		route_id: number | string;
		geometry: string | GeoJSON.LineString;
		mode_segments?: unknown;
	}

	let selectedRoute = $state<RouteGeometry | null>(null);
	let hasSelectedRoutePopup = $derived(Boolean(data.selectedRoute));
	let routeTags = $derived((data.selectedRouteTags ?? []) as RouteAccessibilityTag[]);

	$effect(() => {
		const geometry = data.selectedRouteGeometry as RouteGeometry | null;
		selectedRoute = data.selectedRoute && geometry ? geometry : null;
	});

	function formatTagLabel(tag: RouteAccessibilityTag) {
		if (tag === 'pwd-friendly') return 'PWD-friendly';
		if (tag === 'id-required') return 'ID-required';
		if (tag === 'under-50-pesos') return 'Under 50 pesos';
		if (tag === 'under-100-pesos') return 'Under 100 pesos';
		return tag;
	}

	async function closeSelectedRoutePopup() {
		const nextUrl = new URL(page.url);
		nextUrl.searchParams.delete('route');

		const target = `${nextUrl.pathname}${nextUrl.search}`;
		// eslint-disable-next-line svelte/no-navigation-without-resolve
		await goto(target, { keepFocus: true, noScroll: true, replaceState: true });
	}

	async function clearTraceQuery() {
		const nextUrl = new URL(page.url);
		nextUrl.searchParams.delete('trace');
		const target = `${nextUrl.pathname}${nextUrl.search}`;
		// eslint-disable-next-line svelte/no-navigation-without-resolve
		await goto(target, { keepFocus: true, noScroll: true, replaceState: true });
	}

	/** Toggle between route-search bar and navigate-search bar. */
	let showNavSearch = $state(false);
</script>

<svelte:head>
	<title>Map | Komyut PH</title>
	<meta name="description" content="Your commute companion for the Philippines" />
</svelte:head>

<div class="relative flex-1">
	<Map
		{selectedRoute}
		controlsHidden={hasSelectedRoutePopup}
		tracingActive={data.traceMode}
		onTraceSessionEnd={clearTraceQuery}
		{showNavSearch}
	/>

	{#if data.routeSelectionInvalid}
		<div class="pointer-events-none absolute inset-x-0 top-4 z-20 px-4">
			<div
				class="pointer-events-auto rounded-2xl border border-destructive/20 bg-card/95 p-3 text-sm text-destructive shadow-lg backdrop-blur"
			>
				The selected route could not be found for this account.
			</div>
		</div>
	{/if}

	{#if data.selectedRoute}
		<div class="pointer-events-none absolute inset-x-0 bottom-5 z-20 px-4">
			<article
				class={cn(
					'pointer-events-auto relative max-h-[min(80vh,32rem)] w-full overflow-y-auto overscroll-contain rounded-2xl border border-border/60 bg-card p-4 shadow-lg'
				)}
			>
				<Button.Root
					variant="ghost"
					size="icon-sm"
					class="absolute top-3 right-3 z-10 shrink-0 rounded-full p-1.5 text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground"
					onclick={() => void closeSelectedRoutePopup()}
				>
					<X class="size-4" />
					<span class="sr-only">Close route details</span>
				</Button.Root>

				<div class="min-w-0 pr-10">
					<div class="flex flex-wrap items-center gap-x-1.5 gap-y-1 text-xs text-muted-foreground">
						<div
							class="grid size-6 shrink-0 place-items-center rounded-full bg-brand/10 text-brand"
							aria-hidden="true"
						>
							<MapPin class="size-3.5" />
						</div>
						<span class="font-medium text-foreground">Route</span>
						<span aria-hidden="true">·</span>
						{#if data.selectedRoute.geo_route_id}
							<span>Alerts available</span>
						{:else}
							<span>Map preview only</span>
						{/if}
					</div>

					<h3 class="mt-2 text-sm leading-snug font-semibold text-foreground">
						{data.selectedRoute.route_name}
					</h3>

					<p class="mt-1 text-sm leading-relaxed text-muted-foreground">
						{data.selectedRoute.start_loc}
						<span aria-hidden="true" class="mx-1.5">→</span>
						{data.selectedRoute.end_loc}
					</p>
				</div>

				<div class="mt-3 flex flex-wrap gap-2" aria-label="Route attributes">
					{#each data.selectedRoute.vehicle_types as vehicleType (vehicleType)}
						<span
							class="rounded-full bg-border/40 px-3 py-1.5 text-xs font-medium text-muted-foreground"
						>
							{vehicleType}
						</span>
					{/each}

					{#if data.selectedRoute.pwd_friendly}
						<span
							class="inline-flex items-center gap-1.5 rounded-full bg-success/15 px-3 py-1.5 text-xs font-medium text-success"
						>
							<Accessibility class="size-4" />
							PWD-Friendly
						</span>
					{/if}

					{#if subscription}
						<span
							class="inline-flex items-center gap-1.5 rounded-full bg-brand/10 px-3 py-1.5 text-xs font-medium text-brand"
						>
							<Bell class="size-4" />
							Subscribed
						</span>
					{/if}

					{#each routeTags as tag (tag)}
						<span
							class="inline-flex items-center gap-1.5 rounded-full bg-brand/10 px-3 py-1.5 text-xs font-medium text-brand"
						>
							{formatTagLabel(tag)}
						</span>
					{/each}
				</div>

				<div class="mt-3 flex flex-wrap gap-2" aria-label="Route time and fare">
					<span
						class="inline-flex items-center gap-1.5 rounded-full bg-border/40 px-3 py-1.5 text-xs text-muted-foreground"
					>
						<Clock class="size-4 shrink-0" />
						{data.selectedRoute.est_time_of_arrival} min
					</span>
					<span
						class="inline-flex items-center gap-1.5 rounded-full bg-border/40 px-3 py-1.5 text-xs text-muted-foreground"
					>
						<Coins class="size-4 shrink-0" />
						₱{data.selectedRoute.fare}
					</span>
				</div>

				{#if data.selectedRoute.geo_route_id}
					{#if routesPrefsHref}
						<Button.Root
							variant="outline"
							size="sm"
							class="mt-4 w-full gap-2"
							href={routesPrefsHref}
						>
							<Settings2 class="size-4 shrink-0" />
							Alert preferences
						</Button.Root>
					{/if}
					{#if !isRouteSubscribed}
						<div class="pointer-events-none relative z-10 mt-4 w-full *:pointer-events-auto">
							<RouteSubscribeButton
								class="w-full"
								routeId={data.selectedRoute.geo_route_id}
								savedRouteId={data.selectedRouteSource === 'saved'
									? data.selectedRoute.saved_route_id
									: null}
								savedRoute={data.selectedRoute}
								defaultRouteName={data.selectedRoute.route_name}
								initialSubscription={subscription}
								onchange={handleSubscriptionChange}
							/>
						</div>
					{/if}
				{:else}
					<div
						class="mt-4 flex items-start gap-2 rounded-xl border border-border/60 bg-muted/40 p-3 text-xs leading-relaxed text-muted-foreground"
					>
						<Info class="mt-0.5 size-4 shrink-0" />
						This route has not been linked to a canonical route yet, so subscription alerts are not available
						for it.
					</div>
				{/if}
			</article>
		</div>
	{/if}

	<!-- ── Navigation FAB ─────────────────────────────────────────────────────── -->
	{#if !hasSelectedRoutePopup && !data.traceMode}
		<!-- "Navigate" toggle button — appears top-left when route search is visible -->
		<div class="pointer-events-none absolute top-4 left-4 z-20">
			<button
				type="button"
				class="nav-fab pointer-events-auto"
				class:nav-fab--active={showNavSearch}
				id="nav-toggle-btn"
				onclick={() => {
					showNavSearch = !showNavSearch;
				}}
				aria-label={showNavSearch ? 'Switch to route search' : 'Plan a route'}
				aria-pressed={showNavSearch}
			>
				<Navigation2 class="size-4" />
				<span>{showNavSearch ? 'Search routes' : 'Navigate'}</span>
			</button>
		</div>

		{#if !showNavSearch}
			<MapSearchBar />
		{/if}
	{/if}
</div>

<style>
	.nav-fab {
		display: inline-flex;
		align-items: center;
		gap: 0.4rem;
		padding: 0.5rem 0.875rem;
		border-radius: 99px;
		background: var(--card);
		border: 1px solid var(--border);
		color: var(--foreground);
		font-size: 0.8rem;
		font-weight: 600;
		cursor: pointer;
		box-shadow:
			0 4px 16px rgba(0, 0, 0, 0.15),
			0 1px 3px rgba(0, 0, 0, 0.08);
		backdrop-filter: blur(8px);
		-webkit-backdrop-filter: blur(8px);
		transition:
			background 150ms,
			color 150ms,
			box-shadow 150ms,
			transform 120ms;
		letter-spacing: 0.01em;
	}

	.nav-fab:hover {
		transform: translateY(-1px);
		box-shadow:
			0 6px 20px rgba(0, 0, 0, 0.18),
			0 1px 4px rgba(0, 0, 0, 0.1);
	}

	.nav-fab:active {
		transform: translateY(0);
	}

	.nav-fab--active {
		background: var(--brand);
		color: var(--brand-foreground);
		border-color: var(--brand);
	}
</style>
