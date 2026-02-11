<script lang="ts">
	import iconBlue from '$lib/images/komyut_icon_blue.svg';
	import textBlue from '$lib/images/komyut_text_blue.svg';
	import { goto } from '$app/navigation';

	function onc() {
		console.log("Login button clicked");

		// TODO: no input validation yet, this is just a simple
		// redirect to the map page
		goto('/map');
	}
</script>

<svelte:head>
	<title>Komyut PH</title>
	<meta name="description" content="Your commute companion for the Philippines" />
</svelte:head>

<div class="loginbg h-screen mx-auto max-w-7xl px-4 py-fluid-lg md:px-6">

	<section aria-label="Logo" class="mt-24">
		<div class="flex flex-col gap-2 justify-center text-center">
			<img src={iconBlue} class="w-[40%] mx-auto" alt="Komyut Logo (Blue)" />
			<img src={textBlue} class="w-[50%] mx-auto" alt="Komyut Text (Blue)" />
			<p class="text-center">Ang Komyut ng Komyuniti</p>
		</div>
	</section>

	<section class="flex flex-col mt-12">
		<form class="w-[85%] mx-auto flex flex-col gap-6">
			<input name="email" type="email" placeholder="Email" class="rounded-xl border border-solid py-3 px-4" />
			<input name="password" type="password" placeholder="Password" class="rounded-xl border border-solid py-3 px-4" />
		</form>

		<!-- TODO: yung brand color sa styles is different from the logo so hardcoded lang muna bg color here -->
		 <!-- also, since wala pa input validation I put the button outside the form element para instant redirect na muna to map page for testing -->
		<button aria-label="Login button" onclick={onc} class="mx-auto w-[85%] font-bold text-white bg-[#2b59ff] rounded-xl mt-6 py-3 px-4">Log In</button>

		<button class="underline underline-offset-4 text-muted-foreground mt-4">Create Account</button>
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
			/* #2b59ff 90%, */
			#2b59ff 100%
		);
	}
</style>