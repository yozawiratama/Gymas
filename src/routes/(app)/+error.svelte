<script lang="ts">
	import { dev } from '$app/environment';

	let { status, error } = $props();

	const isAccess = () => status === 401 || status === 403;
	const isNotFound = () => status === 404;

	const title = () => {
		if (isAccess()) return 'Access denied';
		if (isNotFound()) return 'Page not found';
		return 'Something went wrong';
	};

	const message = () => {
		if (isAccess()) return 'Your account does not have permission to view this page.';
		if (isNotFound()) return 'We could not find the page you were looking for.';
		return 'Please try again or contact an administrator.';
	};
</script>

<svelte:head>
	<title>{status} | {title()}</title>
</svelte:head>

<div class="min-h-screen bg-base-200">
	<div class="mx-auto flex max-w-4xl flex-col gap-6 p-6">
		<div class="card bg-base-100 shadow">
			<div class="card-body space-y-4">
				<p class="text-xs uppercase tracking-[0.2em] text-primary">App Error</p>
				<div class="space-y-2">
					<h1 class="text-2xl font-semibold md:text-3xl">{title()}</h1>
					<p class="text-sm opacity-70">{message()}</p>
				</div>

				<div class="flex flex-wrap gap-3">
					<a class="btn btn-primary" href="/admin">Go to dashboard</a>
					{#if isAccess()}
						<a class="btn btn-outline" href="/auth/login">Login</a>
					{/if}
					<a class="btn btn-ghost" href="/">Public site</a>
				</div>

				{#if dev && error?.message}
					<details class="rounded-2xl border border-base-200 bg-base-200/40 p-4 text-sm">
						<summary class="cursor-pointer font-medium">Details</summary>
						<p class="mt-2 whitespace-pre-wrap text-xs opacity-70">{error.message}</p>
					</details>
				{/if}
			</div>
		</div>
	</div>
</div>
