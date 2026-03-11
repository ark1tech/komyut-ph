<script lang="ts">
	import type { Snippet } from 'svelte';
	import { ArrowLeft } from '@lucide/svelte';

	interface Props {
		title: string;
		backHref?: string;
		right?: Snippet;
	}

	let { title, backHref = '/profile', right }: Props = $props();
</script>

<div class="sticky top-0 z-30 border-b bg-background/95 backdrop-blur-sm">
	<div class="relative flex items-center justify-between gap-fluid-sm px-fluid-sm py-fluid-sm">
		<a
			href={backHref}
			class="grid size-9 place-items-center rounded-full text-muted-foreground hover:bg-muted/50 hover:text-foreground"
			aria-label="Back to profile"
		>
			<ArrowLeft class="size-6" />
		</a>

		<div
			class="pointer-events-none absolute left-1/2 -translate-x-1/2 text-base font-semibold text-foreground"
		>
			{title}
		</div>

		<div class="flex min-w-9 items-center justify-end">
			{@render right?.()}
		</div>
	</div>
</div>
