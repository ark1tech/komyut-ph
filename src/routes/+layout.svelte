<script lang="ts">
	import './layout.css';
	import { browser } from '$app/environment';
	import { page } from '$app/state';
	import { Sun, Moon } from '@lucide/svelte';

	let { children } = $props();

	let darkMode = $state(
		browser ? document.documentElement.classList.contains('dark') : false
	);

	$effect(() => {
		document.documentElement.classList.toggle('dark', darkMode);
		localStorage.setItem('theme', darkMode ? 'dark' : 'light');
	});

	function toggleDarkMode() {
		darkMode = !darkMode;
	}
</script>

<div class="flex min-h-dvh flex-col bg-background text-foreground">
	<header
		class="sticky top-0 z-50 w-full border-b border-border/40 bg-background/80 backdrop-blur-sm safe-area-pt"
	>
		<div class="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 md:px-6">
			<!-- Brand / Logo -->
			<a href="/" class="font-display text-lg font-bold tracking-tight"> Komyut PH </a>

			<!-- Nav

			<nav class="hidden items-center gap-6 md:flex">
				<a
					href="/"
					class="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
					class:text-foreground={page.url.pathname === '/'}
				>
					Home
				</a>
				<a
					href="/routes"
					class="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
					class:text-foreground={page.url.pathname === '/routes'}
				>
					Routes
				</a>
				<a
					href="/schedule"
					class="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
					class:text-foreground={page.url.pathname === '/schedule'}
				>
					Schedule
				</a>
			</nav>
			-->

			<!-- Action Buttons -->
			<div class="flex items-center gap-2">
				<!-- Dark Mode Toggle -->
				<button
					onclick={toggleDarkMode}
					class="inline-flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
					aria-label={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
				>
					{#if darkMode}
						<Sun class="h-5 w-5" />
					{:else}
						<Moon class="h-5 w-5" />
					{/if}
				</button>

				<!-- More header actions here -->
			</div>
		</div>
	</header>

	<main class="flex-1">
		{@render children()}
	</main>

	<!-- Footer -->
	<footer class="border-t border-border/40 py-6">
		<div class="mx-auto max-w-7xl px-4 text-center text-sm text-muted-foreground md:px-6">
			<!-- TO DO: Add footer content -->
			<p>&copy; {new Date().getFullYear()} Komyut PH. All rights reserved.</p>
		</div>
	</footer>

	<!-- Mobile bottom nav

	<nav class="fixed inset-x-0 bottom-0 z-50 border-t border-border bg-background safe-area-pb md:hidden">
		<div class="flex justify-around">
			<a
				href="/"
				class="flex min-h-14 min-w-14 flex-col items-center justify-center px-3 py-2 text-xs text-muted-foreground hover:text-foreground"
				class:text-foreground={page.url.pathname === '/'}
			>
				<Home class="mb-1 h-5 w-5" />
				Home
			</a>
			<a
				href="/search"
				class="flex min-h-14 min-w-14 flex-col items-center justify-center px-3 py-2 text-xs text-muted-foreground hover:text-foreground"
				class:text-foreground={page.url.pathname === '/search'}
			>
				<Search class="mb-1 h-5 w-5" />
				Search
			</a>
			<a
				href="/profile"
				class="flex min-h-14 min-w-14 flex-col items-center justify-center px-3 py-2 text-xs text-muted-foreground hover:text-foreground"
				class:text-foreground={page.url.pathname === '/profile'}
			>
				<User class="mb-1 h-5 w-5" />
				Profile
			</a>
		</div>
	</nav>
	-->
</div>
