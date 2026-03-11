<script lang="ts">
	import { Skeleton } from '$lib/components/ui/skeleton';
</script>

<div class="pt-safe-area-pt flex min-h-full flex-col overflow-hidden px-4 pb-6" aria-hidden="true">
	<div class="flex-1 space-y-4">
		<div class="space-y-2">
			<Skeleton class="h-7 w-44" />
			<Skeleton class="h-4 w-72" />
		</div>

		<div class="space-y-3">
			{#each Array(4) as _, i (i)}
				<div class="rounded-2xl bg-card p-4">
					<div class="flex items-center justify-between">
						<div class="flex items-center gap-3">
							<Skeleton class="size-9 rounded-full" />
							<div class="space-y-2">
								<Skeleton class="h-3 w-32" />
								<Skeleton class="h-3 w-20" />
							</div>
						</div>
						<Skeleton class="h-3 w-12" />
					</div>

					<div class="mt-3 space-y-2">
						<Skeleton class="h-4 w-4/5" />
						<Skeleton class="h-4 w-3/5" />
					</div>

					<div class="mt-4 flex items-center gap-2">
						<Skeleton class="h-7 w-16 rounded-full" />
						<Skeleton class="h-7 w-16 rounded-full" />
						<Skeleton class="h-7 w-20 rounded-full" />
					</div>
				</div>
			{/each}
		</div>
	</div>
</div>
