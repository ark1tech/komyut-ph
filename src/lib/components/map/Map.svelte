<script lang="ts">
	import maplibregl from 'maplibre-gl';
	import 'maplibre-gl/dist/maplibre-gl.css';

	interface Props {
		// center coordinates [lng, lat];
		center?: [number, number];
		zoom?: number;
		// map style URL; defaults to OpenStreetMap-based style
		style?: string;
	}

	let {
		center = [120.9842, 14.5995],
		zoom = 12,
		style = 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json'
	}: Props = $props();

	// fall back to center user to metro manila
	const FALLBACK_CENTER: [number, number] = [120.9842, 14.5995];

	let container: HTMLDivElement;
	let map = $state<maplibregl.Map | null>(null);
	let ready = $state(false);

	//  try to get the user's location before initializing the map para cool
	function getUserLocation(): Promise<[number, number]> {
		return new Promise((resolve) => {
			if (!navigator.geolocation) {
				resolve(center ?? FALLBACK_CENTER);
				return;
			}
			navigator.geolocation.getCurrentPosition(
				(pos) => resolve([pos.coords.longitude, pos.coords.latitude]),
				() => resolve(center ?? FALLBACK_CENTER),
				{ enableHighAccuracy: true, timeout: 5000 }
			);
		});
	}

	$effect(() => {
		let cancelled = false;

		getUserLocation().then((userCenter) => {
			if (cancelled) return;

			const instance = new maplibregl.Map({
				container,
				style,
				center: userCenter,
				zoom,
				attributionControl: false
			});

			// add navigation controls (zoom +/-, compass)
			instance.addControl(new maplibregl.NavigationControl(), 'top-right');

			// add geolocation control to re-center on the user later
			const geolocate = new maplibregl.GeolocateControl({
				positionOptions: { enableHighAccuracy: true },
				trackUserLocation: true,
				showUserLocation: true
			});
			instance.addControl(geolocate, 'top-right');

			// activate tracking once the map style is loaded
			instance.on('load', () => {
				geolocate.trigger();
			});

			map = instance;
			ready = true;
		});

		return () => {
			cancelled = true;
			if (map) {
				map.remove();
				map = null;
			}
		};
	});
</script>

{#if !ready}
	<div class="absolute inset-0 flex items-center justify-center bg-muted">
		<p class="text-sm text-muted-foreground">Loading map...</p>
	</div>
{/if}
<div bind:this={container} class="absolute inset-0 h-full w-full"></div>
