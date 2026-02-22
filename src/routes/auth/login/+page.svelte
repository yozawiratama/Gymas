<script lang="ts">
	import { goto } from '$app/navigation';

	let { data } = $props();

	let submitting = $state(false);
	let errorMessage = $state('');

	const branding = () => data?.branding;

	const handleSubmit = async (event: SubmitEvent) => {
		event.preventDefault();
		if (submitting) return;

		const form = event.currentTarget as HTMLFormElement;
		const formData = new FormData(form);
		const username = String(formData.get('username') ?? '').trim();
		const password = String(formData.get('password') ?? '');

		if (!username || !password) {
			errorMessage = 'Username and password are required.';
			return;
		}

		submitting = true;
		errorMessage = '';

		try {
			const response = await fetch('/auth/login', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ username, password })
			});
			const payload = await response.json().catch(() => null);

			if (!response.ok) {
				errorMessage = payload?.error?.message ?? 'Unable to sign in.';
				return;
			}

			await goto('/attendance/check-in');
		} catch {
			errorMessage = 'Unable to sign in right now.';
		} finally {
			submitting = false;
		}
	};
</script>

<svelte:head>
	<title>Sign In</title>
</svelte:head>

<div class="min-h-screen bg-base-200">
	<div class="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-6 p-6">
		<div class="text-center">
			{#if branding()}
				{#if branding().showLogoOnLogin && branding().logoMediaId}
					<img
						src={`/media/${branding().logoMediaId}`}
						alt={`${branding().companyName} logo`}
						class="mx-auto mb-4 h-16 w-auto"
						loading="lazy"
					/>
				{/if}
				<h1 class="text-3xl font-semibold">{branding().companyName}</h1>
			{/if}
			<p class="text-sm opacity-70">Sign in to continue.</p>
		</div>

		{#if errorMessage}
			<div role="alert" class="alert alert-error">
				<span>{errorMessage}</span>
			</div>
		{/if}

		<div class="card bg-base-100 shadow">
			<div class="card-body">
				<form class="space-y-4" onsubmit={handleSubmit}>
					<div class="form-control">
						<label class="label" for="username">
							<span class="label-text">Username</span>
						</label>
						<input
							id="username"
							name="username"
							type="text"
							autocomplete="username"
							class="input input-bordered"
							required
						/>
					</div>

					<div class="form-control">
						<label class="label" for="password">
							<span class="label-text">Password</span>
						</label>
						<input
							id="password"
							name="password"
							type="password"
							autocomplete="current-password"
							class="input input-bordered"
							required
						/>
					</div>

					<div class="flex justify-end">
						<button class="btn btn-primary" type="submit" disabled={submitting}>
							{submitting ? 'Signing in…' : 'Sign In'}
						</button>
					</div>
				</form>
			</div>
		</div>
	</div>
</div>
