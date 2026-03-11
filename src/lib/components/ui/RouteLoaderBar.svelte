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
		class="pointer-events-none fixed top-0 right-0 left-0 z-1000 h-1 overflow-hidden bg-transparent"
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
		/* softly glowing center with feathered, transparent edges */
		background: linear-gradient(
			to right,
			transparent 0%,
			color-mix(in srgb, var(--brand) 80%, transparent) 20%,
			var(--brand-foreground) 50%,
			color-mix(in srgb, var(--brand) 80%, transparent) 80%,
			transparent 100%
		);
		animation: routeLoaderIndeterminate 900ms ease-in-out infinite;
		border-radius: 9999px;
		box-shadow:
			0 0 0 1px color-mix(in srgb, var(--brand) 60%, transparent),
			0 0 28px 10px color-mix(in srgb, var(--brand) 40%, transparent);
		/* fade the entire bar out at the edges for a feathered look */
		mask-image: linear-gradient(to right, transparent, black 25%, black 75%, transparent);
		-webkit-mask-image: linear-gradient(to right, transparent, black 25%, black 75%, transparent);
	}
</style>

