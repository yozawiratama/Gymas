<script lang="ts">
	let { data } = $props();
</script>

<svelte:head>
	<title>{data.page.title} | About</title>
</svelte:head>

<section class="bg-base-100">
	<div class="mx-auto w-full max-w-4xl px-6 py-12">
		<div class="space-y-3">
			<p class="text-sm uppercase tracking-[0.2em] text-primary">About</p>
			<h1 class="text-3xl font-semibold md:text-4xl">{data.page.title}</h1>
			<p class="text-sm opacity-60">
				Last updated {new Date(data.page.updatedAt).toLocaleDateString()}
			</p>
		</div>

		<div class="prose prose-neutral mt-8 max-w-none">
			{@html data.html}
		</div>
	</div>
</section>
