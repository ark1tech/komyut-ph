<script lang="ts">
	import maplibregl, { type GeoJSONSource } from 'maplibre-gl';
	import 'maplibre-gl/dist/maplibre-gl.css';

	interface Route {
		route_id: number | string;
		geometry: string | GeoJSON.LineString;
	}

	interface Props {
		center?: [number, number];
		zoom?: number;
		style?: string;
		selectedRoute?: Route | null;
	}

	let {
		center = [120.9842, 14.5995],
		zoom = 12,
		style = 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json',
		selectedRoute = null
	}: Props = $props();

	const FALLBACK_CENTER: [number, number] = [120.9842, 14.5995];

	let container: HTMLDivElement;
	let map = $state<maplibregl.Map | null>(null);
	let ready = $state(false);
	let activeRouteId = $state<string | null>(null);

	// Route tracing state
	let tracingMode = $state(false);
	let tracedPoints = $state<[number, number][]>([]);
	let traceMarkers: maplibregl.Marker[] = [];
	let savingRoute = $state(false);

	// Hardcoded start/end location OSM IDs for traced route saving
	const TRACE_START_LOC = 371357222;
	const TRACE_END_LOC = 28756784;

	function parseGeometry(geometry: string | GeoJSON.LineString): GeoJSON.LineString | null {
		if (typeof geometry !== 'string') return geometry;

		try {
			const parsed = JSON.parse(geometry);
			if (parsed?.type !== 'LineString' || !Array.isArray(parsed.coordinates)) {
				return null;
			}
			return parsed as GeoJSON.LineString;
		} catch {
			return null;
		}
	}

	function removeRouteLayers() {
		if (!map) return;

		if (map.getLayer('route-line')) {
			map.removeLayer('route-line');
		}

		if (map.getSource('selected-route')) {
			map.removeSource('selected-route');
		}
	}

	function clearRoutes() {
		removeRouteLayers();
		activeRouteId = null;
	}

	function displayRoute(route: Route) {
		if (!map) return;

		const geometry = parseGeometry(route.geometry);
		if (!geometry) {
			clearRoutes();
			return;
		}

		removeRouteLayers();

		const geojson: GeoJSON.FeatureCollection = {
			type: 'FeatureCollection',
			features: [
				{
					type: 'Feature',
					properties: { route_id: route.route_id },
					geometry
				}
			]
		};

		map.addSource('selected-route', {
			type: 'geojson',
			data: geojson
		});

		map.addLayer({
			id: 'route-line',
			type: 'line',
			source: 'selected-route',
			layout: {
				'line-join': 'round',
				'line-cap': 'round'
			},
			paint: {
				'line-color': '#3b82f6',
				'line-width': 3,
				'line-opacity': 0.85
			}
		});

		activeRouteId = String(route.route_id);
	}

	function startTracing() {
		tracingMode = true;
		tracedPoints = [];
		clearTraceMarkers();
		removeTraceLayers();
		if (map) {
			map.getCanvas().style.cursor = 'crosshair';
		}
	}

	function cancelTracing() {
		tracingMode = false;
		tracedPoints = [];
		clearTraceMarkers();
		removeTraceLayers();
		if (map) {
			map.getCanvas().style.cursor = '';
		}
	}

	function clearTraceMarkers() {
		for (const marker of traceMarkers) {
			marker.remove();
		}
		traceMarkers = [];
	}

	function removeTraceLayers() {
		if (!map) return;
		if (map.getLayer('trace-line')) map.removeLayer('trace-line');
		if (map.getSource('trace')) map.removeSource('trace');
	}

	function updateTraceLine() {
		if (!map) return;

		const geojson: GeoJSON.FeatureCollection = {
			type: 'FeatureCollection',
			features:
				tracedPoints.length >= 2
					? [
							{
								type: 'Feature',
								properties: {},
								geometry: {
									type: 'LineString',
									coordinates: tracedPoints
								}
							}
						]
					: []
		};

		const source = map.getSource('trace');
		if (source && source.type === 'geojson') {
			(source as GeoJSONSource).setData(geojson);
		} else {
			map.addSource('trace', { type: 'geojson', data: geojson });
			map.addLayer({
				id: 'trace-line',
				type: 'line',
				source: 'trace',
				layout: { 'line-join': 'round', 'line-cap': 'round' },
				paint: { 'line-color': '#ef4444', 'line-width': 3, 'line-dasharray': [2, 2] }
			});
		}
	}

	function addTracePoint(lngLat: maplibregl.LngLat) {
		if (!map) return;

		const coord: [number, number] = [lngLat.lng, lngLat.lat];
		tracedPoints = [...tracedPoints, coord];

		const index = tracedPoints.length - 1;
		const isFirst = index === 0;

		const el = document.createElement('div');
		el.className = 'trace-marker';
		el.style.width = isFirst ? '14px' : '10px';
		el.style.height = isFirst ? '14px' : '10px';
		el.style.borderRadius = '50%';
		el.style.backgroundColor = isFirst ? '#22c55e' : '#ef4444';
		el.style.border = '2px solid white';
		el.style.cursor = 'pointer';
		el.style.boxShadow = '0 1px 3px rgba(0,0,0,0.3)';

		const marker = new maplibregl.Marker({ element: el }).setLngLat(coord).addTo(map);

		traceMarkers.push(marker);

		updateTraceLine();
	}

	function undoLastPoint() {
		if (tracedPoints.length === 0) return;

		tracedPoints = tracedPoints.slice(0, -1);

		const lastMarker = traceMarkers.pop();
		if (lastMarker) lastMarker.remove();

		updateTraceLine();
	}

	async function saveTracedRoute() {
		if (tracedPoints.length < 2) return;

		savingRoute = true;
		try {
			const response = await fetch('/api/map/routes', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					start_loc_osmid: TRACE_START_LOC,
					end_loc_osmid: TRACE_END_LOC,
					geometry: {
						type: 'LineString',
						coordinates: tracedPoints
					}
				})
			});

			if (!response.ok) {
				console.error('Failed to save route:', response.status);
				return;
			}

			cancelTracing();
		} catch (err) {
			console.error('Error saving route:', err);
		} finally {
			savingRoute = false;
		}
	}

	function onMapClickForTracing(e: maplibregl.MapMouseEvent) {
		if (!tracingMode) return;
		addTracePoint(e.lngLat);
	}

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

			instance.addControl(new maplibregl.NavigationControl(), 'top-right');

			const geolocate = new maplibregl.GeolocateControl({
				positionOptions: { enableHighAccuracy: true },
				trackUserLocation: true,
				showUserLocation: true
			});
			instance.addControl(geolocate, 'top-right');

			instance.on('load', () => {
				geolocate.trigger();
				instance.on('click', onMapClickForTracing);

				if (selectedRoute) {
					displayRoute(selectedRoute);
				}
			});

			map = instance;
			ready = true;
		});

		return () => {
			cancelled = true;
			if (map) {
				clearRoutes();
				clearTraceMarkers();
				map.remove();
				map = null;
			}
		};
	});

	$effect(() => {
		if (!map) return;

		if (!selectedRoute) {
			clearRoutes();
			return;
		}

		if (!map.isStyleLoaded()) return;

		displayRoute(selectedRoute);
	});
