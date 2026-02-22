<script lang="ts">
	let { data, form } = $props();

	let modal: HTMLDialogElement | null = null;
	let selectedUser = $state<(typeof data.users)[number] | null>(null);
	let selectedRoleIds = $state<string[]>([]);

	const openModal = (user: (typeof data.users)[number]) => {
		selectedUser = user;
		selectedRoleIds = [...user.roleIds];
		modal?.showModal();
	};

	const closeModal = () => {
		modal?.close();
	};

	$effect(() => {
		if (form?.success && form?.action === 'updateRoles') {
			modal?.close();
		}
	});
</script>

<svelte:head>
	<title>User Roles</title>
</svelte:head>

<div class="min-h-screen bg-base-200">
	<div class="mx-auto flex max-w-5xl flex-col gap-6 p-6">
		<div class="flex flex-wrap items-end justify-between gap-4">
			<div class="prose max-w-none">
				<h1>User Role Assignment</h1>
				<p class="text-sm opacity-70">Assign roles to users and review their access.</p>
			</div>
			<form method="GET" class="flex flex-wrap items-center gap-2">
				<label class="input input-bordered flex items-center gap-2">
					<input
						name="q"
						type="search"
						class="grow"
						placeholder="Search users"
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

		{#if form?.success && form?.action === 'updateRoles'}
			<div role="alert" class="alert alert-success">
				<span>User roles updated.</span>
			</div>
		{/if}

		<div class="card bg-base-100 shadow">
			<div class="card-body">
				<div class="flex items-center justify-between">
					<h2 class="card-title">Users</h2>
					<span class="text-sm opacity-60">{data.users.length} users</span>
				</div>

				<div class="overflow-x-auto">
					<table class="table">
						<thead>
							<tr>
								<th>Username</th>
								<th>Roles</th>
								<th>Status</th>
								<th class="text-right">Actions</th>
							</tr>
						</thead>
						<tbody>
							{#if data.users.length === 0}
								<tr>
									<td colspan="4" class="text-center text-sm opacity-60">
										No users found.
									</td>
								</tr>
							{:else}
								{#each data.users as user}
									<tr>
										<td class="font-semibold">{user.username}</td>
										<td>
											{#if user.roleNames.length > 0}
												<div class="flex flex-wrap gap-2">
													{#each user.roleNames as roleName}
														<span class="badge badge-ghost">{roleName}</span>
													{/each}
												</div>
											{:else}
												<span class="text-xs opacity-60">Legacy role: {user.legacyRole}</span>
											{/if}
										</td>
										<td>
											<span class={`badge ${user.isActive ? 'badge-success' : 'badge-ghost'}`}>
												{user.isActive ? 'Active' : 'Inactive'}
											</span>
										</td>
										<td>
											<div class="flex justify-end">
												<button
													class="btn btn-sm btn-outline"
													onclick={() => openModal(user)}
												>
													Assign roles
												</button>
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
	</div>
</div>

<dialog class="modal" bind:this={modal}>
	<div class="modal-box">
		<form method="dialog">
			<button class="btn btn-sm btn-circle btn-ghost absolute right-2 top-2" aria-label="Close">
				?
			</button>
		</form>
		<h3 class="font-bold text-lg">Assign Roles</h3>
		<p class="text-sm opacity-60">
			{#if selectedUser}
				Update roles for <span class="font-semibold">{selectedUser.username}</span>.
			{:else}
				Select a user to update roles.
			{/if}
		</p>

		<form method="POST" action="?/updateRoles" class="mt-4 space-y-4">
			<input type="hidden" name="userId" value={selectedUser?.id ?? ''} />

			<div class="grid gap-3 sm:grid-cols-2">
				{#each data.roles as role}
					<label class="card border border-base-200 p-3">
						<div class="flex items-start gap-3">
							<input
								type="checkbox"
								class="checkbox checkbox-primary"
								name="roleIds"
								value={role.id}
								bind:group={selectedRoleIds}
							/>
							<div>
								<div class="font-medium">{role.name}</div>
								{#if role.description}
									<div class="text-xs opacity-60">{role.description}</div>
								{/if}
							</div>
						</div>
					</label>
				{/each}
			</div>

			{#if selectedRoleIds.length === 0}
				<div class="alert alert-warning">
					<span>No roles selected. The user will fall back to their legacy role.</span>
				</div>
			{/if}

			<div class="flex justify-end gap-2">
				<button type="button" class="btn btn-ghost" onclick={closeModal}>Cancel</button>
				<button class="btn btn-primary" type="submit" disabled={!selectedUser}>Save Roles</button>
			</div>
		</form>
	</div>
	<form method="dialog" class="modal-backdrop">
		<button>close</button>
	</form>
</dialog>



