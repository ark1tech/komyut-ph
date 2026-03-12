<script lang="ts">
	import RouteCard from '$lib/components/routes/RouteCard.svelte';
	import RoutesSortBar from '$lib/components/routes/RoutesSortBar.svelte';
	import * as Pagination from '$lib/components/ui/pagination';
	import { routesSearchQuery } from '$lib/stores/routesSearch';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';

	let { data } = $props();

	type ViewOption = 'recent' | 'saved';

	const PER_PAGE = 5;

	let activeView = $state<ViewOption>('recent');

	let currentPage = $derived(Number(page.url.searchParams.get('page')) || 1);

	const activeList = $derived(
		activeView === 'recent' ? data.recentRoutes : data.savedRoutes
	);

	let filteredRoutes = $derived.by(() => {
		const q = $routesSearchQuery.trim().toLowerCase();
		if (!q) return activeList;
		return activeList.filter(
			(route) =>
				route.route_name.toLowerCase().includes(q) ||
				route.start_loc.toLowerCase().includes(q) ||
				route.end_loc.toLowerCase().includes(q)
		);
	});

	let pagedRoutes = $derived(
		filteredRoutes.slice((currentPage - 1) * PER_PAGE, currentPage * PER_PAGE)
	);

	function setPage(p: number) {
		// eslint-disable-next-line svelte/no-navigation-without-resolve
		goto(`?page=${p}`, { keepFocus: true, noScroll: true });
	}

	function handleViewChange(value: ViewOption) {
		activeView = value;
		// eslint-disable-next-line svelte/no-navigation-without-resolve
		goto('?page=1', { keepFocus: true, noScroll: true });
	}
</script>

<svelte:head>
	<title>Routes | Komyut PH</title>
	<meta name="description" content="Recently used and saved routes" />
</svelte:head>

<RoutesSortBar active={activeView} onchange={handleViewChange} class="px-fluid-sm pt-fluid-sm" />

<div class="space-y-3 px-fluid-sm py-fluid-sm" role="region" aria-label="Routes">
	{#each pagedRoutes as route (route.saved_route_id)}
		<RouteCard {route} view={activeView} />
	{/each}
</div>

{#if filteredRoutes.length > PER_PAGE}
	<div class="px-fluid-sm pb-fluid-sm">
		<Pagination.Root
			count={filteredRoutes.length}
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
