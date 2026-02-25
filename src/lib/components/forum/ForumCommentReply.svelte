<script lang="ts">
	import { SendHorizontal } from '@lucide/svelte';

	let replyText = $state('');
</script>

<div class="mt-2 flex items-center gap-2 rounded-xl border border-border bg-card/50 px-2.5 py-1.5">
	<div
		class="grid size-5 shrink-0 place-items-center rounded-full bg-brand/10 text-[8px] font-semibold text-brand"
	>
		Y
	</div>
	<input
		type="text"
		bind:value={replyText}
		placeholder="Reply..."
		class="min-w-0 flex-1 bg-transparent text-xs text-foreground placeholder:text-muted-foreground focus:outline-none"
	/>
	<button
		type="button"
		class="shrink-0 rounded-full p-1 text-brand transition-opacity disabled:opacity-30"
		disabled={!replyText.trim()}
		aria-label="Send reply"
	>
		<SendHorizontal class="size-3" />
	</button>
</div>
