<script lang="ts">
	import { goto } from '$app/navigation';
	import { navigating } from '$app/stores';
	import EmptyState from '$lib/components/EmptyState.svelte';
	import LoadingSkeleton from '$lib/components/LoadingSkeleton.svelte';

	let { data } = $props();

	const rows = () => data.rows ?? [];
	const pagination = () => data.pagination;
	const canCreate = () => data.canCreate ?? false;
	const canRenewMembership = () => data.canRenewMembership ?? false;
	const query = () => data.query ?? '';
	const statusFilter = () => data.statusFilter ?? 'active';
	const membershipStatusFilter = () => data.membershipStatusFilter ?? 'active';
	const page = () => pagination().page;
	const totalPages = () => Math.max(1, pagination().totalPages);
	const pageSize = () => pagination().pageSize;

	const statusBadgeClass = (status: string) =>
		status === 'ACTIVE' ? 'badge-success' : 'badge-ghost';
	const membershipStatusBadgeClass = (status: string) => {
		if (status === 'ACTIVE') return 'badge-success';
		if (status === 'CANCELLED') return 'badge-error';
		return 'badge-ghost';
	};
	const formatMemberStatus = (status: string) => {
		if (status === 'ACTIVE') return 'Active';
		if (status === 'INACTIVE') return 'Inactive';
		return status;
	};
	const formatDate = (value: string | null | undefined) => {
		if (!value) return '—';
		return new Date(value).toLocaleDateString();
	};

	const buildPageUrl = (
		targetPage: number,
		overrides: {
			query?: string;
			status?: string;
			membershipStatus?: string;
			pageSize?: number;
		} = {}
	) => {
		const params = new URLSearchParams();
		const nextQuery = overrides.query ?? query();
		const nextStatus = overrides.status ?? statusFilter();
		const nextMembershipStatus = overrides.membershipStatus ?? membershipStatusFilter();
		const nextPageSize = overrides.pageSize ?? pageSize();
		if (nextQuery) params.set('q', nextQuery);
		if (nextStatus) params.set('status', nextStatus);
		if (nextMembershipStatus) params.set('membershipStatus', nextMembershipStatus);
		if (targetPage > 1) params.set('page', String(targetPage));
		if (nextPageSize !== 20) params.set('pageSize', String(nextPageSize));
		const queryString = params.toString();
		return queryString ? `/members?${queryString}` : '/members';
	};

	const hasPrev = () => page() > 1;
	const hasNext = () => page() < totalPages();

	const openMember = (memberId: string) => {
		goto(`/members/${memberId}`);
	};

	const handleRowKeydown = (event: KeyboardEvent, memberId: string) => {
		if (event.key === 'Enter' || event.key === ' ') {
			event.preventDefault();
			openMember(memberId);
		}
	};
</script>

<svelte:head>
	<title>Members</title>
</svelte:head>

