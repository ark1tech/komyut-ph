<script lang="ts">
	import { page } from '$app/state';
	import { Map, MessageCircle, Route, UserRound } from '@lucide/svelte';

	let { children, data } = $props();

	const navItems = $derived([
		{ href: '/map', label: 'Map', icon: Map },
		{ href: '/routes', label: 'Routes', icon: Route, badge: data.unreadRoutes },
		{ href: '/forum', label: 'Forum', icon: MessageCircle, badge: data.unreadForum },
		{ href: '/profile', label: 'Profile', icon: UserRound }
	]);
</script>

<div class="flex h-dvh flex-col">
	<main class="flex min-h-0 flex-1 flex-col overflow-y-auto stable-scroll">
		{@render children()}
	</main>

	<nav
		class="sticky right-0 bottom-0 left-0 z-50 border-t border-border bg-background/95 safe-area-pb backdrop-blur-sm"
	>
		<div class="mx-auto flex max-w-lg items-center justify-around px-2 py-1.5">
			{#each navItems as item (item.href)}
				{@const active = page.url.pathname.startsWith(item.href)}
				<a
					href={item.href}
					class="flex flex-col items-center gap-0.5 rounded-lg px-5 py-1.5 text-xs font-medium transition-colors
						{active ? 'text-brand' : 'text-muted-foreground hover:text-foreground'}"
					aria-current={active ? 'page' : undefined}
				>
					<span class="relative">
						<item.icon class="size-5" strokeWidth={active ? 2.5 : 2} />
						{#if item.badge && item.badge > 0}
							<span
								class="absolute -top-1 -right-2 grid min-w-4 place-items-center rounded-full bg-destructive px-1 text-[10px] leading-4 font-semibold text-white"
								aria-label={`${item.badge} unread`}
							>
								{item.badge > 9 ? '9+' : item.badge}
							</span>
						{/if}
					</span>
					<span>{item.label}</span>
				</a>
			{/each}
		</div>
	</nav>
</div>
