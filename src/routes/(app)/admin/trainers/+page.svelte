<script lang="ts">
	import { navigating } from '$app/stores';
	import AlertBanner from '$lib/components/AlertBanner.svelte';
	import EmptyState from '$lib/components/EmptyState.svelte';
	import LoadingSkeleton from '$lib/components/LoadingSkeleton.svelte';

	let { data, form } = $props();

	type TrainerRow = {
		id: string;
		fullName: string;
		displayName?: string | null;
		specialty?: string | null;
		isActive: boolean;
		updatedAt: string | Date;
		phone?: string | null;
		email?: string | null;
		bio?: string | null;
		photoMediaId?: string | null;
	};

	const rows = () => (form?.rows ?? data.rows ?? []) as TrainerRow[];
	const pagination = () => form?.pagination ?? data.pagination;
	const q = () => form?.q ?? data.q ?? '';
	const activeOnly = () => form?.activeOnly ?? data.activeOnly ?? true;
	const canManage = () => data.canManage ?? false;
	const action = () => form?.action ?? null;
	const page = () => pagination().page;
	const totalPages = () => pagination().totalPages;
	const pageSize = () => pagination().pageSize;

	const formatDateTime = (value: string | Date | null | undefined) => {
		if (!value) return 'â€”';
		const date = value instanceof Date ? value : new Date(value);
		if (Number.isNaN(date.getTime())) return 'â€”';
		return date.toLocaleString();
	};

	const buildPageUrl = (targetPage: number) => {
		const params = new URLSearchParams();
		if (q()) params.set('q', q());
		if (!activeOnly()) params.set('activeOnly', 'false');
		if (targetPage > 1) params.set('page', String(targetPage));
		if (pageSize() !== 20) params.set('pageSize', String(pageSize()));
		const queryString = params.toString();
		return queryString ? `/admin/trainers?${queryString}` : '/admin/trainers';
	};

	const hasPrev = () => page() > 1;
	const hasNext = () => page() < totalPages();

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
	<title>Personal Trainers</title>
</svelte:head>

