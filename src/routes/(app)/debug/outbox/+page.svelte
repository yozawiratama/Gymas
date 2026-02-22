<script lang="ts">
	let { data } = $props();

	const formatDateTime = (value: string) => new Date(value).toLocaleString();
</script>

<svelte:head>
	<title>Outbox Debug</title>
</svelte:head>

<div class="min-h-screen bg-base-200">
	<div class="mx-auto flex max-w-6xl flex-col gap-6 p-6">
		<div class="prose max-w-none">
			<h1>Outbox Debug</h1>
			<p class="text-sm opacity-70">Latest outbox events (MySQL).</p>
		</div>

		<div class="grid gap-4 md:grid-cols-3">
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
		</div>

		<div class="card bg-base-100 shadow">
			<div class="card-body">
				<h2 class="card-title">Latest 50 Events</h2>
				{#if data.events.length === 0}
					<p class="text-sm opacity-60">No outbox events yet.</p>
				{:else}
					<div class="overflow-x-auto">
						<table class="table table-sm">
							<thead>
								<tr>
									<th>Type</th>
									<th>Status</th>
									<th>Attempts</th>
									<th>Last Attempt</th>
									<th>Created</th>
									<th>Last Error</th>
								</tr>
							</thead>
							<tbody>
								{#each data.events as event}
									<tr>
										<td class="font-mono text-xs">{event.type}</td>
										<td>
											<span class="badge badge-outline">{event.status}</span>
										</td>
										<td>{event.attempts}</td>
										<td class="text-xs">
											{event.lastAttemptAt ? formatDateTime(event.lastAttemptAt) : '—'}
										</td>
										<td class="text-xs">{formatDateTime(event.createdAt)}</td>
										<td class="text-xs">
											{event.lastError ? event.lastError : '—'}
										</td>
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
