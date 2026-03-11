<script lang="ts">
	/* eslint-disable svelte/no-navigation-without-resolve */

	import { page } from '$app/state';
	import { timeAgo } from '$lib/utils';
	import type { NotificationKind } from '$lib/types/database';
	import {
		AlertTriangle,
		ArrowBigDown,
		ArrowBigUp,
		ArrowLeft,
		Bell,
		Check,
		MessageCircle
	} from '@lucide/svelte';
	import * as Button from '$lib/components/ui/button/index';

	let { data } = $props();

	type NotificationRow = {
		notification_id: number;
		kind: NotificationKind;
		message: string;
		is_read: boolean;
		created_at: string;
		post_id: number | null;
		route_id: number | null;
	};

	let notifications = $derived<NotificationRow[]>(data.notifications as NotificationRow[]);

	let scope = $derived((page.url.searchParams.get('scope') ?? 'forum') as 'forum' | 'routes');
	let backHref = $derived(scope === 'routes' ? '/routes' : '/forum');

	let filtered = $derived.by(() => {
		const isForum = (n: NotificationRow) =>
			n.kind === 'upvote' || n.kind === 'downvote' || n.kind === 'comment';
		return notifications.filter((n) =>
			scope === 'routes' ? n.kind === 'route_alert' : isForum(n)
		);
	});

	let unreadCount = $derived(filtered.filter((n) => !n.is_read).length);

	function hrefFor(n: NotificationRow) {
		if (n.kind === 'route_alert') return `/map?route=${n.route_id ?? ''}`;
		return `/forum/${n.post_id ?? ''}`;
	}

	function iconFor(n: NotificationRow) {
		switch (n.kind) {
			case 'upvote':
				return ArrowBigUp;
			case 'downvote':
				return ArrowBigDown;
			case 'comment':
				return MessageCircle;
			case 'route_alert':
				return AlertTriangle;
			default:
				return Bell;
		}
	}

	function markRead(id: number) {
		notifications = notifications.map((n) =>
			n.notification_id === id ? { ...n, is_read: true } : n
		);
	}

	function markAllRead() {
		const ids = new Set(filtered.map((n) => n.notification_id));
		notifications = notifications.map((n) =>
			ids.has(n.notification_id) ? { ...n, is_read: true } : n
		);
	}
</script>

<svelte:head>
	<title>Notifications | Komyut PH</title>
	<meta name="description" content="Forum and route notifications" />
</svelte:head>

<div class="sticky top-0 z-30 border-b bg-background/95 backdrop-blur-sm">
	<div class="relative flex items-center justify-between gap-fluid-sm px-fluid-sm py-fluid-sm">
		<a
			href={backHref}
			class="grid size-9 place-items-center rounded-full text-muted-foreground hover:bg-muted/50 hover:text-foreground"
			aria-label="Back"
		>
			<ArrowLeft class="size-6" />
		</a>

		<div class="pointer-events-none absolute left-1/2 -translate-x-1/2 text-base font-semibold">
			Notifications
		</div>

		<Button.Root
			variant="ghost"
			size="sm"
			disabled={filtered.length === 0 || unreadCount === 0}
			onclick={markAllRead}
			aria-label="Mark all as read"
		>
			Mark all
		</Button.Root>
	</div>
</div>

<section class="space-y-3 px-fluid-sm py-fluid-sm" aria-label="Notifications">
	<div class="flex gap-2" role="tablist" aria-label="Notification scope">
		<a
			href="/notifications?scope=forum"
			role="tab"
			aria-selected={scope === 'forum'}
			class="rounded-full px-3 py-1.5 text-xs font-medium transition-colors
                {scope === 'forum'
				? 'bg-brand text-white'
				: 'bg-card text-muted-foreground hover:bg-muted/50 hover:text-foreground'}"
		>
			Forum
		</a>

		<a
			href="/notifications?scope=routes"
			role="tab"
			aria-selected={scope === 'routes'}
			class="rounded-full px-3 py-1.5 text-xs font-medium transition-colors
                {scope === 'routes'
				? 'bg-brand text-white'
				: 'bg-card text-muted-foreground hover:bg-muted/50 hover:text-foreground'}"
		>
			Routes
		</a>
	</div>

	{#if filtered.length === 0}
		<div class="rounded-2xl bg-card p-4">
			<h2 class="text-sm font-semibold text-foreground">All caught up</h2>
			<p class="mt-1 text-sm text-muted-foreground">
				{scope === 'routes' ? 'No route alerts right now.' : 'No forum activity right now.'}
			</p>
		</div>
	{:else}
		<div class="text-xs text-muted-foreground" role="status" aria-live="polite">
			{unreadCount} unread
		</div>

		{#each filtered as n (n.notification_id)}
			{@const Icon = iconFor(n)}
			<article
				class="relative rounded-2xl bg-card p-4 {n.is_read ? 'opacity-70' : 'ring-1 ring-brand/20'}"
			>
				<a href={hrefFor(n)} class="block">
					<div class="flex items-start gap-3">
						<div
							class="mt-0.5 grid size-9 shrink-0 place-items-center rounded-full {n.is_read
								? 'bg-border/40 text-muted-foreground'
								: 'bg-brand/15 text-brand'}"
							aria-hidden="true"
						>
							<Icon class="size-4" />
						</div>

						<div class="min-w-0 flex-1">
							<p
								class="text-sm leading-snug {n.is_read
									? 'text-muted-foreground'
									: 'font-medium text-foreground'}"
							>
								{n.message}
							</p>
							<div class="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
								<span>{timeAgo(n.created_at)}</span>
								{#if !n.is_read}
									<span class="inline-flex items-center gap-1 text-brand">
										<span class="size-1.5 rounded-full bg-brand"></span>
										Unread
									</span>
								{/if}
							</div>
						</div>
					</div>
				</a>

				{#if !n.is_read}
					<div class="mt-3 flex justify-end">
						<button
							type="button"
							onclick={(e) => {
								e.preventDefault();
								e.stopPropagation();
								markRead(n.notification_id);
							}}
							class="inline-flex cursor-pointer items-center gap-1.5 rounded-full bg-border/40 px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground"
							aria-label="Mark as read"
						>
							<Check class="size-4" />
							Mark as read
						</button>
					</div>
				{/if}
			</article>
		{/each}
	{/if}
</section>
