<script lang="ts">
	import { navigating } from '$app/stores';
	import { onDestroy } from 'svelte';

	const DELAY_MS = 200;

	let visible = $state(false);
	let timeout: ReturnType<typeof setTimeout> | undefined;

	$effect(() => {
		if ($navigating) {
			timeout = setTimeout(() => {
				visible = true;
			}, DELAY_MS);
		} else {
			if (timeout) clearTimeout(timeout);
			timeout = undefined;
			visible = false;
		}

		return () => {
			if (timeout) clearTimeout(timeout);
		};
	});

	onDestroy(() => {
		if (timeout) clearTimeout(timeout);
	});
</script>

{#if visible}
	<div
		aria-hidden="true"
		class="pointer-events-none fixed top-0 right-0 left-0 z-[100] h-1 overflow-hidden bg-transparent"
	>
		<div class="route-loader-bar h-full"></div>
	</div>
{/if}

<style>
	@keyframes routeLoaderIndeterminate {
		0% {
			transform: translateX(-60%);
		}
		100% {
			transform: translateX(160%);
		}
	}

	.route-loader-bar {
		width: 45%;
		background: hsl(var(--brand));
		animation: routeLoaderIndeterminate 900ms ease-in-out infinite;
		border-radius: 9999px;
	}
</style>

