<script lang="ts">
	import ForumPost from '$lib/components/forum/ForumPost.svelte';
	import { mockPosts } from '$lib/data/mock_posts';
	import { mockComments } from '$lib/data/mock_comments';
	import { ArrowBigUp, Flame, Clock, History } from '@lucide/svelte';

	type SortOption = 'top' | 'hot' | 'latest';

	const sortOptions: { value: SortOption; label: string; icon: typeof ArrowBigUp }[] = [
		{ value: 'top', label: 'Top', icon: ArrowBigUp },
		{ value: 'hot', label: 'Hot', icon: Flame },
		{ value: 'latest', label: 'Latest', icon: Clock },
	];

	let activeSort = $state<SortOption>('hot');

	function commentCountFor(postId: number) {
		return mockComments.filter((c) => c.parent_id === postId).length;
	}

	let sortedPosts = $derived.by(() => {
		const posts = [...mockPosts];
		switch (activeSort) {
			case 'top':
				return posts.sort((a, b) => (b.upvotes - b.downvotes) - (a.upvotes - a.downvotes));
			case 'hot':
				return posts.sort((a, b) => commentCountFor(b.post_id) - commentCountFor(a.post_id));
			case 'latest':
				return posts.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
			default:
				return posts;
		}
	});
</script>

<svelte:head>
	<title>Forum | Komyut PH</title>
	<meta name="description" content="Community forum for Philippine commuters" />
</svelte:head>

<!-- sort bar -->
<div class="flex gap-2 px-fluid-sm pt-fluid-sm" role="radiogroup" aria-label="Sort posts by">
	{#each sortOptions as opt (opt.value)}
		<button
			type="button"
			role="radio"
			aria-checked={activeSort === opt.value}
			onclick={() => (activeSort = opt.value)}
			class="cursor-pointer flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors
				{activeSort === opt.value
					? 'bg-primary text-background'
					: 'bg-card text-muted-foreground hover:bg-muted/50 hover:text-foreground'}"
		>
			<opt.icon class="size-3.5" />
			{opt.label}
		</button>
	{/each}
</div>

<!-- feed -->
<div class="space-y-3 px-fluid-sm py-fluid-sm" role="region" aria-label="Forum Posts">
	{#each sortedPosts as post (post.post_id)}
		<ForumPost {post} commentCount={commentCountFor(post.post_id)} />
	{/each}
</div>
