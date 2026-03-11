<script lang="ts">
	import { ArrowBigUp, ArrowBigDown, MessageCircle, Share2 } from '@lucide/svelte';
	import { cn } from '$lib/utils';
	import ForumHeader from './ForumHeader.svelte';

	interface PostLike {
		post_id: number;
		title: string;
		body: string;
		upvotes: number;
		downvotes: number;
		created_at: string;
		author?: { username: string; full_name: string } | null;
	}

	interface Props {
		post: PostLike;
		commentCount?: number;
		truncate?: boolean;
		linked?: boolean;
		class?: string;
		titleClass?: string;
	}

	let {
		post,
		commentCount = 0,
		truncate = true,
		linked = true,
		class: className,
		titleClass
	}: Props = $props();

	let voted = $state<'up' | 'down' | null>(null);

	let score = $derived(
		post.upvotes - post.downvotes + (voted === 'up' ? 1 : voted === 'down' ? -1 : 0)
	);

	function vote(dir: 'up' | 'down') {
		voted = voted === dir ? null : dir;
	}

	let authorUsername = $derived(post.author?.username ?? '');
	let postHref = $derived(`/forum/${authorUsername}/${post.post_id}`);
</script>

<article
	class={cn(
		'relative rounded-2xl bg-card p-4',
		linked && 'transition-all duration-200 hover:bg-accent',
		className
	)}
>
	<ForumHeader
		authorName={post.author?.full_name}
		{authorUsername}
		createdAt={post.created_at}
		showAvatar
		showMenu
		class="gap-2"
	/>

	{#if linked}
		<a href={postHref} class="mt-2 block after:absolute after:inset-0 after:rounded-2xl">
			<h3 class={cn('text-sm leading-snug font-semibold text-foreground', titleClass)}>
				{post.title}
			</h3>
			<p
				class={cn('mt-1 text-sm leading-relaxed text-muted-foreground', truncate && 'line-clamp-3')}
			>
				{post.body}
			</p>
		</a>
	{:else}
		<div class="mt-2">
			<h3 class={cn('text-sm leading-snug font-semibold text-foreground', titleClass)}>
				{post.title}
			</h3>
			<p
				class={cn('mt-1 text-sm leading-relaxed text-muted-foreground', truncate && 'line-clamp-3')}
			>
				{post.body}
			</p>
		</div>
	{/if}

	<div
		class="pointer-events-none relative z-10 mt-3 flex items-center gap-fluid-md *:pointer-events-auto [&_a,&_button]:cursor-pointer"
	>
		<div class="flex items-center gap-0.5 rounded-full bg-border/40 px-1">
			<button
				type="button"
				onclick={() => vote('up')}
				class="rounded-full p-1.5 transition-colors hover:text-brand {voted === 'up'
					? 'text-brand'
					: 'text-muted-foreground'}"
				aria-label="Upvote"
			>
				<ArrowBigUp class="size-4" fill={voted === 'up' ? 'currentColor' : 'none'} />
			</button>
			<span class="min-w-6 text-center text-xs font-medium text-foreground">{score}</span>
			<button
				type="button"
				onclick={() => vote('down')}
				class="rounded-full p-1.5 transition-colors hover:text-destructive {voted === 'down'
					? 'text-destructive'
					: 'text-muted-foreground'}"
				aria-label="Downvote"
			>
				<ArrowBigDown class="size-4" fill={voted === 'down' ? 'currentColor' : 'none'} />
			</button>
		</div>

		{#if linked}
			<a
				href={postHref}
				class="flex items-center gap-1.5 rounded-full bg-border/40 px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground"
			>
				<MessageCircle class="size-4" />
				{commentCount}
			</a>
		{:else}
			<div
				class="flex items-center gap-1.5 rounded-full bg-border/40 px-3 py-1.5 text-xs text-muted-foreground"
			>
				<MessageCircle class="size-4" />
				{commentCount}
			</div>
		{/if}

		<button
			type="button"
			class="flex items-center gap-1.5 rounded-full bg-border/40 px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-border/60 hover:text-foreground"
			aria-label="Share"
		>
			<Share2 class="size-4" />
			Share
		</button>
	</div>
</article>
