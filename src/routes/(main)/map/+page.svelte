<script lang="ts">
	import Map from '$lib/components/map/Map.svelte';
	import MapSearchBar from '$lib/components/map/MapSearchBar.svelte';
	import * as Drawer from '$lib/components/ui/drawer/index';

	interface RouteResult {
		route_id: number | string;
		geometry: string | GeoJSON.LineString;
	}

	let routes = $state<RouteResult[]>([]);
	let selectedRoute = $state<RouteResult | null>(null);
	let selectedRouteId = $state<string | null>(null);
	let loadingRoutes = $state(false);
	let routeError = $state<string | null>(null);
	let hasSearched = $state(false);

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
	}
</script>

<svelte:head>
	<title>Map | Komyut PH</title>
	<meta name="description" content="Your commute companion for the Philippines" />
</svelte:head>

<div class="relative flex-1">
	<Map {selectedRoute} />
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
					{#each routes as route}
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
</div>
