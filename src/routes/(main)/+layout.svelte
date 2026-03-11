<script lang="ts">
	/* eslint-disable svelte/no-navigation-without-resolve */

	import { page } from '$app/state';
	import { navigating } from '$app/stores';
	import { Map, MessageCircle, Route, UserRound } from '@lucide/svelte';
	import { onDestroy } from 'svelte';
	import RouteLoaderBar from '$lib/components/ui/RouteLoaderBar.svelte';
	import ForumSkeleton from '$lib/components/forum/ForumSkeleton.svelte';
	import ProfileSkeleton from '$lib/components/profile/ProfileSkeleton.svelte';
	import RoutesSkeleton from '$lib/components/routes/RoutesSkeleton.svelte';

	let { children, data } = $props();

	const navItems = $derived([
		{ href: '/map', label: 'Map', icon: Map },
		{ href: '/routes', label: 'Routes', icon: Route, badge: data.unreadRoutes },
		{ href: '/forum', label: 'Forum', icon: MessageCircle, badge: data.unreadForum },
		{ href: '/profile', label: 'Profile', icon: UserRound }
	]);

	const DELAY_MS = 200;
	let showPending = $state(false);
	let pendingPath = $state<string | null>(null);
	let timeout: ReturnType<typeof setTimeout> | undefined;

	$effect(() => {
		if ($navigating) {
			pendingPath = $navigating.to?.url?.pathname ?? null;
			timeout = setTimeout(() => {
				showPending = true;
			}, DELAY_MS);
		} else {
			if (timeout) clearTimeout(timeout);
			timeout = undefined;
			showPending = false;
			pendingPath = null;
		}

		return () => {
			if (timeout) clearTimeout(timeout);
		};
	});

	onDestroy(() => {
		if (timeout) clearTimeout(timeout);
	});
</script>

<div class="flex h-dvh flex-col">
	<RouteLoaderBar />
	<main class="flex min-h-0 flex-1 flex-col overflow-y-auto stable-scroll">
		{#if showPending && pendingPath}
			{#if pendingPath.startsWith('/routes')}
				<RoutesSkeleton />
			{:else if pendingPath.startsWith('/forum')}
				<ForumSkeleton />
			{:else if pendingPath.startsWith('/profile')}
				<ProfileSkeleton />
			{:else}
				{@render children()}
			{/if}
		{:else}
			{@render children()}
		{/if}
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
