<script lang="ts">
	/* eslint-disable svelte/no-navigation-without-resolve */

	import { goto } from '$app/navigation';
	import iconBlue from '$lib/images/komyut_icon_blue.svg';
	import textBlue from '$lib/images/komyut_text_blue.svg';

	let { data } = $props();
	let { supabase, session } = $derived(data);

	function handleOAuthLogin() {
		console.log('Login button clicked');

		supabase.auth.signInWithOAuth({
			provider: 'google',
			options: {
				redirectTo: `http://localhost:5173/auth/callback`,
				queryParams: {
					prompt: 'select_account'
				}
			}
		});

		// TODO: no input validation yet, this is just a simple
		// redirect to the map page
	}

	function handleGuestLogin() {
		goto('/map');
	}
</script>

<svelte:head>
	<title>Komyut PH</title>
	<meta name="description" content="Your commute companion for the Philippines" />
</svelte:head>

<div
	class="loginbg mx-auto flex h-screen min-h-dvh max-w-7xl flex-col items-center justify-center px-fluid-sm py-fluid-lg"
>
	<div class="flex w-full flex-col items-center gap-fluid-xl">
		<section aria-label="Logo" class="flex w-full flex-col items-center gap-fluid-sm text-center">
			<img src={iconBlue} class="w-[40%] max-w-40 sm:max-w-48" alt="Komyut Logo (Blue)" />
			<img src={textBlue} class="w-[50%] max-w-52 sm:max-w-60" alt="Komyut Text (Blue)" />
			<p class="text-foreground/90">Ang Komyut ng Komyuniti</p>
		</section>

		<section
			class="flex w-full max-w-sm flex-col items-center gap-fluid-md px-fluid-sm"
			aria-label="Input fields"
		>
			<form class="flex w-full flex-col gap-fluid-md">
				<input
					name="email"
					type="email"
					placeholder="Email"
					class="rounded-xl border border-input bg-background/95 px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground"
				/>
				<input
					name="password"
					type="password"
					placeholder="Password"
					class="rounded-xl border border-input bg-background/95 px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground"
				/>
			</form>

			<!-- TODO: yung brand color sa styles is different from the logo so hardcoded lang muna bg color here -->
			<!-- also, since wala pa input validation I put the button outside the form element para instant redirect na muna to map page for testing -->
			{#if session}
				<button
					aria-label="Continue button"
					type="button"
					onclick={handleGuestLogin}
					class="w-full rounded-xl bg-[#2b59ff] px-4 py-3 font-bold text-white"
					><p class="text-sm">Continue from last Log In</p></button
				>
			{/if}
			
			<button
				aria-label="Login button"
				type="button"
				onclick={handleOAuthLogin}
				class="w-full rounded-xl bg-[#2b59ff] px-4 py-3 font-bold text-white"
				><p class="text-sm">Log In</p></button
			>

			<button
				aria-label="Log in as guest"
				type="button"
				onclick={handleGuestLogin}
				class="w-full rounded-xl border border-input bg-background/95 px-4 py-3 text-sm font-semibold text-foreground hover:bg-background"
			>
				Log In as Guest
			</button>

			<button class="text-muted-foreground underline underline-offset-4 hover:text-foreground">
				<p class="text-sm">Create Account</p>
			</button>
		</section>
	</div>
</div>

<style>
	/* Light mode: soft blue gradient; dark mode: bold blue/black (matches .dark from layout.css) */
	.loginbg {
		background: radial-gradient(ellipse 160% 80% at 50% 30%, white 60%, #2b59ff 100%);
	}

	:global(.dark) .loginbg {
		background: radial-gradient(ellipse 120% 80% at 50% 30%, rgb(1, 0, 38) 60%, #2b59ff 100%);
	}
</style>
