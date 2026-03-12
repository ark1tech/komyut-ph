<script lang="ts">
	import { Accessibility, Clock, Coins, Star } from '@lucide/svelte';
	import { resolve } from '$app/paths';
	import { cn } from '$lib/utils';
	import type { SavedRouteDTO } from '$lib/validation/schemas';

	interface Props {
		route: SavedRouteDTO;
		view: 'recent' | 'saved';
		class?: string;
	}

	let { route, view, class: className }: Props = $props();

	const mapHref = $derived(resolve(`/map?route=${route.saved_route_id}`));
</script>

<article
	class={cn(
		'relative rounded-2xl bg-card p-4 transition-colors hover:bg-accent',
		className
	)}
>
	<a href={mapHref} class="block after:absolute after:inset-0 after:rounded-2xl">
		<div class="pointer-events-none relative z-10">
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
		</div>
	</a>
</article>
