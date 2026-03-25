<script lang="ts">
	import { goto, invalidateAll } from '$app/navigation';
	import { page } from '$app/state';
	import Map from '$lib/components/map/Map.svelte';
	import MapSearchBar from '$lib/components/map/MapSearchBar.svelte';
	import RouteSubscribeButton from '$lib/components/routes/RouteSubscribeButton.svelte';
	import RouteSubscriptionPreferences from '$lib/components/routes/RouteSubscriptionPreferences.svelte';
	import * as Button from '$lib/components/ui/button';
	import { tick } from 'svelte';
	import { Accessibility, Bell, Check, Clock, Coins, Info, Pencil, X } from '@lucide/svelte';
	import type { RouteSubscriptionDTO } from '$lib/validation/schemas';

	let { data } = $props();

	let subscription = $derived(data.selectedSubscription);
	let routeNameDraft = $state('');
	let routeNameInput = $state<HTMLInputElement | null>(null);
	let isEditingRouteName = $state(false);
	let savingRouteName = $state(false);
	let routeNameError = $state<string | null>(null);
	let routeNameSuccess = $state<string | null>(null);
	let previousRouteKey = $state<number | null>(null);

	let displayedRouteName = $derived(
		subscription?.saved_route?.route_name ?? data.selectedRoute?.route_name ?? ''
	);
	let currentRouteKey = $derived(
		data.selectedRoute?.geo_route_id ?? data.selectedRoute?.saved_route_id ?? null
	);
	let canEditRouteName = $derived(Boolean(subscription && data.selectedRoute?.geo_route_id));
	let canSaveRouteName = $derived(
		Boolean(
			routeNameDraft.trim() &&
				routeNameDraft.trim() !== displayedRouteName.trim() &&
				!savingRouteName
		)
	);

	$effect(() => {
		if (currentRouteKey !== previousRouteKey) {
			previousRouteKey = currentRouteKey;
			isEditingRouteName = false;
			routeNameError = null;
			routeNameSuccess = null;
		}

		routeNameDraft = displayedRouteName;
		if (!subscription) {
			isEditingRouteName = false;
			savingRouteName = false;
			routeNameError = null;
			routeNameSuccess = null;
		}
	});

	function handleSubscriptionChange(nextSubscription: typeof data.selectedSubscription) {
		subscription = nextSubscription;
		if (!nextSubscription) {
			isEditingRouteName = false;
			routeNameError = null;
			routeNameSuccess = null;
		}
	}

	async function beginRouteNameEdit() {
		if (!canEditRouteName) return;

		routeNameDraft = displayedRouteName;
		routeNameError = null;
		routeNameSuccess = null;
		isEditingRouteName = true;

		await tick();
		routeNameInput?.focus();
		routeNameInput?.select();
	}

	function cancelRouteNameEdit() {
		isEditingRouteName = false;
		routeNameDraft = displayedRouteName;
		routeNameError = null;
	}

	async function saveRouteName() {
		if (!data.selectedRoute?.geo_route_id || !subscription || savingRouteName) return;

		const routeName = routeNameDraft.trim();
		if (!routeName) {
			routeNameError = 'Enter a route name first';
			routeNameSuccess = null;
			return;
		}

		if (routeName === displayedRouteName.trim()) {
			isEditingRouteName = false;
			routeNameError = null;
			return;
		}

		savingRouteName = true;
		routeNameError = null;
		routeNameSuccess = null;

		try {
			const response = await fetch(`/api/route-subscriptions/${data.selectedRoute.geo_route_id}`, {
				method: 'PATCH',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					routeName
				})
			});

			if (!response.ok) {
				const body = (await response.json().catch(() => null)) as { message?: string } | null;
				throw new Error(body?.message ?? 'Failed to update route name');
			}

			const body = (await response.json()) as { subscription: RouteSubscriptionDTO };
			handleSubscriptionChange(body.subscription);
			isEditingRouteName = false;
			routeNameSuccess = 'Subscribed name updated';
			await invalidateAll();
		} catch (err) {
			routeNameError = err instanceof Error ? err.message : 'Something went wrong';
		} finally {
			savingRouteName = false;
		}
	}

	function handleRouteNameKeydown(event: KeyboardEvent) {
		if (event.key === 'Enter') {
			event.preventDefault();
			void saveRouteName();
			return;
		}

		if (event.key === 'Escape') {
			event.preventDefault();
			cancelRouteNameEdit();
		}
	}
	import * as Drawer from '$lib/components/ui/drawer/index';

	interface RouteResult {
		route_id: number | string;
		geometry: string | GeoJSON.LineString;
	}

	let routes = $state<RouteResult[]>([]);
	let selectedRoute = $state<RouteResult | null>(null);
	let selectedRouteId = $state<string | null>(null);
	let selectedRouteSource = $state<'drawer' | 'popup'>('drawer');
	let loadingRoutes = $state(false);
	let routeError = $state<string | null>(null);
	let hasSearched = $state(false);
	let hasSelectedRoutePopup = $derived(Boolean(data.selectedRoute));

	async function handleSearch(payload: { start: string; end: string }) {
		loadingRoutes = true;
		routeError = null;
		hasSearched = true;
		routes = [];
		selectedRoute = null;
		selectedRouteId = null;

		try {
			const response = await fetch(`/api/map/routes?start=${payload.start}&end=${payload.end}`);
			if (!response.ok) {
				routeError = 'Failed to load routes. Please try again.';
				return;
			}

			const data = await response.json();
			routes = Array.isArray(data.results) ? data.results : [];
		} catch (error) {
			console.error('Error loading route list:', error);
			routeError = 'Failed to load routes. Please try again.';
		} finally {
			loadingRoutes = false;
		}
	}

	function selectRoute(route: RouteResult) {
		selectedRoute = route;
		selectedRouteId = String(route.route_id);
		selectedRouteSource = 'drawer';
	}

	$effect(() => {
		const selectedRouteGeometry = data.selectedRouteGeometry as RouteResult | null;

		if (data.selectedRoute) {
			if (selectedRouteGeometry) {
				selectedRoute = selectedRouteGeometry;
				selectedRouteId = String(selectedRouteGeometry.route_id);
			} else {
				selectedRoute = null;
				selectedRouteId = null;
			}
			selectedRouteSource = 'popup';
			return;
		}

		if (selectedRouteSource === 'popup') {
			selectedRoute = null;
			selectedRouteId = null;
			selectedRouteSource = 'drawer';
		}
	});

	async function closeSelectedRoutePopup() {
		const nextUrl = new URL(page.url);
		nextUrl.searchParams.delete('route');

		const target = `${nextUrl.pathname}${nextUrl.search}`;
		// eslint-disable-next-line svelte/no-navigation-without-resolve
		await goto(target, { keepFocus: true, noScroll: true, replaceState: true });
	}
