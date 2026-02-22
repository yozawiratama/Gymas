<script lang="ts">
	let { data } = $props();

	const company = () => data?.company;
	const normalizeWhatsapp = (value: string | null | undefined) =>
		value ? value.replace(/[^0-9]/g, '') : '';
	const whatsappLink = () => {
		const digits = normalizeWhatsapp(company()?.whatsapp ?? null);
		return digits ? `https://wa.me/${digits}` : null;
	};
	const hasContactInfo = () =>
		Boolean(
			company()?.address ||
				company()?.phone ||
				company()?.whatsapp ||
				company()?.email ||
				company()?.googleMapsUrl
		);
</script>

<svelte:head>
	<title>{data.page.title} | Contact Us</title>
</svelte:head>

<section class="bg-base-100">
	<div class="mx-auto w-full max-w-4xl px-6 py-12">
		<div class="space-y-3">
			<p class="text-sm uppercase tracking-[0.2em] text-primary">Contact Us</p>
			<h1 class="text-3xl font-semibold md:text-4xl">{data.page.title}</h1>
			<p class="text-sm opacity-60">
				Last updated {new Date(data.page.updatedAt).toLocaleDateString()}
			</p>
		</div>

		{#if hasContactInfo()}
			<div class="mt-8 grid gap-4 md:grid-cols-3">
				{#if company()?.address || company()?.googleMapsUrl}
					<div class="card bg-base-200/60">
						<div class="card-body space-y-2">
							<h2 class="card-title text-base">Address</h2>
							{#if company()?.address}
								<p class="whitespace-pre-line text-sm opacity-80">{company()?.address}</p>
							{/if}
							{#if company()?.googleMapsUrl}
								<a
									class="btn btn-outline btn-xs self-start"
									href={company()?.googleMapsUrl}
									target="_blank"
									rel="noreferrer"
								>
									Open in Maps
								</a>
							{/if}
						</div>
					</div>
				{/if}

				{#if company()?.phone || company()?.whatsapp}
					<div class="card bg-base-200/60">
						<div class="card-body space-y-2">
							<h2 class="card-title text-base">Phone / WhatsApp</h2>
							{#if company()?.phone}
								<a class="link-hover link text-sm opacity-80" href={`tel:${company()?.phone}`}>
									{company()?.phone}
								</a>
							{/if}
							{#if company()?.whatsapp}
								{#if whatsappLink()}
									<a
										class="link-hover link text-sm opacity-80"
										href={whatsappLink()}
										target="_blank"
										rel="noreferrer"
									>
										{company()?.whatsapp}
									</a>
								{:else}
									<p class="text-sm opacity-80">{company()?.whatsapp}</p>
								{/if}
							{/if}
						</div>
					</div>
				{/if}

				{#if company()?.email}
					<div class="card bg-base-200/60">
						<div class="card-body space-y-2">
							<h2 class="card-title text-base">Email</h2>
							<a
								class="link-hover link text-sm opacity-80"
								href={`mailto:${company()?.email}`}
							>
								{company()?.email}
							</a>
						</div>
					</div>
				{/if}
			</div>
		{/if}

		<div class="prose prose-neutral mt-8 max-w-none">
			{@html data.html}
		</div>
	</div>
</section>
