<script lang="ts">
	import ForumPost from '$lib/components/forum/ForumPost.svelte';
	import ProfileSubpageHeader from '../ProfileSubpageHeader.svelte';
	import { resolve } from '$app/paths';

	let { data } = $props();
</script>

<svelte:head>
	<title>My Posts | Komyut PH</title>
	<meta name="description" content="Your forum posts" />
</svelte:head>

<ProfileSubpageHeader title="My Posts" />

<section class="space-y-3 px-fluid-sm py-fluid-sm" aria-label="My posts">
	{#if data.posts.length === 0}
		<div class="rounded-2xl bg-card p-4">
			<h2 class="text-sm font-semibold text-foreground">No posts yet</h2>
			<p class="mt-1 text-sm text-muted-foreground">
				When you post in the forum, you'll see your threads here.
			</p>
			<a
				href={resolve('/forum')}
				class="mt-3 inline-flex items-center rounded-full bg-border/40 px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground"
			>
				Browse forum
			</a>
		</div>
	{:else}
		{#each data.posts as post (post.post_id)}
			<ForumPost {post} commentCount={data.commentCounts[post.post_id] ?? 0} />
		{/each}
	{/if}
</section>
