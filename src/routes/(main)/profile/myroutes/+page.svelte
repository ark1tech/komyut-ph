<script lang="ts">
	import ProfileSubpageHeader from '../ProfileSubpageHeader.svelte';
	import { mockRoutes, type SavedRoute } from '$lib/data/mock_routes';
	import { Accessibility, Clock, Coins } from '@lucide/svelte';

	// Assumption (temporary): until we have auth + backend, "My Routes" is a believable subset.
	const myRoutes: SavedRoute[] = mockRoutes.slice(0, 5);
</script>

<svelte:head>
	<title>My Routes | Komyut PH</title>
	<meta name="description" content="Routes you created" />
</svelte:head>

<ProfileSubpageHeader title="My Routes" />

<section class="space-y-3 px-fluid-sm py-fluid-sm" role="region" aria-label="My routes">
	{#if myRoutes.length === 0}
		<div class="rounded-2xl bg-card p-4">
			<h2 class="text-sm font-semibold text-foreground">No routes yet</h2>
			<p class="mt-1 text-sm text-muted-foreground">
				When you record or trace a route, it’ll show up here.
			</p>
			<a
				href="/map"
				class="mt-3 inline-flex items-center rounded-full bg-border/40 px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground"
			>
				Explore the map
			</a>
		</div>
	{:else}
		{#each myRoutes as route (route.route_id)}
			<article class="relative rounded-2xl bg-card p-4 transition-colors hover:bg-accent">
				<a
					href="/map?route={route.route_id}"
					class="block after:absolute after:inset-0 after:rounded-2xl"
				>
					<h2 class="text-sm font-semibold text-foreground">{route.route_name}</h2>
					<p class="mt-1 text-sm text-muted-foreground">
						{route.start_loc} <span aria-hidden="true">→</span> {route.end_loc}
					</p>

					<div class="mt-3 flex flex-wrap gap-2" aria-label="Route attributes">
						{#each route.vehicle_types as vt (vt)}
							<span
								class="rounded-full bg-border/40 px-3 py-1.5 text-xs font-medium text-muted-foreground"
							>
								{vt}
							</span>
						{/each}
						{#if route.pwd_friendly}
							<span
								class="inline-flex items-center gap-1.5 rounded-full bg-success/15 px-3 py-1.5 text-xs font-medium text-success"
							>
								<Accessibility class="size-4" />
								PWD-friendly
							</span>
						{/if}
					</div>

					<div class="mt-3 flex items-center gap-fluid-md text-xs text-muted-foreground">
						<span class="inline-flex items-center gap-1.5">
							<Clock class="size-4" />
							{route.est_time_of_arrival} min
						</span>
						<span class="inline-flex items-center gap-1.5">
							<Coins class="size-4" />
							₱{route.fare}
						</span>
					</div>
				</a>
			</article>
		{/each}
	{/if}
</section>