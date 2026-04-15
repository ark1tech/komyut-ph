<script lang="ts">
	import { Route, MapPin } from '@lucide/svelte';
	import { cn } from '$lib/utils';

	interface Props {
		routeId: number;
		routeName: string;
		class?: string;
	}

	let { routeId, routeName, class: className }: Props = $props();
</script>

<a
	href={`/map?route=${routeId}`}
	class={cn(
		'mt-2 flex items-center gap-2 rounded-lg border border-border/60 bg-card/60 px-3 py-2 transition-colors hover:bg-accent',
		className
	)}
>
	<div class="grid size-6 shrink-0 place-items-center rounded-full bg-brand/10 text-brand">
		<MapPin class="size-3.5" />
	</div>
	<div class="min-w-0 flex-1">
		<p class="truncate text-xs font-medium text-foreground">{routeName}</p>
		<p class="inline-flex items-center gap-1 text-[10px] text-muted-foreground">
			<Route class="size-3" />
			View route on map
		</p>
	</div>
</a>
