<script lang="ts">
	import AlertBanner from '$lib/components/AlertBanner.svelte';
	import EmptyState from '$lib/components/EmptyState.svelte';

	let { data, form } = $props();

	const plans = () => form?.plans ?? data.plans ?? [];

	const statusBadgeClass = (isActive: boolean) =>
		isActive ? 'badge-success' : 'badge-ghost';

	const formatPrice = (priceCents: number | null | undefined) => {
		if (priceCents == null) return '—';
		return `USD ${(priceCents / 100).toFixed(2)}`;
	};

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
	<title>Membership Plans</title>
</svelte:head>

<div class="min-h-screen bg-base-200">
	<div class="mx-auto flex max-w-6xl flex-col gap-6 p-6">
		<div class="prose max-w-none">
			<h1>Membership Plans</h1>
			<p class="text-sm opacity-70">
				Define and manage membership plans for assignment to members.
			</p>
		</div>

		{#if form?.success === false && form?.message}
			<AlertBanner kind="error">
				<span>{form.message}</span>
			</AlertBanner>
		{/if}

		{#if form?.success && form?.action === 'create'}
			<AlertBanner kind="success">
				<span>Membership plan created.</span>
			</AlertBanner>
		{/if}

		{#if form?.success && form?.action === 'toggle'}
			<AlertBanner kind="success">
				<span>Membership plan updated.</span>
			</AlertBanner>
		{/if}

		<div class="grid gap-6 lg:grid-cols-[2fr_1fr]">
			<div class="card bg-base-100 shadow">
				<div class="card-body space-y-4">
					<div class="flex flex-wrap items-center justify-between gap-2">
						<h2 class="card-title">Plans</h2>
						<p class="text-sm opacity-70">Total {plans().length}</p>
					</div>

					{#if plans().length}
						<div class="overflow-x-auto">
							<table class="table">
								<thead>
									<tr>
										<th>Plan</th>
										<th>Duration</th>
										<th>Price</th>
										<th>Status</th>
										<th></th>
									</tr>
								</thead>
								<tbody>
									{#each plans() as plan}
										<tr>
											<td>
												<div class="font-semibold">{plan.name}</div>
												{#if plan.description}
													<p class="text-xs opacity-70">{plan.description}</p>
												{/if}
											</td>
											<td>{plan.durationDays} days</td>
											<td class="font-mono text-sm">{formatPrice(plan.priceCents)}</td>
											<td>
												<span class={`badge ${statusBadgeClass(plan.isActive)}`}>
													{plan.isActive ? 'ACTIVE' : 'INACTIVE'}
												</span>
											</td>
											<td>
												<form method="POST" action="?/toggle" onsubmit={lockSubmit}>
													<input type="hidden" name="planId" value={plan.id} />
													<input
														type="hidden"
														name="isActive"
														value={plan.isActive ? 'false' : 'true'}
													/>
													<button
														class={`btn btn-xs ${plan.isActive ? 'btn-ghost' : 'btn-primary'}`}
														type="submit"
													>
														{plan.isActive ? 'Deactivate' : 'Activate'}
													</button>
												</form>
											</td>
										</tr>
									{/each}
								</tbody>
							</table>
						</div>
					{:else}
						<EmptyState
							title="No membership plans yet"
							description="Create a plan to start assigning memberships."
						/>
					{/if}
				</div>
			</div>

			<div class="card bg-base-100 shadow">
				<div class="card-body space-y-5">
					<h2 class="card-title">Create Plan</h2>
					<form method="POST" action="?/create" class="space-y-4" onsubmit={lockSubmit}>
						<div class="form-control">
							<label class="label" for="name">
								<span class="label-text">Plan name</span>
							</label>
							<!-- svelte-ignore a11y_autofocus -->
							<input
								id="name"
								name="name"
								type="text"
								class="input input-bordered"
								required
								placeholder="Monthly"
								autofocus
							/>
						</div>

						<div class="form-control">
							<label class="label" for="durationDays">
								<span class="label-text">Duration (days)</span>
							</label>
							<input
								id="durationDays"
								name="durationDays"
								type="number"
								min="1"
								max="3650"
								class="input input-bordered"
								required
								value="30"
							/>
							<p class="text-xs opacity-70">Number of days from start to end.</p>
						</div>

						<div class="form-control">
							<label class="label" for="price">
								<span class="label-text">Price (optional)</span>
							</label>
							<input
								id="price"
								name="price"
								type="number"
								inputmode="decimal"
								step="0.01"
								min="0"
								class="input input-bordered"
								placeholder="0.00"
							/>
							<p class="text-xs opacity-70">Stored in cents for accuracy.</p>
						</div>

						<div class="form-control">
							<label class="label" for="description">
								<span class="label-text">Description (optional)</span>
							</label>
							<textarea
								id="description"
								name="description"
								class="textarea textarea-bordered"
								rows="3"
								placeholder="Short plan notes"
							></textarea>
						</div>

						<div class="form-control">
							<label class="label cursor-pointer justify-start gap-3">
								<input
									name="isActive"
									type="checkbox"
									class="checkbox"
									checked
								/>
								<span class="label-text">Plan is active</span>
							</label>
						</div>

						<div class="flex justify-end">
							<button class="btn btn-primary" type="submit">Create Plan</button>
						</div>
					</form>
				</div>
			</div>
		</div>
	</div>
</div>



