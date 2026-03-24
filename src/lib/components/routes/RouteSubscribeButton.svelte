<script lang="ts">
	import { goto, invalidateAll } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import * as Button from '$lib/components/ui/button';
	import type { RouteSubscriptionDTO, SavedRouteDTO } from '$lib/validation/schemas';

	interface Props {
		routeId: number | null | undefined;
		savedRouteId?: number | null;
		savedRoute?: SavedRouteDTO | null;
		defaultRouteName?: string | null;
		initialSubscription?: RouteSubscriptionDTO | null;
		size?: 'default' | 'sm';
		class?: string;
		onchange?: ((subscription: RouteSubscriptionDTO | null) => void) | undefined;
	}

	let {
		routeId,
		savedRouteId = null,
		savedRoute = null,
		defaultRouteName = null,
		initialSubscription = null,
		size = 'default',
		class: className,
		onchange
	}: Props = $props();

	let subscription = $state<RouteSubscriptionDTO | null>(null);
	let pending = $state(false);
	let errorMessage = $state<string | null>(null);

	let session = $derived(page.data.session);
	let isSubscribed = $derived(
		subscription?.status === 'active' || subscription?.status === 'muted'
	);

	$effect(() => {
		subscription = initialSubscription;
	});

	async function toggleSubscription() {
		if (!routeId || pending) return;
		errorMessage = null;

		if (!session) {
			await goto(resolve('/login'));
			return;
		}

		pending = true;

		try {
			if (isSubscribed) {
				const response = await fetch(`/api/route-subscriptions/${routeId}`, {
					method: 'DELETE'
				});

				if (!response.ok) {
					const body = (await response.json().catch(() => null)) as { message?: string } | null;
					throw new Error(body?.message ?? 'Failed to unsubscribe');
				}

				subscription = null;
				onchange?.(null);
				await invalidateAll();
				return;
			}

			const response = await fetch('/api/route-subscriptions', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					routeId,
					savedRouteId,
					savedRoute,
					routeName: defaultRouteName?.trim() || undefined
				})
			});

			if (!response.ok) {
				const body = (await response.json().catch(() => null)) as { message?: string } | null;
				throw new Error(body?.message ?? 'Failed to subscribe');
			}

			const body = (await response.json()) as { subscription: RouteSubscriptionDTO };
			subscription = body.subscription;
			onchange?.(body.subscription);
			await invalidateAll();
		} catch (err) {
			errorMessage = err instanceof Error ? err.message : 'Something went wrong';
		} finally {
			pending = false;
		}
	}
</script>

<div class={`w-40 space-y-2 sm:w-48 ${className ?? ''}`.trim()}>
	<Button.Root
		variant={isSubscribed ? 'secondary' : 'default'}
		class="w-full"
		{size}
		disabled={!routeId || pending}
		onclick={() => void toggleSubscription()}
	>
		{#if pending}
			{isSubscribed ? 'Unsubscribing...' : 'Subscribing...'}
		{:else if isSubscribed}
			Subscribed
		{:else}
			Subscribe
		{/if}
	</Button.Root>

	{#if errorMessage}
		<p class="text-xs text-destructive" role="alert">{errorMessage}</p>
	{/if}
</div>
