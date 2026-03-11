<script lang="ts">
	import { Skeleton } from '$lib/components/ui/skeleton';
</script>

<div class="px-4 pt-safe-area-pt pb-6" aria-hidden="true">
	<div class="mx-auto max-w-3xl space-y-6">
		<div class="space-y-2">
			<Skeleton class="h-7 w-40" />
			<Skeleton class="h-4 w-64" />
		</div>

		<div class="space-y-3">
			<div class="space-y-2">
				<Skeleton class="h-4 w-28" />
				<div class="grid gap-3 sm:grid-cols-2">
					{#each Array(2) as _, i (i)}
						<div class="rounded-2xl bg-card p-4">
							<Skeleton class="h-4 w-40" />
							<div class="mt-3 space-y-2">
								<Skeleton class="h-3 w-4/5" />
								<Skeleton class="h-3 w-3/5" />
							</div>
							<div class="mt-4 flex items-center gap-2">
								<Skeleton class="h-7 w-20 rounded-full" />
								<Skeleton class="h-7 w-16 rounded-full" />
							</div>
						</div>
					{/each}
				</div>
			</div>

			<div class="space-y-2">
				<Skeleton class="h-4 w-24" />
				<div class="space-y-3">
					{#each Array(4) as _, i (i)}
						<div class="rounded-2xl bg-card p-4">
							<div class="flex items-start justify-between gap-3">
								<div class="min-w-0 flex-1 space-y-2">
									<Skeleton class="h-4 w-48" />
									<Skeleton class="h-3 w-4/5" />
								</div>
								<Skeleton class="h-6 w-16 rounded-full" />
							</div>
							<div class="mt-4 flex items-center gap-2">
								<Skeleton class="h-7 w-20 rounded-full" />
								<Skeleton class="h-7 w-16 rounded-full" />
								<Skeleton class="h-7 w-24 rounded-full" />
							</div>
						</div>
					{/each}
				</div>
			</div>
		</div>
	</div>
</div>

