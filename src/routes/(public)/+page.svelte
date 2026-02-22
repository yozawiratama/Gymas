<script lang="ts">
	let { data } = $props();

	const branding = () => data?.branding;
	const companyName = () => branding()?.companyName ?? 'Gymas';
	const homeHtml = () => data?.homeHtml;
</script>

<svelte:head>
	<title>{companyName()} | Gym Management</title>
</svelte:head>

<section class="bg-base-100">
	<div class="mx-auto w-full max-w-6xl px-6 py-12">
		<div class="relative overflow-hidden rounded-3xl border border-base-200 bg-base-100 shadow-sm">
			<div class="absolute inset-0 bg-gradient-to-br from-base-200/70 via-base-100 to-base-200/40"></div>
			<div class="relative grid gap-10 p-8 lg:grid-cols-[1.2fr_0.8fr] lg:p-12">
				<div class="space-y-6">
					<p class="text-sm uppercase tracking-[0.2em] text-primary">
						{companyName()} Platform
					</p>
					<h1 class="text-4xl font-semibold leading-tight md:text-5xl">
						{companyName()} keeps your gym running smoothly from the front desk to reports.
					</h1>
					<p class="text-lg opacity-80">
						Member check-ins, payments, and staff workflows in one secure dashboard.
					</p>

					{#if homeHtml()}
						<div class="prose max-w-none text-base-content/80">
							{@html homeHtml()}
						</div>
					{/if}

					<div class="flex flex-wrap gap-3 pt-2">
						<a class="btn btn-primary" href="/auth/login">Get Started</a>
						<a class="btn btn-outline" href="/contact-us">Talk to Us</a>
					</div>
				</div>

				<div class="grid gap-4">
					<div class="card border border-base-200 bg-base-100/90 shadow-sm">
						<div class="card-body">
							<h2 class="card-title text-lg">Faster Check-ins</h2>
							<p class="text-sm opacity-70">
								Reduce queues with streamlined attendance and member lookup.
							</p>
						</div>
					</div>
					<div class="card border border-base-200 bg-base-100/90 shadow-sm">
						<div class="card-body">
							<h2 class="card-title text-lg">Clear Revenue View</h2>
							<p class="text-sm opacity-70">
								Track payments and memberships with built-in reporting.
							</p>
						</div>
					</div>
					<div class="card border border-base-200 bg-base-100/90 shadow-sm">
						<div class="card-body">
							<h2 class="card-title text-lg">Secure by Default</h2>
							<p class="text-sm opacity-70">
								Role-based access keeps staff focused on what they need.
							</p>
						</div>
					</div>
					<div class="card border border-base-200 bg-base-100/90 shadow-sm">
						<div class="card-body">
							<h2 class="card-title text-lg">Custom Branding</h2>
							<p class="text-sm opacity-70">
								Keep your company identity consistent across screens.
							</p>
						</div>
					</div>
				</div>
			</div>
		</div>
	</div>
</section>

<section class="bg-base-200/40">
	<div class="mx-auto w-full max-w-6xl px-6 py-12">
		<div class="grid gap-6 md:grid-cols-3">
			<div class="space-y-2">
				<h3 class="text-lg font-semibold">Member Experience</h3>
				<p class="text-sm opacity-70">
					Keep members active with quick renewals and consistent service.
				</p>
			</div>
			<div class="space-y-2">
				<h3 class="text-lg font-semibold">Operational Control</h3>
				<p class="text-sm opacity-70">
					Stay on top of attendance rules, freezes, and membership cycles.
				</p>
			</div>
			<div class="space-y-2">
				<h3 class="text-lg font-semibold">Actionable Insights</h3>
				<p class="text-sm opacity-70">
					Spot trends early with built-in dashboards and exports.
				</p>
			</div>
		</div>
	</div>
</section>

<section class="bg-base-100">
	<div class="mx-auto w-full max-w-6xl px-6 py-12">
		<div class="rounded-3xl border border-base-200 bg-base-100 px-8 py-10 shadow-sm md:flex md:items-center md:justify-between">
			<div class="space-y-2">
				<h3 class="text-2xl font-semibold">
					Ready to see {companyName()} in action?
				</h3>
				<p class="text-sm opacity-70">Sign in or reach out for a tailored walkthrough.</p>
			</div>
			<div class="mt-6 flex flex-wrap gap-3 md:mt-0">
				<a class="btn btn-primary" href="/auth/login">Login</a>
				<a class="btn btn-outline" href="/contact-us">Contact Us</a>
			</div>
		</div>
	</div>
</section>
