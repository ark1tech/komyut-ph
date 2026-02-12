<script lang="ts">
	import ForumPost from '$lib/components/forum/ForumPost.svelte';
	import { mockPosts } from '$lib/data/mock_posts';
	import { mockComments } from '$lib/data/mock_comments';

	function commentCountFor(postId: number) {
		return mockComments.filter((c) => c.parent_id === postId).length;
	}
</script>

<svelte:head>
	<title>Forum | Komyut PH</title>
	<meta name="description" content="Community forum for Philippine commuters" />
</svelte:head>

<!-- feed -->
<div class="space-y-3 px-fluid-sm py-fluid-sm" role="region" aria-label="Forum Posts">
	{#each mockPosts as post (post.post_id)}
		<ForumPost {post} commentCount={commentCountFor(post.post_id)} />
	{/each}
</div>
