<script lang="ts">
	import EmptyState from '$lib/components/EmptyState.svelte';

	let { data } = $props();

	const rows = () => data.rows ?? [];
	const pagination = () =>
		data.pagination ?? { total: 0, page: 1, pageSize: 20, totalPages: 1 };
	const filter = () => data.filter ?? { days: 14, membershipFilter: 'active' };
	const days = () => filter().days ?? 14;
	const membershipFilter = () => filter().membershipFilter ?? 'active';
	const page = () => pagination().page ?? 1;
	const totalPages = () => Math.max(1, pagination().totalPages ?? 1);
	const pageSize = () => pagination().pageSize ?? 20;
	const defaultPageSize = 20;

	const formatDate = (value: string | null | undefined) => {
		if (!value) return '-';
		return new Date(value).toLocaleDateString();
	};

	const formatDays = (value: number | null | undefined) => {
		if (value === null || value === undefined) return '-';
		return String(value);
	};

	const buildPageUrl = (
		targetPage: number,
		overrides: {
			days?: number;
			membershipFilter?: string;
			pageSize?: number;
		} = {}
	) => {
		const params = new URLSearchParams();
		const nextDays = overrides.days ?? days();
		const nextMembershipFilter = overrides.membershipFilter ?? membershipFilter();
		const nextPageSize = overrides.pageSize ?? pageSize();
		if (nextDays) params.set('days', String(nextDays));
		if (nextMembershipFilter) params.set('membershipFilter', nextMembershipFilter);
		if (targetPage > 1) params.set('page', String(targetPage));
		if (nextPageSize !== defaultPageSize) params.set('pageSize', String(nextPageSize));
		const queryString = params.toString();
		return queryString ? `/reports/members/inactive?${queryString}` : '/reports/members/inactive';
	};

	const hasPrev = () => page() > 1;
	const hasNext = () => page() < totalPages();
</script>

<svelte:head>
	<title>Inactive Members</title>
</svelte:head>

<div class="min-h-screen bg-base-200">
	<div class="mx-auto flex max-w-6xl flex-col gap-6 p-6">
		<div class="prose max-w-none">
			<h1>Inactive Members</h1>
			<p class="text-sm opacity-70">
				Members who have not attended in the selected window.
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
							<option value="7" selected={days() === 7}>Last 7 days</option>
							<option value="14" selected={days() === 14}>Last 14 days</option>
							<option value="30" selected={days() === 30}>Last 30 days</option>
							<option value="60" selected={days() === 60}>Last 60 days</option>
						</select>
					</div>
					<div class="form-control">
						<label class="label" for="membershipFilter">
							<span class="label-text">Membership</span>
						</label>
						<select id="membershipFilter" name="membershipFilter" class="select select-bordered">
							<option value="active" selected={membershipFilter() === 'active'}>
								Active Only
							</option>
							<option value="all" selected={membershipFilter() === 'all'}>
								All Members
							</option>
						</select>
					</div>
					<button class="btn btn-primary" type="submit">Apply</button>
				</form>
				<p class="text-xs opacity-70">
					Defaults to active memberships and a 14-day window. Results are scoped to the active
					branch.
				</p>
			</div>
		</div>

		<div class="card bg-base-100 shadow">
			<div class="card-body gap-4">
				<div class="flex flex-wrap items-center justify-between gap-2">
					<div class="flex flex-wrap items-center gap-3">
						<h2 class="card-title">Inactive Members</h2>
						<p class="text-sm opacity-70">Total {pagination().total}</p>
					</div>
					<form method="POST" action="?/exportCsv">
						<input type="hidden" name="days" value={days()} />
						<input type="hidden" name="membershipFilter" value={membershipFilter()} />
						<button class="btn btn-sm" type="submit">Export CSV</button>
					</form>
				</div>

				{#if rows().length}
					<div class="overflow-x-auto">
						<table class="table table-sm">
							<thead>
								<tr>
									<th>Member</th>
									<th>Current Plan</th>
									<th>Last Attendance</th>
									<th>Days Since Last Visit</th>
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
										<td>{row.currentPlanName ?? '-'}</td>
										<td>{formatDate(row.lastAttendanceAt)}</td>
										<td class="font-mono text-sm">{formatDays(row.daysSinceLastAttendance)}</td>
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
						title="No inactive members"
						description={`No ${membershipFilter() === 'active' ? 'active members' : 'members'} have been inactive for ${days()} days.`}
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
