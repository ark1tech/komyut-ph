<script lang="ts">
	import maplibregl from 'maplibre-gl';
	import 'maplibre-gl/dist/maplibre-gl.css';

	interface Location {
		osm_id: string;
		coordinates: [number, number][]; // EPSG:3857
	}

	interface Route {
		route_id: string;
		geometry: string; // GeoJSON LineString as string
	}

	interface Props {
		// center coordinates [lng, lat];
		center?: [number, number];
		zoom?: number;
		// map style URL; defaults to OpenStreetMap-based style
		style?: string;
		// locations to display as clickable polygons
		locations?: Location[];
	}

	let {
		center = [120.9842, 14.5995],
		zoom = 12,
		style = 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json',
		locations = [
			{
				osm_id: '51260262',
				coordinates: [[13477960.437762177,1648713.4778763228],[13477982.601472793,1648712.9370971576],[13477981.321298651,1648675.0480666398],[13478059.957386946,1648754.9683294],[13478121.33895417,1648819.6203944085],[13478140.20760786,1648837.8573923504],[13478143.870019106,1648842.4597913914],[13478143.769831564,1648866.9560744194],[13478143.825491311,1648875.067812653],[13478143.536060633,1648886.3782264886],[13478143.569456482,1648892.2808147671],[13478142.946067333,1648901.0253925342],[13478142.578713013,1648912.0021431283],[13478145.183589099,1648926.7989025393],[13478144.91642232,1648940.4220541827],[13478143.658512073,1648989.8750769806],[13478141.732684884,1648990.0936922336],[13478141.343066663,1649058.1291523383],[13478138.827246174,1649158.2784199857],[13478137.224245507,1649238.810041726],[13477961.940575304,1649238.338288371],[13477960.437762177,1648713.4778763228]]
			},
			{
				osm_id: '138294127',
				coordinates: [[13477954.1148151,1647123.959353536],[13478056.862705104,1647114.5020685543],[13478055.22630859,1647107.0351879022],[13478054.591787491,1647100.1780852731],[13478046.064714495,1647048.8534215523],[13478137.380092794,1647022.9552728548],[13478148.256007044,1647008.3552176189],[13478187.741030429,1647026.982082325],[13478220.51348852,1646983.7802028125],[13478235.797654603,1646967.5349346222],[13478252.573501866,1646945.6061401737],[13478266.588625757,1646933.7443500655],[13478361.922637671,1646906.5922617752],[13478362.69074216,1646952.4516956825],[13478378.642825188,1646959.0211296887],[13478428.369241726,1646975.2088666647],[13478515.176180648,1647011.4155909875],[13478593.64528971,1647060.3010790437],[13478629.846388113,1647075.9481368759],[13478654.347808037,1647087.6374158203],[13478695.246588955,1647098.567356738],[13478739.07307248,1647113.0524120454],[13478755.192134747,1647119.253721028],[13478764.064298162,1647157.7041717693],[13478776.565476978,1647155.3110839578],[13478788.387606902,1647211.0194657817],[13478779.682422722,1647238.194892028],[13478759.322087854,1647280.1316254192],[13478742.535108643,1647309.8382918877],[13478739.685329678,1647329.0521497792],[13478757.485316256,1647389.777241118],[13478768.617265336,1647444.6692597456],[13478777.890178919,1647505.762801693],[13478784.936702687,1647552.3481649747],[13478751.88594587,1647554.9138716003],[13478693.36528956,1647562.0702385441],[13478643.349442348,1647568.582304119],[13478674.25173299,1647602.6843852017],[13478726.371518582,1647648.9937964801],[13478728.909602972,1647698.513320595],[13478762.472429447,1647747.31960092],[13478783.233514478,1647762.4953589013],[13478815.928048924,1647844.3341564885],[13478819.590460172,1647872.0165091234],[13478837.501766238,1647901.574299888],[13478819.278765595,1647973.5302342132],[13478826.091518434,1648026.4560604044],[13478917.974626133,1648135.598669033],[13478916.21577818,1648171.6574840986],[13478919.165744685,1648204.9319692487],[13478919.989508916,1648235.801802288],[13478903.380640892,1648361.2950234555],[13478884.946133217,1648411.218648634],[13478877.621310722,1648437.0721988212],[13478859.442837875,1648453.0077558616],[13478845.494505677,1648456.9427469475],[13478788.164967919,1648497.075088753],[13478759.555858785,1648517.0837543479],[13478700.578792565,1648556.2036754284],[13478667.661619136,1648551.647352087],[13478659.457372665,1648550.5197772454],[13478643.850380054,1648546.6307950162],[13478636.369710276,1648544.7668451662],[13478621.586481895,1648536.6091897273],[13478552.25670303,1648435.116210564],[13478549.885597875,1648383.4091406954],[13478580.45393005,1648349.9733393025],[13478580.286950812,1648326.167904135],[13478578.439047266,1648063.6652838015],[13478507.706642818,1648028.3659944688],[13478472.852510247,1648009.0940760553],[13478467.453514945,1647999.705493074],[13478427.211519023,1647983.8162447864],[13478405.726857297,1647989.2929143189],[13478358.171170833,1647989.7531387035],[13478345.903762948,1647993.4349340822],[13478288.919315612,1647992.456957132],[13478278.010005511,1647985.6226251516],[13478263.471680013,1647982.562133653],[13478250.213528663,1647972.6097860443],[13478234.918230627,1647971.0795410376],[13478218.843696157,1647976.441151769],[13478157.384205287,1647979.2485192153],[13478136.979342628,1647981.5381347006],[13478121.472537559,1647979.0184071178],[13478112.422262957,1647979.4786313148],[13478086.74085643,1648004.7449526223],[13478083.935605263,1648008.058570408],[13478079.093207413,1648008.3116940067],[13478071.189523568,1647994.033225882],[13478062.005665578,1647981.5381347006],[13478035.077480752,1647964.4523156139],[13478015.18468775,1647954.2468520894],[13478000.134292593,1647943.0289008918],[13477994.033984499,1647934.4802501483],[13477987.3882109,1647925.1722339916],[13477977.94831808,1647887.9402036995],[13477973.617989887,1647764.7619437044],[13477972.048385067,1647721.3747136064],[13477964.17809707,1647504.4511873745],[13477963.977721984,1647430.3565944626],[13477963.810742749,1647366.674536631],[13477961.328318104,1647274.908226021],[13477963.777346903,1647272.7567380373],[13477968.99823102,1647270.4556815731],[13477972.215364302,1647269.2246164507],[13477972.315551843,1647266.3482963054],[13477972.39347549,1647262.9772495124],[13477972.371211592,1647262.3329539308],[13477968.686536446,1647260.411572562],[13477964.089041475,1647257.2706320765],[13477962.09642259,1647254.0491550618],[13477959.947956417,1647248.2159816555],[13477959.101928288,1647231.7979643345],[13477954.426509677,1647153.4127211915],[13477954.270662386,1647143.288122184],[13477954.1148151,1647130.8624834972],[13477954.1148151,1647123.959353536]]
			},
			{
				osm_id: '5131460',
				coordinates: [[13472864.186945865,1649663.9784655743],[13472935.531607514,1649647.5243567624],[13472934.084454134,1649640.781627163],[13472940.719095783,1649639.3663445578],[13472945.016028129,1649638.4113165038],[13472951.405766899,1649637.0880849217],[13473100.228794143,1649604.145394104],[13473104.826289114,1649603.1328356552],[13473110.147360772,1649601.959188413],[13473112.529597875,1649601.4298965372],[13473114.477688964,1649609.2311996564],[13473182.816724362,1649593.9392670535],[13473190.72040821,1649628.5043408687],[13473192.75755489,1649637.444782124],[13473205.982310396,1649697.3009454121],[13473124.952853046,1649714.7101176248],[13473104.169504115,1649719.1055615519],[13473110.53697899,1649748.9992031478],[13473057.916255694,1649760.6206823147],[13473016.861627487,1649769.423093369],[13472997.581091683,1649773.5654055164],[13472989.621748092,1649741.1863503635],[13472975.461908862,1649744.6842988806],[13472887.063101225,1649766.5579945315],[13472878.057354417,1649726.032414532],[13472864.186945865,1649663.9784655743]]
			},
			{
				osm_id: '28756784',
				coordinates: [[13477270.858044509,1648759.6282431188],[13477271.403510014,1648748.4904754625],[13477273.819142966,1648739.0786053897],[13477276.980616504,1648739.8495041514],[13477282.001125539,1648727.9523527555],[13477278.828520048,1648726.6061570612],[13477283.849029085,1648717.389896161],[13477291.28517107,1648709.1401373881],[13477299.578473134,1648703.1225326206],[13477310.320803994,1648719.2423528258],[13477306.135191143,1648723.154373558],[13477307.259517998,1648724.8802652503],[13477303.541447006,1648728.5276500825],[13477305.400482502,1648729.6782447763],[13477301.68241151,1648734.6718263552],[13477303.541447006,1648736.0180224797],[13477300.758459736,1648743.1171946852],[13477297.964340517,1648750.2163688892],[13477295.737950701,1648749.6410710672],[13477294.624755792,1648756.5446457958],[13477292.765720299,1648756.3605504453],[13477292.576477163,1648761.7338340443],[13477290.539330482,1648761.7338340443],[13477290.617254125,1648769.7074668482],[13477272.705948057,1648772.1007077775],[13477270.858044509,1648759.6282431188]]
			},
		]
	}: Props = $props();

	// fall back to center user to metro manila
	const FALLBACK_CENTER: [number, number] = [120.9842, 14.5995];

	let container: HTMLDivElement;
	let map = $state<maplibregl.Map | null>(null);
	let ready = $state(false);
	let activeLocationId = $state<string | null>(null);

	// Convert from Web Mercator (EPSG:3857) to WGS84 (EPSG:4326)
	function mercatorToWgs84(x: number, y: number): [number, number] {
		const lng = (x / 20037508.34) * 180;
		const lat = Math.atan(Math.exp((y / 20037508.34) * Math.PI)) * 2 - Math.PI / 2;
		return [lng, lat * (180 / Math.PI)];
	}

	// Convert polygon coordinates from EPSG:3857 to EPSG:4326
	function convertLocationCoordinates(coords: [number, number][]): [number, number][] {
		return coords.map(([x, y]) => mercatorToWgs84(x, y));
	}

	// Fetch routes from API
	async function fetchRoutes(osmId: string): Promise<Route[]> {
		try {
			const response = await fetch(`/api/map/routes?end=${osmId}`);
			if (!response.ok) {
				console.error('Failed to fetch routes:', response.status);
				return [];
			}
			const data = await response.json();
			return data.results || [];
		} catch (error) {
			console.error('Error fetching routes:', error);
			return [];
		}
	}

	// Remove route layers and sources from the map
	function removeRouteLayers() {
		if (!map) return;

		// Remove route layers
		const style = map.getStyle();
		if (style.layers) {
			style.layers.forEach((layer) => {
				if (layer.id.startsWith('route-')) {
					map?.removeLayer(layer.id);
				}
			});
		}

		// Remove route sources
		if (map.getSource('routes')) {
			map.removeSource('routes');
		}
	}

	// Clear all routes and state
	function clearRoutes() {
		removeRouteLayers();
		activeLocationId = null;
	}

	// Display routes on the map
	function displayRoutes(routes: Route[], osmId: string) {
		if (!map) return;

		removeRouteLayers();

		if (routes.length === 0) {
			activeLocationId = null;
			return;
		}

		// Create a GeoJSON FeatureCollection from the routes
		const features = routes.map((route) => ({
			type: 'Feature',
			properties: { route_id: route.route_id },
			geometry: typeof route.geometry === 'string' ? JSON.parse(route.geometry) : route.geometry
		}));

		const geojson = {
			type: 'FeatureCollection',
			features
		};

		// Add routes source
		map.addSource('routes', {
			type: 'geojson',
			data: geojson
		});

		// Add routes layer
		map.addLayer({
			id: 'route-lines',
			type: 'line',
			source: 'routes',
			layout: {
				'line-join': 'round',
				'line-cap': 'round'
			},
			paint: {
				'line-color': '#3b82f6',
				'line-width': 3,
				'line-opacity': 0.8
			}
		});

		// Set active location ID after successfully displaying routes
		activeLocationId = osmId;
	}

	// Handle location click
	async function onLocationClick(e: maplibregl.MapMouseEvent & { features?: maplibregl.GeoJSONFeature[] }) {
		if (!e.features || e.features.length === 0) return;

		const feature = e.features[0];
		const osmId = feature.properties?.osm_id;

		if (!osmId) return;

		const routes = await fetchRoutes(osmId);
		displayRoutes(routes, osmId);
	}

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

				// Add location sources and layers
				if (locations.length > 0) {
					const features = locations.map((location) => ({
						type: 'Feature',
						properties: { osm_id: location.osm_id },
						geometry: {
							type: 'Polygon',
							coordinates: [convertLocationCoordinates(location.coordinates)]
						}
					}));

					const geojson = {
						type: 'FeatureCollection',
						features
					};

					// Add locations source
					instance.addSource('locations', {
						type: 'geojson',
						data: geojson
					});

					// Add locations layer
					instance.addLayer({
						id: 'locations-fill',
						type: 'fill',
						source: 'locations',
						paint: {
							'fill-color': '#10b981',
							'fill-opacity': 0.5
						}
					});

					instance.addLayer({
						id: 'locations-outline',
						type: 'line',
						source: 'locations',
						paint: {
							'line-color': '#059669',
							'line-width': 2
						}
					});

					// Add click handler
					instance.on('click', 'locations-fill', onLocationClick);
					instance.on('click', 'locations-outline', onLocationClick);

					// Change cursor on hover
					instance.on('mouseenter', 'locations-fill', () => {
						instance.getCanvas().style.cursor = 'pointer';
					});
					instance.on('mouseleave', 'locations-fill', () => {
						instance.getCanvas().style.cursor = '';
					});
				}
			});

			map = instance;
			ready = true;
		});

		return () => {
			cancelled = true;
			if (map) {
				clearRoutes();
				map.remove();
				map = null;
			}
		};
	});

	// Handle location updates
	$effect(() => {
		if (!map || !map.isStyleLoaded()) return;

		// Update or create locations source
		try {
			const features = locations.map((location) => ({
				type: 'Feature',
				properties: { osm_id: location.osm_id },
				geometry: {
					type: 'Polygon',
					coordinates: [convertLocationCoordinates(location.coordinates)]
				}
			}));

			const geojson = {
				type: 'FeatureCollection',
				features
			};

			const source = map.getSource('locations');
			if (source && source.type === 'geojson') {
				source.setData(geojson);
			}
		} catch (error) {
			console.error('Error updating locations:', error);
		}
	});
</script>

{#if !ready}
	<div class="absolute inset-0 flex items-center justify-center bg-white">
		<p class="text-sm text-muted-foreground">Loading map...</p>
	</div>
{/if}
{#if activeLocationId}
	<button
		onclick={() => clearRoutes()}
		class="absolute top-4 left-4 z-10 rounded-lg bg-white px-4 py-2 shadow-md hover:bg-gray-50 text-black"
	>
		Clear Routes
	</button>
{/if}
<div bind:this={container} class="absolute inset-0 h-full w-full"></div>
