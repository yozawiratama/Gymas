<script lang="ts">
	let { data } = $props();

	const rows = () => data.rows ?? [];
	const pagination = () => data.pagination;
	const filterAction = () => data.filter?.action ?? '';
	const page = () => pagination().page;
	const totalPages = () => pagination().totalPages;
	const pageSize = () => pagination().pageSize;

	const buildPageUrl = (targetPage: number) => {
		const params = new URLSearchParams();
		if (filterAction()) params.set('action', filterAction());
		if (targetPage > 1) params.set('page', String(targetPage));
		if (pageSize() !== 25) params.set('pageSize', String(pageSize()));
		const queryString = params.toString();
		return queryString ? `/admin/ops/audit?${queryString}` : '/admin/ops/audit';
	};

	const hasPrev = () => page() > 1;
	const hasNext = () => page() < totalPages();
</script>

<svelte:head>
	<title>Audit Logs</title>
</svelte:head>

<div class="min-h-screen bg-base-200">
	<div class="mx-auto flex max-w-6xl flex-col gap-6 p-6">
		<div class="prose max-w-none">
			<h1>Audit Logs</h1>
			<p class="text-sm opacity-70">
				Review sensitive actions across login, payments, settings, and sync.
			</p>
		</div>

		<div class="flex flex-wrap items-center gap-2">
			<a class="btn btn-sm" href="/admin/ops/sync">Sync Ops</a>
			<a class="btn btn-sm btn-active" href="/admin/ops/audit">Audit Logs</a>
		</div>

		<div class="card bg-base-100 shadow">
			<div class="card-body">
				<h2 class="card-title">Filter</h2>
				<form method="GET" class="flex flex-col gap-3 sm:flex-row">
					<input
						class="input input-bordered flex-1"
						name="action"
						placeholder="Action (e.g. LOGIN_SUCCESS)"
						value={filterAction()}
					/>
					<button class="btn btn-primary" type="submit">Apply</button>
				</form>
				<p class="text-xs opacity-70">Filters apply to exact action names.</p>
			</div>
		</div>

		<div class="card bg-base-100 shadow">
			<div class="card-body gap-4">
				<div class="flex flex-wrap items-center justify-between gap-2">
					<h2 class="card-title">Recent Activity</h2>
					<p class="text-sm opacity-70">Total {pagination().total}</p>
				</div>

				{#if rows().length}
					<div class="overflow-x-auto">
						<table class="table table-sm">
							<thead>
								<tr>
									<th>Time</th>
									<th>Action</th>
									<th>Actor</th>
									<th>Entity</th>
									<th>Meta</th>
									<th>IP</th>
								</tr>
							</thead>
							<tbody>
								{#each rows() as row}
									<tr class="hover">
										<td class="text-xs">{new Date(row.createdAt).toLocaleString()}</td>
										<td class="font-mono text-xs">{row.action}</td>
										<td class="text-xs">
											{#if row.actorUsername}
												{row.actorUsername}
											{:else if row.actorUserId}
												<span class="font-mono">{row.actorUserId}</span>
											{:else}
												System
											{/if}
										</td>
										<td class="text-xs">
											{#if row.entityType || row.entityId}
												<span class="font-mono">
													{row.entityType ?? 'Entity'}:{row.entityId ?? '-'}
												</span>
											{:else}
											-
											{/if}
										</td>
										<td class="text-xs font-mono">
											{row.metaPreview || '-'}
										</td>
										<td class="text-xs">{row.ip ?? '-'}</td>
									</tr>
								{/each}
							</tbody>
						</table>
					</div>
				{:else}
					<p class="text-sm opacity-60">No audit events found.</p>
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
