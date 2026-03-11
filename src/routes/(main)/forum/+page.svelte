<script lang="ts">
	import ForumPost from '$lib/components/forum/ForumPost.svelte';
	import ForumSortBar from '$lib/components/forum/ForumSortBar.svelte';
	import * as Pagination from '$lib/components/ui/pagination';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';

	let { data } = $props();

	type SortOption = 'top' | 'hot' | 'latest';

	const PER_PAGE = 5;

	let activeSort = $state<SortOption>('hot');

	let currentPage = $derived(Number(page.url.searchParams.get('page')) || 1);

	function commentCountFor(postId: number) {
		return data.commentCounts[postId] ?? 0;
	}

	let sortedPosts = $derived.by(() => {
		const posts = [...data.posts];
		switch (activeSort) {
			case 'top':
				return posts.sort((a, b) => b.upvotes - b.downvotes - (a.upvotes - a.downvotes));
			case 'hot':
				return posts.sort((a, b) => commentCountFor(b.post_id) - commentCountFor(a.post_id));
			case 'latest':
				return posts.sort(
					(a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
				);
			default:
				return posts;
		}
	});

	let pagedPosts = $derived(
		sortedPosts.slice((currentPage - 1) * PER_PAGE, currentPage * PER_PAGE)
	);

	function setPage(p: number) {
		// eslint-disable-next-line svelte/no-navigation-without-resolve
		goto(`?page=${p}`, { keepFocus: true, noScroll: true });
	}

	function handleSortChange(value: SortOption) {
		activeSort = value;
		// eslint-disable-next-line svelte/no-navigation-without-resolve
		goto('?page=1', { keepFocus: true, noScroll: true });
	}
</script>

<svelte:head>
	<title>Forum | Komyut PH</title>
	<meta name="description" content="Community forum for Philippine commuters" />
</svelte:head>

<ForumSortBar active={activeSort} onchange={handleSortChange} class="px-fluid-sm pt-fluid-sm" />

<div class="space-y-3 px-fluid-sm py-fluid-sm" role="region" aria-label="Forum Posts">
	{#each pagedPosts as post (post.post_id)}
		<ForumPost {post} commentCount={commentCountFor(post.post_id)} />
	{/each}
</div>

{#if sortedPosts.length > PER_PAGE}
	<div class="px-fluid-sm pb-fluid-sm">
		<Pagination.Root
			count={sortedPosts.length}
			perPage={PER_PAGE}
			page={currentPage}
			onPageChange={setPage}
			siblingCount={1}
		>
			{#snippet children({ pages })}
				<Pagination.Content>
					<Pagination.Item>
						<Pagination.Previous />
					</Pagination.Item>
					{#each pages as p (p.key)}
						{#if p.type === 'ellipsis'}
							<Pagination.Item>
								<Pagination.Ellipsis />
							</Pagination.Item>
						{:else}
							<Pagination.Item>
								<Pagination.Link page={p} isActive={currentPage === p.value} />
							</Pagination.Item>
						{/if}
					{/each}
					<Pagination.Item>
						<Pagination.Next />
					</Pagination.Item>
				</Pagination.Content>
			{/snippet}
		</Pagination.Root>
	</div>
{/if}
