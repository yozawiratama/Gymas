<script lang="ts">
	let { data, form } = $props();

	const settings = () => form?.settings ?? data.settings;
	const updatedAtLabel = () => {
		const value = settings().updatedAt;
		if (!value) return '—';
		const date = new Date(value);
		return Number.isNaN(date.getTime()) ? '—' : date.toLocaleString();
	};
</script>

<svelte:head>
	<title>Company Settings</title>
</svelte:head>

<div class="min-h-screen bg-base-200">
	<div class="mx-auto flex max-w-4xl flex-col gap-6 p-6">
		<div class="prose max-w-none">
			<h1>Company Settings</h1>
			<p class="text-sm opacity-70">
				Manage public contact details, social links, and footer information.
			</p>
			<p class="text-xs uppercase tracking-wide opacity-60">Last updated {updatedAtLabel()}</p>
		</div>

		{#if form?.success === false && form?.message}
			<div role="alert" class="alert alert-error">
				<span>{form.message}</span>
			</div>
		{/if}

		{#if form?.success}
			<div role="alert" class="alert alert-success">
				<span>Company settings updated.</span>
			</div>
		{/if}

		<div class="card bg-base-100 shadow">
			<div class="card-body space-y-6">
				<form method="POST" action="?/save" class="space-y-6">
					<div class="space-y-4">
						<h2 class="card-title">Company Profile</h2>
						<div class="form-control">
							<label class="label" for="companyName">
								<span class="label-text">Company name</span>
							</label>
							<input
								id="companyName"
								name="companyName"
								type="text"
								class="input input-bordered"
								required
								value={settings().companyName}
							/>
						</div>

						<div class="form-control">
							<label class="label" for="tagline">
								<span class="label-text">Tagline</span>
							</label>
							<input
								id="tagline"
								name="tagline"
								type="text"
								class="input input-bordered"
								value={settings().tagline ?? ''}
							/>
							<p class="text-xs opacity-70">Optional short description for the footer.</p>
						</div>
					</div>

					<div class="space-y-4">
						<h2 class="card-title">Contact Details</h2>
						<div class="form-control">
							<label class="label" for="address">
								<span class="label-text">Address</span>
							</label>
							<textarea
								id="address"
								name="address"
								class="textarea textarea-bordered min-h-[96px]"
							>{settings().address ?? ''}</textarea>
						</div>

						<div class="grid gap-4 md:grid-cols-2">
							<div class="form-control">
								<label class="label" for="phone">
									<span class="label-text">Phone</span>
								</label>
								<input
									id="phone"
									name="phone"
									type="text"
									class="input input-bordered"
									value={settings().phone ?? ''}
								/>
								<p class="text-xs opacity-70">Digits, spaces, and + only.</p>
							</div>

							<div class="form-control">
								<label class="label" for="whatsapp">
									<span class="label-text">WhatsApp</span>
								</label>
								<input
									id="whatsapp"
									name="whatsapp"
									type="text"
									class="input input-bordered"
									value={settings().whatsapp ?? ''}
								/>
								<p class="text-xs opacity-70">Digits, spaces, and + only.</p>
							</div>
						</div>

						<div class="form-control">
							<label class="label" for="email">
								<span class="label-text">Email</span>
							</label>
							<input
								id="email"
								name="email"
								type="email"
								class="input input-bordered"
								value={settings().email ?? ''}
							/>
						</div>
					</div>

					<div class="space-y-4">
						<h2 class="card-title">Social & Links</h2>
						<div class="form-control">
							<label class="label" for="instagramUrl">
								<span class="label-text">Instagram URL</span>
							</label>
							<input
								id="instagramUrl"
								name="instagramUrl"
								type="url"
								class="input input-bordered"
								value={settings().instagramUrl ?? ''}
							/>
							<p class="text-xs opacity-70">Must start with https://</p>
						</div>

						<div class="form-control">
							<label class="label" for="facebookUrl">
								<span class="label-text">Facebook URL</span>
							</label>
							<input
								id="facebookUrl"
								name="facebookUrl"
								type="url"
								class="input input-bordered"
								value={settings().facebookUrl ?? ''}
							/>
							<p class="text-xs opacity-70">Must start with https://</p>
						</div>

						<div class="form-control">
							<label class="label" for="websiteUrl">
								<span class="label-text">Website URL</span>
							</label>
							<input
								id="websiteUrl"
								name="websiteUrl"
								type="url"
								class="input input-bordered"
								value={settings().websiteUrl ?? ''}
							/>
							<p class="text-xs opacity-70">Must start with https://</p>
						</div>

						<div class="form-control">
							<label class="label" for="googleMapsUrl">
								<span class="label-text">Google Maps URL</span>
							</label>
							<input
								id="googleMapsUrl"
								name="googleMapsUrl"
								type="url"
								class="input input-bordered"
								value={settings().googleMapsUrl ?? ''}
							/>
							<p class="text-xs opacity-70">Must start with https://</p>
						</div>
					</div>

					<div class="space-y-4">
						<h2 class="card-title">Business Hours</h2>
						<div class="form-control">
							<label class="label" for="businessHours">
								<span class="label-text">Business hours</span>
							</label>
							<textarea
								id="businessHours"
								name="businessHours"
								class="textarea textarea-bordered min-h-[96px]"
							>{settings().businessHours ?? ''}</textarea>
							<p class="text-xs opacity-70">Shown in the public footer.</p>
						</div>
					</div>

					<div class="flex justify-end">
						<button class="btn btn-primary" type="submit">Save Settings</button>
					</div>
				</form>
			</div>
		</div>
	</div>
</div>
