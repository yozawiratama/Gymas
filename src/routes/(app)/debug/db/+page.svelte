<script lang="ts">
	export let data: {
		serverUsers: number;
	};
</script>

<svelte:head>
	<title>DB Debug</title>
</svelte:head>

<section class="space-y-4">
	<h1 class="text-2xl font-semibold">DB Debug</h1>
	<p class="text-sm text-base-content/70">Counts pulled from the MySQL Prisma client.</p>

	<div class="rounded-box border border-base-300 bg-base-100 p-4 shadow-sm">
		<h2 class="mb-2 text-lg font-semibold">MySQL</h2>
		<p class="text-sm">Users: <span class="font-mono">{data.serverUsers}</span></p>
	</div>
</section>
