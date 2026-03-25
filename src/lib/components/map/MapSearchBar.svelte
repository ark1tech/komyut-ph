<script lang="ts">
	import { Search } from '@lucide/svelte';

	interface SearchPayload {
		start: string;
		end: string;
	}

	interface Props {
		onSearch?: (payload: SearchPayload) => void;
		loading?: boolean;
		errorMessage?: string | null;
	}

	let { onSearch, loading = false, errorMessage = null }: Props = $props();

	let startOsmId = $state('');
	let endOsmId = $state('');
	let submitted = $state(false);

	const digitsOnly = /^\d+$/;

	function sanitizeToDigits(value: string): string {
		return value.replace(/\D/g, '');
	}

	function onStartInput(event: Event) {
		const target = event.target as HTMLInputElement;
		startOsmId = sanitizeToDigits(target.value);
	}

	function onEndInput(event: Event) {
		const target = event.target as HTMLInputElement;
		endOsmId = sanitizeToDigits(target.value);
	}

	const startError = $derived.by(() => {
		if (!submitted && startOsmId.length === 0) return null;
		if (startOsmId.length === 0) return 'Start OSM ID is required.';
		if (!digitsOnly.test(startOsmId)) return 'Start OSM ID must contain digits only.';
		return null;
	});

	const endError = $derived.by(() => {
		if (!submitted && endOsmId.length === 0) return null;
		if (endOsmId.length === 0) return 'End OSM ID is required.';
		if (!digitsOnly.test(endOsmId)) return 'End OSM ID must contain digits only.';
		return null;
	});

	function submitSearch() {
		submitted = true;
		if (startError || endError) return;

		onSearch?.({
			start: startOsmId,
			end: endOsmId
		});
	}
</script>

<section aria-label="Search Bar" class="absolute right-0 bottom-5 left-0 z-10 px-4 md:px-6">
	<div class="rounded-xl border border-border bg-background/95 p-3 shadow-lg backdrop-blur-sm">
		<div class="grid gap-3 md:grid-cols-2">
			<div class="space-y-1.5">
				<label for="start-osm-id" class="text-xs font-medium text-foreground">Start OSM ID</label>
				<div class="relative">
					<Search class="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
					<input
						id="start-osm-id"
						type="text"
						inputmode="numeric"
						value={startOsmId}
						oninput={onStartInput}
						placeholder="e.g. 371357222"
						class="w-full rounded-lg border border-border bg-background py-2 pr-3 pl-10 text-sm text-foreground shadow-sm placeholder:text-muted-foreground focus:ring-2 focus:ring-ring focus:outline-none"
					/>
				</div>
				{#if startError}
					<p class="text-xs text-red-600">{startError}</p>
				{/if}
			</div>

			<div class="space-y-1.5">
				<label for="end-osm-id" class="text-xs font-medium text-foreground">End OSM ID</label>
				<div class="relative">
					<Search class="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
					<input
						id="end-osm-id"
						type="text"
						inputmode="numeric"
						value={endOsmId}
						oninput={onEndInput}
						placeholder="e.g. 28756784"
						class="w-full rounded-lg border border-border bg-background py-2 pr-3 pl-10 text-sm text-foreground shadow-sm placeholder:text-muted-foreground focus:ring-2 focus:ring-ring focus:outline-none"
					/>
				</div>
				{#if endError}
					<p class="text-xs text-red-600">{endError}</p>
				{/if}
			</div>
		</div>

		<div class="mt-3 flex items-center justify-between gap-3">
			{#if errorMessage}
				<p class="text-xs text-red-600">{errorMessage}</p>
			{:else}
				<p class="text-xs text-muted-foreground">Search routes by numeric OSM IDs.</p>
			{/if}
			<button
				type="button"
				onclick={submitSearch}
				disabled={loading}
				class="rounded-lg bg-blue-600 px-3 py-2 text-xs font-medium text-white shadow-sm hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
			>
				{loading ? 'Searching...' : 'Search Routes'}
			</button>
		</div>
	</div>
</section>
