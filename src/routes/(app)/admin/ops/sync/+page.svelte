<script lang="ts">
	let { data } = $props();

	const formatDateTime = (value: string | null) =>
		value ? new Date(value).toLocaleString() : '—';
</script>

<svelte:head>
	<title>Sync Ops</title>
</svelte:head>

<div class="min-h-screen bg-base-200">
	<div class="mx-auto flex max-w-6xl flex-col gap-6 p-6">
		<div class="prose max-w-none">
			<h1>Sync Ops</h1>
			<p class="text-sm opacity-70">
				Operational view of sync ingestion and outbox backlog (admin only).
			</p>
		</div>

		<div class="flex flex-wrap items-center gap-2">
			<a class="btn btn-sm btn-active" href="/admin/ops/sync">Sync Ops</a>
			<a class="btn btn-sm" href="/admin/ops/audit">Audit Logs</a>
		</div>

		<div class="grid gap-4 md:grid-cols-4">
			<div class="card bg-base-100 shadow">
				<div class="card-body">
					<p class="text-sm opacity-70">Pending</p>
					<p class="text-3xl font-semibold">{data.summary.pending}</p>
				</div>
			</div>
			<div class="card bg-base-100 shadow">
				<div class="card-body">
					<p class="text-sm opacity-70">In Flight</p>
					<p class="text-3xl font-semibold">{data.summary.inFlight}</p>
				</div>
			</div>
			<div class="card bg-base-100 shadow">
				<div class="card-body">
					<p class="text-sm opacity-70">Failed</p>
					<p class="text-3xl font-semibold">{data.summary.failed}</p>
				</div>
			</div>
			<div class="card bg-base-100 shadow">
				<div class="card-body">
					<p class="text-sm opacity-70">Processed (24h)</p>
					<p class="text-3xl font-semibold">{data.processedLast24h}</p>
				</div>
			</div>
		</div>

		<div class="card bg-base-100 shadow">
			<div class="card-body">
				<h2 class="card-title">Recent Failures</h2>
				{#if data.failures.length === 0}
					<p class="text-sm opacity-60">No failed outbox events.</p>
				{:else}
					<div class="overflow-x-auto">
						<table class="table table-sm">
							<thead>
								<tr>
									<th>Type</th>
									<th>Attempts</th>
									<th>Last Attempt</th>
									<th>Updated</th>
									<th>Last Error</th>
								</tr>
							</thead>
							<tbody>
								{#each data.failures as failure}
									<tr>
										<td class="font-mono text-xs">{failure.type}</td>
										<td>{failure.attempts}</td>
										<td class="text-xs">{formatDateTime(failure.lastAttemptAt)}</td>
										<td class="text-xs">{formatDateTime(failure.updatedAt)}</td>
										<td class="text-xs">{failure.lastError ?? '—'}</td>
									</tr>
								{/each}
							</tbody>
						</table>
					</div>
				{/if}
			</div>
		</div>
	</div>
</div>
