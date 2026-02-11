<script lang="ts">
	import ForumSearchBar from '$lib/components/forum/ForumSearchBar.svelte';
	import ForumPost from '$lib/components/forum/ForumPost.svelte';
	import { mockPosts } from '$lib/data/mock_posts';
	import { mockComments } from '$lib/data/mock_comments';

	// group comments by post
	function commentsFor(postId: number) {
		return mockComments.filter((c) => c.parent_id === postId);
	}
</script>

<svelte:head>
	<title>Forum • Komyut PH</title>
	<meta name="description" content="Community forum for Philippine commuters" />
</svelte:head>

<div class="mx-auto max-w-xl px-4 py-fluid-lg md:px-6">
	<!-- search -->
	<div class="sticky top-0 z-30 -mx-4 bg-background/95 px-4 pb-3 pt-1 backdrop-blur-sm md:-mx-6 md:px-6">
		<ForumSearchBar />
	</div>

	<!-- feed -->
	<div class="mt-2 space-y-3">
		{#each mockPosts as post (post.post_id)}
			<ForumPost {post} comments={commentsFor(post.post_id)} />
		{/each}
	</div>
</div>
