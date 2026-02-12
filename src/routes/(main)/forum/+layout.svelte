<script lang="ts">
	import { page } from '$app/state';
	import { ArrowLeft } from '@lucide/svelte';
	import ForumSearchBar from '$lib/components/forum/ForumSearchBar.svelte';
	import iconBlue from '$lib/images/komyut_icon_blue.svg';
	import textBlue from '$lib/images/komyut_text_blue.svg';

	let { children } = $props();

	let isPostRoute = $derived(page.url.pathname !== '/forum');
</script>

<div class="flex flex-col">
	<!-- search -->
	<div
		class="sticky top-0 z-30 flex flex-row items-center gap-fluid-sm border-b bg-background/95 px-fluid-sm py-fluid-sm backdrop-blur-sm"
	>
		<div class="relative flex shrink-0 items-center">
			<div
				class="overflow-hidden transition-all ease-in-out {isPostRoute
					? 'max-w-0 opacity-0 duration-400'
					: 'max-w-40 opacity-100 delay-400 duration-400'}"
			>
				<a
					href="/forum"
					class="flex shrink-0 cursor-default items-center gap-1.5"
					aria-label="Komyut PH home"
					tabindex={isPostRoute ? -1 : 0}
				>
					<img src={iconBlue} class="h-7 w-7" alt="Komyut logo" />
					<img src={textBlue} class="hidden h-5 sm:block" alt="Komyut" />
				</a>
			</div>
			<div
				class=" flex flex-row items-center overflow-hidden transition-all ease-in-out {isPostRoute
					? 'max-w-10 opacity-100 delay-400 duration-400'
					: 'max-w-0 opacity-0 duration-400'}"
			>
				<button
					onclick={() => history.back()}
					class="shrink-0 cursor-pointer rounded-full text-muted-foreground hover:bg-muted/50 hover:text-foreground"
					aria-label="Go back"
					tabindex={isPostRoute ? 0 : -1}
				>
					<ArrowLeft class="size-6" />
				</button>
			</div>
		</div>
		<div class="flex-1">
			<ForumSearchBar />
		</div>
	</div>

	{@render children()}
</div>
