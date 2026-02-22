<script lang="ts">
	import AlertBanner from '$lib/components/AlertBanner.svelte';

	let { data, form } = $props();

	type MemberFormValues = {
		name: string;
		memberCode: string;
		phone: string;
	};

	type FieldErrors = Partial<Record<keyof MemberFormValues, string>>;

	const fallbackValues: MemberFormValues = {
		name: '',
		memberCode: '',
		phone: ''
	};

	const values = () => (form?.values ?? data.values ?? fallbackValues) as MemberFormValues;
	const fieldErrors = () => (form?.fieldErrors ?? {}) as FieldErrors;
	const errorMessage = () => (form?.success === false && form?.message ? form.message : '');
	const hasFieldErrors = () => Object.keys(fieldErrors()).length > 0;
	const nameErrorId = 'name-error';
	const memberCodeErrorId = 'member-code-error';
	const phoneErrorId = 'phone-error';

	const lockSubmit = (event: SubmitEvent) => {
		const form = event.currentTarget as HTMLFormElement | null;
		const button = form?.querySelector('button[type="submit"]') as HTMLButtonElement | null;
		if (button) {
			button.disabled = true;
			button.classList.add('btn-disabled');
		}
	};
</script>

<svelte:head>
	<title>New Member</title>
</svelte:head>

<div class="min-h-screen bg-base-200">
	<div class="mx-auto flex max-w-3xl flex-col gap-6 p-6">
		<div class="prose max-w-none">
			<a class="link link-hover text-sm" href="/members">Back to members</a>
			<h1>New Member</h1>
			<p class="text-sm opacity-70">Create a new member profile.</p>
		</div>

		{#if errorMessage() && !hasFieldErrors()}
			<AlertBanner kind="error">
				<span>{errorMessage()}</span>
			</AlertBanner>
		{/if}

		<div class="card bg-base-100 shadow">
			<div class="card-body space-y-4">
				<h2 class="card-title">Member Details</h2>

				<form method="POST" action="?/createMember" class="space-y-4" onsubmit={lockSubmit}>
					<div class="form-control">
						<label class="label" for="name">
							<span class="label-text">Name</span>
						</label>
						<input
							id="name"
							name="name"
							class={`input input-bordered ${fieldErrors().name ? 'input-error' : ''}`}
							placeholder="Full name"
							required
							aria-invalid={!!fieldErrors().name}
							aria-describedby={fieldErrors().name ? nameErrorId : undefined}
							value={values().name}
						/>
						{#if fieldErrors().name}
							<div class="label">
								<span id={nameErrorId} class="label-text-alt text-error">
									{fieldErrors().name}
								</span>
							</div>
						{/if}
					</div>

					<div class="form-control">
						<label class="label" for="memberCode">
							<span class="label-text">Member Code</span>
						</label>
						<input
							id="memberCode"
							name="memberCode"
							class={`input input-bordered ${fieldErrors().memberCode ? 'input-error' : ''}`}
							placeholder="e.g. MBR-20260208-0001"
							required
							aria-invalid={!!fieldErrors().memberCode}
							aria-describedby={fieldErrors().memberCode ? memberCodeErrorId : undefined}
							value={values().memberCode}
						/>
						{#if fieldErrors().memberCode}
							<div class="label">
								<span id={memberCodeErrorId} class="label-text-alt text-error">
									{fieldErrors().memberCode}
								</span>
							</div>
						{/if}
					</div>

					<div class="form-control">
						<label class="label" for="phone">
							<span class="label-text">Phone (optional)</span>
						</label>
						<input
							id="phone"
							name="phone"
							class={`input input-bordered ${fieldErrors().phone ? 'input-error' : ''}`}
							placeholder="Phone number"
							aria-invalid={!!fieldErrors().phone}
							aria-describedby={fieldErrors().phone ? phoneErrorId : undefined}
							value={values().phone}
						/>
						{#if fieldErrors().phone}
							<div class="label">
								<span id={phoneErrorId} class="label-text-alt text-error">
									{fieldErrors().phone}
								</span>
							</div>
						{/if}
					</div>

					<div class="flex flex-wrap items-center gap-3">
						<button class="btn btn-primary" type="submit">Create Member</button>
						<a class="btn btn-ghost" href="/members">Cancel</a>
					</div>
				</form>
			</div>
		</div>
	</div>
</div>
