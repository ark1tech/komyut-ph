<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import * as Button from '$lib/components/ui/button';
	import {
		defaultRouteSubscriptionAlertTypes,
		routeChangeTypes,
		type RouteChangeType
	} from '$lib/types/routeSubscriptions';
	import type { RouteSubscriptionDTO } from '$lib/validation/schemas';

	interface Props {
		routeId: number | null | undefined;
		subscription?: RouteSubscriptionDTO | null;
		class?: string;
		onchange?: ((subscription: RouteSubscriptionDTO | null) => void) | undefined;
	}

	type PreferenceForm = {
		notifyInApp: boolean;
		notifyPush: boolean;
		notifyEmail: boolean;
		alertTypes: RouteChangeType[];
	};

	function toForm(subscription: RouteSubscriptionDTO | null | undefined): PreferenceForm {
		return {
			notifyInApp: subscription?.notify_in_app ?? true,
			notifyPush: subscription?.notify_push ?? true,
			notifyEmail: subscription?.notify_email ?? false,
			alertTypes: subscription?.alert_types?.length
				? [...subscription.alert_types]
				: [...defaultRouteSubscriptionAlertTypes]
		};
	}

	let { routeId, subscription = null, class: className, onchange }: Props = $props();

	let form = $derived(toForm(subscription));
	let saving = $state(false);
	let unsubscribing = $state(false);
	let errorMessage = $state<string | null>(null);
	let successMessage = $state<string | null>(null);

	let session = $derived(page.data.session);

	function toggleAlertType(type: RouteChangeType) {
		if (form.alertTypes.includes(type)) {
			if (form.alertTypes.length === 1) return;
			form = {
				...form,
				alertTypes: form.alertTypes.filter((value) => value !== type)
			};
			return;
		}

		form = {
			...form,
			alertTypes: [...form.alertTypes, type]
		};
	}

	async function savePreferences() {
		if (!routeId || !subscription || saving) return;

		errorMessage = null;
		successMessage = null;
		saving = true;

		try {
			const response = await fetch(`/api/route-subscriptions/${routeId}`, {
				method: 'PATCH',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					notifyInApp: form.notifyInApp,
					notifyPush: form.notifyPush,
					notifyEmail: form.notifyEmail,
					alertTypes: form.alertTypes
				})
			});

			if (!response.ok) {
				const body = (await response.json().catch(() => null)) as { message?: string } | null;
				throw new Error(body?.message ?? 'Failed to save preferences');
			}

			const body = (await response.json()) as { subscription: RouteSubscriptionDTO };
			successMessage = 'Preferences saved';
			onchange?.(body.subscription);
		} catch (err) {
			errorMessage = err instanceof Error ? err.message : 'Something went wrong';
		} finally {
			saving = false;
		}
	}

	async function unsubscribe() {
		if (!routeId || !subscription || unsubscribing) return;

		errorMessage = null;
		successMessage = null;
		unsubscribing = true;

		try {
			const response = await fetch(`/api/route-subscriptions/${routeId}`, {
				method: 'DELETE'
			});

			if (!response.ok) {
				const body = (await response.json().catch(() => null)) as { message?: string } | null;
				throw new Error(body?.message ?? 'Failed to unsubscribe');
			}

			onchange?.(null);
			await invalidateAll();
		} catch (err) {
			errorMessage = err instanceof Error ? err.message : 'Something went wrong';
		} finally {
			unsubscribing = false;
		}
	}
</script>

<section class={className} aria-label="Route subscription preferences">
	{#if !session}
		<p class="text-sm text-muted-foreground">
			<a href={resolve('/login')} class="font-medium text-brand underline-offset-2 hover:underline">
				Log in
			</a>
			to manage route alerts.
		</p>
	{:else if subscription}
		<div class="space-y-4 rounded-2xl border border-border/70 bg-background/70 p-4">
			<div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
				<div class="min-w-0 flex-1">
					<h3 class="text-sm font-semibold text-foreground">Alert preferences</h3>
					<p class="mt-1 text-xs text-muted-foreground">
						Choose which route changes should trigger notifications for this subscription.
					</p>
				</div>
				<Button.Root
					variant="outline"
					size="sm"
					class="w-full shrink-0 border-destructive/60 text-destructive hover:bg-destructive/10 hover:text-destructive sm:w-auto"
					disabled={unsubscribing}
					onclick={() => void unsubscribe()}
				>
					{unsubscribing ? 'Unsubscribing...' : 'Unsubscribe'}
				</Button.Root>
			</div>

			<div class="grid gap-3 sm:grid-cols-3">
				<label class="rounded-xl bg-card px-3 py-2 text-sm text-foreground">
					<input type="checkbox" bind:checked={form.notifyInApp} class="mr-2 align-middle" />
					In-app
				</label>
				<label class="rounded-xl bg-card px-3 py-2 text-sm text-foreground">
					<input type="checkbox" bind:checked={form.notifyPush} class="mr-2 align-middle" />
					Push
				</label>
				<label class="rounded-xl bg-card px-3 py-2 text-sm text-foreground">
					<input type="checkbox" bind:checked={form.notifyEmail} class="mr-2 align-middle" />
					Email
				</label>
			</div>

			<div>
				<p class="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
					Route events
				</p>
				<div class="mt-2 flex flex-wrap gap-2">
					{#each routeChangeTypes as type (type)}
						<label
							class="inline-flex cursor-pointer items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors {form.alertTypes.includes(
								type
							)
								? 'border-brand/30 bg-brand/10 text-brand'
								: 'border-border bg-card text-muted-foreground'}"
						>
							<input
								type="checkbox"
								class="sr-only"
								checked={form.alertTypes.includes(type)}
								onchange={() => toggleAlertType(type)}
							/>
							{type.replaceAll('_', ' ')}
						</label>
					{/each}
				</div>
			</div>

			<div class="flex flex-wrap items-center gap-3">
				<Button.Root size="sm" disabled={saving} onclick={() => void savePreferences()}>
					{saving ? 'Saving...' : 'Save preferences'}
				</Button.Root>

				{#if successMessage}
					<p class="text-xs text-success" role="status">{successMessage}</p>
				{/if}

				{#if errorMessage}
					<p class="text-xs text-destructive" role="alert">{errorMessage}</p>
				{/if}
			</div>
		</div>
	{/if}
</section>