</script>

{#if !ready}
	<div class="absolute inset-0 flex items-center justify-center bg-white">
		<p class="text-sm text-muted-foreground">Loading map...</p>
	</div>
{/if}
{#if activeRouteId && !tracingMode}
	<button
		onclick={() => clearRoutes()}
		class="absolute top-16 left-4 z-20 w-32 rounded-lg bg-white px-4 py-2 text-sm font-medium text-black shadow-md hover:bg-gray-50"
	>
		Clear Route
	</button>
{/if}

{#if ready && !tracingMode}
	<button
		onclick={startTracing}
		class="absolute bottom-52 left-4 z-20 rounded-lg bg-blue-500 px-4 py-2 text-white shadow-md hover:bg-red-600"
	>
		Trace Route
	</button>
{/if}

{#if tracingMode}
	<div class="absolute bottom-52 left-4 z-20 flex items-center gap-2">
		<button
			onclick={undoLastPoint}
			disabled={tracedPoints.length === 0}
			class="rounded-lg bg-white px-4 py-2 text-black shadow-md hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
		>
			Undo Point
		</button>
		<button
			onclick={saveTracedRoute}
			disabled={tracedPoints.length < 2 || savingRoute}
			class="rounded-lg bg-green-500 px-4 py-2 text-white shadow-md hover:bg-green-600 disabled:cursor-not-allowed disabled:opacity-40"
		>
			{savingRoute ? 'Saving...' : 'Save Route'}
		</button>
		<button
			onclick={cancelTracing}
			class="rounded-lg bg-gray-500 px-4 py-2 text-white shadow-md hover:bg-gray-600"
		>
			Cancel
		</button>
	</div>
	<div
		class="absolute top-4 left-4 z-10 max-w-75 rounded-lg bg-red-500/90 px-3 py-1.5 text-sm text-white shadow-md"
	>
		Tracing Mode - Click on the map to add points ({tracedPoints.length} point{tracedPoints.length !==
		1
			? 's'
			: ''})
	</div>
{/if}

<div bind:this={container} class="absolute inset-0 h-full w-full"></div>
