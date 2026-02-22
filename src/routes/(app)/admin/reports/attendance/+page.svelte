<script lang="ts">
	let { data } = $props();

	const rows = () => data.rows ?? [];
	const totals = () => data.totals ?? { totalCheckIns: 0, totalUniqueMembers: 0 };
	const pagination = () => data.pagination;
	const from = () => data.filter?.from ?? '';
	const to = () => data.filter?.to ?? '';
	const errorMessage = () => data.errorMessage ?? '';
	const page = () => pagination().page;
	const totalPages = () => pagination().totalPages;
	const pageSize = () => pagination().pageSize;

	const buildPageUrl = (targetPage: number) => {
		const params = new URLSearchParams();
		if (from()) params.set('from', from());
		if (to()) params.set('to', to());
		if (targetPage > 1) params.set('page', String(targetPage));
		if (pageSize() !== 31) params.set('pageSize', String(pageSize()));
		const queryString = params.toString();
		return queryString ? `/admin/reports/attendance?${queryString}` : '/admin/reports/attendance';
	};

	const exportUrl = () => {
		const params = new URLSearchParams();
		if (from()) params.set('from', from());
		if (to()) params.set('to', to());
		const queryString = params.toString();
		return queryString
			? `/admin/reports/attendance/export.csv?${queryString}`
			: '/admin/reports/attendance/export.csv';
	};

	const hasPrev = () => page() > 1;
	const hasNext = () => page() < totalPages();
</script>

<svelte:head>
	<title>Attendance Report</title>
</svelte:head>

<div class="min-h-screen bg-base-200">
	<div class="mx-auto flex max-w-6xl flex-col gap-6 p-6">
		<div class="prose max-w-none">
			<h1>Attendance Report</h1>
			<p class="text-sm opacity-70">Daily check-ins and unique member visits by date.</p>
		</div>

		<div class="tabs tabs-boxed">
			<a class="tab" href="/admin/reports">Overview</a>
			<a class="tab tab-active" href="/admin/reports/attendance">Attendance</a>
			<a class="tab" href="/admin/reports/revenue">Revenue</a>
			<a class="tab" href="/admin/reports/memberships">Memberships</a>
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
						<label class="label" for="from">
							<span class="label-text">From</span>
						</label>
						<input
							id="from"
							name="from"
							type="date"
							class="input input-bordered"
							value={from()}
						/>
					</div>
					<div class="form-control">
						<label class="label" for="to">
							<span class="label-text">To</span>
						</label>
						<input
							id="to"
							name="to"
							type="date"
							class="input input-bordered"
							value={to()}
						/>
					</div>
					<button class="btn btn-primary" type="submit">Apply</button>
				</form>
				<p class="text-xs opacity-70">Range defaults to the last 7 days (max 90 days).</p>
			</div>
		</div>

		<div class="stats stats-vertical bg-base-100 shadow lg:stats-horizontal">
			<div class="stat">
				<div class="stat-title">Total Check-ins</div>
				<div class="stat-value text-primary">{totals().totalCheckIns}</div>
			</div>
			<div class="stat">
				<div class="stat-title">Unique Members</div>
				<div class="stat-value">{totals().totalUniqueMembers}</div>
			</div>
		</div>

		<div class="card bg-base-100 shadow">
			<div class="card-body gap-4">
				<div class="flex flex-wrap items-center justify-between gap-2">
					<h2 class="card-title">Daily Attendance</h2>
					<div class="flex items-center gap-2">
						<p class="text-sm opacity-70">Total {pagination().total}</p>
						<a class="btn btn-sm" href={exportUrl()}>Export CSV</a>
					</div>
				</div>

				{#if rows().length}
					<div class="overflow-x-auto">
						<table class="table table-sm">
							<thead>
								<tr>
									<th>Date</th>
									<th>Check-ins</th>
									<th>Unique Members</th>
								</tr>
							</thead>
							<tbody>
								{#each rows() as row}
									<tr class="hover">
										<td>{row.date}</td>
										<td class="font-mono text-sm">{row.checkInsCount}</td>
										<td class="font-mono text-sm">{row.uniqueMembersCount}</td>
									</tr>
								{/each}
							</tbody>
						</table>
					</div>
				{:else}
					<p class="text-sm opacity-60">No attendance records found for this range.</p>
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
	</div>
</div>
