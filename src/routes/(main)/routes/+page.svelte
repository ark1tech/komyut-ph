<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import RouteCard from '$lib/components/routes/RouteCard.svelte';
	import RouteSubscriptionPreferences from '$lib/components/routes/RouteSubscriptionPreferences.svelte';
	import RoutesSortBar from '$lib/components/routes/RoutesSortBar.svelte';
	import * as Button from '$lib/components/ui/button';
	import * as Pagination from '$lib/components/ui/pagination';
	import { cn } from '$lib/utils';
	import { routesSearchQuery } from '$lib/stores/routesSearch';
	import { page } from '$app/state';
	import { Accessibility, Bell, Clock, Coins, Info, MapPin, PenLine, X } from '@lucide/svelte';
	import type { SavedRouteDTO } from '$lib/validation/schemas';

	let { data } = $props();

	function isSameRouteAsAlertsPanel(route: SavedRouteDTO, alerts: NonNullable<typeof data.alertsRoute>) {
		if (route.saved_route_id === alerts.saved_route_id) return true;
		if (
			route.geo_route_id != null &&
			alerts.geo_route_id != null &&
			route.geo_route_id === alerts.geo_route_id
		) {
			return true;
		}
		return false;
	}

	type ViewOption = 'recent' | 'subscribed';

	const PER_PAGE = 5;

	let activeView = $state<ViewOption>('recent');

	let currentPage = $derived(Number(page.url.searchParams.get('page')) || 1);

	const activeList = $derived(
		activeView === 'recent' ? data.recentRoutes : data.subscribedRoutes
	);

	let filteredRoutes = $derived.by(() => {
		const q = $routesSearchQuery.trim().toLowerCase();
		if (!q) return activeList;
		return activeList.filter(
			(route) =>
				route.route_name.toLowerCase().includes(q) ||
				route.start_loc.toLowerCase().includes(q) ||
				route.end_loc.toLowerCase().includes(q)
		);
	});

	/** Avoid duplicating the route already shown in the alert preferences panel */
	let listRoutes = $derived.by(() => {
		const alerts = data.alertsRoute;
		if (!alerts) return filteredRoutes;
		return filteredRoutes.filter((r) => !isSameRouteAsAlertsPanel(r, alerts));
	});

	let pagedRoutes = $derived(
		listRoutes.slice((currentPage - 1) * PER_PAGE, currentPage * PER_PAGE)
	);

	function setPage(p: number) {
		const next = new URL(page.url);
		next.searchParams.set('page', String(p));
		// eslint-disable-next-line svelte/no-navigation-without-resolve
		void goto(`${next.pathname}${next.search}`, { keepFocus: true, noScroll: true });
	}

	function handleViewChange(value: ViewOption) {
		activeView = value;
		const next = new URL(page.url);
		next.searchParams.set('page', '1');
		// eslint-disable-next-line svelte/no-navigation-without-resolve
		void goto(`${next.pathname}${next.search}`, { keepFocus: true, noScroll: true });
	}

	let subscriptionOverride = $state<typeof data.alertsSubscription | 'unset'>('unset');
	$effect(() => {
		void data.alertsSubscription;
		subscriptionOverride = 'unset';
	});

	let subscription = $derived(
		subscriptionOverride !== 'unset' ? subscriptionOverride : data.alertsSubscription
	);

	function handleSubscriptionChange(nextSubscription: typeof data.alertsSubscription) {
		subscriptionOverride = nextSubscription;
	}

	let isRouteSubscribed = $derived(
		subscription?.status === 'active' || subscription?.status === 'muted'
	);

	async function dismissAlertsPanel() {
		await goto(resolve('/routes'), { keepFocus: true, noScroll: true, replaceState: true });
	}

	let mapHref = $derived(
		data.alertsRoute
			? `${resolve('/map')}?route=${data.alertsRoute.geo_route_id ?? data.alertsRoute.saved_route_id}`
			: null
	);
</script>

<svelte:head>
	<title>Routes | Komyut PH</title>
	<meta name="description" content="Recently used and subscribed routes" />
</svelte:head>

<div class="flex flex-wrap items-center justify-between gap-3 px-fluid-sm pt-fluid-sm">
	<RoutesSortBar active={activeView} onchange={handleViewChange} class="min-w-0" />
	<Button.Root variant="outline" size="sm" class="shrink-0 gap-1.5" href={resolve('/map?trace=1')}>
		<PenLine class="size-3.5" aria-hidden="true" />
		Add a traced route
	</Button.Root>
</div>

