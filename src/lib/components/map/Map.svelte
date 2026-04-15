<script lang="ts">
	import { onMount } from 'svelte';
	import maplibregl, { type GeoJSONSource } from 'maplibre-gl';
	import 'maplibre-gl/dist/maplibre-gl.css';
	import * as Button from '$lib/components/ui/button';
	import RouteTraceSaveDrawer from '$lib/components/map/RouteTraceSaveDrawer.svelte';
	import type { RouteMetadataInput } from '$lib/validation/schemas';
	import { PenLine } from '@lucide/svelte';

	interface Route {
		route_id: number | string;
		geometry: string | GeoJSON.LineString;
	}

	interface Props {
		center?: [number, number];
		zoom?: number;
		style?: string;
		selectedRoute?: Route | null;
		controlsHidden?: boolean;
		/** When true (e.g. `/map?trace=1`), map enters trace mode. */
		tracingActive?: boolean;
		/** Clear the `trace` query param after cancel or successful save. */
		onTraceSessionEnd?: () => void | Promise<void>;
	}

	let {
		center = [120.9842, 14.5995],
		zoom = 12,
		style = 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json',
		selectedRoute = null,
		controlsHidden = false,
		tracingActive = false,
		onTraceSessionEnd
	}: Props = $props();

	const FALLBACK_CENTER: [number, number] = [120.9842, 14.5995];

	let container: HTMLDivElement;
	let map = $state<maplibregl.Map | null>(null);
	let ready = $state(false);
	let mapStyleLoaded = $state(false);
	let activeRouteId = $state<string | null>(null);

	/** Only fit camera once per selected route id (avoids repeated jarring moves). Not UI state. */
	let lastFittedRouteId: string | null = null;
	let fitGeneration = 0;

	// Route tracing state
	let tracingMode = $state(false);
	let tracedPoints = $state<[number, number][]>([]);
	let traceMarkers: maplibregl.Marker[] = [];
	let savingRoute = $state(false);
	let traceMetadataOpen = $state(false);
	let traceSaveError = $state<string | null>(null);

	// Hardcoded start/end location OSM IDs for traced route saving
	const TRACE_START_LOC = 371357222;
	const TRACE_END_LOC = 28756784;
	const ROUTE_FIT_BASE_PADDING_PX = 96;
	// Increase/decrease this value to account for overlays at the bottom of the map.
	const ROUTE_FIT_BOTTOM_OFFSET_PX = 200;

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

	/** Real GPS only; `null` when permission denied / unavailable (fit route only). */
	function getUserLocationForBounds(): Promise<[number, number] | null> {
		return new Promise((resolve) => {
			if (!navigator.geolocation) {
				resolve(null);
				return;
			}
			navigator.geolocation.getCurrentPosition(
				(pos) => resolve([pos.coords.longitude, pos.coords.latitude]),
				() => resolve(null),
				{ enableHighAccuracy: true, timeout: 5000 }
			);
		});
	}

	/** Re-apply route + user framing after GeolocateControl moves the camera (see `geolocate` listener). */
	function refitRouteWithUserPosition(position: GeolocationPosition) {
		if (!map || !selectedRoute) return;
		const geometry = parseGeometry(selectedRoute.geometry);
		if (!geometry) return;
		const userLngLat: [number, number] = [position.coords.longitude, position.coords.latitude];
		fitBoundsForRouteAndUser(geometry, userLngLat);
	}

	function fitBoundsForRouteAndUser(
		geometry: GeoJSON.LineString,
		userLngLat: [number, number] | null
	) {
		if (!map) return;

		const bounds = new maplibregl.LngLatBounds();
		for (const c of geometry.coordinates) {
			bounds.extend(c as [number, number]);
		}
		if (userLngLat) {
			bounds.extend(userLngLat);
		}

		map.fitBounds(bounds, {
			padding: {
				top: ROUTE_FIT_BASE_PADDING_PX,
				right: ROUTE_FIT_BASE_PADDING_PX,
				bottom: ROUTE_FIT_BASE_PADDING_PX + ROUTE_FIT_BOTTOM_OFFSET_PX,
				left: ROUTE_FIT_BASE_PADDING_PX
			},
			maxZoom: 16,
			duration: 600
		});
	}

	async function fitRouteWhenNew(route: Route) {
		const id = String(route.route_id);
		if (lastFittedRouteId === id) return;

		const geometry = parseGeometry(route.geometry);
		if (!geometry) return;

		const gen = ++fitGeneration;
		const userLngLat = await getUserLocationForBounds();

		if (gen !== fitGeneration) return;
		if (!map || !selectedRoute || String(selectedRoute.route_id) !== id) return;

		lastFittedRouteId = id;
		fitBoundsForRouteAndUser(geometry, userLngLat);
	}

	function startTracing() {
		tracingMode = true;
		tracedPoints = [];
		clearTraceMarkers();
		removeTraceLayers();
		traceMetadataOpen = false;
		traceSaveError = null;
		if (map) {
			map.getCanvas().style.cursor = 'crosshair';
		}
	}

	function cancelTracing() {
		tracingMode = false;
		tracedPoints = [];
		clearTraceMarkers();
		removeTraceLayers();
		traceMetadataOpen = false;
		traceSaveError = null;
		if (map) {
			map.getCanvas().style.cursor = '';
		}
	}

	function openTraceMetadataPrompt() {
		if (tracedPoints.length < 2 || savingRoute) return;
		traceSaveError = null;
		traceMetadataOpen = true;
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
				paint: {
					'line-color': '#3b82f6',
					'line-width': 3,
					'line-opacity': 0.9,
					'line-dasharray': [2, 2]
				}
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
		el.style.backgroundColor = isFirst ? '#16a34a' : '#3b82f6';
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

	async function saveTracedRoute(metadata: RouteMetadataInput) {
		if (tracedPoints.length < 2) return;

		savingRoute = true;
		traceSaveError = null;
		try {
			const response = await fetch('/api/map/routes', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					...metadata,
					start_loc_osmid: TRACE_START_LOC,
					end_loc_osmid: TRACE_END_LOC,
					geometry: {
						type: 'LineString',
						coordinates: tracedPoints
					}
				})
			});

			if (!response.ok) {
				const body = (await response.json().catch(() => null)) as {
					message?: string;
					error?: string;
				} | null;
				throw new Error(body?.message ?? body?.error ?? 'Failed to save route');
			}

			traceMetadataOpen = false;
			cancelTracing();
			await onTraceSessionEnd?.();
		} catch (err) {
			traceSaveError = err instanceof Error ? err.message : 'Error saving route';
			console.error('Error saving route:', err);
			throw err;
		} finally {
			savingRoute = false;
		}
	}

	async function handleTraceMetadataSave(metadata: RouteMetadataInput) {
		await saveTracedRoute(metadata);
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

	onMount(() => {
		let cancelled = false;
		let geolocateControl: maplibregl.GeolocateControl | null = null;
		let geolocateHandler: ((e: GeolocationPosition & { type?: string }) => void) | null = null;

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
				positionOptions: { enableHighAccuracy: true, timeout: 10000 },
				trackUserLocation: false,
				showUserLocation: true,
				showAccuracyCircle: true
			});
			geolocateControl = geolocate;
			instance.addControl(geolocate, 'top-right');

			instance.on('load', () => {
				if (cancelled) return;
				mapStyleLoaded = true;
				instance.on('click', onMapClickForTracing);
				geolocateHandler = (e) => {
					if (cancelled || !e.coords) return;
					refitRouteWithUserPosition(e);
				};
				geolocate.on('geolocate', geolocateHandler);
				geolocate.trigger();
			});

			map = instance;
			ready = true;
		});

		return () => {
			cancelled = true;
			if (geolocateControl && geolocateHandler) {
				geolocateControl.off('geolocate', geolocateHandler);
			}
			geolocateControl = null;
			geolocateHandler = null;
			mapStyleLoaded = false;
			lastFittedRouteId = null;
			fitGeneration++;
			if (map) {
				clearRoutes();
				clearTraceMarkers();
				map.remove();
				map = null;
			}
		};
	});

	$effect(() => {
		if (!map || !mapStyleLoaded) return;

		if (!selectedRoute) {
			clearRoutes();
			lastFittedRouteId = null;
			return;
		}

		if (!map.isStyleLoaded()) return;

		displayRoute(selectedRoute);
		void fitRouteWhenNew(selectedRoute);
	});

	let prevTracingActive = $state<boolean | undefined>(undefined);

	$effect(() => {
		if (!map || !mapStyleLoaded) return;
		if (tracingActive === prevTracingActive) return;

		if (tracingActive) {
			startTracing();
		} else if (prevTracingActive !== undefined) {
			cancelTracing();
		}
		prevTracingActive = tracingActive;
	});

	async function handleCancelTrace() {
		cancelTracing();
		await onTraceSessionEnd?.();
	}