<div class="min-h-screen bg-base-200">
	<div class="mx-auto flex max-w-6xl flex-col gap-6 p-6">
		<div class="prose max-w-none">
			<h1>Personal Trainers</h1>
			<p class="text-sm opacity-70">Manage trainer profiles and availability by branch.</p>
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
						Trainer created.
					{:else if action() === 'update'}
						Trainer updated.
					{:else if action() === 'toggleActive'}
						Trainer status updated.
					{:else}
						Trainer updated.
					{/if}
				</span>
			</AlertBanner>
		{/if}

		<div class="card bg-base-100 shadow">
			<div class="card-body space-y-4">
				<div class="flex flex-wrap items-center justify-between gap-3">
					<h2 class="card-title">Trainer Directory</h2>
					<p class="text-sm opacity-70">Total {pagination().total}</p>
				</div>

				<form method="GET" class="flex flex-col gap-3 lg:flex-row lg:items-end">
					<div class="form-control flex-1">
						<label class="label" for="q">
							<span class="label-text">Search</span>
						</label>
						<input
							id="q"
							name="q"
							class="input input-bordered"
							placeholder="Search by name"
							value={q()}
						/>
					</div>
					<div class="form-control">
						<label class="label cursor-pointer gap-2">
							<input type="hidden" name="activeOnly" value="false" />
							<input
								class="checkbox"
								type="checkbox"
								name="activeOnly"
								value="true"
								checked={activeOnly()}
							/>
							<span class="label-text">Active only</span>
						</label>
					</div>
					<input type="hidden" name="pageSize" value={pageSize()} />
					<button class="btn btn-primary" type="submit">Apply</button>
					{#if canManage()}
						<label for="add-trainer-modal" class="btn btn-outline">
							Add Trainer
						</label>
					{/if}
				</form>
			</div>
		</div>

		<div class="card bg-base-100 shadow">
			<div class="card-body gap-4">
				{#if $navigating && $navigating.to?.url.pathname === '/admin/trainers'}
					<LoadingSkeleton rows={6} columns={6} />
				{:else if rows().length}
					<div class="overflow-x-auto">
						<table class="table">
							<thead>
								<tr>
									<th>Name</th>
									<th>Specialty</th>
									<th>Status</th>
									<th>Updated</th>
									{#if canManage()}
										<th>Phone</th>
										<th>Email</th>
										<th>Actions</th>
									{/if}
								</tr>
							</thead>
							<tbody>
								{#each rows() as trainer}
									<tr class="hover">
										<td>
											<div class="font-semibold">{trainer.fullName}</div>
											{#if trainer.displayName}
												<div class="text-xs opacity-60">{trainer.displayName}</div>
											{/if}
										</td>
										<td class="text-sm">{trainer.specialty ?? 'â€”'}</td>
										<td>
											<span
												class={`badge ${trainer.isActive ? 'badge-success' : 'badge-ghost'}`}
											>
												{trainer.isActive ? 'ACTIVE' : 'INACTIVE'}
											</span>
										</td>
										<td class="text-sm">{formatDateTime(trainer.updatedAt)}</td>
										{#if canManage()}
											<td class="text-sm">{trainer.phone ?? 'â€”'}</td>
											<td class="text-sm">{trainer.email ?? 'â€”'}</td>
											<td>
												<div class="flex flex-wrap gap-2">
													<label
														for={`edit-trainer-${trainer.id}`}
														class="btn btn-xs"
													>
														Edit
													</label>
													<form method="POST" action="?/toggleActive" onsubmit={lockSubmit}>
														<input type="hidden" name="id" value={trainer.id} />
														<input
															type="hidden"
															name="isActive"
															value={trainer.isActive ? 'false' : 'true'}
														/>
														<button
															class={`btn btn-xs ${
																trainer.isActive ? 'btn-ghost text-warning' : 'btn-ghost text-success'
															}`}
															type="submit"
														>
															{trainer.isActive ? 'Deactivate' : 'Activate'}
														</button>
													</form>
												</div>
											</td>
										{/if}
									</tr>
								{/each}
							</tbody>
						</table>
					</div>
				{:else}
					<EmptyState
						title={q() || !activeOnly() ? 'No trainers found' : 'No trainers yet'}
						description={
							q() || !activeOnly()
								? 'Try adjusting the search or active filter.'
								: 'Add your first trainer to start scheduling.'
						}
					/>
				{/if}

				<div class="flex flex-wrap items-center justify-between gap-3">
					<p class="text-sm opacity-70">
						Page {page()} of {totalPages()}
					</p>
					<div class="join">
						<a
							class={`btn btn-sm join-item ${hasPrev() ? '' : 'btn-disabled'}`}
							href={hasPrev() ? buildPageUrl(page() - 1) : '#'}
							aria-disabled={!hasPrev()}
						>
							Prev
						</a>
						<a
							class={`btn btn-sm join-item ${hasNext() ? '' : 'btn-disabled'}`}
							href={hasNext() ? buildPageUrl(page() + 1) : '#'}
							aria-disabled={!hasNext()}
						>
							Next
						</a>
					</div>
				</div>
			</div>
		</div>

		{#if canManage()}
			{#each rows() as trainer}
				<input type="checkbox" id={`edit-trainer-${trainer.id}`} class="modal-toggle" />
				<div class="modal" role="dialog">
					<div class="modal-box">
						<label
							for={`edit-trainer-${trainer.id}`}
							class="btn btn-sm btn-circle btn-ghost absolute right-2 top-2"
						>
							x
						</label>
						<h3 class="text-lg font-semibold">Edit Trainer</h3>
						<form
							method="POST"
							action="?/update"
							class="mt-4 space-y-4"
							onsubmit={lockSubmit}
						>
							<input type="hidden" name="id" value={trainer.id} />

							<div class="form-control">
								<label class="label" for={`fullName-${trainer.id}`}>
									<span class="label-text">Full name</span>
								</label>
								<!-- svelte-ignore a11y_autofocus -->
								<input
									id={`fullName-${trainer.id}`}
									name="fullName"
									class="input input-bordered"
									required
									value={trainer.fullName}
									autofocus
								/>
							</div>

							<div class="form-control">
								<label class="label" for={`displayName-${trainer.id}`}>
									<span class="label-text">Display name</span>
								</label>
								<input
									id={`displayName-${trainer.id}`}
									name="displayName"
									class="input input-bordered"
									value={trainer.displayName ?? ''}
								/>
							</div>

							<div class="form-control">
								<label class="label" for={`specialty-${trainer.id}`}>
									<span class="label-text">Specialty</span>
								</label>
								<input
									id={`specialty-${trainer.id}`}
									name="specialty"
									class="input input-bordered"
									value={trainer.specialty ?? ''}
								/>
							</div>

							<div class="form-control">
								<label class="label" for={`phone-${trainer.id}`}>
									<span class="label-text">Phone</span>
								</label>
								<input
									id={`phone-${trainer.id}`}
									name="phone"
									class="input input-bordered"
									value={trainer.phone ?? ''}
								/>
							</div>

							<div class="form-control">
								<label class="label" for={`email-${trainer.id}`}>
									<span class="label-text">Email</span>
								</label>
								<input
									id={`email-${trainer.id}`}
									name="email"
									type="email"
									class="input input-bordered"
									value={trainer.email ?? ''}
								/>
							</div>

							<div class="form-control">
								<label class="label" for={`photo-${trainer.id}`}>
									<span class="label-text">Photo media id</span>
								</label>
								<input
									id={`photo-${trainer.id}`}
									name="photoMediaId"
									class="input input-bordered"
									value={trainer.photoMediaId ?? ''}
								/>
							</div>

							<div class="form-control">
								<label class="label" for={`bio-${trainer.id}`}>
									<span class="label-text">Bio</span>
								</label>
								<textarea
									id={`bio-${trainer.id}`}
									name="bio"
									class="textarea textarea-bordered"
									rows="4"
								>{trainer.bio ?? ''}</textarea>
							</div>

							<div class="modal-action">
								<label for={`edit-trainer-${trainer.id}`} class="btn btn-ghost">
									Cancel
								</label>
								<button class="btn btn-primary" type="submit">
									Save Changes
								</button>
							</div>
						</form>
					</div>
				</div>
			{/each}
		{/if}

		{#if canManage()}
			<input type="checkbox" id="add-trainer-modal" class="modal-toggle" />
			<div class="modal" role="dialog">
				<div class="modal-box">
					<label
						for="add-trainer-modal"
						class="btn btn-sm btn-circle btn-ghost absolute right-2 top-2"
					>
						x
					</label>
					<h3 class="text-lg font-semibold">Add Trainer</h3>
					<form
						method="POST"
						action="?/create"
						class="mt-4 space-y-4"
						onsubmit={lockSubmit}
					>
						<div class="form-control">
							<label class="label" for="fullName">
								<span class="label-text">Full name</span>
							</label>
							<!-- svelte-ignore a11y_autofocus -->
							<input
								id="fullName"
								name="fullName"
								class="input input-bordered"
								required
								placeholder="Trainer name"
								autofocus
							/>
						</div>

						<div class="form-control">
							<label class="label" for="displayName">
								<span class="label-text">Display name</span>
							</label>
							<input
								id="displayName"
								name="displayName"
								class="input input-bordered"
								placeholder="Preferred display name"
							/>
						</div>

						<div class="form-control">
							<label class="label" for="specialty">
								<span class="label-text">Specialty</span>
							</label>
							<input
								id="specialty"
								name="specialty"
								class="input input-bordered"
								placeholder="Strength, HIIT, Yoga"
							/>
						</div>

						<div class="form-control">
							<label class="label" for="phone">
								<span class="label-text">Phone</span>
							</label>
							<input id="phone" name="phone" class="input input-bordered" />
						</div>

						<div class="form-control">
							<label class="label" for="email">
								<span class="label-text">Email</span>
							</label>
							<input id="email" name="email" type="email" class="input input-bordered" />
						</div>

						<div class="form-control">
							<label class="label" for="photoMediaId">
								<span class="label-text">Photo media id</span>
							</label>
							<input
								id="photoMediaId"
								name="photoMediaId"
								class="input input-bordered"
							/>
						</div>

						<div class="form-control">
							<label class="label" for="bio">
								<span class="label-text">Bio</span>
							</label>
							<textarea
								id="bio"
								name="bio"
								class="textarea textarea-bordered"
								rows="4"
								placeholder="Short trainer bio"
							></textarea>
						</div>

						<div class="modal-action">
							<label for="add-trainer-modal" class="btn btn-ghost">Cancel</label>
							<button class="btn btn-primary" type="submit">Create Trainer</button>
						</div>
					</form>
				</div>
			</div>
		{/if}
	</div>
</div>

