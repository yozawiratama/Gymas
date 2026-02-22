<script lang="ts">
	import AlertBanner from '$lib/components/AlertBanner.svelte';
	import EmptyState from '$lib/components/EmptyState.svelte';

	let { data, form } = $props();

	const branches = () => form?.branches ?? data.branches ?? [];
	const action = () => form?.action ?? null;

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
	<title>Branches</title>
</svelte:head>

<div class="min-h-screen bg-base-200">
	<div class="mx-auto flex max-w-6xl flex-col gap-6 p-6">
		<div class="prose max-w-none">
			<h1>Branches</h1>
			<p class="text-sm opacity-70">Create and manage branch locations and availability.</p>
		</div>

		{#if form?.success === false && form?.message}
			<AlertBanner kind="error">
				<span>{form.message}</span>
			</AlertBanner>
		{/if}

		{#if form?.success}
			<AlertBanner kind="success">
				<span>
					{#if action() === 'create'}
						Branch created.
					{:else if action() === 'update'}
						Branch updated.
					{:else if action() === 'delete'}
						Branch deleted.
					{:else}
						Branch updated.
					{/if}
				</span>
			</AlertBanner>
		{/if}

		<div class="card bg-base-100 shadow">
			<div class="card-body">
				<div class="flex items-start justify-between gap-4">
					<div>
						<h2 class="card-title">Branch Directory</h2>
						<p class="text-sm opacity-70">Total {branches().length}</p>
					</div>
				</div>

				{#if branches().length}
					<div class="overflow-x-auto">
						<table class="table table-sm">
							<thead>
								<tr>
									<th>Branch</th>
									<th>Address</th>
									<th>Status</th>
									<th>Update</th>
									<th>Delete</th>
								</tr>
							</thead>
							<tbody>
								{#each branches() as branch}
									<tr>
										<td>
											<div class="font-semibold">{branch.name}</div>
											<div class="text-xs opacity-70">
												{branch.code ?? 'â€”'}
											</div>
										</td>
										<td class="text-sm">{branch.address ?? 'â€”'}</td>
										<td>
											<span
												class={`badge ${branch.isActive ? 'badge-success' : 'badge-ghost'}`}
											>
												{branch.isActive ? 'ACTIVE' : 'INACTIVE'}
											</span>
										</td>
										<td>
											<form
												method="POST"
												action="?/update"
												class="flex flex-wrap items-center gap-2"
												onsubmit={lockSubmit}
											>
												<input type="hidden" name="branchId" value={branch.id} />
												<input
													class="input input-bordered input-xs"
													name="name"
													value={branch.name}
													placeholder="Name"
												/>
												<input
													class="input input-bordered input-xs"
													name="code"
													value={branch.code ?? ''}
													placeholder="Code"
												/>
												<input
													class="input input-bordered input-xs"
													name="address"
													value={branch.address ?? ''}
													placeholder="Address"
												/>
												<label class="label cursor-pointer gap-2">
													<input
														class="checkbox checkbox-xs"
														type="checkbox"
														name="isActive"
														checked={branch.isActive}
													/>
													<span class="label-text text-xs">Active</span>
												</label>
												<button class="btn btn-xs" type="submit">Save</button>
											</form>
										</td>
										<td>
											<form method="POST" action="?/delete" onsubmit={lockSubmit}>
												<input type="hidden" name="branchId" value={branch.id} />
												<button class="btn btn-xs btn-ghost text-error" type="submit">
													Delete
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
						title="No branches yet"
						description="Create your first branch to start scheduling."
					/>
				{/if}
			</div>
		</div>

		<div class="card bg-base-100 shadow">
			<div class="card-body">
				<h2 class="card-title">Create Branch</h2>
				<form
					method="POST"
					action="?/create"
					class="grid gap-4 md:grid-cols-2"
					onsubmit={lockSubmit}
				>
					<div class="form-control">
						<label class="label" for="name">
							<span class="label-text">Name</span>
						</label>
						<!-- svelte-ignore a11y_autofocus -->
						<input
							class="input input-bordered"
							id="name"
							name="name"
							required
							placeholder="Main Branch"
							autofocus
						/>
					</div>
					<div class="form-control">
						<label class="label" for="code">
							<span class="label-text">Code</span>
						</label>
						<input
							class="input input-bordered"
							id="code"
							name="code"
							placeholder="MAIN"
						/>
					</div>
					<div class="form-control md:col-span-2">
						<label class="label" for="address">
							<span class="label-text">Address</span>
						</label>
						<input
							class="input input-bordered"
							id="address"
							name="address"
							placeholder="Branch address (optional)"
						/>
					</div>
					<div class="form-control">
						<label class="label cursor-pointer justify-start gap-3">
							<input class="checkbox" name="isActive" type="checkbox" checked />
							<span class="label-text">Active</span>
						</label>
					</div>
					<div class="flex justify-end md:col-span-2">
						<button class="btn btn-primary" type="submit">Create Branch</button>
					</div>
				</form>
			</div>
		</div>
	</div>
</div>

