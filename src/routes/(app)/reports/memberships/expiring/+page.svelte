<script lang="ts">
	import EmptyState from '$lib/components/EmptyState.svelte';

	let { data } = $props();

	const rows = () => data.rows ?? [];
	const pagination = () =>
		data.pagination ?? { total: 0, page: 1, pageSize: 20, totalPages: 1 };
	const filter = () => data.filter ?? { days: 7, q: '' };
	const days = () => filter().days ?? 7;
	const query = () => filter().q ?? '';
	const page = () => pagination().page ?? 1;
	const totalPages = () => Math.max(1, pagination().totalPages ?? 1);
	const pageSize = () => pagination().pageSize ?? 20;
	const defaultPageSize = 20;

	const formatDate = (value: string | null | undefined) => {
		if (!value) return '-';
		return new Date(value).toLocaleDateString();
	};

	const buildPageUrl = (
		targetPage: number,
		overrides: {
			days?: number;
			query?: string;
			pageSize?: number;
		} = {}
	) => {
		const params = new URLSearchParams();
		const nextDays = overrides.days ?? days();
		const nextQuery = overrides.query ?? query();
		const nextPageSize = overrides.pageSize ?? pageSize();
		if (nextDays) params.set('days', String(nextDays));
		if (nextQuery) params.set('q', nextQuery);
		if (targetPage > 1) params.set('page', String(targetPage));
		if (nextPageSize !== defaultPageSize) params.set('pageSize', String(nextPageSize));
		const queryString = params.toString();
		return queryString
			? `/reports/memberships/expiring?${queryString}`
			: '/reports/memberships/expiring';
	};

	const hasPrev = () => page() > 1;
	const hasNext = () => page() < totalPages();
</script>

<svelte:head>
	<title>Expiring Memberships</title>
</svelte:head>

<div class="min-h-screen bg-base-200">
	<div class="mx-auto flex max-w-6xl flex-col gap-6 p-6">
		<div class="prose max-w-none">
			<h1>Expiring Memberships</h1>
			<p class="text-sm opacity-70">
				Members whose memberships end within the selected window.
			</p>
		</div>

		<div class="card bg-base-100 shadow">
			<div class="card-body space-y-4">
				<h2 class="card-title">Filters</h2>
				<form method="GET" class="flex flex-col gap-3 sm:flex-row sm:items-end">
					<div class="form-control">
						<label class="label" for="days">
							<span class="label-text">Days</span>
						</label>
						<select id="days" name="days" class="select select-bordered">
							<option value="7" selected={days() === 7}>Next 7 days</option>
							<option value="14" selected={days() === 14}>Next 14 days</option>
							<option value="30" selected={days() === 30}>Next 30 days</option>
							<option value="60" selected={days() === 60}>Next 60 days</option>
						</select>
					</div>
					<div class="form-control flex-1">
						<label class="label" for="q">
							<span class="label-text">Search</span>
						</label>
						<input
							id="q"
							name="q"
							class="input input-bordered"
							placeholder="Search by name or member code"
							value={query()}
						/>
					</div>
					<button class="btn btn-primary" type="submit">Apply</button>
					{#if query()}
						<a class="btn btn-ghost" href={buildPageUrl(1, { query: '' })}>Clear</a>
					{/if}
				</form>
				<p class="text-xs opacity-70">
					Window defaults to the next 7 days. Results are scoped to the active branch.
				</p>
			</div>
		</div>

		<div class="card bg-base-100 shadow">
			<div class="card-body gap-4">
				<div class="flex flex-wrap items-center justify-between gap-2">
					<div class="flex flex-wrap items-center gap-3">
						<h2 class="card-title">Expiring Members</h2>
						<p class="text-sm opacity-70">Total {pagination().total}</p>
					</div>
					<form method="POST" action="?/exportCsv">
						<input type="hidden" name="days" value={days()} />
						{#if query()}
							<input type="hidden" name="q" value={query()} />
						{/if}
						<button class="btn btn-sm" type="submit">Export CSV</button>
					</form>
				</div>

				{#if rows().length}
					<div class="overflow-x-auto">
						<table class="table table-sm">
							<thead>
								<tr>
									<th>Member</th>
									<th>Plan</th>
									<th>End Date</th>
									<th>Days Left</th>
									<th>Action</th>
								</tr>
							</thead>
							<tbody>
								{#each rows() as row}
									<tr class="hover">
										<td>
											<div class="font-semibold">{row.memberName}</div>
											<div class="text-xs opacity-60">{row.memberCode}</div>
										</td>
										<td>{row.planName}</td>
										<td>{formatDate(row.endAt)}</td>
										<td class="font-mono text-sm">{row.daysLeft}</td>
										<td>
											<a class="btn btn-ghost btn-xs" href={`/members/${row.memberId}`}>
												Open Profile
											</a>
										</td>
									</tr>
								{/each}
							</tbody>
						</table>
					</div>
				{:else}
					<EmptyState
						title="No expiring memberships"
						description={`No memberships end within the next ${days()} days.`}
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
	</div>
</div>
