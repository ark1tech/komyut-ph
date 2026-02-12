<script lang="ts">
	import { ArrowBigUp, ArrowBigDown } from '@lucide/svelte';
	import type { Comment } from '$lib/data/mock_comments';
	import { cn } from '$lib/utils';
	import ForumHeader from './ForumHeader.svelte';

	interface Props {
		comment: Comment;
		class?: string;
	}

	let { comment, class: className }: Props = $props();

	let voted = $state<'up' | 'down' | null>(null);

	let score = $derived(
		comment.upvotes - comment.downvotes + (voted === 'up' ? 1 : voted === 'down' ? -1 : 0)
	);

	function vote(dir: 'up' | 'down') {
		voted = voted === dir ? null : dir;
	}

</script>

<div class={cn('flex gap-3 rounded-xl p-fluid-sm', className)}>
	<!-- vote strip -->
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

	<!-- body -->
	<div class="min-w-0 flex-1">
		<ForumHeader
			authorUsername={comment.author_username}
			createdAt={comment.created_at}
			showAvatar
			showMenu
		/>
		<p class="mt-1 text-sm leading-relaxed text-muted-foreground">{comment.body}</p>
	</div>
</div>
