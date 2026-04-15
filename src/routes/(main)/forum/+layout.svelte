<script lang="ts">
	import { page } from '$app/state';
	import { ArrowLeft, Bell } from '@lucide/svelte';
	import * as Button from '$lib/components/ui/button';
	import CirclePlusIcon from '@lucide/svelte/icons/plus-circle';
	import UnifiedSearchBar from '$lib/components/shared/UnifiedSearchBar.svelte';
	import iconBlue from '$lib/images/komyut_icon_blue.svg';
	import textBlue from '$lib/images/komyut_text_blue.svg';
	import { resolve } from '$app/paths';
	import { enhance } from '$app/forms';
	let { children, data } = $props();

	let isPostRoute = $derived(/^\/forum\/.+\/.+/.test(page.url.pathname));

	let unreadForum = $derived(data.unreadForum);

	let isPostModalOpen = $state(false);
</script>

<div class="flex flex-col">
	<div
		class="sticky top-0 z-30 flex flex-row items-center gap-fluid-sm border-b bg-background/95 px-fluid-sm py-fluid-sm backdrop-blur-sm"
	>
		<div class="relative flex shrink-0 items-center">
			<div
				class="overflow-hidden transition-all ease-[cubic-bezier(0.65,0,0.25,1)] {isPostRoute
					? 'max-w-0 opacity-0 duration-200'
					: 'max-w-40 opacity-100 delay-300 duration-200'}"
			>
				<a
					href={resolve('/forum')}
					class="flex shrink-0 cursor-default items-center gap-1.5"
					aria-label="Komyut PH home"
					tabindex={isPostRoute ? -1 : 0}
				>
					<img src={iconBlue} class="h-7 w-7" alt="Komyut logo" />
					<img src={textBlue} class="hidden h-5 sm:block" alt="Komyut" />
				</a>
			</div>
			<div
				class=" flex flex-row items-center overflow-hidden transition-all ease-[cubic-bezier(0.65,0,0.25,1)] {isPostRoute
					? 'max-w-10 opacity-100 delay-300 duration-200'
					: 'max-w-0 opacity-0 duration-200'}"
			>
				<button
					onclick={() => history.back()}
					class="shrink-0 cursor-pointer rounded-full text-muted-foreground hover:bg-muted/50 hover:text-foreground"
					aria-label="Go back"
					tabindex={isPostRoute ? 0 : -1}
				>
					<ArrowLeft class="size-6" />
				</button>
			</div>
		</div>

		<div class="flex-1">
			<UnifiedSearchBar />
		</div>

		<a
			href={resolve('/notifications?scope=forum')}
			class="relative grid size-9 shrink-0 place-items-center rounded-full text-muted-foreground hover:bg-muted/50 hover:text-foreground"
			aria-label="Forum notifications"
		>
			<Bell class="size-5" />
			{#if unreadForum > 0}
				<span
					class="absolute -top-1 -right-1 grid min-w-4 place-items-center rounded-full bg-destructive px-1 text-[10px] leading-4 font-semibold text-white"
					aria-label={`${unreadForum} unread forum notifications`}
				>
					{unreadForum > 9 ? '9+' : unreadForum}
				</span>
			{/if}
		</a>

	</div>
	
	{@render children()}
	<Button.Root
		variant="default"
		size="sm"
		class="width-20 height-20 fixed bottom-18 right-6 z-20 shadow-md"
		onclick={() => (isPostModalOpen = true)} 
	>
		<CirclePlusIcon />
	</Button.Root>

	{#if isPostModalOpen}
		<div
			class="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
			onclick={(e) => {
				if (e.target === e.currentTarget) {
					isPostModalOpen = false;
				}
			}}
			onkeydown={(e) => {
				if (e.key === 'Escape') isPostModalOpen = false;
			}}
			aria-label="Close modal"
			role="presentation"
		>
			<div
				class="absolute left-1/2 top-1/2 w-[92vw] max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-xl bg-background p-4 shadow-xl sm:p-6"
			>
				<!-- Close button -->
				<button
					class="absolute right-2 top-1 rounded-full text-muted-foreground hover:bg-muted"
					onclick={() => (isPostModalOpen = false)}
				>
					✕
				</button>

				<!-- Form -->
				<form
					method="POST"
					action="?/createPost"
					class="flex flex-col gap-3"
					use:enhance={() => {
						return async ({ result }) => {
							if (result.type === 'success') {
								isPostModalOpen = false;
							}
						}
					}}
				>
					<input
						name="title"
						placeholder="Title"
						class="rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
						required
					/>

					<textarea
						name="body"
						placeholder="What’s happening?"
						rows="5"
						class="min-h-32 resize-none rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
						required
					></textarea>

					<button
						type="submit"
						class="rounded-md bg-primary px-4 py-2 text-sm font-medium text-white hover:opacity-90"
					>
						Post
					</button>
				</form>
			</div>
		</div>
	{/if}
</div>
