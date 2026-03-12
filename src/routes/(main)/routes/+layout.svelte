<script lang="ts">
	import { page } from '$app/state';
	import { ArrowLeft, Bell } from '@lucide/svelte';
	import UnifiedSearchBar from '$lib/components/shared/UnifiedSearchBar.svelte';
	import iconBlue from '$lib/images/komyut_icon_blue.svg';
	import textBlue from '$lib/images/komyut_text_blue.svg';
	import { resolve } from '$app/paths';
	let { children, data } = $props();

	let isRouteDetail = $derived(/^\/routes\/.+\/.+/.test(page.url.pathname));

	let unreadRoutes = $derived(data.unreadRoutes);
</script>

<div class="flex flex-col">
	<div
		class="sticky top-0 z-30 flex flex-row items-center gap-fluid-sm border-b bg-background/95 px-fluid-sm py-fluid-sm backdrop-blur-sm"
	>
		<div class="relative flex shrink-0 items-center">
			<div
				class="overflow-hidden transition-all ease-[cubic-bezier(0.65,0,0.25,1)] {isRouteDetail
					? 'max-w-0 opacity-0 duration-200'
					: 'max-w-40 opacity-100 delay-300 duration-200'}"
			>
				<a
					href={resolve('/routes')}
					class="flex shrink-0 cursor-default items-center gap-1.5"
					aria-label="Komyut PH routes"
					tabindex={isRouteDetail ? -1 : 0}
				>
					<img src={iconBlue} class="h-7 w-7" alt="Komyut logo" />
					<img src={textBlue} class="hidden h-5 sm:block" alt="Komyut" />
				</a>
			</div>
			<div
				class=" flex flex-row items-center overflow-hidden transition-all ease-[cubic-bezier(0.65,0,0.25,1)] {isRouteDetail
					? 'max-w-10 opacity-100 delay-300 duration-200'
					: 'max-w-0 opacity-0 duration-200'}"
			>
				<button
					onclick={() => history.back()}
					class="shrink-0 cursor-pointer rounded-full text-muted-foreground hover:bg-muted/50 hover:text-foreground"
					aria-label="Go back"
					tabindex={isRouteDetail ? 0 : -1}
				>
					<ArrowLeft class="size-6" />
				</button>
			</div>
		</div>

		<div class="flex-1">
			<UnifiedSearchBar />
		</div>

		<a
			href={resolve('/notifications?scope=routes')}
			class="relative grid size-9 shrink-0 place-items-center rounded-full text-muted-foreground hover:bg-muted/50 hover:text-foreground"
			aria-label="Route notifications"
		>
			<Bell class="size-5" />
			{#if unreadRoutes > 0}
				<span
					class="absolute -top-1 -right-1 grid min-w-4 place-items-center rounded-full bg-destructive px-1 text-[10px] leading-4 font-semibold text-white"
					aria-label={`${unreadRoutes} unread route notifications`}
				>
					{unreadRoutes > 9 ? '9+' : unreadRoutes}
				</span>
			{/if}
		</a>
	</div>

	{@render children()}
</div>
