<script lang="ts">
	import { navigating } from '$app/stores';
	import AlertBanner from '$lib/components/AlertBanner.svelte';
	import EmptyState from '$lib/components/EmptyState.svelte';
	import LoadingSkeleton from '$lib/components/LoadingSkeleton.svelte';

	let { data } = $props();

	const rows = () => data.rows ?? [];
	const pagination = () => data.pagination;
	const query = () => data.query ?? '';
	const from = () => data.from ?? '';
	const to = () => data.to ?? '';
	const flash = () => data.flash ?? '';
	const page = () => pagination().page;
	const totalPages = () => Math.max(1, pagination().totalPages);
	const pageSize = () => pagination().pageSize;

	const formatDateTime = (value: string | null | undefined) => {
		if (!value) return '--';
		return new Date(value).toLocaleString();
	};

	const formatAmount = (amount: string, currency: string) => `${currency} ${amount}`;

	const statusBadgeClass = (status: string) => {
		if (status === 'PAID') return 'badge-success';
		if (status === 'REFUNDED') return 'badge-warning';
		if (status === 'VOID') return 'badge-ghost';
		return 'badge-ghost';
	};

	const buildPageUrl = (targetPage: number) => {
		const params = new URLSearchParams();
		if (query()) params.set('q', query());
		if (from()) params.set('from', from());
		if (to()) params.set('to', to());
		if (targetPage > 1) params.set('page', String(targetPage));
		if (pageSize() !== 20) params.set('pageSize', String(pageSize()));
		const queryString = params.toString();
		return queryString ? `/payments?${queryString}` : '/payments';
	};

	const hasPrev = () => page() > 1;
	const hasNext = () => page() < totalPages();
</script>

<svelte:head>
	<title>Payments</title>
</svelte:head>

<div class="min-h-screen bg-base-200">
	<div class="mx-auto flex max-w-6xl flex-col gap-6 p-6">
		<div class="prose max-w-none">
			<h1>Payments</h1>
			<p class="text-sm opacity-70">Review member payments and track who recorded them.</p>
		</div>

		{#if flash() === 'payment-recorded'}
			<AlertBanner kind="success">
				<span>Payment recorded successfully and listed below.</span>
			</AlertBanner>
		{/if}

		<div class="card bg-base-100 shadow">
			<div class="card-body space-y-4">
				<h2 class="card-title">Filters</h2>
				<form method="GET" class="flex flex-col gap-3 lg:flex-row lg:items-end">
					<div class="form-control flex-1">
						<label class="label" for="q">
							<span class="label-text">Member</span>
						</label>
						<input
							id="q"
							name="q"
							class="input input-bordered"
							placeholder="Search by name or member code"
							value={query()}
						/>
					</div>
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
					{#if query() || from() || to()}
						<a class="btn btn-ghost" href="/payments">Clear</a>
					{/if}
				</form>
				<p class="text-xs opacity-70">Filters apply to paid date and member name or code.</p>
			</div>
		</div>

		<div class="card bg-base-100 shadow">
			<div class="card-body gap-4">
				<div class="flex flex-wrap items-center justify-between gap-2">
					<h2 class="card-title">Payment Records</h2>
					<p class="text-sm opacity-70">Total {pagination().total}</p>
				</div>

				{#if $navigating && $navigating.to?.url.pathname === '/payments'}
					<LoadingSkeleton rows={6} columns={5} />
				{:else if rows().length}
					<div class="overflow-x-auto">
						<table class="table">
							<thead>
								<tr>
									<th>Paid At</th>
									<th>Member</th>
									<th>Amount</th>
									<th>Method / Status</th>
									<th>Recorded By</th>
								</tr>
							</thead>
							<tbody>
								{#each rows() as payment}
									<tr class="hover">
										<td>{formatDateTime(payment.paidAt)}</td>
										<td>
											<a
												class="link link-hover font-semibold"
												href={`/members/${payment.memberId}`}
											>
												{payment.memberName}
											</a>
											<div class="text-xs opacity-60">{payment.memberCode}</div>
										</td>
										<td class="font-mono text-sm">
											{formatAmount(payment.amount, payment.currency)}
										</td>
										<td>
											<div class="flex flex-col gap-1">
												<span>{payment.method}</span>
												<span class={`badge badge-sm ${statusBadgeClass(payment.status)}`}>
													{payment.status}
												</span>
											</div>
										</td>
										<td>{payment.recordedBy}</td>
									</tr>
								{/each}
							</tbody>
						</table>
					</div>
				{:else}
					<EmptyState
						title={query() || from() || to() ? 'No payments found' : 'No payments yet'}
						description={
							query() || from() || to()
								? 'Try adjusting the filters or date range.'
								: 'Payments you record will appear here.'
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
