<script lang="ts">
	import { page } from '$app/state';
	import { Map, MessageCircle, UserRound } from '@lucide/svelte';

	let { children } = $props();

	const navItems = [
		{ href: '/map', label: 'Map', icon: Map },
		{ href: '/forum', label: 'Forum', icon: MessageCircle },
		{ href: '/profile', label: 'Profile', icon: UserRound }
	];
</script>

<div class="flex h-dvh flex-col">
	<main class="flex min-h-0 flex-1 flex-col overflow-y-auto stable-scroll">
		{@render children()}
	</main>

	<nav
		class="sticky right-0 bottom-0 left-0 z-50 border-t border-border bg-background/95 safe-area-pb backdrop-blur-sm"
	>
		<div class="mx-auto flex max-w-lg items-center justify-around px-2 py-1.5">
			{#each navItems as item}
				{@const active = page.url.pathname.startsWith(item.href)}
				<a
					href={item.href}
					class="flex flex-col items-center gap-0.5 rounded-lg px-5 py-1.5 text-xs font-medium transition-colors
						{active ? 'text-brand' : 'text-muted-foreground hover:text-foreground'}"
					aria-current={active ? 'page' : undefined}
				>
					<item.icon class="size-5" strokeWidth={active ? 2.5 : 2} />
					<span>{item.label}</span>
				</a>
			{/each}
		</div>
	</nav>
</div>
