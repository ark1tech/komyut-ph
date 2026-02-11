<script lang="ts">
	import './layout.css';
	let { children } = $props();
</script>

<div class="flex min-h-dvh flex-col bg-background text-foreground">
	<main class="flex-1">
		{@render children()}
	</main>
</div>
