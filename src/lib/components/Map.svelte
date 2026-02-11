<script lang="ts">
	import maplibregl from 'maplibre-gl';
	import 'maplibre-gl/dist/maplibre-gl.css';

	interface Props {
		/** center coordinates [lng, lat]; defaults to Metro Manila. */
		center?: [number, number];
		/** initial zoom level; defaults to 12. */
		zoom?: number;
		/** map style URL; defaults to OpenStreetMap-based style. */
		style?: string;
	}

	let {
		center = [120.9842, 14.5995],
		zoom = 12,
		style = 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json'
	}: Props = $props();

	let container: HTMLDivElement;
	let map = $state<maplibregl.Map | null>(null);

	$effect(() => {
		const instance = new maplibregl.Map({
			container,
			style,
			center,
			zoom
		});

		// add navigation controls (zoom +/-, compass)
		instance.addControl(new maplibregl.NavigationControl(), 'top-right');

		// add geolocation control so users can find themselves on the map
		instance.addControl(
			new maplibregl.GeolocateControl({
				positionOptions: { enableHighAccuracy: true },
				trackUserLocation: true,
				showUserLocation: true
			}),
			'top-right'
		);

		map = instance;

		return () => {
			instance.remove();
			map = null;
		};
	});
</script>

<div bind:this={container} class="absolute inset-0 h-full w-full"></div>
