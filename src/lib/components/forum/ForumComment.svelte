<script lang="ts">
	import { ArrowBigUp, ArrowBigDown } from '@lucide/svelte';
	import type { Comment } from '$lib/data/mock_comments';

	interface Props {
		comment: Comment;
	}

	let { comment }: Props = $props();

	let voted = $state<'up' | 'down' | null>(null);

	let score = $derived(
		comment.upvotes - comment.downvotes + (voted === 'up' ? 1 : voted === 'down' ? -1 : 0)
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

<div class="flex gap-3 rounded-xl bg-muted/30 p-3">
	<!-- vote strip -->
	<div class="flex flex-col items-center gap-0.5">
		<button
			type="button"
			onclick={() => vote('up')}
			class="rounded-full p-0.5 transition-colors hover:text-brand {voted === 'up' ? 'text-brand' : 'text-muted-foreground'}"
			aria-label="Upvote comment"
		>
			<ArrowBigUp class="size-3.5" fill={voted === 'up' ? 'currentColor' : 'none'} />
		</button>
		<span class="text-[10px] font-medium text-foreground">{score}</span>
		<button
			type="button"
			onclick={() => vote('down')}
			class="rounded-full p-0.5 transition-colors hover:text-destructive {voted === 'down' ? 'text-destructive' : 'text-muted-foreground'}"
			aria-label="Downvote comment"
		>
			<ArrowBigDown class="size-3.5" fill={voted === 'down' ? 'currentColor' : 'none'} />
		</button>
	</div>

	<!-- body -->
	<div class="min-w-0 flex-1">
		<div class="flex items-center gap-1.5 text-xs text-muted-foreground">
			<span class="font-medium text-foreground">{comment.author_username}</span>
			<span>·</span>
			<span>{timeAgo(comment.created_at)}</span>
		</div>
		<p class="mt-1 text-xs leading-relaxed text-muted-foreground">{comment.body}</p>
	</div>
</div>
