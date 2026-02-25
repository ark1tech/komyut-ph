<script lang="ts">
	import { cn } from '$lib/utils';

	interface Props {
		fullName: string;
		username: string;
		email?: string;
		avatarUrl?: string;
		initials?: string;
		stats: { routes: number; posts: number; followers: string };
		class?: string;
	}

	let {
		fullName,
		username,
		email,
		avatarUrl,
		initials = 'GU',
		stats,
		class: className
	}: Props = $props();
</script>

<div class={cn('bg-brand px-4 pb-8', className)} aria-label="Profile Header" role="region">
	<div class="mb-6 flex items-center justify-between text-brand-foreground"></div>

	<div
		class="flex flex-col items-center text-center text-brand-foreground"
		aria-label="User Information"
		role="region"
	>
		<div class="mb-3 grid h-20 w-20 place-items-center rounded-full bg-white text-brand">
			{#if avatarUrl}
				<img class="h-20 w-20 rounded-full object-cover" src={avatarUrl} alt="User Avatar" />
			{:else}
				<span class="font-display text-2xl font-bold">{initials}</span>
			{/if}
		</div>
		<h1 class="font-display text-xl font-semibold">{fullName}</h1>
		<p class="mt-0.5 text-sm opacity-80">@{username}</p>
		{#if email}
			<p class="mt-1 text-sm opacity-90">{email}</p>
		{/if}
	</div>

	<div
		class="mt-6 flex gap-8 rounded-2xl bg-white px-6 py-4 text-center"
		aria-label="User Stats"
		role="region"
	>
		<div class="flex-1">
			<div class="font-display text-2xl font-bold text-brand">{stats.routes}</div>
			<div class="mt-1 text-xs text-muted-foreground">Routes</div>
		</div>
		<div class="flex-1 border-x border-border">
			<div class="font-display text-2xl font-bold text-brand">{stats.posts}</div>
			<div class="mt-1 text-xs text-muted-foreground">Posts</div>
		</div>
		<div class="flex-1">
			<div class="font-display text-2xl font-bold text-brand">{stats.followers}</div>
			<div class="mt-1 text-xs text-muted-foreground">Followers</div>
		</div>
	</div>
</div>