</script>

{#if !ready}
	<div class="absolute inset-0 flex items-center justify-center bg-background">
		<p class="text-sm text-muted-foreground">Loading map...</p>
	</div>
{/if}
{#if activeRouteId && !tracingMode && !controlsHidden}
	<Button.Root
		variant="secondary"
		size="sm"
		class="absolute top-16 left-4 z-20 shadow-md"
		onclick={() => clearRoutes()}
	>
		Clear Route
	</Button.Root>
{/if}

{#if tracingMode && !controlsHidden}
	<div
		class="pointer-events-none absolute top-4 left-4 z-20 max-w-[min(100%-2rem,20rem)] px-4 sm:right-4 sm:left-auto"
	>
		<div
			class="pointer-events-auto flex items-start gap-2 rounded-2xl border border-border/60 bg-card/95 p-3 text-sm shadow-lg backdrop-blur"
		>
			<div
				class="mt-0.5 grid size-8 shrink-0 place-items-center rounded-full bg-brand/10 text-brand"
				aria-hidden="true"
			>
				<PenLine class="size-4" />
			</div>
			<div class="min-w-0">
				<p class="font-medium text-foreground">Trace a route</p>
				<p class="mt-0.5 text-muted-foreground">
					Click the map to add points ({tracedPoints.length} point{tracedPoints.length !== 1
						? 's'
						: ''})
				</p>
			</div>
		</div>
	</div>

	<div
		class="absolute right-4 bottom-6 left-4 z-20 flex flex-wrap items-center justify-center gap-2 sm:right-auto sm:left-auto sm:justify-start"
	>
		<Button.Root
			variant="outline"
			size="sm"
			class="shadow-md"
			disabled={tracedPoints.length === 0}
			onclick={undoLastPoint}
		>
			Undo
		</Button.Root>
		<Button.Root
			variant="default"
			size="sm"
			class="bg-success text-success-foreground shadow-md hover:bg-success/90"
			disabled={tracedPoints.length < 2 || savingRoute}
			onclick={openTraceMetadataPrompt}
		>
			Save route
		</Button.Root>
		<Button.Root
			variant="ghost"
			size="sm"
			class="shadow-sm"
			onclick={() => void handleCancelTrace()}
		>
			Cancel
		</Button.Root>
	</div>
{/if}

<RouteTraceSaveDrawer
	bind:open={traceMetadataOpen}
	saving={savingRoute}
	errorMessage={traceSaveError}
	onsave={handleTraceMetadataSave}
/>

<div bind:this={container} class="absolute inset-0 h-full w-full"></div>
