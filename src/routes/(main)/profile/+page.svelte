<script lang="ts">
	/* eslint-disable svelte/no-navigation-without-resolve */

	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import {
		Map,
		MessageSquare,
		Settings,
		HelpCircle,
		Lock,
		ChevronRight,
		LogOut,
		LogIn
	} from '@lucide/svelte';
	import ProfileCard from '$lib/components/profile/ProfileCard.svelte';

	let { data } = $props();
	let { supabase, session, user } = $derived(data);
	let isGuest = $derived(!session);
	let full_name: string = $derived(user?.full_name ?? 'Guest');
	let username: string = $derived(user?.username ?? 'guest');
	let email: string = $derived(user?.email ?? 'Guest User');
	let avatar_url: string = $derived(user?.avatar_url ?? '');

	type MenuItem = {
		icon: typeof Map;
		label: string;
		href: string;
	};
	type MenuSection = { items: MenuItem[] };

	const memberStats = {
		initials: 'GU',
		stats: {
			routes: 42,
			posts: 128,
			followers: '1.2k'
		}
	};
	const guestStats = {
		initials: 'GU',
		stats: {
			routes: 0,
			posts: 0,
			followers: '0'
		}
	};

	let userDetails = $derived(session ? memberStats : guestStats);

	let menuSections = $derived.by(() => {
		const sections: MenuSection[] = [];

		if (!isGuest) {
			sections.push({
				items: [
					{ icon: Map, label: 'My Routes', href: '/profile/myroutes' },
					{ icon: MessageSquare, label: 'My Posts', href: '/profile/myposts' }
				]
			});
		}

		sections.push({
			items: [
				{ icon: Settings, label: 'Settings', href: '#' },
				{ icon: HelpCircle, label: 'Help & Support', href: '#' },
				{ icon: Lock, label: 'Privacy', href: '#' }
			]
		});

		return sections;
	});

	async function signOut() {
		const { error } = await supabase.auth.signOut();
		if (error) {
			console.error('signout error');
		} else {
			goto('/login');
		}
	}
</script>

<svelte:head>
	<title>Profile | Komyut PH</title>
</svelte:head>

<div>
	<ProfileCard
		fullName={full_name}
		{username}
		{email}
		avatarUrl={session ? avatar_url : undefined}
		initials={session ? undefined : userDetails.initials}
		stats={userDetails.stats}
		class="pt-safe-area-pt"
	/>

	<div class="flex-1 space-y-6 px-4 py-6" aria-label="Menu Sections" role="region">
		{#if isGuest}
			<p class="px-2 text-center text-sm text-muted-foreground">
				Log in to access your personal routes and forum posts.
			</p>
		{/if}

		{#each menuSections as section, sectionIndex (sectionIndex)}
			<div class="space-y-2">
				{#each section.items as item (item.href)}
					<a
						href={item.href}
						class="flex items-center justify-between rounded-xl bg-card px-4 py-3.5 transition-colors hover:bg-accent"
					>
						<div class="flex items-center gap-3">
							<div class="text-foreground">
								<item.icon class="h-5 w-5" />
							</div>
							<span class="text-sm font-medium text-foreground">{item.label}</span>
						</div>
						<div class="flex items-center gap-2">
							<ChevronRight class="h-5 w-5 text-muted-foreground" />
						</div>
					</a>
				{/each}
			</div>
			{#if sectionIndex < menuSections.length - 1}
				<div class="mx-4 h-px bg-border"></div>
			{/if}
		{/each}

		{#if isGuest}
			<a
				href={resolve('/login')}
				class="flex items-center justify-between rounded-xl bg-card px-4 py-3.5 transition-colors hover:bg-accent"
			>
				<div class="flex items-center gap-3">
					<div class="text-foreground">
						<LogIn class="h-5 w-5" />
					</div>
					<span class="text-sm font-medium text-foreground">Log In</span>
				</div>
				<div class="flex items-center gap-2">
					<ChevronRight class="h-5 w-5 text-muted-foreground" />
				</div>
			</a>
		{:else}
			<a
				href={resolve('/login')}
				onclick={signOut}
				class="flex items-center justify-between rounded-xl bg-card px-4 py-3.5 transition-colors hover:bg-accent"
			>
				<div class="flex items-center gap-3">
					<div class="text-foreground">
						<LogOut class="h-5 w-5" />
					</div>
					<span class="text-sm font-medium text-foreground">Log Out</span>
				</div>
				<div class="flex items-center gap-2">
					<ChevronRight class="h-5 w-5 text-muted-foreground" />
				</div>
			</a>
		{/if}
	</div>
</div>
