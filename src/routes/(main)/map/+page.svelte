<script lang="ts">
	import Map from '$lib/components/map/Map.svelte';
	import MapSearchBar from '$lib/components/map/MapSearchBar.svelte';
	import * as Drawer from "$lib/components/ui/drawer/index";
	import * as Button from "$lib/components/ui/button/index";
</script>

<svelte:head>
	<title>Map | Komyut PH</title>
	<meta name="description" content="Your commute companion for the Philippines" />
</svelte:head>

<div class="relative flex-1">
	<Map />
	<MapSearchBar />
	<Drawer.Root>
		<Drawer.Trigger>Open</Drawer.Trigger>
		<Drawer.Content>
			<Drawer.Header>
				<Drawer.Title>Are you sure absolutely sure?</Drawer.Title>
				<Drawer.Description>This action cannot be undone.</Drawer.Description>
			</Drawer.Header>
			<Drawer.Footer>
				<Button>Submit</Button>
				<Drawer.Close>Cancel</Drawer.Close>
			</Drawer.Footer>
		</Drawer.Content>
	</Drawer.Root>
</div>
