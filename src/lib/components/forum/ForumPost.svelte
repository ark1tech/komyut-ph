<script lang="ts">
	import {
		ArrowBigUp,
		ArrowBigDown,
		MessageCircle,
		Share2,
		Ellipsis,
		Flag
	} from '@lucide/svelte';
	import type { Post } from '$lib/data/mock_posts';

	interface Props {
		post: Post;
		commentCount?: number;
	}

	let { post, commentCount = 0 }: Props = $props();

	let showMenu = $state(false);
	let voted = $state<'up' | 'down' | null>(null);

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

<article class="rounded-2xl border border-border bg-card p-4 transition-colors hover:border-border/80">
	<!-- header -->
	<div class="flex items-center gap-2 text-xs text-muted-foreground">
		<div class="grid size-6 place-items-center rounded-full bg-brand/10 text-[10px] font-semibold text-brand">
			{post.author_name.charAt(0)}
		</div>
		<span class="font-medium text-foreground">{post.author_username}</span>
		<span>·</span>
		<span>{timeAgo(post.created_at)}</span>
	</div>

	<!-- clickable content area links to detail page -->
	<a href="/forum/{post.post_id}" class="mt-2 block">
		<h3 class="text-sm font-semibold leading-snug text-foreground">{post.title}</h3>
		<p class="mt-1 line-clamp-3 text-sm leading-relaxed text-muted-foreground">{post.body}</p>
	</a>

	<!-- actions -->
	<div class="mt-3 flex items-center gap-1">
		<!-- vote group -->
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

		<!-- comment link -->
		<a
			href="/forum/{post.post_id}"
			class="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground"
		>
			<MessageCircle class="size-4" />
			{commentCount}
		</a>

		<!-- share -->
		<button
			type="button"
			class="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground"
			aria-label="Share"
		>
			<Share2 class="size-4" />
			Share
		</button>

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
</article>
