<script lang="ts">
	import * as Button from '$lib/components/ui/button';
	import { cn } from '$lib/utils';
	import {
		routeVehicleTypeOptions,
		type RouteMetadataInput,
		type RouteVehicleType
	} from '$lib/validation/schemas';

	interface Props {
		open?: boolean;
		saving?: boolean;
		errorMessage?: string | null;
		class?: string;
		onsave?: ((payload: RouteMetadataInput) => void | Promise<void>) | undefined;
	}

	type FieldName =
		| 'route_name'
		| 'start_loc'
		| 'end_loc'
		| 'vehicle_types'
		| 'pwd_friendly'
		| 'est_time_of_arrival'
		| 'fare';

	type FieldErrors = Partial<Record<FieldName, string>>;

	let {
		open = $bindable(false),
		saving = false,
		errorMessage = null,
		class: className,
		onsave
	}: Props = $props();

	let routeName = $state('');
	let startLoc = $state('');
	let endLoc = $state('');
	let vehicleTypes = $state<RouteVehicleType[]>([]);
	let pwdFriendly = $state<boolean | null>(null);
	let estTimeOfArrival = $state('');
	let fare = $state('');
	let fieldErrors = $state<FieldErrors>({});
	let localErrorMessage = $state<string | null>(null);
	let previousOpen = $state(false);

	function resetForm() {
		routeName = '';
		startLoc = '';
		endLoc = '';
		vehicleTypes = [];
		pwdFriendly = null;
		estTimeOfArrival = '';
		fare = '';
		fieldErrors = {};
		localErrorMessage = null;
	}

	$effect(() => {
		if (previousOpen && !open) {
			resetForm();
		}
		previousOpen = open;
	});

	function toggleVehicleType(vehicleType: RouteVehicleType) {
		if (vehicleTypes.includes(vehicleType)) {
			vehicleTypes = vehicleTypes.filter((value) => value !== vehicleType);
			return;
		}

		vehicleTypes = [...vehicleTypes, vehicleType];
	}

	function validateForm(): RouteMetadataInput | null {
		const errors: FieldErrors = {};

		const normalizedRouteName = routeName.trim();
		const normalizedStartLoc = startLoc.trim();
		const normalizedEndLoc = endLoc.trim();
		const etaValue = Number(estTimeOfArrival);
		const fareValue = Number(fare);

		if (!normalizedRouteName) errors.route_name = 'Route name is required';
		if (!normalizedStartLoc) errors.start_loc = 'Start location is required';
		if (!normalizedEndLoc) errors.end_loc = 'End location is required';
		if (vehicleTypes.length === 0) errors.vehicle_types = 'Choose at least one vehicle type';
		if (pwdFriendly === null) errors.pwd_friendly = 'Choose whether this route is PWD-friendly';
		if (!Number.isInteger(etaValue) || etaValue <= 0) {
			errors.est_time_of_arrival = 'Enter a positive whole number';
		}
		if (!Number.isFinite(fareValue) || fareValue < 0) {
			errors.fare = 'Enter a valid fare';
		}

		fieldErrors = errors;

		if (Object.keys(errors).length > 0 || pwdFriendly === null) {
			localErrorMessage = 'Fill in all required route details before saving.';
			return null;
		}

		return {
			route_name: normalizedRouteName,
			start_loc: normalizedStartLoc,
			end_loc: normalizedEndLoc,
			vehicle_types: [...vehicleTypes],
			pwd_friendly: pwdFriendly,
			est_time_of_arrival: etaValue,
			fare: fareValue
		};
	}

	async function handleSubmit(event: SubmitEvent) {
		event.preventDefault();
		if (saving) return;

		localErrorMessage = null;
		const payload = validateForm();
		if (!payload) return;

		try {
			await onsave?.(payload);
		} catch (err) {
			localErrorMessage = err instanceof Error ? err.message : 'Failed to save traced route';
		}
	}

	function closeDialog() {
		if (saving) return;
		open = false;
	}

	function handleOverlayKeydown(event: KeyboardEvent) {
		if (event.key !== 'Escape') return;
		event.preventDefault();
		closeDialog();
	}
