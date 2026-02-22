<script lang="ts">
	let { data } = $props();
</script>

<svelte:head>
	<title>Health & Config</title>
</svelte:head>

<div class="min-h-screen bg-base-200">
	<div class="mx-auto flex max-w-5xl flex-col gap-6 p-6">
		<div class="prose max-w-none">
			<h1>Health &amp; Config</h1>
			<p class="text-sm opacity-70">Runtime wiring and environment readiness.</p>
		</div>

		{#if data.configError}
			<div role="alert" class="alert alert-warning">
				<span class="font-medium">Config check failed:</span>
				<span>{data.configError}</span>
			</div>
		{/if}

		<div class="grid gap-6 lg:grid-cols-2">
			<div class="card bg-base-100 shadow">
				<div class="card-body">
					<h2 class="card-title">Build Info</h2>
					<table class="table table-sm">
						<tbody>
							<tr>
								<th>App Version</th>
								<td>{data.build.version}</td>
							</tr>
							<tr>
								<th>Node Version</th>
								<td>{data.build.nodeVersion}</td>
							</tr>
							<tr>
								<th>Runtime</th>
								<td>{data.build.runtime}</td>
							</tr>
							<tr>
								<th>Adapter Expectation</th>
								<td>
									<div class="flex items-center gap-2">
										<span>{data.expectedAdapter}</span>
										<span class="badge {data.nodeRuntime ? 'badge-success' : 'badge-error'}">
											{data.nodeRuntime ? 'node ok' : 'not node'}
										</span>
									</div>
								</td>
							</tr>
							<tr>
								<th>APP_ENV</th>
								<td>{data.build.appEnv ?? 'unset'}</td>
							</tr>
							<tr>
								<th>NODE_ENV</th>
								<td>{data.build.nodeEnv ?? 'unset'}</td>
							</tr>
						</tbody>
					</table>
				</div>
			</div>

			<div class="card bg-base-100 shadow">
				<div class="card-body">
					<h2 class="card-title">Required Env</h2>
					<table class="table table-sm">
						<thead>
							<tr>
								<th>Key</th>
								<th>Status</th>
								<th>Masked</th>
							</tr>
						</thead>
						<tbody>
							{#each data.envStatus as entry}
								<tr>
									<td class="font-mono text-xs">{entry.key}</td>
									<td>
										<span class="badge {entry.present ? 'badge-success' : 'badge-error'}">
											{entry.present ? 'present' : 'missing'}
										</span>
									</td>
									<td class="font-mono text-xs">{entry.masked}</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
			</div>
		</div>
	</div>
</div>
