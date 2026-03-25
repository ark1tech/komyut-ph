<script lang="ts">
	/** Browser-test stub: avoids MapLibre WebGL init in headless Chromium. */
	let {
		..._rest
	}: {
		selectedRoute?: unknown;
		controlsHidden?: boolean;
		tracingActive?: boolean;
		onTraceSessionEnd?: () => void | Promise<void>;
	} = $props();
</script>

<div class="map-stub" role="presentation" data-testid="map-stub"></div>
