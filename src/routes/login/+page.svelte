<script lang="ts">
	import iconBlue from '$lib/images/komyut_icon_blue.svg';
	import textBlue from '$lib/images/komyut_text_blue.svg';
	import { goto } from '$app/navigation';

	function onc() {
		console.log('Login button clicked');

		// TODO: no input validation yet, this is just a simple
		// redirect to the map page
		goto('/map');
	}
</script>

<svelte:head>
	<title>Komyut PH</title>
	<meta name="description" content="Your commute companion for the Philippines" />
</svelte:head>

<div class="loginbg mx-auto h-screen max-w-7xl px-4 py-fluid-lg md:px-6">
	<section aria-label="Logo" class="mt-24">
		<div class="flex flex-col justify-center gap-2 text-center">
			<img src={iconBlue} class="mx-auto w-[40%]" alt="Komyut Logo (Blue)" />
			<img src={textBlue} class="mx-auto w-[50%]" alt="Komyut Text (Blue)" />
			<p class="text-center">Ang Komyut ng Komyuniti</p>
		</div>
	</section>

	<section class="mt-12 flex flex-col">
		<form class="mx-auto flex w-[85%] flex-col gap-6">
			<input
				name="email"
				type="email"
				placeholder="Email"
				class="rounded-xl border border-solid px-4 py-3"
			/>
			<input
				name="password"
				type="password"
				placeholder="Password"
				class="rounded-xl border border-solid px-4 py-3"
			/>
		</form>

		<!-- TODO: yung brand color sa styles is different from the logo so hardcoded lang muna bg color here -->
		<!-- also, since wala pa input validation I put the button outside the form element para instant redirect na muna to map page for testing -->
		<button
			aria-label="Login button"
			onclick={onc}
			class="mx-auto mt-6 w-[85%] rounded-xl bg-[#2b59ff] px-4 py-3 font-bold text-white"
			>Log In</button
		>

		<button class="mt-4 text-muted-foreground underline underline-offset-4">Create Account</button>
	</section>
</div>

<style>
	/* 
		TODO: there's probably a better way to do this in tailwind, 
		or with some overlay components with z-index lang
	*/
	.loginbg {
		background: radial-gradient(
			ellipse 100% 80% at 50% 30%,
			black 60%,
			/* #2b59ff 90%, */ #2b59ff 100%
		);
	}
</style>
