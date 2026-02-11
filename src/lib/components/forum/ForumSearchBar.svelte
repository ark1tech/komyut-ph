<script lang="ts">
	import { Search } from '@lucide/svelte';
</script>

<div class="relative">
	<Search class="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
	<input
		type="text"
		placeholder="Saan tayo?"
		class="w-full rounded-xl border border-border bg-card py-2.5 pl-10 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-brand/40"
	/>
</div>
