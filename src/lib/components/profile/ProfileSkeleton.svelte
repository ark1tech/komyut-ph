<script lang="ts">
	import { Skeleton } from '$lib/components/ui/skeleton';
</script>

<div class="bg-brand px-4 pb-8" aria-hidden="true">
	<div class="mb-6 h-6"></div>

	<div class="flex flex-col items-center">
		<Skeleton class="mb-3 h-20 w-20 rounded-full bg-white/20" />
		<Skeleton class="h-6 w-36 rounded bg-white/20" />
		<Skeleton class="mt-1 h-4 w-24 rounded bg-white/20" />
	</div>

	<div class="mt-6 flex gap-8 rounded-2xl bg-white/10 px-6 py-4">
		{#each Array(3) as _, i (i)}
			<div class="flex flex-1 flex-col items-center gap-1">
				<Skeleton class="h-8 w-12 rounded bg-white/20" />
				<Skeleton class="h-3 w-16 rounded bg-white/20" />
			</div>
		{/each}
	</div>
</div>

<div class="space-y-3 px-fluid-sm py-fluid-sm" aria-hidden="true">
	{#each Array(3) as _, i (i)}
		<div class="animate-pulse rounded-2xl bg-card p-4">
			<div class="flex items-center gap-3">
				<Skeleton class="size-9 rounded-full" />
				<div class="flex-1 space-y-2">
					<Skeleton class="h-3 w-32 rounded" />
					<Skeleton class="h-3 w-20 rounded" />
				</div>
			</div>
			<div class="mt-3 space-y-2">
				<Skeleton class="h-3 w-4/5 rounded" />
				<Skeleton class="h-3 w-3/5 rounded" />
			</div>
			<div class="mt-4 flex gap-2">
				<Skeleton class="h-7 w-24 rounded-full" />
				<Skeleton class="h-7 w-16 rounded-full" />
				<Skeleton class="h-7 w-20 rounded-full" />
			</div>
		</div>
	{/each}
</div>
