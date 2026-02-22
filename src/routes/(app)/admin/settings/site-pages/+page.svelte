<script lang="ts">
	let { data, form } = $props();

	const pages = () => form?.pages ?? data.pages;
	const page = () => form?.page ?? data.page;
	const previewHtml = () => form?.previewHtml ?? data.previewHtml;
	const selectedSlug = () => page()?.slug ?? '';
	const slugPath = (slug: string) => (slug === 'home' ? '/' : `/${slug}`);
</script>

<svelte:head>
	<title>Site Pages</title>
</svelte:head>

<div class="min-h-screen bg-base-200">
	<div class="mx-auto flex max-w-6xl flex-col gap-6 p-6">
		<div class="prose max-w-none">
			<h1>Site Pages</h1>
			<p class="text-sm opacity-70">
				Edit the public About and Contact pages without a redeploy.
			</p>
		</div>

		{#if form?.success === false && form?.message}
			<div role="alert" class="alert alert-error">
				<span>{form.message}</span>
			</div>
		{/if}

		{#if form?.success && form?.action === 'save'}
			<div role="alert" class="alert alert-success">
				<span>Site page updated.</span>
			</div>
		{/if}

		<div class="grid gap-6 lg:grid-cols-[1fr_1.2fr]">
			<div class="space-y-6">
				<div class="card bg-base-100 shadow">
					<div class="card-body space-y-4">
						<h2 class="card-title">Pages</h2>
						<div class="flex flex-col gap-2">
							{#each pages() as item}
								<a
									class={`btn btn-sm justify-start ${
										item.slug === selectedSlug() ? 'btn-active' : 'btn-ghost'
									}`}
									href={`?slug=${item.slug}`}
								>
									<span class="flex-1 text-left">
										<span class="block font-semibold">{item.title}</span>
										<span class="block text-xs opacity-60">{slugPath(item.slug)}</span>
									</span>
								</a>
							{/each}
						</div>
					</div>
				</div>

				<div class="card bg-base-100 shadow">
					<div class="card-body space-y-4">
						<h2 class="card-title">Content</h2>
						<form method="POST" action="?/save" class="space-y-4">
							<input type="hidden" name="slug" value={selectedSlug()} />
							<div class="form-control">
								<label class="label" for="title">
									<span class="label-text">Title</span>
								</label>
								<input
									id="title"
									name="title"
									type="text"
									class="input input-bordered"
									required
									value={page().title}
								/>
							</div>

							<div class="form-control">
								<label class="label" for="contentMarkdown">
									<span class="label-text">Markdown Content</span>
								</label>
								<textarea
									id="contentMarkdown"
									name="contentMarkdown"
									class="textarea textarea-bordered min-h-[220px]"
									required
								>{page().contentMarkdown}</textarea>
								<p class="text-xs opacity-70">Headings, lists, and links are supported.</p>
							</div>

							<div class="flex justify-end">
								<button class="btn btn-primary" type="submit">Save Changes</button>
							</div>
						</form>
					</div>
				</div>
			</div>

			<div class="card bg-base-100 shadow">
				<div class="card-body space-y-4">
					<div class="flex items-center justify-between">
						<h2 class="card-title">Preview</h2>
						<span class="text-xs uppercase opacity-60">{slugPath(selectedSlug())}</span>
					</div>
					<div class="prose prose-neutral max-w-none">
						{@html previewHtml()}
					</div>
				</div>
			</div>
		</div>
	</div>
</div>
