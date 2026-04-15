<script lang="ts">
	import { Flag, X, Save } from '@lucide/svelte';
	import RouteTraceSaveDrawer from '$lib/components/map/RouteTraceSaveDrawer.svelte';
	import type { RouteMetadataInput, RouteVehicleType } from '$lib/validation/schemas';

	interface RideLeg {
		type: 'ride';
		route_id: number;
		route_name: string;
		mode: string;
		board: [number, number];
		alight: [number, number];
		geometry: GeoJSON.LineString;
	}

	interface WalkLeg {
		type: 'walk';
		distance_m: number;
		from: [number, number];
		to: [number, number];
		geometry?: GeoJSON.LineString;
	}

	type ItineraryLeg = WalkLeg | RideLeg;

	interface Props {
		itinerary: ItineraryLeg[];
		fromName: string;
		toName: string;
		ondismiss?: () => void;
		onsaved?: () => void;
	}

	let { itinerary, fromName, toName, ondismiss, onsaved }: Props = $props();

	const rideLegs = $derived(itinerary.filter((l): l is RideLeg => l.type === 'ride'));
	const showSavePrompt = $derived(rideLegs.length >= 2);

	const itineraryVehicleTypes = $derived.by((): RouteVehicleType[] => {
		const ordered: RouteVehicleType[] = [];
		const seen = new Set<RouteVehicleType>();
		for (const leg of itinerary) {
			const mode: RouteVehicleType =
				leg.type === 'walk' ? 'Walk' : (leg.mode as RouteVehicleType);
			if (!seen.has(mode)) {
				seen.add(mode);
				ordered.push(mode);
			}
		}
		return ordered.length > 0 ? ordered : ['Walk'];
	});

	let saving = $state(false);
	let saveError = $state<string | null>(null);
	let drawerOpen = $state(false);

	// Build the concatenated geometry from all itinerary legs
	const prefillGeometry = $derived((): GeoJSON.LineString => {
		const coords: [number, number][] = [];
		for (const leg of itinerary) {
			if (leg.type === 'walk') {
				if (coords.length === 0) coords.push(leg.from);
				coords.push(leg.to);
			} else {
				const geomCoords = leg.geometry.coordinates as [number, number][];
				if (coords.length === 0 && geomCoords.length > 0) {
					coords.push(geomCoords[0]);
				}
				coords.push(...geomCoords.slice(1));
			}
		}
		return { type: 'LineString', coordinates: coords };
	});

	function openSaveDrawer() {
		drawerOpen = true;
	}

	async function handleSave(metadata: RouteMetadataInput) {
		saving = true;
		saveError = null;
		try {
			const res = await fetch('/api/map/routes', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					...metadata,
					start_loc_osmid: 0,
					end_loc_osmid: 0,
					geometry: prefillGeometry()
				})
			});
			if (!res.ok) {
				const body = (await res.json().catch(() => null)) as {
					message?: string;
					error?: string;
				} | null;
				throw new Error(body?.message ?? body?.error ?? 'Failed to save route');
			}
			drawerOpen = false;
			onsaved?.();
		} catch (err) {
			saveError = err instanceof Error ? err.message : 'Error saving route';
			throw err;
		} finally {
			saving = false;
		}
	}
</script>

<!-- Overlay prompt -->
<div
	class="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/45 backdrop-blur-[4px] animate-in fade-in duration-200"
	role="dialog"
	aria-modal="true"
	aria-label="You've arrived"
>
	<div
		class="w-full max-w-[22rem] rounded-[1.5rem] bg-card border border-border p-7 px-6 shadow-[0_20px_60px_rgba(0,0,0,0.3)] flex flex-col items-center gap-3 animate-in fade-in slide-in-from-bottom-6 duration-300 ease-out"
	>
		<!-- Arrived badge -->
		<div
			class="grid place-items-center w-14 h-14 rounded-full bg-success/15 text-success border-2 border-success/30 mb-1"
			aria-hidden="true"
		>
			<Flag class="size-5" />
		</div>

		<h2 class="text-[1.1rem] font-bold text-foreground text-center tracking-tight m-0">
			You've arrived!
		</h2>

		{#if showSavePrompt}
			<p class="text-[0.85rem] text-muted-foreground text-center leading-relaxed m-0">
				Your route combined <strong>{rideLegs.length}</strong> recorded routes. Want to save this as
				a new route so others can use it?
			</p>

			<div class="flex flex-col gap-2 w-full mt-1">
				<button
					type="button"
					class="flex items-center justify-center gap-2 w-full py-[0.7rem] px-4 rounded-[0.875rem] text-[0.8125rem] font-semibold border-none cursor-pointer transition-all bg-success text-white hover:opacity-90 hover:-translate-y-0.5 active:translate-y-0"
					onclick={openSaveDrawer}
				>
					<Save class="size-4" />
					Save combined route
				</button>
				<button
					type="button"
					class="flex items-center justify-center gap-2 w-full py-[0.7rem] px-4 rounded-[0.875rem] text-[0.8125rem] font-semibold border-none cursor-pointer transition-all bg-muted text-muted-foreground hover:opacity-90 hover:-translate-y-0.5 active:translate-y-0"
					onclick={ondismiss}
				>
					<X class="size-4" />
					Skip
				</button>
			</div>
		{:else}
			<p class="text-[0.85rem] text-muted-foreground text-center leading-relaxed m-0">
				Great commute! Navigation has ended.
			</p>
			<button
				type="button"
				class="flex items-center justify-center gap-2 w-full py-[0.7rem] px-4 rounded-[0.875rem] text-[0.8125rem] font-semibold border-none cursor-pointer transition-all bg-success text-white hover:opacity-90 hover:-translate-y-0.5 active:translate-y-0"
				onclick={ondismiss}
			>
				Done
			</button>
		{/if}
	</div>
</div>

<!-- Route save drawer (reusing existing component) -->
<RouteTraceSaveDrawer
	bind:open={drawerOpen}
	{saving}
	errorMessage={saveError}
	traceVehicleTypes={itineraryVehicleTypes}
	onsave={handleSave}
/>

