<script lang="ts">
	import { Flag, X, Save } from '@lucide/svelte';
	import RouteTraceSaveDrawer from '$lib/components/map/RouteTraceSaveDrawer.svelte';
	import type { RouteMetadataInput } from '$lib/validation/schemas';

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
				const body = await res.json().catch(() => null) as { message?: string } | null;
				throw new Error(body?.message ?? 'Failed to save route');
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
	class="arrived-overlay"
	role="dialog"
	aria-modal="true"
	aria-label="You've arrived"
>
	<div class="arrived-card">
		<!-- Arrived badge -->
		<div class="arrived-badge" aria-hidden="true">
			<Flag class="size-5" />
		</div>

		<h2 class="arrived-title">You've arrived!</h2>

		{#if showSavePrompt}
			<p class="arrived-body">
				Your route combined <strong>{rideLegs.length}</strong> recorded routes.
				Want to save this as a new route so others can use it?
			</p>

			<div class="arrived-actions">
				<button type="button" class="arrived-btn arrived-btn--save" onclick={openSaveDrawer}>
					<Save class="size-4" />
					Save combined route
				</button>
				<button type="button" class="arrived-btn arrived-btn--skip" onclick={ondismiss}>
					<X class="size-4" />
					Skip
				</button>
			</div>
		{:else}
			<p class="arrived-body">Great commute! Navigation has ended.</p>
			<button type="button" class="arrived-btn arrived-btn--save" onclick={ondismiss}>
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
	onsave={handleSave}
/>

<style>
	.arrived-overlay {
		position: fixed;
		inset: 0;
		z-index: 60;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 1rem;
		background: rgba(0, 0, 0, 0.45);
		backdrop-filter: blur(4px);
		-webkit-backdrop-filter: blur(4px);
		animation: fadeIn 200ms ease-out;
	}

	@keyframes fadeIn {
		from { opacity: 0; }
		to { opacity: 1; }
	}

	.arrived-card {
		width: 100%;
		max-width: 22rem;
		border-radius: 1.5rem;
		background: var(--card);
		border: 1px solid var(--border);
		padding: 1.75rem 1.5rem;
		box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.75rem;
		animation: slideUp 250ms cubic-bezier(0.34, 1.56, 0.64, 1);
	}

	@keyframes slideUp {
		from { transform: translateY(1.5rem) scale(0.96); opacity: 0; }
		to { transform: translateY(0) scale(1); opacity: 1; }
	}

	.arrived-badge {
		display: grid;
		place-items: center;
		width: 3.5rem;
		height: 3.5rem;
		border-radius: 50%;
		background: color-mix(in srgb, #16a34a 15%, transparent);
		color: #16a34a;
		border: 2px solid color-mix(in srgb, #16a34a 30%, transparent);
		margin-bottom: 0.25rem;
	}

	.arrived-title {
		font-size: 1.1rem;
		font-weight: 700;
		color: var(--foreground);
		text-align: center;
		letter-spacing: -0.02em;
		margin: 0;
	}

	.arrived-body {
		font-size: 0.85rem;
		color: var(--muted-foreground);
		text-align: center;
		line-height: 1.5;
		margin: 0;
	}

	.arrived-actions {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		width: 100%;
		margin-top: 0.25rem;
	}

	.arrived-btn {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.5rem;
		width: 100%;
		padding: 0.7rem 1rem;
		border-radius: 0.875rem;
		font-size: 0.8125rem;
		font-weight: 600;
		border: none;
		cursor: pointer;
		transition: opacity 150ms, transform 120ms;
	}

	.arrived-btn:hover {
		opacity: 0.9;
		transform: translateY(-1px);
	}

	.arrived-btn:active {
		transform: translateY(0);
	}

	.arrived-btn--save {
		background: #16a34a;
		color: white;
	}

	.arrived-btn--skip {
		background: var(--muted);
		color: var(--muted-foreground);
	}
</style>
