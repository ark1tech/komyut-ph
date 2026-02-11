<script lang="ts">
	import {
		Map,
		Star,
		MessageSquare,
		Bell,
		Settings,
		HelpCircle,
		Lock,
		ChevronRight,
		Home,
		MessageCircle
	} from '@lucide/svelte';

	// Placeholder data matching the design image
	const user = {
		initials: 'JD',
		name: 'Juan Dela Cruz',
		username: '@juandc',
		stats: {
			routes: 42,
			posts: 128,
			followers: '1.2k'
		}
	};

	const menuSections = [
		{
			items: [
				{ icon: Map, label: 'My Routes', href: '/profile/myroutes' },
				{ icon: Star, label: 'Saved Routes', href: '/profile/savedroutes' },
				{ icon: MessageSquare, label: 'My Posts', href: '/profile/myposts' },
				{ icon: Bell, label: 'Notifications', badge: 3, href: '/profile/notifications' }
			]
		},
		{
			items: [
				{ icon: Settings, label: 'Settings', href: '#' },
				{ icon: HelpCircle, label: 'Help & Support', href: '#' },
				{ icon: Lock, label: 'Privacy', href: '#' }
			]
		}
	];

	const navItems = [
		{ icon: Home, label: 'Home', active: false },
		{ icon: Map, label: 'Routes', active: false },
		{ icon: MessageCircle, label: 'Forum', active: false },
		{ label: 'Profile', active: true }
	];
</script>

<svelte:head>
	<title>Profile • Komyut PH</title>
</svelte:head>

<div class="mx-auto max-w-xl px-4 py-fluid-lg md:px-6">
	<!-- Profile Header with Blue Background -->
	<div class="bg-brand px-4 pb-8 pt-safe-area-pt">
		<div class="mb-6 flex items-center justify-between text-brand-foreground">
		</div>

		<!-- Avatar and Name -->
		<div class="flex flex-col items-center text-center text-brand-foreground">
			<div
				class="mb-3 grid h-20 w-20 place-items-center rounded-full bg-white text-brand"
			>
				<span class="font-display text-2xl font-bold">{user.initials}</span>
			</div>
			<h1 class="font-display text-xl font-semibold">{user.name}</h1>
			<p class="mt-1 text-sm opacity-90">{user.username}</p>
		</div>

		<!-- Stats Cards -->
		<div class="mt-6 flex gap-8 rounded-2xl bg-white px-6 py-4 text-center">
			<div class="flex-1">
				<div class="font-display text-2xl font-bold text-brand">{user.stats.routes}</div>
				<div class="mt-1 text-xs text-muted-foreground">Routes</div>
			</div>
			<div class="flex-1 border-x border-border">
				<div class="font-display text-2xl font-bold text-brand">{user.stats.posts}</div>
				<div class="mt-1 text-xs text-muted-foreground">Posts</div>
			</div>
			<div class="flex-1">
				<div class="font-display text-2xl font-bold text-brand">{user.stats.followers}</div>
				<div class="mt-1 text-xs text-muted-foreground">Followers</div>
			</div>
		</div>
	</div>

	<!-- Menu Sections -->
	<div class="flex-1 space-y-6 px-4 py-6">
		{#each menuSections as section, sectionIndex}
			<div class="space-y-2">
				{#each section.items as item}
					<a
						href={item.href}
						class="flex items-center justify-between rounded-xl bg-card px-4 py-3.5 transition-colors hover:bg-accent"
					>
						<div class="flex items-center gap-3">
							<div class="text-foreground">
								<svelte:component this={item.icon} class="h-5 w-5" />
							</div>
							<span class="text-sm font-medium text-foreground">{item.label}</span>
						</div>
						<div class="flex items-center gap-2">
							{#if item.badge}
								<div
									class="flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-xs font-semibold text-white"
								>
									{item.badge}
								</div>
							{/if}
							<ChevronRight class="h-5 w-5 text-muted-foreground" />
						</div>
					</a>
				{/each}
			</div>
		{/each}
	</div>
</div>