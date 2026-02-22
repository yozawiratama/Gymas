<script lang="ts">
	export let title: string;
	export let description: string | undefined = undefined;
	export let actionLabel: string | undefined = undefined;
	export let actionHref: string | undefined = undefined;
</script>

<div
	class="flex flex-col items-center gap-2 rounded-box border border-dashed border-base-300 bg-base-200/40 px-6 py-8 text-center"
>
	<h3 class="text-base font-semibold">{title}</h3>
	{#if description}
		<p class="text-sm opacity-70">{description}</p>
	{/if}
	{#if actionLabel && actionHref}
		<a class="btn btn-sm btn-outline" href={actionHref}>{actionLabel}</a>
	{/if}
</div>
