<script lang="ts">
	import { Accessibility, Bell, Clock, Coins, Star } from '@lucide/svelte';
	import { resolve } from '$app/paths';

	let { data } = $props();

	type View = 'recent' | 'saved';
	let view = $state<View>('recent');

	const activeList = $derived(view === 'recent' ? data.recentRoutes : data.savedRoutes);
</script>

<svelte:head>
	<title>Routes | Komyut PH</title>
	<meta name="description" content="Recently used and saved routes" />
</svelte:head>

<!-- Sticky header (same style as forum) -->
<div class="sticky top-0 z-30 border-b bg-background/95 backdrop-blur-sm">
	<div class="relative flex items-center justify-between gap-fluid-sm px-fluid-sm py-fluid-sm">
		<div class="min-w-9" aria-hidden="true"></div>

		<div class="pointer-events-none absolute left-1/2 -translate-x-1/2 text-base font-semibold">
			Routes
		</div>

		<a
			href={resolve("/notifications?scope=routes")}
			class="relative grid size-9 place-items-center rounded-full text-muted-foreground hover:bg-muted/50 hover:text-foreground"
			aria-label="Route notifications"
		>
			<Bell class="size-5" />
			{#if data.unreadRouteAlerts > 0}
				<span
					class="absolute -top-1 -right-1 grid min-w-4 place-items-center rounded-full bg-destructive px-1 text-[10px] leading-4 font-semibold text-white"
					aria-label={`${data.unreadRouteAlerts} unread route notifications`}
				>
					{data.unreadRouteAlerts > 9 ? '9+' : data.unreadRouteAlerts}
				</span>
			{/if}
		</a>
	</div>

	<!-- Recents / Saved toggle -->
	<div class="px-fluid-sm pb-fluid-sm">
		<div class="flex gap-2" role="radiogroup" aria-label="Routes list">
			<button
				type="button"
				role="radio"
				aria-checked={view === 'recent'}
				onclick={() => (view = 'recent')}
				class="flex cursor-pointer items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors
                    {view === 'recent'
					? 'bg-brand text-white'
					: 'bg-card text-muted-foreground hover:bg-muted/50 hover:text-foreground'}"
			>
				Recents
			</button>

			<button
				type="button"
				role="radio"
				aria-checked={view === 'saved'}
				onclick={() => (view = 'saved')}
				class="flex cursor-pointer items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors
                    {view === 'saved'
					? 'bg-brand text-white'
					: 'bg-card text-muted-foreground hover:bg-muted/50 hover:text-foreground'}"
			>
				Saved
			</button>
		</div>
	</div>
</div>

<section class="space-y-3 px-fluid-sm py-fluid-sm" aria-label="Routes">
	<!-- Optional little header text for context -->
	<div class="flex items-center justify-between">
		<h2 class="text-sm font-semibold text-foreground">
			{view === 'recent' ? 'Recently used' : 'Saved routes'}
		</h2>

		{#if view === 'recent'}
			<a href={resolve("/map")} class="text-xs font-medium text-muted-foreground hover:text-foreground">
				Open map
			</a>
		{:else}
			<a
				href={resolve("/profile/savedroutes")}
				class="text-xs font-medium text-muted-foreground hover:text-foreground"
			>
				Manage
			</a>
		{/if}
	</div>

	{#if activeList.length === 0}
		<div class="rounded-2xl bg-card p-4">
			<h3 class="text-sm font-semibold text-foreground">
				{view === 'recent' ? 'No recent routes yet' : 'No saved routes yet'}
			</h3>
			<p class="mt-1 text-sm text-muted-foreground">
				{view === 'recent'
					? 'When you use a route, it will show up here.'
					: 'Star a route and it’ll show up here for quick access.'}
			</p>
			<a
				href={resolve("/map")}
				class="mt-3 inline-flex items-center rounded-full bg-border/40 px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground"
			>
				Find routes
			</a>
		</div>
	{:else}
		{#each activeList as route (route.saved_route_id)}
			<article class="rounded-2xl bg-card p-4 transition-colors hover:bg-accent">
				<a href={resolve("/map?route={route.saved_route_id}")} class="block">
					<div class="flex items-start justify-between gap-3">
						<div class="min-w-0">
							<h3 class="truncate text-sm font-semibold text-foreground">{route.route_name}</h3>
							<p class="mt-1 text-sm text-muted-foreground">
								{route.start_loc} <span aria-hidden="true">→</span>
								{route.end_loc}
							</p>
						</div>

						{#if view === 'saved'}
							<div
								class="grid size-9 shrink-0 place-items-center rounded-full bg-border/40 text-brand"
								aria-label="Saved route"
							>
								<Star class="size-4" fill="currentColor" />
							</div>
						{/if}
					</div>

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
