<script lang="ts">
	let { data, form } = $props();

	const settings = () => form?.settings ?? data.settings;
</script>

<svelte:head>
	<title>Attendance Settings</title>
</svelte:head>

<div class="min-h-screen bg-base-200">
	<div class="mx-auto flex max-w-3xl flex-col gap-6 p-6">
		<div class="prose max-w-none">
			<h1>Attendance Settings</h1>
			<p class="text-sm opacity-70">
				Configure duplicate protection and access controls for attendance check-in.
			</p>
		</div>

		{#if form?.success === false && form?.message}
			<div role="alert" class="alert alert-error">
				<span>{form.message}</span>
			</div>
		{/if}

		{#if form?.success}
			<div role="alert" class="alert alert-success">
				<span>Attendance settings updated.</span>
			</div>
		{/if}

		<div class="card bg-base-100 shadow">
			<div class="card-body">
				<form method="POST" action="?/save" class="space-y-6">
					<div class="form-control">
						<label class="label" for="duplicateWindowMinutes">
							<span class="label-text">Duplicate window (minutes)</span>
						</label>
						<input
							class="input input-bordered"
							id="duplicateWindowMinutes"
							name="duplicateWindowMinutes"
							type="number"
							min="1"
							max="60"
							required
							value={settings().duplicateWindowMinutes}
						/>
						<p class="text-xs opacity-70">Prevents accidental double check-ins within this window.</p>
					</div>

					<div class="form-control">
						<label class="label cursor-pointer justify-start gap-3">
							<input
								class="checkbox"
								name="requireMemberCode"
								type="checkbox"
								checked={settings().requireMemberCode}
							/>
							<span class="label-text">Require member code for search</span>
						</label>
						<p class="text-xs opacity-70">Disables name search on the check-in screen.</p>
					</div>

					<div class="form-control">
						<label class="label cursor-pointer justify-start gap-3">
							<input
								class="checkbox"
								name="requireAuth"
								type="checkbox"
								checked={settings().requireAuth}
							/>
							<span class="label-text">Require staff login for check-in</span>
						</label>
						<p class="text-xs opacity-70">
							When enabled, /attendance/check-in requires a staff session.
						</p>
					</div>

					<div class="form-control">
						<label class="label cursor-pointer justify-start gap-3">
							<input
								class="checkbox"
								name="blockIfExpired"
								type="checkbox"
								checked={settings().blockIfExpired}
							/>
							<span class="label-text">Block expired members</span>
						</label>
						<p class="text-xs opacity-70">
							When enabled, members without an active membership cannot check in.
						</p>
					</div>

					<div class="form-control">
						<label class="label" for="graceDays">
							<span class="label-text">Grace period (days)</span>
						</label>
						<input
							class="input input-bordered"
							id="graceDays"
							name="graceDays"
							type="number"
							min="0"
							max="30"
							required
							value={settings().graceDays}
						/>
						<p class="text-xs opacity-70">
							Allows check-in for this many days after membership expiry.
						</p>
					</div>

					<div class="form-control">
						<label class="label cursor-pointer justify-start gap-3">
							<input
								class="checkbox"
								name="blockIfFrozen"
								type="checkbox"
								checked={settings().blockIfFrozen}
							/>
							<span class="label-text">Block frozen members</span>
						</label>
						<p class="text-xs opacity-70">
							When enabled, frozen members are always blocked from check-in.
						</p>
					</div>

					<div class="form-control">
						<label class="label cursor-pointer justify-start gap-3">
							<input
								class="checkbox"
								name="allowWithoutActiveMembership"
								type="checkbox"
								checked={settings().allowWithoutActiveMembership}
							/>
							<span class="label-text">Allow check-in without active membership</span>
						</label>
						<p class="text-xs opacity-70">
							Overrides the expired membership block for front desk exceptions.
						</p>
					</div>

					<div class="flex justify-end">
						<button class="btn btn-primary" type="submit">Save Settings</button>
					</div>
				</form>
			</div>
		</div>
	</div>
</div>
