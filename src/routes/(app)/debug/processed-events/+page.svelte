<script lang="ts">
	let { data } = $props();

	const formatDateTime = (value: string) => new Date(value).toLocaleString();
</script>

<svelte:head>
	<title>Processed Events Debug</title>
</svelte:head>

<div class="min-h-screen bg-base-200">
	<div class="mx-auto flex max-w-6xl flex-col gap-6 p-6">
		<div class="prose max-w-none">
			<h1>Processed Events Debug</h1>
			<p class="text-sm opacity-70">Latest server-side sync ingestions (MySQL).</p>
		</div>

		<form method="get" class="flex flex-wrap items-end gap-3">
			<label class="form-control">
				<span class="label">
					<span class="label-text">Filter by event type</span>
				</span>
				<input
					name="type"
					value={data.filter}
					placeholder="ATTENDANCE_CHECKIN"
					class="input input-sm input-bordered"
				/>
			</label>
			<button class="btn btn-sm">Filter</button>
			{#if data.filter}
				<a href="/debug/processed-events" class="btn btn-sm btn-ghost">Clear</a>
			{/if}
		</form>

		<div class="card bg-base-100 shadow">
			<div class="card-body">
				<h2 class="card-title">Latest 50 Events</h2>
				{#if data.events.length === 0}
					<p class="text-sm opacity-60">No processed events yet.</p>
				{:else}
					<div class="overflow-x-auto">
						<table class="table table-sm">
							<thead>
								<tr>
									<th>Type</th>
									<th>Status</th>
									<th>Idempotency Key</th>
									<th>Processed At</th>
									<th>Event Id</th>
									<th>Device</th>
									<th>Gym</th>
								</tr>
							</thead>
							<tbody>
								{#each data.events as event}
									<tr>
										<td class="font-mono text-xs">{event.eventType}</td>
										<td>
											<span class="badge badge-outline">{event.status}</span>
										</td>
										<td class="font-mono text-xs">{event.idempotencyKey}</td>
										<td class="text-xs">{formatDateTime(event.processedAt)}</td>
										<td class="font-mono text-xs">{event.eventId}</td>
										<td class="font-mono text-xs">{event.deviceId ?? '—'}</td>
										<td class="font-mono text-xs">{event.gymId ?? '—'}</td>
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
