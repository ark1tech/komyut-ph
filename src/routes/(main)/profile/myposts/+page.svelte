<script lang="ts">
	import { onMount } from 'svelte';
	import ForumPost from '$lib/components/forum/ForumPost.svelte';
	import ProfileSubpageHeader from '../ProfileSubpageHeader.svelte';
	import { mockPosts } from '$lib/data/mock_posts';
	import { mockComments } from '$lib/data/mock_comments';

	// Assumption (temporary): until auth exists, we treat author_id === 1 as "current user".
	const CURRENT_USER_ID = 1;

	let isLoading = $state(true);

	const commentCountByPost = $derived.by(() => {
		const map = new Map<number, number>();
		for (const c of mockComments) map.set(c.parent_id, (map.get(c.parent_id) ?? 0) + 1);
		return map;
	});

	function commentCountFor(postId: number) {
		return commentCountByPost.get(postId) ?? 0;
	}

	let myPosts = $derived.by(() =>
		mockPosts
			.filter((p) => p.author_id === CURRENT_USER_ID)
			.slice()
			.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
	);

	onMount(() => {
		const t = setTimeout(() => (isLoading = false), 350);
		return () => clearTimeout(t);
	});
</script>

<svelte:head>
	<title>My Posts | Komyut PH</title>
	<meta name="description" content="Your forum posts" />
</svelte:head>

<ProfileSubpageHeader title="My Posts" />

<section class="space-y-3 px-fluid-sm py-fluid-sm" role="region" aria-label="My posts">
	{#if isLoading}
		{#each Array(3) as _, i (i)}
			<div class="animate-pulse rounded-2xl bg-card p-4" aria-hidden="true">
				<div class="flex items-center gap-3">
					<div class="size-9 rounded-full bg-border/60" />
					<div class="flex-1 space-y-2">
						<div class="h-3 w-32 rounded bg-border/60" />
						<div class="h-3 w-20 rounded bg-border/60" />
					</div>
				</div>
				<div class="mt-3 space-y-2">
					<div class="h-3 w-4/5 rounded bg-border/60" />
					<div class="h-3 w-3/5 rounded bg-border/60" />
				</div>
				<div class="mt-4 flex gap-2">
					<div class="h-7 w-24 rounded-full bg-border/60" />
					<div class="h-7 w-16 rounded-full bg-border/60" />
					<div class="h-7 w-20 rounded-full bg-border/60" />
				</div>
			</div>
		{/each}
	{:else if myPosts.length === 0}
		<div class="rounded-2xl bg-card p-4">
			<h2 class="text-sm font-semibold text-foreground">No posts yet</h2>
			<p class="mt-1 text-sm text-muted-foreground">
				When you post in the forum, you’ll see your threads here.
			</p>
			<a
				href="/forum"
				class="mt-3 inline-flex items-center rounded-full bg-border/40 px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground"
			>
				Browse forum
			</a>
		</div>
	{:else}
		{#each myPosts as post (post.post_id)}
			<ForumPost {post} commentCount={commentCountFor(post.post_id)} />
		{/each}
	{/if}
</section>