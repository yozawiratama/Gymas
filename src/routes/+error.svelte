<script lang="ts">
	import { page } from '$app/stores';

	const status = $page.status;
	const message = $page.error?.message ?? 'Something went wrong.';
	const isForbidden = status === 403;
	const title = isForbidden ? 'Access denied' : 'Something went wrong';
	const description = isForbidden
		? 'You do not have permission to view this page.'
		: message;
</script>

<div class="mx-auto flex min-h-[60vh] w-full max-w-4xl items-center justify-center px-6 py-16">
	<div class="card w-full max-w-xl border border-base-200 bg-base-100 shadow">
		<div class="card-body gap-4 text-center">
			<div class="text-5xl font-semibold">{status}</div>
			<h1 class="text-2xl font-semibold">{title}</h1>
			<p class="text-sm opacity-70">{description}</p>
			<div class="card-actions justify-center">
				<a class="btn btn-primary" href="/">Back to dashboard</a>
			</div>
		</div>
	</div>
</div>