{#if data.alertsRouteInvalid}
	<div class="px-fluid-sm pt-fluid-sm">
		<div
			class="rounded-2xl border border-destructive/20 bg-card p-4 text-sm text-destructive shadow-sm"
			role="alert"
		>
			<p>That route could not be found for your account.</p>
			<Button.Root variant="outline" size="sm" class="mt-3" onclick={() => void dismissAlertsPanel()}>
				Back to routes
			</Button.Root>
		</div>
	</div>
{:else if data.alertsRoute}
	<div class="px-fluid-sm pt-fluid-sm">
		<article
			class={cn(
				'relative w-full rounded-2xl border border-border/60 bg-card p-4 shadow-sm'
			)}
		>
			<Button.Root
				variant="ghost"
				size="icon-sm"
				class="absolute top-3 right-3 z-10 shrink-0 rounded-full p-1.5 text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground"
				onclick={() => void dismissAlertsPanel()}
			>
				<X class="size-4" />
				<span class="sr-only">Close alert preferences</span>
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
					{#if data.alertsRoute.geo_route_id}
						<span>Alerts</span>
					{:else}
						<span>Preview only</span>
					{/if}
				</div>

				<h2 class="mt-2 text-sm leading-snug font-semibold text-foreground">
					{data.alertsRoute.route_name}
				</h2>

				<p class="mt-1 text-sm leading-relaxed text-muted-foreground">
					{data.alertsRoute.start_loc}
					<span aria-hidden="true" class="mx-1.5">→</span>
					{data.alertsRoute.end_loc}
				</p>
			</div>

			<div class="mt-3 flex flex-wrap gap-2" aria-label="Route attributes">
				{#each data.alertsRoute.vehicle_types as vehicleType (vehicleType)}
					<span
						class="rounded-full bg-border/40 px-3 py-1.5 text-xs font-medium text-muted-foreground"
					>
						{vehicleType}
					</span>
				{/each}

				{#if data.alertsRoute.pwd_friendly}
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
			</div>

			<div class="mt-3 flex flex-wrap gap-2" aria-label="Route time and fare">
				<span
					class="inline-flex items-center gap-1.5 rounded-full bg-border/40 px-3 py-1.5 text-xs text-muted-foreground"
				>
					<Clock class="size-4 shrink-0" />
					{data.alertsRoute.est_time_of_arrival} min
				</span>
				<span
					class="inline-flex items-center gap-1.5 rounded-full bg-border/40 px-3 py-1.5 text-xs text-muted-foreground"
				>
					<Coins class="size-4 shrink-0" />
					₱{data.alertsRoute.fare}
				</span>
			</div>

			{#if data.alertsRoute.geo_route_id}
				{#if isRouteSubscribed}
					<RouteSubscriptionPreferences
						class="mt-4"
						routeId={data.alertsRoute.geo_route_id}
						{subscription}
						onchange={handleSubscriptionChange}
					/>
				{:else}
					<div class="mt-4 space-y-3">
						<p class="text-sm text-muted-foreground">
							Subscribe to this route from the map to turn on alerts, then you can customize them here.
						</p>
						{#if mapHref}
							<Button.Root variant="default" size="sm" href={mapHref} class="w-full sm:w-auto">
								Open in map
							</Button.Root>
						{/if}
					</div>
				{/if}
			{:else}
				<div
					class="mt-4 flex items-start gap-2 rounded-xl border border-border/60 bg-muted/40 p-3 text-xs leading-relaxed text-muted-foreground"
				>
					<Info class="mt-0.5 size-4 shrink-0" />
					This route is not linked to a canonical route yet, so subscription alerts are not available for
					it.
				</div>
			{/if}
		</article>
	</div>
{/if}

<div class="space-y-3 px-fluid-sm py-fluid-sm" role="region" aria-label="Routes">
	{#each pagedRoutes as route (route.saved_route_id)}
		<RouteCard {route} view={activeView} />
	{/each}
</div>

{#if listRoutes.length > PER_PAGE}
	<div class="px-fluid-sm pb-fluid-sm">
		<Pagination.Root
			count={listRoutes.length}
			perPage={PER_PAGE}
			page={currentPage}
			onPageChange={setPage}
			siblingCount={1}
		>
			{#snippet children({ pages })}
				<Pagination.Content>
					<Pagination.Item>
						<Pagination.Previous />
					</Pagination.Item>
					{#each pages as p (p.key)}
						{#if p.type === 'ellipsis'}
							<Pagination.Item>
								<Pagination.Ellipsis />
							</Pagination.Item>
						{:else}
							<Pagination.Item>
								<Pagination.Link page={p} isActive={currentPage === p.value} />
							</Pagination.Item>
						{/if}
					{/each}
					<Pagination.Item>
						<Pagination.Next />
					</Pagination.Item>
				</Pagination.Content>
			{/snippet}
		</Pagination.Root>
	</div>
{/if}
