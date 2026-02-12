<script lang="ts">
	import Map from '$lib/components/map/Map.svelte';
	import MapSearchBar from '$lib/components/map/MapSearchBar.svelte';
</script>

<svelte:head>
	<title>Map | Komyut PH</title>
	<meta name="description" content="Your commute companion for the Philippines" />
</svelte:head>

<div class="relative flex-1">
	<Map />
	<MapSearchBar />
</div>
