<script lang="ts">
	import { onMount } from 'svelte';
	import maplibregl from 'maplibre-gl';
	import 'maplibre-gl/dist/maplibre-gl.css';
	import * as Button from '$lib/components/ui/button';
	import RouteTraceSaveDrawer from '$lib/components/map/RouteTraceSaveDrawer.svelte';
	import NavigationSearchBar from '$lib/components/map/NavigationSearchBar.svelte';
	import NavigationItineraryCard from '$lib/components/map/NavigationItineraryCard.svelte';
	import NavigationArrivedPrompt from '$lib/components/map/NavigationArrivedPrompt.svelte';
	import type { ModeSegment, RouteMetadataInput, RouteVehicleType } from '$lib/validation/schemas';
	import { buildModeSegments, type ModeMarker } from '$lib/utils/buildModeSegments';
	import {
		PenLine,
		Radio,
		Footprints,
		Undo2,
		CheckCircle2,
		X,
		RefreshCw,
		Crosshair
	} from '@lucide/svelte';
	import type { NavigationResult } from '$lib/components/map/NavigationSearchBar.svelte';

	// ── Types ────────────────────────────────────────────────────────────────────

	interface Route {
		route_id: number | string;
		geometry: string | GeoJSON.LineString;
		mode_segments?: unknown;
	}

	type RouteDisplayModeSegment = ModeSegment & {
		mode: RouteVehicleType;
	};

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
		/** Whether the navigation search bar is visible. */
		showNavSearch?: boolean;
	}

	/**
	 * Before tracing starts the user picks a recording mode:
	 *   'manual' — tap points; consecutive taps form straight segments.
	 *   'gps'    — device location tracked live; final trace matched via OSRM.
	 */
	type RecordingMode = 'manual' | 'gps';

	// ── Props ─────────────────────────────────────────────────────────────────────

	let {
		center = [120.9842, 14.5995],
		zoom = 12,
		style = 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json',
		selectedRoute = null,
		controlsHidden = false,
		tracingActive = false,
		onTraceSessionEnd,
		showNavSearch = false
	}: Props = $props();

	const FALLBACK_CENTER: [number, number] = [120.9842, 14.5995];
	const ROUTE_FIT_BASE_PADDING_PX = 96;
	const ROUTE_FIT_BOTTOM_OFFSET_PX = 200;
	const NAV_CAMERA_ZOOM = 16.8;
	const NAV_CAMERA_PITCH = 32;
	/** 10 m minimum movement before a new GPS point is recorded (Mode B). */
	const GPS_MIN_DISTANCE_M = 10;
	/** Walk colour on the trace (dashed gray). */
	const WALK_COLOUR = '#6b7280';
	/** Default transit colour. */
	const TRANSIT_COLOUR = '#3b82f6';

	// Mode-to-colour map for trace segments.
	const MODE_COLOURS: Record<string, string> = {
		Walk: WALK_COLOUR,
		Jeepney: '#f59e0b',
		Bus: '#3b82f6',
		'MRT-3': '#8b5cf6',
		'LRT-1': '#10b981',
		'LRT-2': '#ef4444',
		'UV Express': '#06b6d4',
		Tricycle: '#f97316',
		Shuttle: '#84cc16'
	};

	// ── Map state ─────────────────────────────────────────────────────────────────

	let container: HTMLDivElement;
	let map = $state<maplibregl.Map | null>(null);
	let ready = $state(false);
	let mapStyleLoaded = $state(false);
	let activeRouteId = $state<string | null>(null);

	let lastFittedRouteId: string | null = null;
	let fitGeneration = 0;

	// ── Tracing state ─────────────────────────────────────────────────────────────

	/** Whether the mode-selection step has been passed and actual tracing started. */
	let tracingMode = $state(false);
	/** The chosen recording mode; null means mode picker is showing. */
	let recordingMode = $state<RecordingMode | null>(null);

	/** Raw accumulated coordinates. */
	let tracedPoints = $state<[number, number][]>([]);
	/** MapLibre markers for each tapped point (Mode A). */
	let traceMarkers: maplibregl.Marker[] = [];

	/** Mode-change markers placed by the user. */
	let modeMarkers = $state<ModeMarker[]>([]);
	/** True when awaiting the user to tap the map to drop a mode-change pin (Mode A). */
	let pendingModeChange = $state(false);
	/** The mode that will be set at the next tapped point (while pendingModeChange is true). */
	let pendingMode = $state<RouteVehicleType>('Walk');
	/** True when the mode picker bottom-sheet is open. */
	let modePickerOpen = $state(false);

	let savingRoute = $state(false);
	let traceMetadataOpen = $state(false);
	let traceSaveError = $state<string | null>(null);

	// GPS (Mode B) specific state.
	let gpsWatchId = $state<number | null>(null);
	let gpsRecording = $state(false);
	let gpsPointCount = $state(0);
	let gpsSnapping = $state(false);
	let lastGpsCoord: [number, number] | null = null;

	// Hardcoded start/end location OSM IDs for traced route saving.
	const TRACE_START_LOC = 371357222;
	const TRACE_END_LOC = 28756784;

	// ── Navigation state ──────────────────────────────────────────────────────

	/** Currently displayed itinerary result from the nav API. */
	let navResult = $state<NavigationResult | null>(null);
	/** True once the user has tapped "Start Navigation". */
	let navActive = $state(false);
	/** True when the "I've Arrived" prompt is showing. */
	let navArrived = $state(false);
	/** Index of the current active leg during live navigation. */
	let navActiveLegIndex = $state(0);
	/** GPS watch ID for live navigation. */
	let navWatchId: number | null = null;
	/** Last known position for bearing calculation. */
	let navLastCoord: [number, number] | null = null;
	/** Whether the user has panned away — shows re-center button. */
	let navOffCenter = $state(false);
	/** Start and end pins for navigation route context. */
	let navStartMarker: maplibregl.Marker | null = null;
	let navEndMarker: maplibregl.Marker | null = null;

	// ── Geometry helpers ──────────────────────────────────────────────────────────

	function parseGeometry(geometry: string | GeoJSON.LineString): GeoJSON.LineString | null {
		if (typeof geometry !== 'string') return geometry;
		try {
			const parsed = JSON.parse(geometry);
			if (parsed?.type !== 'LineString' || !Array.isArray(parsed.coordinates)) return null;
			return parsed as GeoJSON.LineString;
		} catch {
			return null;
		}
	}

	/** Haversine distance in metres between two [lng, lat] pairs. */
	function haversineM(a: [number, number], b: [number, number]): number {
		const R = 6_371_000;
		const toRad = (d: number) => (d * Math.PI) / 180;
		const dLat = toRad(b[1] - a[1]);
		const dLng = toRad(b[0] - a[0]);
		const sa =
			Math.sin(dLat / 2) ** 2 +
			Math.cos(toRad(a[1])) * Math.cos(toRad(b[1])) * Math.sin(dLng / 2) ** 2;
		return R * 2 * Math.asin(Math.sqrt(sa));
	}

	function isLngLatPair(value: unknown): value is [number, number] {
		return (
			Array.isArray(value) &&
			value.length >= 2 &&
			typeof value[0] === 'number' &&
			typeof value[1] === 'number'
		);
	}

	function isRouteDisplayModeSegment(value: unknown): value is RouteDisplayModeSegment {
		if (typeof value !== 'object' || value === null) return false;
		const candidate = value as {
			mode?: unknown;
			from?: unknown;
			to?: unknown;
			start_index?: unknown;
			end_index?: unknown;
		};

		if (typeof candidate.mode !== 'string') return false;
		if (!isLngLatPair(candidate.from) || !isLngLatPair(candidate.to)) return false;

		const startIsValid =
			candidate.start_index === undefined ||
			(Number.isInteger(candidate.start_index) && (candidate.start_index as number) >= 0);
		const endIsValid =
			candidate.end_index === undefined ||
			(Number.isInteger(candidate.end_index) && (candidate.end_index as number) >= 0);

		return startIsValid && endIsValid;
	}

	function normalizeRouteDisplayModeSegments(value: unknown): RouteDisplayModeSegment[] {
		if (!Array.isArray(value)) return [];
		return value.filter(isRouteDisplayModeSegment);
	}

	function findNearestCoordinateIndex(
		coordinates: [number, number][],
		target: [number, number],
		minIndex = 0
	): number {
		let nearestIndex = minIndex;
		let minDistance = Infinity;

		for (let i = Math.max(0, minIndex); i < coordinates.length; i++) {
			const d = haversineM(coordinates[i], target);
			if (d < minDistance) {
				minDistance = d;
				nearestIndex = i;
			}
		}

		return nearestIndex;
	}

	function toSegmentCoordinates(
		coordinates: [number, number][],
		segment: RouteDisplayModeSegment
	): [number, number][] | null {
		if (coordinates.length < 2) return null;

		const hasIndexBounds =
			typeof segment.start_index === 'number' && typeof segment.end_index === 'number';

		let startIndex =
			hasIndexBounds && segment.start_index! >= 0 && segment.start_index! < coordinates.length
				? segment.start_index!
				: findNearestCoordinateIndex(coordinates, segment.from);

		let endIndex =
			hasIndexBounds && segment.end_index! >= 0 && segment.end_index! < coordinates.length
				? segment.end_index!
				: findNearestCoordinateIndex(coordinates, segment.to, startIndex + 1);

		if (endIndex <= startIndex) {
			startIndex = findNearestCoordinateIndex(coordinates, segment.from);
			endIndex = findNearestCoordinateIndex(coordinates, segment.to, startIndex + 1);
		}

		if (endIndex <= startIndex || startIndex < 0 || endIndex >= coordinates.length) return null;

		return coordinates.slice(startIndex, endIndex + 1);
	}

	// ── Selected-route display ────────────────────────────────────────────────────

	function removeRouteLayers() {
		if (!map) return;

		const layers = map.getStyle()?.layers ?? [];
		for (const layer of layers) {
			if (layer.id.startsWith('selected-route-seg-')) {
				map.removeLayer(layer.id);
			}
		}

		const sources = Object.keys(map.getStyle()?.sources ?? {});
		for (const sourceId of sources) {
			if (sourceId.startsWith('selected-route-seg-src-')) {
				map.removeSource(sourceId);
			}
		}

		if (map.getLayer('route-line')) map.removeLayer('route-line');
		if (map.getSource('selected-route')) map.removeSource('selected-route');
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

		const coordinates = geometry.coordinates as [number, number][];
		const segments = normalizeRouteDisplayModeSegments(route.mode_segments);
		let renderedSegmentCount = 0;

		for (let i = 0; i < segments.length; i++) {
			const segmentCoordinates = toSegmentCoordinates(coordinates, segments[i]);
			if (!segmentCoordinates || segmentCoordinates.length < 2) continue;

			const sourceId = `selected-route-seg-src-${i}`;
			const layerId = `selected-route-seg-${i}`;
			const mode = segments[i].mode;
			const isWalk = mode === 'Walk';
			const colour = MODE_COLOURS[mode] ?? TRANSIT_COLOUR;

			const geojson: GeoJSON.FeatureCollection = {
				type: 'FeatureCollection',
				features: [
					{
						type: 'Feature',
						properties: {
							route_id: route.route_id,
							mode
						},
						geometry: {
							type: 'LineString',
							coordinates: segmentCoordinates
						}
					}
				]
			};

			map.addSource(sourceId, {
				type: 'geojson',
				data: geojson
			});

			map.addLayer({
				id: layerId,
				type: 'line',
				source: sourceId,
				layout: {
					'line-join': 'round',
					'line-cap': 'round'
				},
				paint: {
					'line-color': colour,
					'line-width': 4,
					'line-opacity': 0.9,
					...(isWalk ? { 'line-dasharray': [2, 2] } : {})
				}
			});

			renderedSegmentCount++;
		}

		if (renderedSegmentCount > 0) {
			activeRouteId = String(route.route_id);
			return;
		}

		const geojson: GeoJSON.FeatureCollection = {
			type: 'FeatureCollection',
			features: [{ type: 'Feature', properties: { route_id: route.route_id }, geometry }]
		};

		map.addSource('selected-route', { type: 'geojson', data: geojson });
		map.addLayer({
			id: 'route-line',
			type: 'line',
			source: 'selected-route',
			layout: { 'line-join': 'round', 'line-cap': 'round' },
			paint: { 'line-color': '#3b82f6', 'line-width': 3, 'line-opacity': 0.85 }
		});

		activeRouteId = String(route.route_id);
	}

	// ── Camera helpers ────────────────────────────────────────────────────────────

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

	function refitRouteWithUserPosition(position: GeolocationPosition) {
		if (!map || !selectedRoute) return;
		const geometry = parseGeometry(selectedRoute.geometry);
		if (!geometry) return;
		fitBoundsForRouteAndUser(geometry, [position.coords.longitude, position.coords.latitude]);
	}

	function fitBoundsForRouteAndUser(
		geometry: GeoJSON.LineString,
		userLngLat: [number, number] | null
	) {
		if (!map) return;
		const bounds = new maplibregl.LngLatBounds();
		for (const c of geometry.coordinates) bounds.extend(c as [number, number]);
		if (userLngLat) bounds.extend(userLngLat);
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

	// ── Trace map layers ──────────────────────────────────────────────────────────

	function removeTraceLayers() {
		if (!map) return;
		// Remove individual coloured segment layers.
		const existingLayers = map.getStyle()?.layers ?? [];
		for (const layer of existingLayers) {
			if (layer.id.startsWith('trace-seg-')) map.removeLayer(layer.id);
			if (layer.id === 'trace-line') map.removeLayer(layer.id);
		}
		// Remove sources.
		const existingSources = Object.keys(map.getStyle()?.sources ?? {});
		for (const src of existingSources) {
			if (src.startsWith('trace-seg-')) map.removeSource(src);
			if (src === 'trace') map.removeSource(src);
		}
	}

	/**
	 * Compute colour-coded GeoJSON segments from the current tracedPoints +
	 * modeMarkers state and redraw all trace layers on the map.
	 */
	function updateTraceLine() {
		if (!map) return;

		// Build a list of { coords, mode, isWalk }[] for each segment boundary.
		interface Seg {
			coords: [number, number][];
			mode: RouteVehicleType;
		}

		const segments: Seg[] = [];

		if (tracedPoints.length >= 2) {
			// Sort markers by pointIndex.
			const sorted = [...modeMarkers].sort((a, b) => a.pointIndex - b.pointIndex);
			// Ensure implicit start marker.
			if (sorted.length === 0 || sorted[0].pointIndex !== 0) {
				sorted.unshift({ pointIndex: 0, mode: 'Walk' });
			}

			for (let i = 0; i < sorted.length; i++) {
				const startIdx = sorted[i].pointIndex;
				const endIdx = i + 1 < sorted.length ? sorted[i + 1].pointIndex : tracedPoints.length - 1;
				if (endIdx <= startIdx) continue;
				segments.push({ coords: tracedPoints.slice(startIdx, endIdx + 1), mode: sorted[i].mode });
			}
		}

		// Remove old layers & sources, then re-add.
		const style = map.getStyle();
		const existingLayers = style?.layers ?? [];
		const existingSources = Object.keys(style?.sources ?? {});

		for (const l of existingLayers) if (l.id.startsWith('trace-seg-')) map.removeLayer(l.id);
		for (const s of existingSources) if (s.startsWith('trace-seg-')) map.removeSource(s);

		if (segments.length === 0) {
			// Nothing to draw yet; ensure a plain line source exists for single-point preview.
			if (map.getLayer('trace-line')) map.removeLayer('trace-line');
			if (map.getSource('trace')) map.removeSource('trace');
			return;
		}

		for (let i = 0; i < segments.length; i++) {
			const seg = segments[i];
			if (seg.coords.length < 2) continue;

			const srcId = `trace-seg-${i}`;
			const layerId = `trace-seg-${i}`;
			const isWalk = seg.mode === 'Walk';
			const colour = MODE_COLOURS[seg.mode] ?? TRANSIT_COLOUR;

			const geojson: GeoJSON.FeatureCollection = {
				type: 'FeatureCollection',
				features: [
					{
						type: 'Feature',
						properties: {},
						geometry: { type: 'LineString', coordinates: seg.coords }
					}
				]
			};

			map.addSource(srcId, { type: 'geojson', data: geojson });
			map.addLayer({
				id: layerId,
				type: 'line',
				source: srcId,
				layout: { 'line-join': 'round', 'line-cap': 'round' },
				paint: {
					'line-color': colour,
					'line-width': 3,
					'line-opacity': 0.9,
					...(isWalk ? { 'line-dasharray': [2, 2] } : {})
				}
			});
		}
	}

	// ── Marker visuals ────────────────────────────────────────────────────────────

	function clearTraceMarkers() {
		for (const marker of traceMarkers) marker.remove();
		traceMarkers = [];
	}

	function addPointMarker(coord: [number, number], isFirst: boolean) {
		if (!map) return;
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
	}

	// ── OSRM helpers ──────────────────────────────────────────────────────────────

	/**
	 * Map-match a raw GPS trace via OSRM match endpoint.
	 * Returns the snapped coords or the raw input if matching fails.
	 */
	async function matchTrace(raw: [number, number][]): Promise<[number, number][]> {
		if (raw.length < 2) return raw;
		const coordsStr = raw.map((c) => `${c[0]},${c[1]}`).join(';');
		gpsSnapping = true;
		try {
			const res = await fetch(`/api/osrm/match?coords=${encodeURIComponent(coordsStr)}`);
			if (!res.ok) throw new Error('match error');
			const data = (await res.json()) as {
				code?: string;
				matchings?: Array<{ geometry: { coordinates: [number, number][] } }>;
			};
			if (data.code !== 'Ok' || !data.matchings?.[0]) throw new Error('no matching');
			return data.matchings[0].geometry.coordinates;
		} catch {
			console.warn('[osrm/match] fallback to raw GPS trace');
			return raw;
		} finally {
			gpsSnapping = false;
		}
	}

	// ── Manual trace (Mode A) ─────────────────────────────────────────────────────

	async function addManualPoint(lngLat: maplibregl.LngLat) {
		if (!map) return;

		const newCoord: [number, number] = [lngLat.lng, lngLat.lat];
		const isFirst = tracedPoints.length === 0;
		const previousPointIndex = tracedPoints.length - 1;

		if (pendingModeChange) {
			// Apply the new mode starting before the new tap segment.
			if (previousPointIndex >= 0) {
				modeMarkers = [
					...modeMarkers.filter((m) => m.pointIndex !== previousPointIndex),
					{ pointIndex: previousPointIndex, mode: pendingMode }
				];
			}
			pendingModeChange = false;
		}

		if (isFirst) {
			tracedPoints = [newCoord];
			addPointMarker(newCoord, true);
			updateTraceLine();
			return;
		}

		// Pure manual tracing: directly connect the new point to the previous point.
		tracedPoints = [...tracedPoints, newCoord];
		addPointMarker(newCoord, false);
		updateTraceLine();
	}

	function undoLastPoint() {
		if (tracedPoints.length === 0) return;

		const removedIdx = tracedPoints.length - 1;
		tracedPoints = tracedPoints.slice(0, -1);

		const lastMarker = traceMarkers.pop();
		if (lastMarker) lastMarker.remove();

		// Remove any mode marker tied to the removed point or its preceding boundary.
		modeMarkers = modeMarkers.filter(
			(m) => m.pointIndex !== removedIdx && m.pointIndex !== removedIdx - 1
		);

		updateTraceLine();
	}

	// ── GPS trace (Mode B) ────────────────────────────────────────────────────────

	function startGpsRecording() {
		if (!navigator.geolocation) {
			console.warn('Geolocation not available');
			return;
		}
		tracedPoints = [];
		gpsPointCount = 0;
		lastGpsCoord = null;
		gpsRecording = true;

		const watchId = navigator.geolocation.watchPosition(
			(pos) => {
				const coord: [number, number] = [pos.coords.longitude, pos.coords.latitude];
				if (lastGpsCoord === null || haversineM(lastGpsCoord, coord) >= GPS_MIN_DISTANCE_M) {
					tracedPoints = [...tracedPoints, coord];
					lastGpsCoord = coord;
					gpsPointCount = tracedPoints.length;
					updateTraceLine();
				}
			},
			(err) => console.warn('GPS watch error:', err),
			{ enableHighAccuracy: true }
		);

		gpsWatchId = watchId;
	}

	async function stopGpsRecording() {
		if (gpsWatchId !== null) {
			navigator.geolocation.clearWatch(gpsWatchId);
			gpsWatchId = null;
		}
		gpsRecording = false;

		// Map-match the raw trace.
		if (tracedPoints.length >= 2) {
			const matched = await matchTrace(tracedPoints);
			tracedPoints = matched;
			updateTraceLine();
		}
	}

	// ── Mode marker UI ────────────────────────────────────────────────────────────

	const PICKABLE_MODES = [
		'Walk',
		'Jeepney',
		'Bus',
		'MRT-3',
		'LRT-1',
		'LRT-2',
		'UV Express',
		'Tricycle',
		'Shuttle'
	] as const;

	function openModePicker() {
		modePickerOpen = true;
	}

	function selectMode(mode: RouteVehicleType) {
		modePickerOpen = false;
		pendingMode = mode;

		if (recordingMode === 'gps') {
			// Immediately place the marker at the last recorded GPS point.
			const lastIdx = tracedPoints.length - 1;
			if (lastIdx >= 0 && !modeMarkers.some((m) => m.pointIndex === lastIdx)) {
				modeMarkers = [...modeMarkers, { pointIndex: lastIdx, mode }];
				updateTraceLine();
			}
		} else {
			// Mode A: arm pendingModeChange; next tap adds point and applies mode before that segment.
			pendingModeChange = true;
			if (map) map.getCanvas().style.cursor = 'cell';
		}
	}

	// ── Session lifecycle ─────────────────────────────────────────────────────────

	function startTracing() {
		tracingMode = true;
		recordingMode = null; // show mode picker first
		tracedPoints = [];
		modeMarkers = [];
		clearTraceMarkers();
		removeTraceLayers();
		traceMetadataOpen = false;
		traceSaveError = null;
		pendingModeChange = false;
		gpsRecording = false;
		gpsPointCount = 0;
		lastGpsCoord = null;
		if (map) map.getCanvas().style.cursor = '';
	}

	function cancelTracing() {
		if (gpsWatchId !== null) {
			navigator.geolocation.clearWatch(gpsWatchId);
			gpsWatchId = null;
		}
		tracingMode = false;
		recordingMode = null;
		tracedPoints = [];
		modeMarkers = [];
		clearTraceMarkers();
		removeTraceLayers();
		traceMetadataOpen = false;
		traceSaveError = null;
		pendingModeChange = false;
		gpsRecording = false;
		gpsPointCount = 0;
		if (map) map.getCanvas().style.cursor = '';
	}

	function chooseMode(mode: RecordingMode) {
		recordingMode = mode;
		if (mode === 'manual') {
			if (map) map.getCanvas().style.cursor = 'crosshair';
		} else {
			startGpsRecording();
		}
	}

	function openTraceMetadataPrompt() {
		if (tracedPoints.length < 2 || savingRoute) return;
		traceSaveError = null;
		traceMetadataOpen = true;
	}

	// ── Save ──────────────────────────────────────────────────────────────────────

	async function saveTracedRoute(metadata: RouteMetadataInput) {
		if (tracedPoints.length < 2) return;

		savingRoute = true;
		traceSaveError = null;

		const mode_segments = buildModeSegments(tracedPoints, modeMarkers);

		try {
			const response = await fetch('/api/map/routes', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					...metadata,
					start_loc_osmid: TRACE_START_LOC,
					end_loc_osmid: TRACE_END_LOC,
					geometry: { type: 'LineString', coordinates: tracedPoints },
					...(mode_segments.length > 0 ? { mode_segments } : {})
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

	// ── Map click handler ─────────────────────────────────────────────────────────

	function onMapClickForTracing(e: maplibregl.MapMouseEvent) {
		if (!tracingMode || recordingMode !== 'manual') return;
		void addManualPoint(e.lngLat);
	}

	// ── Geolocation (for initial centering) ───────────────────────────────────────

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

	// ── Navigation map layers ─────────────────────────────────────────────────────

	const NAV_WALK_COLOUR = '#9ca3af';
	const NAV_LEG_COLOURS: Record<string, string> = {
		Walk: NAV_WALK_COLOUR,
		Jeepney: '#f59e0b',
		Bus: '#3b82f6',
		'MRT-3': '#8b5cf6',
		'LRT-1': '#10b981',
		'LRT-2': '#ef4444',
		'UV Express': '#06b6d4',
		Tricycle: '#f97316',
		Shuttle: '#84cc16'
	};

	function removeNavLayers() {
		if (!map) return;
		const style = map.getStyle();
		const layers = style?.layers ?? [];
		const sources = Object.keys(style?.sources ?? {});
		for (const l of layers) {
			if (l.id.startsWith('nav-leg-')) map.removeLayer(l.id);
		}
		for (const s of sources) {
			if (s.startsWith('nav-leg-')) map.removeSource(s);
		}
	}

	function drawNavLegs(result: NavigationResult, activeLegIdx: number) {
		if (!map) return;
		const m = map; // capture for TS narrowing inside callbacks
		removeNavLayers();

		result.itinerary.forEach((leg, i) => {
			const isActive = i === activeLegIdx;
			const isCompleted = i < activeLegIdx;
			const opacity = navActive ? (isActive ? 0.95 : isCompleted ? 0.3 : 0.55) : 0.85;

			if (leg.type === 'walk') {
				const srcId = `nav-leg-${i}`;
				const walkCoords =
					leg.geometry?.coordinates && leg.geometry.coordinates.length >= 2
						? (leg.geometry.coordinates as [number, number][])
						: [leg.from, leg.to];
				const geojson: GeoJSON.FeatureCollection = {
					type: 'FeatureCollection',
					features: [{
						type: 'Feature',
						properties: {},
						geometry: {
							type: 'LineString',
							coordinates: walkCoords
						}
					}]
				};
				m.addSource(srcId, { type: 'geojson', data: geojson });
				m.addLayer({
					id: srcId,
					type: 'line',
					source: srcId,
					layout: { 'line-join': 'round', 'line-cap': 'round' },
					paint: {
						'line-color': NAV_WALK_COLOUR,
						'line-width': 3,
						'line-opacity': opacity,
						'line-dasharray': [3, 3]
					}
				});
			} else {
				const colour = NAV_LEG_COLOURS[leg.mode] ?? '#3b82f6';
				const srcId = `nav-leg-${i}`;
				const geojson: GeoJSON.FeatureCollection = {
					type: 'FeatureCollection',
					features: [
						{
							type: 'Feature',
							properties: {},
							geometry: leg.geometry
						}
					]
				};
				// Casing
				m.addSource(srcId, { type: 'geojson', data: geojson });
				m.addLayer({
					id: `${srcId}-casing`,
					type: 'line',
					source: srcId,
					layout: { 'line-join': 'round', 'line-cap': 'round' },
					paint: { 'line-color': '#ffffff', 'line-width': 6, 'line-opacity': opacity * 0.5 }
				});
				m.addLayer({
					id: srcId,
					type: 'line',
					source: srcId,
					layout: { 'line-join': 'round', 'line-cap': 'round' },
					paint: { 'line-color': colour, 'line-width': 4, 'line-opacity': opacity }
				});
			}
		});
	}

	function getNavEndpoints(result: NavigationResult): { start: [number, number]; end: [number, number] } | null {
		// Prefer API-resolved coordinates so the destination pin matches search/geocode, not the last ride alight on the corridor.
		if (result.originCoord && result.destinationCoord) {
			return { start: result.originCoord, end: result.destinationCoord };
		}
		const firstLeg = result.itinerary[0];
		const lastLeg = result.itinerary[result.itinerary.length - 1];
		if (!firstLeg || !lastLeg) return null;
		const start = firstLeg.type === 'walk' ? firstLeg.from : firstLeg.board;
		const end = lastLeg.type === 'walk' ? lastLeg.to : lastLeg.alight;
		return { start, end };
	}

	function removeNavMarkers() {
		navStartMarker?.remove();
		navEndMarker?.remove();
		navStartMarker = null;
		navEndMarker = null;
	}

	function createNavPinElement(kind: 'start' | 'end'): HTMLDivElement {
		const el = document.createElement('div');
		el.className = `nav-pin nav-pin--${kind}`;
		el.setAttribute('aria-hidden', 'true');
		el.innerHTML = `<span class="nav-pin__dot"></span>`;
		return el;
	}

	function drawNavMarkers(result: NavigationResult) {
		if (!map) return;
		const endpoints = getNavEndpoints(result);
		if (!endpoints) return;
		removeNavMarkers();
		navStartMarker = new maplibregl.Marker({
			element: createNavPinElement('start'),
			anchor: 'bottom'
		})
			.setLngLat(endpoints.start)
			.addTo(map);
		navEndMarker = new maplibregl.Marker({ element: createNavPinElement('end'), anchor: 'bottom' })
			.setLngLat(endpoints.end)
			.addTo(map);
	}

	function getNavCameraOffsetY(): number {
		const mapHeight = container?.clientHeight ?? 0;
		if (mapHeight <= 0) return 110;
		const overlayMaxHeight = mapHeight * 0.5;
		return Math.min(190, Math.max(90, overlayMaxHeight * 0.35));
	}

	function getNavBottomPadding(): number {
		const mapHeight = container?.clientHeight ?? 0;
		if (mapHeight <= 0) return 280;
		return Math.round(Math.min(360, Math.max(220, mapHeight * 0.52)));
	}

	// ── Handle navigation result from NavigationSearchBar ─────────────────────────

	function handleNavResult(result: NavigationResult) {
		navResult = result;
		navActive = false;
		navArrived = false;
		navActiveLegIndex = 0;
		if (map && mapStyleLoaded) {
			drawNavLegs(result, 0);
			drawNavMarkers(result);
			// Fit bounds around all leg coordinates
			const bounds = new maplibregl.LngLatBounds();
			for (const leg of result.itinerary) {
				if (leg.type === 'walk') {
					const wc = leg.geometry?.coordinates;
					if (wc && wc.length > 0) {
						for (const c of wc) bounds.extend(c as [number, number]);
					} else {
						bounds.extend(leg.from);
						bounds.extend(leg.to);
					}
				} else {
					for (const c of leg.geometry.coordinates) bounds.extend(c as [number, number]);
				}
			}
			map.fitBounds(bounds, {
				padding: { top: 80, right: 80, bottom: getNavBottomPadding(), left: 80 },
				maxZoom: 16,
				duration: 700
			});
		}
	}

	function clearNavResult() {
		navResult = null;
		navActive = false;
		navArrived = false;
		navActiveLegIndex = 0;
		stopNavGps();
		removeNavMarkers();
		if (map && mapStyleLoaded) removeNavLayers();
	}

	// ── Live navigation GPS ───────────────────────────────────────────────────────

	/** Compute bearing in degrees from point a to point b (both [lng, lat]). */
	function computeBearing(a: [number, number], b: [number, number]): number {
		const toRad = (d: number) => (d * Math.PI) / 180;
		const toDeg = (r: number) => (r * 180) / Math.PI;
		const dLng = toRad(b[0] - a[0]);
		const lat1 = toRad(a[1]);
		const lat2 = toRad(b[1]);
		const y = Math.sin(dLng) * Math.cos(lat2);
		const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);
		return (toDeg(Math.atan2(y, x)) + 360) % 360;
	}

	function startNavGps() {
		if (!navigator.geolocation) return;
		navWatchId = navigator.geolocation.watchPosition(
			(pos) => {
				const coord: [number, number] = [pos.coords.longitude, pos.coords.latitude];
				const bearing =
					pos.coords.heading != null && !isNaN(pos.coords.heading)
						? pos.coords.heading
						: navLastCoord
							? computeBearing(navLastCoord, coord)
							: 0;
				navLastCoord = coord;

				if (map && !navOffCenter) {
					map.easeTo({
						center: coord,
						bearing,
						zoom: NAV_CAMERA_ZOOM,
						pitch: NAV_CAMERA_PITCH,
						offset: [0, getNavCameraOffsetY()],
						duration: 300
					});
				}

				// Check if we have advanced to the next leg
				if (navResult && navActiveLegIndex < navResult.itinerary.length - 1) {
					const currentLeg = navResult.itinerary[navActiveLegIndex];
					const targetCoord = currentLeg.type === 'walk' ? currentLeg.to : currentLeg.alight;
					if (haversineM(coord, targetCoord) < 80) {
						navActiveLegIndex = navActiveLegIndex + 1;
						if (map && mapStyleLoaded) drawNavLegs(navResult, navActiveLegIndex);
					}
				}
			},
			(err) => console.warn('[nav GPS] watch error:', err),
			{ enableHighAccuracy: true }
		);
	}

	function stopNavGps() {
		if (navWatchId !== null) {
			navigator.geolocation.clearWatch(navWatchId);
			navWatchId = null;
		}
		navLastCoord = null;
	}

	function startNavigation() {
		if (!navResult) return;
		navActive = true;
		navActiveLegIndex = 0;
		navOffCenter = false;
		if (map && mapStyleLoaded) {
			drawNavLegs(navResult, 0);
			// Register move events to detect manual panning
			map.on('dragstart', onNavMapDrag);
		}
		startNavGps();
	}

	function onNavMapDrag() {
		navOffCenter = true;
	}

	function recenterNav() {
		navOffCenter = false;
		if (map && navLastCoord) {
			map.easeTo({
				center: navLastCoord,
				zoom: NAV_CAMERA_ZOOM,
				pitch: NAV_CAMERA_PITCH,
				offset: [0, getNavCameraOffsetY()],
				duration: 500
			});
		}
	}

	function handleArrived() {
		stopNavGps();
		navArrived = true;
		// Reset camera to north-up overview
		if (map) {
			map.easeTo({ bearing: 0, pitch: 0, zoom: 13, duration: 600 });
			map.off('dragstart', onNavMapDrag);
		}
	}

	function handleArrivedDismiss() {
		navArrived = false;
		clearNavResult();
	}

	// ── Mount ─────────────────────────────────────────────────────────────────────

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
			if (geolocateControl && geolocateHandler) geolocateControl.off('geolocate', geolocateHandler);
			geolocateControl = null;
			geolocateHandler = null;
			mapStyleLoaded = false;
			lastFittedRouteId = null;
			fitGeneration++;
			stopNavGps();
			removeNavMarkers();
			if (map) {
				clearRoutes();
				clearTraceMarkers();
				removeNavLayers();
				map.remove();
				map = null;
			}
		};
	});

	// ── Reactive effects ──────────────────────────────────────────────────────────

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

	/** Keep map cursor in sync with pendingModeChange state. */
	$effect(() => {
		if (!map) return;
		if (pendingModeChange) {
			map.getCanvas().style.cursor = 'cell';
		} else if (tracingMode && recordingMode === 'manual') {
			map.getCanvas().style.cursor = 'crosshair';
		} else {
			map.getCanvas().style.cursor = '';
		}
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

<!-- ── Tracing overlay ─────────────────────────────────────────────────────── -->
{#if tracingMode && !controlsHidden}
	<!-- Step 1: mode picker (shown before any tracing starts) -->
	{#if recordingMode === null}
		<div class="pointer-events-none absolute inset-0 z-30 flex items-end justify-center pb-10">
			<div
				class="pointer-events-auto mx-4 w-full max-w-sm rounded-2xl border border-border/60 bg-card/95 p-5 shadow-2xl backdrop-blur"
			>
				<div class="mb-4 flex items-center justify-between">
					<h2 class="text-base font-semibold text-foreground">Choose recording mode</h2>
					<button
						type="button"
						class="rounded-lg p-1 text-muted-foreground hover:bg-muted"
						onclick={() => void handleCancelTrace()}
						aria-label="Cancel tracing"
					>
						<X class="size-4" />
					</button>
				</div>
				<div class="grid grid-cols-1 gap-3">
					<button
						type="button"
						class="flex items-center gap-3 rounded-xl border border-border bg-background px-4 py-3 text-left transition-colors hover:border-brand/50 hover:bg-brand/5"
						onclick={() => chooseMode('manual')}
					>
						<div
							class="grid size-9 shrink-0 place-items-center rounded-full bg-blue-500/10 text-blue-500"
						>
							<PenLine class="size-4" />
						</div>
						<div>
							<p class="text-sm font-medium text-foreground">Manual trace</p>
							<p class="text-xs text-muted-foreground">
								Tap points on the map to draw straight segments
							</p>
						</div>
					</button>
					<button
						type="button"
						class="flex items-center gap-3 rounded-xl border border-border bg-background px-4 py-3 text-left transition-colors hover:border-brand/50 hover:bg-brand/5"
						onclick={() => chooseMode('gps')}
					>
						<div
							class="grid size-9 shrink-0 place-items-center rounded-full bg-green-500/10 text-green-600"
						>
							<Radio class="size-4" />
						</div>
						<div>
							<p class="text-sm font-medium text-foreground">Record live</p>
							<p class="text-xs text-muted-foreground">Use GPS to record your actual journey</p>
						</div>
					</button>
				</div>
			</div>
		</div>
	{:else}
		<!-- Status info card (top-left) -->
		<div
			class="pointer-events-none absolute top-4 left-4 z-20 max-w-[min(100%-2rem,22rem)] px-4 sm:right-4 sm:left-auto"
		>
			<div
				class="pointer-events-auto flex items-start gap-2 rounded-2xl border border-border/60 bg-card/95 p-3 text-sm shadow-lg backdrop-blur"
			>
				<div
					class="mt-0.5 grid size-8 shrink-0 place-items-center rounded-full bg-brand/10 text-brand"
					aria-hidden="true"
				>
					{#if recordingMode === 'gps'}
						<Radio class="size-4 {gpsRecording ? 'animate-pulse text-red-500' : ''}" />
					{:else}
						<PenLine class="size-4" />
					{/if}
				</div>
				<div class="min-w-0">
					{#if recordingMode === 'manual'}
						<p class="font-medium text-foreground">
							{pendingModeChange ? `Tap to mark "${pendingMode}" change` : 'Trace a route'}
						</p>
						<p class="mt-0.5 text-muted-foreground">
							{tracedPoints.length} point{tracedPoints.length !== 1 ? 's' : ''}
						</p>
					{:else}
						<p class="font-medium text-foreground">
							{gpsRecording ? 'Recording…' : gpsSnapping ? 'Snapping to roads…' : 'GPS ready'}
						</p>
						<p class="mt-0.5 text-muted-foreground">
							{gpsPointCount} GPS point{gpsPointCount !== 1 ? 's' : ''} recorded
						</p>
					{/if}
				</div>
			</div>
		</div>

		<!-- Bottom toolbar -->
		<div
			class="absolute right-4 bottom-6 left-4 z-20 flex flex-wrap items-center justify-center gap-2 sm:right-auto sm:left-auto sm:justify-start"
		>
			{#if recordingMode === 'manual'}
				<!-- Undo -->
				<Button.Root
					variant="outline"
					size="sm"
					class="gap-1.5 border-border/80 bg-card/95 shadow-md"
					disabled={tracedPoints.length === 0}
					onclick={undoLastPoint}
				>
					<Undo2 class="size-3.5" />
					Undo
				</Button.Root>
				<!-- Change mode -->
				<Button.Root
					variant="outline"
					size="sm"
					class="gap-1.5 border-border/80 bg-card/95 shadow-md"
					disabled={tracedPoints.length === 0}
					onclick={openModePicker}
				>
					<Footprints class="size-3.5" />
					Change mode
				</Button.Root>
				<!-- Save -->
				<Button.Root
					variant="default"
					size="sm"
					class="gap-1.5 bg-success text-success-foreground shadow-md hover:bg-success/90"
					disabled={tracedPoints.length < 2 || savingRoute}
					onclick={openTraceMetadataPrompt}
				>
					<CheckCircle2 class="size-3.5" />
					Save route
				</Button.Root>
			{:else}
				<!-- GPS mode buttons -->
				{#if gpsRecording}
					<!-- Change mode (GPS) -->
					<Button.Root
						variant="outline"
						size="sm"
						class="gap-1.5 shadow-md"
						onclick={openModePicker}
					>
						<Footprints class="size-3.5" />
						Change mode
					</Button.Root>
					<!-- Stop -->
					<Button.Root
						variant="default"
						size="sm"
						class="text-destructive-foreground gap-1.5 bg-destructive shadow-md hover:bg-destructive/90"
						onclick={() => void stopGpsRecording()}
					>
						Stop recording
					</Button.Root>
				{:else if gpsSnapping}
					<Button.Root variant="outline" size="sm" class="gap-1.5 shadow-md" disabled>
						<RefreshCw class="size-3.5 animate-spin" />
						Snapping…
					</Button.Root>
				{:else}
					<!-- Save (after GPS stopped) -->
					<Button.Root
						variant="default"
						size="sm"
						class="gap-1.5 bg-success text-success-foreground shadow-md hover:bg-success/90"
						disabled={tracedPoints.length < 2 || savingRoute}
						onclick={openTraceMetadataPrompt}
					>
						<CheckCircle2 class="size-3.5" />
						Save route
					</Button.Root>
				{/if}
			{/if}
			<!-- Cancel (always visible) -->
			<Button.Root
				variant="outline"
				size="sm"
				class="gap-1.5 border-border/80 bg-card/95 shadow-md"
				onclick={() => void handleCancelTrace()}
			>
				<X class="size-3.5" />
				Cancel
			</Button.Root>
		</div>
	{/if}
{/if}

<!-- ── Mode picker bottom sheet ───────────────────────────────────────────── -->
{#if modePickerOpen}
	<div
		class="fixed inset-0 z-80 flex items-end justify-center px-4 pb-[calc(env(safe-area-inset-bottom)+5.5rem)]"
	>
		<button
			type="button"
			class="absolute inset-0 bg-black/40"
			onclick={() => {
				modePickerOpen = false;
			}}
			aria-label="Close mode picker"
		></button>
		<div
			class="relative z-10 w-full max-w-sm rounded-2xl border border-border/60 bg-card p-5 shadow-2xl"
		>
			<h2 class="mb-3 text-sm font-semibold text-foreground">Change transport mode</h2>
			<div class="grid grid-cols-3 gap-2">
				{#each PICKABLE_MODES as mode (mode)}
					<button
						type="button"
						class="flex flex-col items-center gap-1 rounded-xl border px-2 py-2.5 text-center text-xs transition-colors hover:border-brand/40 hover:bg-brand/10 hover:text-brand"
						style="border-color: {MODE_COLOURS[mode] ?? TRANSIT_COLOUR}22; color: {MODE_COLOURS[
							mode
						] ?? TRANSIT_COLOUR}"
						onclick={() => selectMode(mode)}
					>
						<span
							class="inline-block size-3 rounded-full"
							style="background: {MODE_COLOURS[mode] ?? TRANSIT_COLOUR};"
						></span>
						{mode}
					</button>
				{/each}
			</div>
		</div>
	</div>
{/if}

<RouteTraceSaveDrawer
	bind:open={traceMetadataOpen}
	saving={savingRoute}
	errorMessage={traceSaveError}
	onsave={handleTraceMetadataSave}
/>

<!-- ── Navigation Search Bar ────────────────────────────────────────────── -->
{#if showNavSearch && !tracingMode && !navResult && !controlsHidden}
	<NavigationSearchBar
		onnav={handleNavResult}
		onclose={() => {
			/* parent manages showNavSearch */
		}}
	/>
{/if}

<!-- ── Navigation Itinerary Card ─────────────────────────────────────────── -->
{#if navResult && !tracingMode && !controlsHidden}
	<div class="pointer-events-none absolute right-0 bottom-5 left-0 z-10 px-4 md:px-6">
		<div class="pointer-events-auto">
			<NavigationItineraryCard
				itinerary={navResult.itinerary}
				summary={navResult.summary}
				fromName={navResult.fromName}
				toName={navResult.toName}
				navigating={navActive}
				activeLegIndex={navActiveLegIndex}
				onstart={startNavigation}
				onarrived={handleArrived}
				onclose={clearNavResult}
			/>
		</div>
	</div>
{/if}

<!-- ── Re-center button (live navigation) ────────────────────────────────── -->
{#if navActive && navOffCenter && !controlsHidden}
	<div class="absolute right-4 bottom-[calc(50vh+1rem)] z-20">
		<button
			type="button"
			class="recenter-btn"
			onclick={recenterNav}
			aria-label="Re-center on my location"
		>
			<Crosshair class="size-4" />
			<span class="text-xs font-semibold">Re-center</span>
		</button>
	</div>
{/if}

<!-- ── Arrived prompt ────────────────────────────────────────────────────── -->
{#if navArrived && navResult}
	<NavigationArrivedPrompt
		itinerary={navResult.itinerary}
		fromName={navResult.fromName}
		toName={navResult.toName}
		ondismiss={handleArrivedDismiss}
		onsaved={handleArrivedDismiss}
	/>
{/if}

<div bind:this={container} class="absolute inset-0 h-full w-full"></div>

<style>
	.recenter-btn {
		display: flex;
		align-items: center;
		gap: 0.375rem;
		padding: 0.5rem 0.875rem;
		border-radius: 99px;
		background: var(--card);
		border: 1px solid var(--border);
		color: var(--foreground);
		box-shadow:
			0 4px 16px rgba(0, 0, 0, 0.18),
			0 1px 3px rgba(0, 0, 0, 0.08);
		backdrop-filter: blur(8px);
		-webkit-backdrop-filter: blur(8px);
		cursor: pointer;
		transition:
			transform 120ms,
			box-shadow 120ms;
	}

	.recenter-btn:hover {
		transform: translateY(-1px);
		box-shadow:
			0 6px 20px rgba(0, 0, 0, 0.22),
			0 1px 4px rgba(0, 0, 0, 0.1);
	}

	.recenter-btn:active {
		transform: translateY(0);
	}

	:global(.nav-pin) {
		width: 1.05rem;
		height: 1.05rem;
		border-radius: 9999px;
		border: 2px solid #fff;
		box-shadow: 0 3px 10px rgba(0, 0, 0, 0.25);
		display: grid;
		place-items: center;
	}

	:global(.nav-pin__dot) {
		width: 0.45rem;
		height: 0.45rem;
		border-radius: 9999px;
		background: #fff;
		opacity: 0.95;
	}

	:global(.nav-pin--start) {
		background: #2563eb;
	}

	:global(.nav-pin--end) {
		background: #ef4444;
	}
</style>
