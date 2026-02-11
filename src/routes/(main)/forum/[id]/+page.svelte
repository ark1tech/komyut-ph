<script lang="ts">
	import {
		ArrowLeft,
		ArrowBigUp,
		ArrowBigDown,
		MessageCircle,
		Share2,
		Ellipsis,
		Flag,
		SendHorizontal
	} from '@lucide/svelte';
	import ForumComment from '$lib/components/forum/ForumComment.svelte';

	let { data } = $props();
	let post = $derived(data.post);
	let comments = $derived(data.comments);

	let showMenu = $state(false);
	let voted = $state<'up' | 'down' | null>(null);
	let commentText = $state('');

	let score = $derived(
		post.upvotes - post.downvotes + (voted === 'up' ? 1 : voted === 'down' ? -1 : 0)
	);

	function vote(dir: 'up' | 'down') {
		voted = voted === dir ? null : dir;
	}

	function timeAgo(dateStr: string): string {
		const diff = Date.now() - new Date(dateStr).getTime();
		const mins = Math.floor(diff / 60000);
		if (mins < 60) return `${mins}m`;
		const hrs = Math.floor(mins / 60);
		if (hrs < 24) return `${hrs}h`;
		const days = Math.floor(hrs / 24);
		if (days < 30) return `${days}d`;
		return `${Math.floor(days / 30)}mo`;
	}
</script>

<svelte:head>
	<title>{post.title} • Komyut PH</title>
</svelte:head>

<div class="mx-auto max-w-xl px-4 py-fluid-lg md:px-6">
	<!-- top bar -->
	<div class="mb-4 flex items-center gap-3">
		<a
			href="/forum"
			class="rounded-full p-1.5 text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground"
			aria-label="Back to forum"
		>
			<ArrowLeft class="size-5" />
		</a>
		<span class="text-m font-medium text-foreground">Post</span>
	</div>

	<!-- post -->
	<article class="rounded-2xl border border-border bg-card p-4">
		<!-- header -->
		<div class="flex items-center gap-2 text-xs text-muted-foreground">
			<div class="grid size-7 place-items-center rounded-full bg-brand/10 text-xs font-semibold text-brand">
				{post.author_name.charAt(0)}
			</div>
			<div class="flex flex-col">
				<span class="font-medium text-foreground">{post.author_username}</span>
				<span class="text-[10px]">{timeAgo(post.created_at)}</span>
			</div>

			<!-- more options -->
			<div class="relative ml-auto">
				<button
					type="button"
					onclick={() => (showMenu = !showMenu)}
					class="rounded-full p-1.5 text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground"
					aria-label="More options"
				>
					<Ellipsis class="size-4" />
				</button>

				{#if showMenu}
					<button
						type="button"
						class="fixed inset-0 z-40"
						onclick={() => (showMenu = false)}
						aria-label="Close menu"
					></button>
					<div class="absolute right-0 top-full z-50 mt-1 w-36 rounded-xl border border-border bg-card p-1 shadow-lg">
						<button
							type="button"
							class="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs text-destructive transition-colors hover:bg-destructive/10"
							onclick={() => (showMenu = false)}
						>
							<Flag class="size-3.5" />
							Report
						</button>
					</div>
				{/if}
			</div>
		</div>

		<!-- full content (no line clamp) -->
		<h1 class="mt-3 text-base font-semibold leading-snug text-foreground">{post.title}</h1>
		<p class="mt-2 text-sm leading-relaxed text-muted-foreground">{post.body}</p>

		<!-- actions -->
		<div class="mt-4 flex items-center gap-1 border-t border-border pt-3">
			<div class="flex items-center gap-0.5 rounded-full bg-muted/50 px-1">
				<button
					type="button"
					onclick={() => vote('up')}
					class="rounded-full p-1.5 transition-colors hover:text-brand {voted === 'up' ? 'text-brand' : 'text-muted-foreground'}"
					aria-label="Upvote"
				>
					<ArrowBigUp class="size-4" fill={voted === 'up' ? 'currentColor' : 'none'} />
				</button>
				<span class="min-w-6 text-center text-xs font-medium text-foreground">{score}</span>
				<button
					type="button"
					onclick={() => vote('down')}
					class="rounded-full p-1.5 transition-colors hover:text-destructive {voted === 'down' ? 'text-destructive' : 'text-muted-foreground'}"
					aria-label="Downvote"
				>
					<ArrowBigDown class="size-4" fill={voted === 'down' ? 'currentColor' : 'none'} />
				</button>
			</div>

			<div class="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs text-muted-foreground">
				<MessageCircle class="size-4" />
				{comments.length}
			</div>

			<button
				type="button"
				class="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground"
				aria-label="Share"
			>
				<Share2 class="size-4" />
				Share
			</button>
		</div>
	</article>

	<!-- comment input -->
	<div class="mt-3 flex items-start gap-3 rounded-2xl border border-border bg-card p-3">
		<div class="grid size-7 shrink-0 place-items-center rounded-full bg-brand/10 text-xs font-semibold text-brand">
			Y
		</div>
		<div class="flex min-w-0 flex-1 items-end gap-2">
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
		<div class="mt-3 space-y-2">
			{#each comments as comment (comment.comment_id)}
				<ForumComment {comment} />
			{/each}
		</div>
	{/if}
</div>
