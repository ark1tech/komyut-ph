<script lang="ts">
	import { Search } from '@lucide/svelte';
	import Map from '$lib/components/Map.svelte';

	let searchQuery = $state('');
</script>

<svelte:head>
	<title>Komyut PH</title>
	<meta name="description" content="Your commute companion for the Philippines" />
</svelte:head>

<div class="relative h-dvh">
	
	<Map />
	<section
		aria-label="Search Bar"
		class="absolute bottom-20 left-0 right-0 z-10 px-4 md:px-6"
	>
		<div class="relative">
			<Search class="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
			<input
				type="text"
				bind:value={searchQuery}
				placeholder="Where to komyut?"
				class="w-full rounded-lg border border-border bg-background py-2 pl-10 pr-4 text-sm text-foreground shadow-lg placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
			/>
		</div>
	</section>
</div>