</script>

<svelte:head>
	<title>Map | Komyut PH</title>
	<meta name="description" content="Your commute companion for the Philippines" />
</svelte:head>

<div class="relative flex-1">
	<Map {selectedRoute} controlsHidden={hasSelectedRoutePopup} />

	{#if data.routeSelectionInvalid}
		<div class="pointer-events-none absolute inset-x-0 top-4 z-20 px-4">
			<div class="pointer-events-auto rounded-2xl border border-destructive/20 bg-card/95 p-3 text-sm text-destructive shadow-lg backdrop-blur">
				The selected route could not be found for this account.
			</div>
		</div>
	{/if}

	{#if data.selectedRoute}
		<div class="pointer-events-none absolute inset-x-0 bottom-20 z-20 px-4">
			<section class="pointer-events-auto relative rounded-[1.75rem] border border-border/70 bg-card/95 p-4 shadow-xl backdrop-blur">
				<Button.Root
					variant="ghost"
					size="icon-sm"
					class="absolute top-3 right-3 z-10 shrink-0 text-muted-foreground transition-colors hover:text-foreground"
					onclick={() => void closeSelectedRoutePopup()}
				>
					<X class="size-4" />
					<span class="sr-only">Close route details</span>
				</Button.Root>

				<div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
					<div class="min-w-0 flex-1">
						<p class="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
							Route details
						</p>

						{#if canEditRouteName}
							{#if isEditingRouteName}
								<div class="mt-1 flex items-start gap-2">
									<input
										bind:this={routeNameInput}
										bind:value={routeNameDraft}
										class="min-w-0 flex-1 rounded-xl border border-border bg-background px-3 py-2 text-lg font-semibold text-foreground outline-none transition focus:border-ring focus:ring-2 focus:ring-ring/30"
										maxlength="255"
										onkeydown={handleRouteNameKeydown}
										placeholder="Route name"
										type="text"
									/>
									<Button.Root
										variant="secondary"
										size="icon-sm"
										disabled={!canSaveRouteName}
										onclick={() => void saveRouteName()}
									>
										<Check class="size-4" />
										<span class="sr-only">Save route name</span>
									</Button.Root>
									<Button.Root
										variant="ghost"
										size="icon-sm"
										disabled={savingRouteName}
										onclick={cancelRouteNameEdit}
									>
										<X class="size-4" />
										<span class="sr-only">Cancel editing route name</span>
									</Button.Root>
								</div>
							{:else}
								<div class="mt-1 flex items-center gap-2">
									<button
										type="button"
										class="group min-w-0 text-left"
										onclick={() => void beginRouteNameEdit()}
									>
										<span class="block truncate text-lg font-semibold text-foreground">
											{displayedRouteName}
										</span>
									</button>
									<Button.Root
										variant="ghost"
										size="icon-sm"
										class="shrink-0 text-muted-foreground transition-colors hover:text-foreground"
										onclick={() => void beginRouteNameEdit()}
									>
										<Pencil class="size-4" />
										<span class="sr-only">Edit route name</span>
									</Button.Root>
								</div>
							{/if}
						{:else}
							<h2 class="mt-1 truncate text-lg font-semibold text-foreground">
								{data.selectedRoute.route_name}
							</h2>
						{/if}

						<p class="mt-1 text-sm text-muted-foreground">
							{data.selectedRoute.start_loc} <span aria-hidden="true">→</span>
							{data.selectedRoute.end_loc}
						</p>

						{#if routeNameSuccess}
							<p class="mt-2 text-xs text-success" role="status">{routeNameSuccess}</p>
						{/if}

						{#if routeNameError}
							<p class="mt-2 text-xs text-destructive" role="alert">{routeNameError}</p>
						{/if}
					</div>

					{#if data.selectedRoute.geo_route_id}
						<RouteSubscribeButton
							routeId={data.selectedRoute.geo_route_id}
							savedRouteId={data.selectedRoute.saved_route_id}
							savedRoute={data.selectedRoute}
							defaultRouteName={data.selectedRoute.route_name}
							initialSubscription={subscription}
							onchange={handleSubscriptionChange}
						/>
					{/if}
				</div>

				<div class="mt-3 flex flex-wrap gap-2" aria-label="Route attributes">
					{#each data.selectedRoute.vehicle_types as vehicleType (vehicleType)}
						<span class="rounded-full bg-border/40 px-3 py-1.5 text-xs font-medium text-muted-foreground">
							{vehicleType}
						</span>
					{/each}

					{#if data.selectedRoute.pwd_friendly}
						<span class="inline-flex items-center gap-1.5 rounded-full bg-success/15 px-3 py-1.5 text-xs font-medium text-success">
							<Accessibility class="size-4" />
							PWD-friendly
						</span>
					{/if}

					{#if subscription}
						<span class="inline-flex items-center gap-1.5 rounded-full bg-brand/10 px-3 py-1.5 text-xs font-medium text-brand">
							<Bell class="size-4" />
							Subscribed
						</span>
					{/if}
				</div>

				<div class="mt-3 flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
					<span class="inline-flex items-center gap-1.5">
						<Clock class="size-4" />
						{data.selectedRoute.est_time_of_arrival} min
					</span>
					<span class="inline-flex items-center gap-1.5">
						<Coins class="size-4" />
						₱{data.selectedRoute.fare}
					</span>
				</div>

				{#if data.selectedRoute.geo_route_id}
					<RouteSubscriptionPreferences
						class="mt-4"
						routeId={data.selectedRoute.geo_route_id}
						{subscription}
						onchange={handleSubscriptionChange}
					/>
				{:else}
					<div class="mt-4 inline-flex items-start gap-2 rounded-2xl bg-muted/60 p-3 text-xs text-muted-foreground">
						<Info class="mt-0.5 size-4 shrink-0" />
						This route has not been linked to a canonical `route_id` yet, so subscription alerts are not available for it.
					</div>
				{/if}
			</section>
		</div>
	{/if}
	{#if !hasSelectedRoutePopup}
		<MapSearchBar onSearch={handleSearch} loading={loadingRoutes} errorMessage={routeError} />
		<Drawer.Root>
			<Drawer.Trigger
				class="absolute top-4 left-4 z-20 w-32 rounded-lg bg-white px-4 py-2 text-sm font-medium text-black shadow-md hover:bg-gray-50"
			>
				View Routes
			</Drawer.Trigger>
			<Drawer.Content>
				<Drawer.Header>
					<Drawer.Title>Available Routes</Drawer.Title>
					<Drawer.Description>Select a route to draw it on the map.</Drawer.Description>
				</Drawer.Header>

				<div class="max-h-[60vh] space-y-2 overflow-y-auto px-4 pb-4">
					{#if loadingRoutes}
						<p
							class="rounded-lg border border-border bg-muted px-3 py-2 text-sm text-muted-foreground"
						>
							Loading routes...
						</p>
					{:else if routeError}
						<p class="rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">
							{routeError}
						</p>
					{:else if !hasSearched}
						<p
							class="rounded-lg border border-border bg-muted px-3 py-2 text-sm text-muted-foreground"
						>
							Enter start and end OSM IDs, then search to load routes.
						</p>
					{:else if routes.length === 0}
						<p
							class="rounded-lg border border-border bg-muted px-3 py-2 text-sm text-muted-foreground"
						>
							No routes are available for the selected start and end locations.
						</p>
					{:else}
						{#each routes as route (route.route_id)}
							<button
								type="button"
								onclick={() => selectRoute(route)}
								class={`w-full rounded-lg border px-3 py-2 text-left text-sm shadow-sm transition ${
									selectedRouteId === String(route.route_id)
										? 'border-blue-500 bg-blue-50 text-blue-900'
										: 'border-border bg-white hover:bg-muted'
								}`}
							>
								<p class="font-medium">Route #{route.route_id}</p>
								<p class="text-xs text-muted-foreground">Click to preview this route on the map</p>
							</button>
						{/each}
					{/if}
				</div>

				<Drawer.Footer>
					<Drawer.Close
						class="rounded-lg bg-gray-100 px-4 py-2 text-sm font-medium text-black hover:bg-gray-200"
					>
						Close
					</Drawer.Close>
				</Drawer.Footer>
			</Drawer.Content>
		</Drawer.Root>
	{/if}
</div>
