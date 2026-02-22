<script lang="ts">
	let { data } = $props();

	const counts = () => data.counts ?? { active: 0, expired: 0, frozen: 0 };
	const breakdown = () => data.planBreakdown ?? [];
	const asOf = () => data.filter?.asOf ?? '';
	const errorMessage = () => data.errorMessage ?? '';

	const totalMembers = () => counts().active + counts().expired + counts().frozen;

	const exportUrl = () => {
		const params = new URLSearchParams();
		if (asOf()) params.set('asOf', asOf());
		const queryString = params.toString();
		return queryString
			? `/admin/reports/memberships/export.csv?${queryString}`
			: '/admin/reports/memberships/export.csv';
	};
</script>

<svelte:head>
	<title>Membership Status Report</title>
</svelte:head>

<div class="min-h-screen bg-base-200">
	<div class="mx-auto flex max-w-6xl flex-col gap-6 p-6">
		<div class="prose max-w-none">
			<h1>Membership Status</h1>
			<p class="text-sm opacity-70">Snapshot of membership health as of a specific date.</p>
		</div>

		<div class="tabs tabs-boxed">
			<a class="tab" href="/admin/reports">Overview</a>
			<a class="tab" href="/admin/reports/attendance">Attendance</a>
			<a class="tab" href="/admin/reports/revenue">Revenue</a>
			<a class="tab tab-active" href="/admin/reports/memberships">Memberships</a>
		</div>

		{#if errorMessage()}
			<div class="alert alert-warning">
				<span>{errorMessage()}</span>
			</div>
		{/if}

		<div class="card bg-base-100 shadow">
			<div class="card-body space-y-4">
				<h2 class="card-title">Filters</h2>
				<form method="GET" class="flex flex-col gap-3 sm:flex-row sm:items-end">
					<div class="form-control">
						<label class="label" for="asOf">
							<span class="label-text">As of</span>
						</label>
						<input
							id="asOf"
							name="asOf"
							type="date"
							class="input input-bordered"
							value={asOf()}
						/>
					</div>
					<button class="btn btn-primary" type="submit">Apply</button>
				</form>
				<p class="text-xs opacity-70">Defaults to today.</p>
			</div>
		</div>

		<div class="stats stats-vertical bg-base-100 shadow lg:stats-horizontal">
			<div class="stat">
				<div class="stat-title">Active</div>
				<div class="stat-value text-primary">{counts().active}</div>
			</div>
			<div class="stat">
				<div class="stat-title">Expired</div>
				<div class="stat-value">{counts().expired}</div>
			</div>
			<div class="stat">
				<div class="stat-title">Frozen</div>
				<div class="stat-value">{counts().frozen}</div>
			</div>
			<div class="stat">
				<div class="stat-title">Total Members</div>
				<div class="stat-value">{totalMembers()}</div>
			</div>
		</div>

		<div class="card bg-base-100 shadow">
			<div class="card-body gap-4">
				<div class="flex flex-wrap items-center justify-between gap-2">
					<h2 class="card-title">Active Memberships by Plan</h2>
					<a class="btn btn-sm" href={exportUrl()}>Export CSV</a>
				</div>

				{#if breakdown().length}
					<div class="overflow-x-auto">
						<table class="table table-sm">
							<thead>
								<tr>
									<th>Plan</th>
									<th>Active Members</th>
								</tr>
							</thead>
							<tbody>
								{#each breakdown() as plan}
									<tr class="hover">
										<td>{plan.planName}</td>
										<td class="font-mono text-sm">{plan.activeCount}</td>
									</tr>
								{/each}
							</tbody>
						</table>
					</div>
					<p class="text-xs opacity-70">Showing up to the top 5 plans by active members.</p>
				{:else}
					<p class="text-sm opacity-60">No active memberships for this date.</p>
				{/if}
			</div>
		</div>
	</div>
</div>
