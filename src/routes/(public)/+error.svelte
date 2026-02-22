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
		if (isAccess()) return 'You do not have access to this page.';
		if (isNotFound()) return 'The page you are looking for could not be found.';
		return 'Please try again later.';
	};
</script>

<svelte:head>
	<title>{status} | {title()}</title>
</svelte:head>

<section class="bg-base-100">
	<div class="mx-auto w-full max-w-4xl px-6 py-16">
		<div class="rounded-3xl border border-base-200 bg-base-100 shadow-sm">
			<div class="space-y-5 p-8 md:p-12">
				<p class="text-sm uppercase tracking-[0.2em] text-primary">Public Error</p>
				<div class="space-y-2">
					<h1 class="text-3xl font-semibold md:text-4xl">{title()}</h1>
					<p class="text-base opacity-70">{message()}</p>
				</div>

				<div class="flex flex-wrap gap-3 pt-2">
					<a class="btn btn-primary" href="/">Back to home</a>
					<a class="btn btn-outline" href="/contact-us">Contact support</a>
					{#if isAccess()}
						<a class="btn btn-ghost" href="/auth/login">Login</a>
					{/if}
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
</section>
