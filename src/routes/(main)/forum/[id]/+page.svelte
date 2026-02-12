<script lang="ts">
	import { SendHorizontal } from '@lucide/svelte';
	import ForumComment from '$lib/components/forum/ForumComment.svelte';
	import ForumPost from '$lib/components/forum/ForumPost.svelte';

	let { data } = $props();
	let post = $derived(data.post);
	let comments = $derived(data.comments);

	let commentText = $state('');
</script>

<svelte:head>
	<title>{post.title} • Komyut PH</title>
</svelte:head>
<div class="flex flex-col ">
	<ForumPost
		post={post}
		commentCount={comments.length}
		truncate={false}
		linked={false}
		class="border-0 rounded-t-none p-fluid-md bg-primary-foreground"
		titleClass="text-xl"
	/>

	<!-- comment input -->
	<div class="m-fluid-sm flex gap-3 items-center rounded-2xl border border-border bg-card p-3 flex-row justify-center">
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
				class="shrink-0 rounded-full p-1.5 text-brand transition-opacity disabled:opacity-30"
				disabled={!commentText.trim()}
				aria-label="Send comment"
			>
				<SendHorizontal class="size-4" />
			</button>
		</div>
	</div>

	<!-- comments -->
	{#if comments.length > 0}
		<div class="space-y-2">
			{#each comments as comment (comment.comment_id)}
				<ForumComment {comment} />
			{/each}
		</div>
	{/if}
</div>
