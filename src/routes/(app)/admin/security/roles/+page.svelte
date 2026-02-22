<script lang="ts">
	let { data, form } = $props();

	const roles = () => data.roles;

	const confirmDelete = (event: SubmitEvent) => {
		if (!confirm('Delete this role? This cannot be undone.')) {
			event.preventDefault();
		}
	};
</script>

<svelte:head>
	<title>Security Roles</title>
</svelte:head>

<div class="min-h-screen bg-base-200">
	<div class="mx-auto flex max-w-5xl flex-col gap-6 p-6">
		<div class="flex flex-wrap items-end justify-between gap-4">
			<div class="prose max-w-none">
				<h1>Security Roles</h1>
				<p class="text-sm opacity-70">
					Create roles, review permissions, and see how roles are assigned.
				</p>
			</div>
			<form method="GET" class="flex flex-wrap items-center gap-2">
				<label class="input input-bordered flex items-center gap-2">
					<input
						name="q"
						type="search"
						class="grow"
						placeholder="Search roles"
						value={data.filter.search}
					/>
				</label>
				<button class="btn btn-outline" type="submit">Search</button>
			</form>
		</div>

		{#if form?.success === false && form?.message}
			<div role="alert" class="alert alert-error">
				<span>{form.message}</span>
			</div>
		{/if}

		{#if form?.success && form?.action === 'create'}
			<div role="alert" class="alert alert-success">
				<span>Role created successfully.</span>
			</div>
		{/if}

		{#if form?.success && form?.action === 'delete'}
			<div role="alert" class="alert alert-success">
				<span>Role deleted successfully.</span>
			</div>
		{/if}

		<div class="grid gap-6 lg:grid-cols-[2fr_1fr]">
			<div class="card bg-base-100 shadow">
				<div class="card-body">
					<div class="flex items-center justify-between">
						<h2 class="card-title">Role List</h2>
						<span class="text-sm opacity-60">{roles().length} roles</span>
					</div>

					<div class="overflow-x-auto">
						<table class="table">
							<thead>
								<tr>
									<th>Role</th>
									<th>Permissions</th>
									<th>Users</th>
									<th class="text-right">Actions</th>
								</tr>
							</thead>
							<tbody>
								{#if roles().length === 0}
									<tr>
										<td colspan="4" class="text-center text-sm opacity-60">
											No roles found.
										</td>
									</tr>
								{:else}
									{#each roles() as role}
										<tr>
											<td>
												<div class="font-semibold">{role.name}</div>
												{#if role.description}
													<div class="text-xs opacity-70">{role.description}</div>
												{:else}
													<div class="text-xs opacity-50">No description</div>
												{/if}
											</td>
											<td>
												<span class="badge badge-ghost">{role.permissionCount}</span>
											</td>
											<td>
												<span class="badge badge-ghost">{role.userCount}</span>
												{#if role.userCount > 0}
													<span class="ml-2 text-xs opacity-60">In use</span>
												{/if}
											</td>
											<td>
												<div class="flex justify-end gap-2">
													<a class="btn btn-sm btn-outline" href={`/admin/security/roles/${role.id}`}>
														Manage
													</a>
													<form method="POST" action="?/delete" onsubmit={confirmDelete}>
														<input type="hidden" name="roleId" value={role.id} />
														<button
															class="btn btn-sm btn-error btn-outline"
															disabled={role.userCount > 0}
															aria-disabled={role.userCount > 0}
															title={role.userCount > 0 ? 'Role is in use' : 'Delete role'}
														>
															Delete
														</button>
													</form>
												</div>
											</td>
										</tr>
									{/each}
								{/if}
							</tbody>
						</table>
					</div>
				</div>
			</div>

			<div class="card bg-base-100 shadow">
				<div class="card-body space-y-4">
					<h2 class="card-title">Create Role</h2>
					<form method="POST" action="?/create" class="space-y-4">
						<div class="form-control">
							<label class="label" for="name">
								<span class="label-text">Role name</span>
							</label>
							<input
								id="name"
								name="name"
								type="text"
								class="input input-bordered"
								required
								maxlength="60"
								placeholder="e.g. ACCOUNTING"
							/>
							<p class="text-xs opacity-60">Keep it short and descriptive.</p>
						</div>
						<div class="form-control">
							<label class="label" for="description">
								<span class="label-text">Description</span>
							</label>
							<textarea
								id="description"
								name="description"
								class="textarea textarea-bordered"
								rows="3"
								maxlength="280"
								placeholder="Optional notes for admins"
							></textarea>
						</div>
						<div class="flex justify-end">
							<button class="btn btn-primary" type="submit">Create Role</button>
						</div>
					</form>
				</div>
			</div>
		</div>
	</div>
</div>