<div class="min-h-screen bg-base-200">
	<div class="mx-auto flex max-w-6xl flex-col gap-6 p-6">
		<div class="prose max-w-none">
			<h1>Members</h1>
			<p class="text-sm opacity-70">Browse members and open profile 360 records.</p>
		</div>

		<div class="card bg-base-100 shadow">
			<div class="card-body">
				<h2 class="card-title">Search</h2>
				<form method="GET" class="flex flex-col gap-3 sm:flex-row">
					<!-- svelte-ignore a11y_autofocus -->
					<input
						class="input input-bordered flex-1"
						name="q"
						placeholder="Search by name or member code"
						autofocus
						value={query()}
					/>
					<input type="hidden" name="status" value={statusFilter()} />
					<input type="hidden" name="membershipStatus" value={membershipStatusFilter()} />
					<button class="btn btn-primary" type="submit">Search</button>
					{#if query()}
						<a class="btn btn-ghost" href={buildPageUrl(1, { query: '' })}>Clear</a>
					{/if}
				</form>
				<p class="text-xs opacity-70">Search results are paged for performance.</p>
			</div>
		</div>

		<div class="card bg-base-100 shadow">
			<div class="card-body gap-4">
				<div class="flex flex-wrap items-center justify-between gap-2">
					<div class="flex flex-wrap items-center gap-3">
						<h2 class="card-title">Member List</h2>
						<p class="text-sm opacity-70">Total {pagination().total}</p>
					</div>
					{#if canCreate()}
						<a class="btn btn-primary btn-sm" href="/members/new">New Member</a>
					{/if}
				</div>

				<div class="flex flex-wrap items-center gap-2">
					<p class="text-xs uppercase opacity-60">Status</p>
					<div class="tabs tabs-boxed">
						<a
							class={`tab ${statusFilter() === 'active' ? 'tab-active' : ''}`}
							href={buildPageUrl(1, { status: 'active' })}
						>
							Active
						</a>
						<a
							class={`tab ${statusFilter() === 'inactive' ? 'tab-active' : ''}`}
							href={buildPageUrl(1, { status: 'inactive' })}
						>
							Inactive
						</a>
						<a
							class={`tab ${statusFilter() === 'all' ? 'tab-active' : ''}`}
							href={buildPageUrl(1, { status: 'all' })}
						>
							All
						</a>
					</div>
				</div>

				<div class="flex flex-wrap items-center gap-2">
					<p class="text-xs uppercase opacity-60">Membership</p>
					<div class="tabs tabs-boxed">
						<a
							class={`tab ${membershipStatusFilter() === 'active' ? 'tab-active' : ''}`}
							href={buildPageUrl(1, { membershipStatus: 'active' })}
						>
							Active
						</a>
						<a
							class={`tab ${membershipStatusFilter() === 'expired' ? 'tab-active' : ''}`}
							href={buildPageUrl(1, { membershipStatus: 'expired' })}
						>
							Expired
						</a>
						<a
							class={`tab ${membershipStatusFilter() === 'none' ? 'tab-active' : ''}`}
							href={buildPageUrl(1, { membershipStatus: 'none' })}
						>
							None
						</a>
						<a
							class={`tab ${membershipStatusFilter() === 'all' ? 'tab-active' : ''}`}
							href={buildPageUrl(1, { membershipStatus: 'all' })}
						>
							All
						</a>
					</div>
				</div>

				{#if $navigating && $navigating.to?.url.pathname === '/members'}
					<LoadingSkeleton rows={6} columns={7} />
				{:else if rows().length}
					<div class="overflow-x-auto">
						<table class="table">
							<thead>
								<tr>
									<th>Name</th>
									<th>Member Code</th>
									<th>Member Status</th>
									<th>Membership Status</th>
									<th>Current Plan</th>
									<th>Expiry</th>
									<th>Actions</th>
								</tr>
							</thead>
							<tbody>
								{#each rows() as member}
									<tr
										class="hover cursor-pointer"
										role="link"
										tabindex="0"
										onclick={() => openMember(member.id)}
										onkeydown={(event) => handleRowKeydown(event, member.id)}
									>
										<td>
											<a
												class="link link-hover font-semibold"
												href={`/members/${member.id}`}
											>
												{member.name}
											</a>
										</td>
										<td class="font-mono text-sm">{member.memberCode}</td>
										<td>
											<span class={`badge ${statusBadgeClass(member.status)}`}>
												{formatMemberStatus(member.status)}
											</span>
										</td>
										<td>
											<span
												class={`badge ${membershipStatusBadgeClass(
													member.currentMembershipStatus
												)}`}
											>
												{member.currentMembershipStatusLabel}
											</span>
										</td>
										<td>{member.currentPlanName ?? '—'}</td>
										<td>{formatDate(member.currentMembershipEndAt)}</td>
										<td>
											{#if canRenewMembership() && member.currentMembershipStatus !== 'NONE'}
												<a
													class="link link-hover text-sm"
													href={`/members/${member.id}`}
													onclick={(event) => event.stopPropagation()}
												>
													Renew
												</a>
											{:else}
												<span class="text-xs opacity-60">—</span>
											{/if}
										</td>
									</tr>
								{/each}
							</tbody>
						</table>
					</div>
				{:else}
					<EmptyState
						title={
							query()
								? 'No members found'
								: membershipStatusFilter() === 'active'
									? 'No active memberships found'
									: 'No members yet'
						}
						description={
							query()
								? 'Try a different name or member code.'
								: membershipStatusFilter() === 'active'
									? 'Try a different membership filter or adjust your search.'
									: 'Members you add will show up here.'
						}
					/>
				{/if}

				<div class="flex flex-wrap items-center justify-between gap-3">
					<p class="text-sm opacity-70">
						Page {page()} of {totalPages()} | {pageSize()} per page
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
