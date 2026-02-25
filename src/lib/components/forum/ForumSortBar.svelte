<script lang="ts">
	import { ArrowBigUp, Flame, Clock } from '@lucide/svelte';
	import { cn } from '$lib/utils';

	type SortOption = 'top' | 'hot' | 'latest';

	interface Props {
		active?: SortOption;
		onchange?: (value: SortOption) => void;
		class?: string;
	}

	let { active = 'hot', onchange, class: className }: Props = $props();

	const sortOptions: { value: SortOption; label: string; icon: typeof ArrowBigUp }[] = [
		{ value: 'top', label: 'Top', icon: ArrowBigUp },
		{ value: 'hot', label: 'Hot', icon: Flame },
		{ value: 'latest', label: 'Latest', icon: Clock }
	];
</script>

<div class={cn('flex gap-2', className)} role="radiogroup" aria-label="Sort by">
	{#each sortOptions as opt (opt.value)}
		<button
			type="button"
			role="radio"
			aria-checked={active === opt.value}
			onclick={() => onchange?.(opt.value)}
			class="flex cursor-pointer items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors
				{active === opt.value
				? 'bg-primary text-background'
				: 'bg-card text-muted-foreground hover:bg-muted/50 hover:text-foreground'}"
		>
			<opt.icon class="size-3.5" />
			{opt.label}
		</button>
	{/each}
</div>
