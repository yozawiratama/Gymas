<script lang="ts">
	export let rows = 5;
	export let columns = 3;
	export let dense = false;

	const rowItems = () => Array.from({ length: Math.max(1, rows) });
	const columnItems = () => Array.from({ length: Math.max(1, columns) });
</script>

<div class={`space-y-3 ${dense ? 'opacity-80' : ''}`} aria-busy="true" aria-live="polite">
	{#each rowItems() as _, rowIndex}
		<div class="flex gap-3">
			{#each columnItems() as _, columnIndex}
				<div class="skeleton h-4 flex-1"></div>
			{/each}
		</div>
	{/each}
</div>
