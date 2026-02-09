<script lang="ts">
	import { page } from '$app/state';
</script>

<svelte:head>
	<title>Error {page.status} | Komyut PH</title>
</svelte:head>

<div class="mx-auto flex min-h-[50dvh] max-w-7xl flex-col items-center justify-center px-4 text-center">
	<!-- Error Code -->
	<p class="font-display text-fluid-5xl font-bold text-muted-foreground/30">
		{page.status}
	</p>

	<!-- Error Title -->
	<h1 class="mt-4 text-fluid-xl font-semibold">
		{#if page.status === 404}
			Page not found
		{:else if page.status === 500}
			Something went wrong
		{:else if page.status === 403}
			Access denied
		{:else}
			An error occurred
		{/if}
	</h1>

	<!-- Error Description -->
	<p class="mt-2 max-w-md text-muted-foreground">
		{page.error?.message ?? 'An unexpected error occurred. Please try again later.'}
	</p>

	<!-- Navigation -->
	<div class="mt-6 flex flex-col gap-3 sm:flex-row">
		<a
			href="/"
			class="inline-flex min-h-11 items-center justify-center rounded-lg bg-primary px-6 py-3 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
		>
			Go back home
		</a>
		<!-- TO DO: Add additional actions for specific error codes
		     Example: "Report this issue" button for 500 errors
		     Example: "Search" link for 404 errors -->
	</div>
</div>
