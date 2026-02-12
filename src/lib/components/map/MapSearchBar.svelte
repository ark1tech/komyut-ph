<script lang="ts">
	import { Search } from '@lucide/svelte';
	let searchQuery = $state('');
</script>

<section aria-label="Search Bar" class="absolute right-0 bottom-5 left-0 z-10 px-4 md:px-6">
	<div class="relative">
		<Search class="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
		<input
			type="text"
			bind:value={searchQuery}
			placeholder="Where to komyut?"
			class="w-full rounded-lg border border-border bg-background py-2 pr-4 pl-10 text-sm text-foreground shadow-lg placeholder:text-muted-foreground focus:ring-2 focus:ring-ring focus:outline-none"
		/>
	</div>
</section>
