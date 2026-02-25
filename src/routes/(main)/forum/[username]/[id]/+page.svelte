<script lang="ts">
	import { SendHorizontal, Link2 } from '@lucide/svelte';
	import ForumComment from '$lib/components/forum/ForumComment.svelte';
	import ForumPost from '$lib/components/forum/ForumPost.svelte';
	import ForumSortBar from '$lib/components/forum/ForumSortBar.svelte';

	let { data } = $props();
	let post = $derived(data.post);
	let comments = $derived(data.comments);

	let commentText = $state('');

	type SortOption = 'top' | 'hot' | 'latest';
	let commentSort = $state<SortOption>('hot');

	let sortedComments = $derived.by(() => {
		const list = [...comments];
		switch (commentSort) {
			case 'top':
			case 'hot':
				return list.sort((a, b) => b.upvotes - b.downvotes - (a.upvotes - a.downvotes));
			case 'latest':
				return list.sort(
					(a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
				);
			default:
				return list;
		}
	});
</script>

<svelte:head>
	<title>{post.title} | Komyut PH</title>
</svelte:head>
<div class="flex flex-col">
	<ForumPost
		{post}
		commentCount={comments.length}
		truncate={false}
		linked={false}
		class="rounded-none border-0 bg-primary-foreground p-fluid-md"
		titleClass="text-xl"
	/>

	<!-- comment input -->
	<div
		class="m-fluid-sm flex flex-row items-center justify-center gap-3 rounded-2xl border border-border bg-card p-3"
		role="textbox"
		aria-label="Forum Comment Input"
	>
		<div
			class="grid size-7 shrink-0 place-items-center rounded-full bg-brand/10 text-xs font-semibold text-brand"
		>
			Y
		</div>
		<div class="flex min-w-0 flex-1 items-center gap-2">
			<textarea
				bind:value={commentText}
				placeholder="Add a comment..."
				rows="1"
				class="flex-1 resize-none bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
			></textarea>
			<button
				type="button"
				class="shrink-0 rounded-full p-1.5 text-muted-foreground transition-colors hover:text-brand"
				aria-label="Link a post"
			>
				<Link2 class="size-4" />
			</button>
			<button
				type="button"
				class="shrink-0 rounded-full p-1.5 text-brand transition-opacity disabled:opacity-30"
				disabled={!commentText.trim()}
				aria-label="Send comment"
			>
				<SendHorizontal class="size-4" />
			</button>
		</div>
	</div>

	{#if comments.length > 0}
		<ForumSortBar
			active={commentSort}
			onchange={(v) => (commentSort = v)}
			class="px-fluid-sm"
		/>

		<div class="space-y-2 pt-2" role="region" aria-label="Forum Comments">
			{#each sortedComments as comment (comment.comment_id)}
				<ForumComment {comment} />
			{/each}
		</div>
	{/if}
</div>
