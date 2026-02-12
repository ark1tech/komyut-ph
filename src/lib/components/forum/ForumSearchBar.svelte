<script lang="ts">
	import { Search } from '@lucide/svelte';
</script>

<div class="relative w-full h-full">
	<Search class="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
	<input
		type="text"
		placeholder="Saan tayo?"
		class="w-full rounded-xl border border-border bg-card py-2.5 pr-4 pl-10 text-sm text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-brand/40 focus:outline-none"
	/>
</div>
