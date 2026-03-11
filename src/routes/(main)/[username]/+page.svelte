<script lang="ts">
	import { onMount } from 'svelte';
	import { ArrowLeft } from '@lucide/svelte';
	import ProfileCard from '$lib/components/profile/ProfileCard.svelte';
	import ProfileSkeleton from '$lib/components/profile/ProfileSkeleton.svelte';
	import ForumPost from '$lib/components/forum/ForumPost.svelte';

	let { data } = $props();
	let user = $derived(data.profileUser);
	let posts = $derived(data.posts);
	let commentCounts = $derived(data.commentCounts);
	let stats = $derived(data.stats);

	let isLoading = $state(true);

	onMount(() => {
		const t = setTimeout(() => (isLoading = false), 400);
		return () => clearTimeout(t);
	});

	function fullName(u: typeof user) {
		return u.full_name ?? `${u.first_name ?? ''} ${u.last_name ?? ''}`.trim();
	}

	function initials(u: typeof user) {
		const name = fullName(u);
		const parts = name.split(' ').filter(Boolean);
		return parts.length >= 2
			? `${parts[0].charAt(0)}${parts[parts.length - 1].charAt(0)}`
			: name.charAt(0).toUpperCase();
	}
</script>

<svelte:head>
	<title>@{user.username} | Komyut PH</title>
</svelte:head>

<div class="flex flex-col">
	<div
		class="sticky top-0 z-30 flex items-center gap-fluid-sm border-b bg-background/95 px-fluid-sm py-fluid-sm backdrop-blur-sm"
	>
		<button
			onclick={() => history.back()}
			class="grid size-9 shrink-0 cursor-pointer place-items-center rounded-full text-muted-foreground hover:bg-muted/50 hover:text-foreground"
			aria-label="Go back"
		>
			<ArrowLeft class="size-6" />
		</button>
		<span class="text-base font-semibold text-foreground">@{user.username}</span>
	</div>

	{#if isLoading}
		<ProfileSkeleton />
	{:else}
		<ProfileCard
			fullName={fullName(user)}
			username={user.username}
			initials={initials(user)}
			{stats}
		/>

		<div class="space-y-3 px-fluid-sm py-fluid-sm" role="region" aria-label="User posts">
			{#if posts.length === 0}
				<div class="rounded-2xl bg-card p-4 text-center">
					<p class="text-sm text-muted-foreground">No posts yet.</p>
				</div>
			{:else}
				{#each posts as post (post.post_id)}
					<ForumPost {post} commentCount={commentCounts[post.post_id] ?? 0} />
				{/each}
			{/if}
		</div>
	{/if}
</div>
