<script lang="ts">
	import { FileText } from '@lucide/svelte';
	import type { Post } from '$lib/data/mock_posts';
	import { cn } from '$lib/utils';

	interface Props {
		post: Post;
		class?: string;
	}

	let { post, class: className }: Props = $props();
</script>

<a
	href="/forum/{post.author_username}/{post.post_id}"
	class={cn(
		'mt-2 flex items-center gap-2 rounded-lg border border-border/60 bg-card/60 px-3 py-2 transition-colors hover:bg-accent',
		className
	)}
>
	<FileText class="size-3.5 shrink-0 text-brand" />
	<div class="min-w-0 flex-1">
		<p class="truncate text-xs font-medium text-foreground">{post.title}</p>
		<p class="text-[10px] text-muted-foreground">@{post.author_username}</p>
	</div>
</a>
