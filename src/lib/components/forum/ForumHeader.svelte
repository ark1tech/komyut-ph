<script lang="ts">
	import { Ellipsis, Flag } from '@lucide/svelte';
	import { timeAgo } from '$lib/utils';

	interface Props {
		authorName?: string;
		authorUsername: string;
		createdAt: string;
		showAvatar?: boolean;
		showMenu?: boolean;
		class?: string;
	}

	let {
		authorName,
		authorUsername,
		createdAt,
		showAvatar = false,
		showMenu: showMenuProp = false,
		class: className
	}: Props = $props();

	let menuOpen = $state(false);
</script>

<div
	class="flex items-center gap-1.5 text-xs text-muted-foreground {showMenuProp
		? 'pointer-events-none relative z-10 *:pointer-events-auto [&_a,&_button]:cursor-pointer'
		: ''} {className ?? ''}"
>
	{#if showAvatar && authorUsername}
		<div
			class="grid size-6 place-items-center rounded-full bg-brand/10 text-[10px] font-semibold text-brand"
		>
			{authorUsername.charAt(0)}
		</div>
	{/if}

	<span class="font-medium text-foreground">{authorUsername}</span>
	<span>·</span>
	<span>{timeAgo(createdAt)}</span>

	{#if showMenuProp}
		<div class="relative ml-auto">
			<button
				type="button"
				onclick={() => (menuOpen = !menuOpen)}
				class="cursor-pointer rounded-full p-1.5 text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground"
				aria-label="More options"
			>
				<Ellipsis class="size-4" />
			</button>

			{#if menuOpen}
				<button
					type="button"
					class="fixed inset-0 z-40"
					onclick={() => (menuOpen = false)}
					aria-label="Close menu"
				></button>
				<div
					class="absolute top-full right-0 z-50 mt-1 w-36 rounded-xl border border-border bg-card p-1 shadow-lg"
				>
					<button
						type="button"
						class="flex w-full cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-xs text-destructive transition-colors hover:bg-destructive/10"
						onclick={() => (menuOpen = false)}
					>
						<Flag class="size-3.5" />
						Report
					</button>
				</div>
			{/if}
		</div>
	{/if}
</div>
