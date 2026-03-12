<script lang="ts">
	import { Clock, Star } from '@lucide/svelte';
	import { cn } from '$lib/utils';

	type ViewOption = 'recent' | 'saved';

	interface Props {
		active?: ViewOption;
		onchange?: (value: ViewOption) => void;
		class?: string;
	}

	let { active = 'recent', onchange, class: className }: Props = $props();

	const viewOptions: { value: ViewOption; label: string; icon: typeof Clock }[] = [
		{ value: 'recent', label: 'Recents', icon: Clock },
		{ value: 'saved', label: 'Saved', icon: Star }
	];
</script>

<div class={cn('flex gap-2', className)} role="radiogroup" aria-label="Routes list">
	{#each viewOptions as opt (opt.value)}
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
