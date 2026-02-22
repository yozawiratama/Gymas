<script lang="ts">
	let { data, form } = $props();

	const branding = () => form?.branding ?? data.branding;
</script>

<svelte:head>
	<title>Branding Settings</title>
</svelte:head>

<div class="min-h-screen bg-base-200">
	<div class="mx-auto flex max-w-4xl flex-col gap-6 p-6">
		<div class="prose max-w-none">
			<h1>Branding Settings</h1>
			<p class="text-sm opacity-70">Update your company name and logo for staff-facing screens.</p>
		</div>

		{#if form?.success === false && form?.message}
			<div role="alert" class="alert alert-error">
				<span>{form.message}</span>
			</div>
		{/if}

		{#if form?.success && form?.action === 'save'}
			<div role="alert" class="alert alert-success">
				<span>Branding settings updated.</span>
			</div>
		{/if}

		{#if form?.success && form?.action === 'uploadLogo'}
			<div role="alert" class="alert alert-success">
				<span>Logo uploaded successfully.</span>
			</div>
		{/if}

		<div class="grid gap-6 lg:grid-cols-[2fr_1fr]">
			<div class="card bg-base-100 shadow">
				<div class="card-body space-y-6">
					<h2 class="card-title">Company Profile</h2>
					<form method="POST" action="?/save" class="space-y-5">
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
								value={branding().companyName}
							/>
							<p class="text-xs opacity-70">Displayed on the login page and app header.</p>
						</div>

						<div class="form-control">
							<label class="label cursor-pointer justify-between">
								<span class="label-text">Show logo on login</span>
								<input
									name="showLogoOnLogin"
									type="checkbox"
									class="toggle toggle-primary"
									checked={branding().showLogoOnLogin}
								/>
							</label>
						</div>

						<div class="form-control">
							<label class="label cursor-pointer justify-between">
								<span class="label-text">Show logo on layout header</span>
								<input
									name="showLogoOnLayout"
									type="checkbox"
									class="toggle toggle-primary"
									checked={branding().showLogoOnLayout}
								/>
							</label>
						</div>

						<div class="flex justify-end">
							<button class="btn btn-primary" type="submit">Save Settings</button>
						</div>
					</form>
				</div>
			</div>

			<div class="card bg-base-100 shadow">
				<div class="card-body space-y-4">
					<h2 class="card-title">Logo</h2>

					{#if branding().logoMediaId}
						<div class="rounded-box border border-base-200 bg-base-200/40 p-4">
							<p class="text-xs uppercase opacity-60">Current logo</p>
							<img
								class="mt-3 h-20 w-auto max-w-full"
								src={`/media/${branding().logoMediaId}`}
								alt="Company logo preview"
								loading="lazy"
							/>
						</div>
					{:else}
						<p class="text-sm opacity-70">No logo uploaded yet.</p>
					{/if}

					<form method="POST" action="?/uploadLogo" enctype="multipart/form-data">
						<div class="form-control">
							<label class="label" for="logo">
								<span class="label-text">Upload new logo</span>
							</label>
							<input
								id="logo"
								name="logo"
								type="file"
								accept="image/png,image/jpeg,image/webp,image/svg+xml"
								class="file-input file-input-bordered w-full"
								required
							/>
							<p class="text-xs opacity-70">PNG, JPG, WEBP, or SVG up to 5 MB.</p>
						</div>
						<div class="mt-4 flex justify-end">
							<button class="btn btn-outline" type="submit">Upload Logo</button>
						</div>
					</form>
				</div>
			</div>
		</div>
	</div>
</div>
