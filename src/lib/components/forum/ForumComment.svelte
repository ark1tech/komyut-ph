<script lang="ts">
	import { ArrowBigUp, ArrowBigDown, Reply } from '@lucide/svelte';
	import { cn } from '$lib/utils';
	import ForumHeader from './ForumHeader.svelte';
	import ForumCommentReply from './ForumCommentReply.svelte';
	import ForumPostLink from './ForumPostLink.svelte';

	interface CommentLike {
		comment_id: number;
		body: string;
		upvotes: number;
		downvotes: number;
		created_at: string;
		linked_post_id?: number | null;
		author?: { username: string; full_name: string } | null;
	}

	interface LinkedPost {
		post_id: number;
		title: string;
		author?: { username: string } | null;
	}

	interface Props {
		comment: CommentLike;
		linkedPosts?: Record<number, LinkedPost>;
		class?: string;
	}

	let { comment, linkedPosts = {}, class: className }: Props = $props();

	let voted = $state<'up' | 'down' | null>(null);
	let showReply = $state(false);

	let score = $derived(
		comment.upvotes - comment.downvotes + (voted === 'up' ? 1 : voted === 'down' ? -1 : 0)
	);

	let linkedPost = $derived(
		comment.linked_post_id ? (linkedPosts[comment.linked_post_id] ?? null) : null
	);

	let authorUsername = $derived(comment.author?.username ?? '');

	function vote(dir: 'up' | 'down') {
		voted = voted === dir ? null : dir;
	}
</script>

<div class={cn('flex gap-3 rounded-xl p-fluid-sm', className)}>
	<div class="flex flex-col items-center gap-0.5">
		<button
			type="button"
			onclick={() => vote('up')}
			class="rounded-full p-0.5 transition-colors hover:text-brand {voted === 'up'
				? 'text-brand'
				: 'text-muted-foreground'}"
			aria-label="Upvote comment"
		>
			<ArrowBigUp class="size-3.5" fill={voted === 'up' ? 'currentColor' : 'none'} />
		</button>
		<span class="text-[10px] font-medium text-foreground">{score}</span>
		<button
			type="button"
			onclick={() => vote('down')}
			class="rounded-full p-0.5 transition-colors hover:text-destructive {voted === 'down'
				? 'text-destructive'
				: 'text-muted-foreground'}"
			aria-label="Downvote comment"
		>
			<ArrowBigDown class="size-3.5" fill={voted === 'down' ? 'currentColor' : 'none'} />
		</button>
	</div>

	<div class="min-w-0 flex-1">
		<ForumHeader {authorUsername} createdAt={comment.created_at} showAvatar showMenu />
		<p class="mt-1 text-sm leading-relaxed text-muted-foreground">{comment.body}</p>

		{#if linkedPost}
			<ForumPostLink post={linkedPost} />
		{/if}

		<button
			type="button"
			onclick={() => (showReply = !showReply)}
			class="mt-1.5 flex cursor-pointer items-center gap-1 text-[11px] text-muted-foreground transition-colors hover:text-foreground"
		>
			<Reply class="size-3" />
			Reply
		</button>

		{#if showReply}
			<ForumCommentReply />
		{/if}
	</div>
</div>