</script>

{#if open}
	<div class="fixed inset-0 z-70">
		<button
			type="button"
			class="absolute inset-0 bg-black/50"
			onclick={closeDialog}
			aria-label="Close save traced route dialog"
		></button>
		<div
			role="dialog"
			aria-modal="true"
			aria-labelledby="trace-save-route-title"
			aria-describedby="trace-save-route-description"
			tabindex="-1"
			onkeydown={handleOverlayKeydown}
			class={cn(
				'absolute inset-x-0 bottom-0 mx-auto flex w-full max-w-3xl flex-col rounded-t-lg border border-border/70 bg-background shadow-2xl',
				'max-h-[calc(100dvh-1rem)]',
				className
			)}
		>
			<div class="mx-auto mt-4 h-2 w-25 shrink-0 rounded-full bg-muted"></div>

			<form class="mt-4 flex min-h-0 flex-1 flex-col px-4 pb-6" onsubmit={handleSubmit}>
				<div class="space-y-5 overflow-y-auto overscroll-contain pr-1">
					<header class="space-y-2 text-left">
						<h2
							id="trace-save-route-title"
							class="text-lg font-semibold text-balance text-foreground"
						>
							Save traced route
						</h2>
						<p id="trace-save-route-description" class="max-w-2xl text-sm text-muted-foreground">
							Add the route details below before we store the traced geometry.
						</p>
					</header>

					<div class="grid gap-4 sm:grid-cols-2">
						<label class="space-y-2 sm:col-span-2">
							<span class="text-sm font-medium text-foreground">Route name</span>
							<input
								type="text"
								bind:value={routeName}
								placeholder="e.g. Cubao to Alabang"
								class="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground shadow-sm transition-colors outline-none placeholder:text-muted-foreground focus:border-brand focus:ring-2 focus:ring-brand/20"
								aria-invalid={Boolean(fieldErrors.route_name)}
							/>
							{#if fieldErrors.route_name}
								<p class="text-xs text-destructive" role="alert">{fieldErrors.route_name}</p>
							{/if}
						</label>

						<label class="space-y-2">
							<span class="text-sm font-medium text-foreground">Start location</span>
							<input
								type="text"
								bind:value={startLoc}
								placeholder="Start point name"
								class="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground shadow-sm transition-colors outline-none placeholder:text-muted-foreground focus:border-brand focus:ring-2 focus:ring-brand/20"
								aria-invalid={Boolean(fieldErrors.start_loc)}
							/>
							{#if fieldErrors.start_loc}
								<p class="text-xs text-destructive" role="alert">{fieldErrors.start_loc}</p>
							{/if}
						</label>

						<label class="space-y-2">
							<span class="text-sm font-medium text-foreground">End location</span>
							<input
								type="text"
								bind:value={endLoc}
								placeholder="Destination point name"
								class="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground shadow-sm transition-colors outline-none placeholder:text-muted-foreground focus:border-brand focus:ring-2 focus:ring-brand/20"
								aria-invalid={Boolean(fieldErrors.end_loc)}
							/>
							{#if fieldErrors.end_loc}
								<p class="text-xs text-destructive" role="alert">{fieldErrors.end_loc}</p>
							{/if}
						</label>
					</div>

					<div class="space-y-3">
						<div class="flex items-end justify-between gap-3">
							<div>
								<p class="text-sm font-medium text-foreground">Vehicle types</p>
								<p class="text-xs text-muted-foreground">
									Select every vehicle that serves this route.
								</p>
							</div>
							{#if fieldErrors.vehicle_types}
								<p class="text-xs text-destructive" role="alert">{fieldErrors.vehicle_types}</p>
							{/if}
						</div>
						<div class="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
							{#each routeVehicleTypeOptions as vehicleType (vehicleType)}
								<label
									class={cn(
										'flex cursor-pointer items-center gap-2 rounded-xl border px-3 py-2.5 text-sm transition-colors',
										vehicleTypes.includes(vehicleType)
											? 'border-brand/30 bg-brand/10 text-brand'
											: 'border-border bg-background text-foreground'
									)}
								>
									<input
										type="checkbox"
										checked={vehicleTypes.includes(vehicleType)}
										onchange={() => toggleVehicleType(vehicleType)}
										class="size-4 rounded border-border text-brand focus:ring-brand/20"
									/>
									<span class="min-w-0">{vehicleType}</span>
								</label>
							{/each}
						</div>
					</div>

					<div class="grid gap-4 sm:grid-cols-2">
						<div class="space-y-3 sm:col-span-2">
							<div class="flex items-end justify-between gap-3">
								<div>
									<p class="text-sm font-medium text-foreground">PWD-friendly</p>
									<p class="text-xs text-muted-foreground">
										Choose the accessibility status for this route.
									</p>
								</div>
								{#if fieldErrors.pwd_friendly}
									<p class="text-xs text-destructive" role="alert">{fieldErrors.pwd_friendly}</p>
								{/if}
							</div>
							<div class="grid grid-cols-2 gap-2">
								<label
									class={cn(
										'cursor-pointer rounded-xl border px-3 py-2.5 text-sm transition-colors',
										pwdFriendly === true
											? 'border-brand/30 bg-brand/10 text-brand'
											: 'border-border bg-background text-foreground'
									)}
								>
									<input bind:group={pwdFriendly} type="radio" value={true} class="sr-only" />
									Yes
								</label>
								<label
									class={cn(
										'cursor-pointer rounded-xl border px-3 py-2.5 text-sm transition-colors',
										pwdFriendly === false
											? 'border-brand/30 bg-brand/10 text-brand'
											: 'border-border bg-background text-foreground'
									)}
								>
									<input bind:group={pwdFriendly} type="radio" value={false} class="sr-only" />
									No
								</label>
							</div>
						</div>

						<label class="space-y-2">
							<span class="text-sm font-medium text-foreground">ETA in minutes</span>
							<input
								type="number"
								min="1"
								step="1"
								inputmode="numeric"
								bind:value={estTimeOfArrival}
								placeholder="e.g. 45"
								class="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground shadow-sm transition-colors outline-none placeholder:text-muted-foreground focus:border-brand focus:ring-2 focus:ring-brand/20"
								aria-invalid={Boolean(fieldErrors.est_time_of_arrival)}
							/>
							{#if fieldErrors.est_time_of_arrival}
								<p class="text-xs text-destructive" role="alert">
									{fieldErrors.est_time_of_arrival}
								</p>
							{/if}
						</label>

						<label class="space-y-2">
							<span class="text-sm font-medium text-foreground">Fare</span>
							<input
								type="number"
								min="0"
								step="0.01"
								inputmode="decimal"
								bind:value={fare}
								placeholder="e.g. 25"
								class="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground shadow-sm transition-colors outline-none placeholder:text-muted-foreground focus:border-brand focus:ring-2 focus:ring-brand/20"
								aria-invalid={Boolean(fieldErrors.fare)}
							/>
							{#if fieldErrors.fare}
								<p class="text-xs text-destructive" role="alert">{fieldErrors.fare}</p>
							{/if}
						</label>
					</div>

					{#if localErrorMessage || errorMessage}
						<p
							class="rounded-xl border border-destructive/20 bg-destructive/5 px-3 py-2 text-sm text-destructive"
							role="alert"
						>
							{localErrorMessage ?? errorMessage}
						</p>
					{/if}
				</div>

				<div
					class="mt-4 flex shrink-0 flex-col-reverse gap-2 border-t border-border/60 bg-background px-0 pt-3 sm:flex-row sm:items-center sm:justify-end"
				>
					<Button.Root variant="outline" size="sm" class="w-full sm:w-auto" onclick={closeDialog}>
						Cancel
					</Button.Root>
					<Button.Root type="submit" size="sm" class="w-full sm:w-auto" disabled={saving}>
						{saving ? 'Saving...' : 'Save route'}
					</Button.Root>
				</div>
			</form>
		</div>
	</div>
{/if}
