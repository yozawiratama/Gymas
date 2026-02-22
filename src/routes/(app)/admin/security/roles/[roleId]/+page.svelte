<script lang="ts">
	let { data, form } = $props();

	const role = () => data.role;
	const assignedPermissionIds = () => new Set(data.role.permissionIds);
	const activeTab = () => data.tab ?? 'permissions';
</script>

<svelte:head>
	<title>Role {role().name}</title>
</svelte:head>

<div class="min-h-screen bg-base-200">
	<div class="mx-auto flex max-w-5xl flex-col gap-6 p-6">
		<div class="flex flex-wrap items-center justify-between gap-4">
			<div class="prose max-w-none">
				<h1>{role().name}</h1>
				<p class="text-sm opacity-70">Manage permissions and assignments for this role.</p>
			</div>
			<a class="btn btn-outline" href="/admin/security/roles">Back to roles</a>
		</div>

		{#if form?.success === false && form?.message}
			<div role="alert" class="alert alert-error">
				<span>{form.message}</span>
			</div>
		{/if}

		{#if form?.success && form?.action === 'updateDescription'}
			<div role="alert" class="alert alert-success">
				<span>Role description updated.</span>
			</div>
		{/if}

		{#if form?.success && form?.action === 'updatePermissions'}
			<div role="alert" class="alert alert-success">
				<span>Role permissions updated.</span>
			</div>
		{/if}

		<div class="card bg-base-100 shadow">
			<div class="card-body space-y-6">
				<h2 class="card-title">Role Details</h2>
				<form method="POST" action="?/updateDescription" class="space-y-4">
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
							placeholder="Optional description"
						>{role().description ?? ''}</textarea>
					</div>
					<div class="flex justify-end">
						<button class="btn btn-primary" type="submit">Save Description</button>
					</div>
				</form>
			</div>
		</div>

		<div class="tabs tabs-boxed">
			<a
				class={`tab ${activeTab() === 'permissions' ? 'tab-active' : ''}`}
				href="?tab=permissions"
			>
				Permissions
			</a>
			<a class={`tab ${activeTab() === 'users' ? 'tab-active' : ''}`} href="?tab=users">
				Users
			</a>
		</div>

		{#if activeTab() === 'users'}
			<div class="card bg-base-100 shadow">
				<div class="card-body">
					<h2 class="card-title">Assigned Users</h2>
					{#if role().users.length === 0}
						<p class="text-sm opacity-60">No users are assigned to this role.</p>
					{:else}
						<div class="overflow-x-auto">
							<table class="table">
								<thead>
									<tr>
										<th>Username</th>
										<th>Status</th>
									</tr>
								</thead>
								<tbody>
									{#each role().users as user}
										<tr>
											<td>{user.username}</td>
											<td>
												<span class={`badge ${user.isActive ? 'badge-success' : 'badge-ghost'}`}>
													{user.isActive ? 'Active' : 'Inactive'}
												</span>
											</td>
										</tr>
									{/each}
								</tbody>
							</table>
						</div>
					{/if}
				</div>
			</div>
		{:else}
			<div class="card bg-base-100 shadow">
				<div class="card-body space-y-4">
					<div class="flex flex-wrap items-center justify-between gap-2">
						<h2 class="card-title">Permissions</h2>
						<span class="text-sm opacity-60">
							{role().permissionIds.length} assigned
						</span>
					</div>

					<form method="POST" action="?/updatePermissions" class="space-y-4">
						<div class="grid gap-3 sm:grid-cols-2">
							{#each data.permissions as permission}
								<label class="card border border-base-200 p-3">
									<div class="flex items-start gap-3">
										<input
											type="checkbox"
											class="checkbox checkbox-primary"
											name="permissionIds"
											value={permission.id}
											checked={assignedPermissionIds().has(permission.id)}
										/>
										<div>
											<div class="font-medium">{permission.key}</div>
											{#if permission.description}
												<div class="text-xs opacity-60">{permission.description}</div>
											{/if}
										</div>
									</div>
								</label>
							{/each}
						</div>
						<div class="flex justify-end">
							<button class="btn btn-primary" type="submit">Save Permissions</button>
						</div>
					</form>
				</div>
			</div>
		{/if}
	</div>
</div>
