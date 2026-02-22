<script lang="ts">
	import { page } from '$app/stores';

	let { data, children } = $props();

	const branding = () => data?.branding;
	const company = () => data?.company;
	const companyName = () => company()?.companyName ?? branding()?.companyName ?? 'Gymas';
	const showLogo = () => branding()?.logoMediaId && branding()?.showLogoOnLayout;
	const socialLinks = () => {
		const links = [
			{ label: 'Instagram', href: company()?.instagramUrl },
			{ label: 'Facebook', href: company()?.facebookUrl },
			{ label: 'Website', href: company()?.websiteUrl }
		];
		return links.filter(
			(item): item is { label: string; href: string } => Boolean(item.href)
		);
	};
	const isActive = (path: string) =>
		path === '/' ? $page.url.pathname === '/' : $page.url.pathname.startsWith(path);
</script>

<div class="flex min-h-screen flex-col bg-base-100 text-base-content">
	<header class="sticky top-0 z-30 border-b border-base-200 bg-base-100/95 backdrop-blur">
		<div class="mx-auto flex w-full max-w-6xl flex-wrap items-center gap-4 px-6 py-4">
			<a href="/" class="flex items-center gap-3">
				{#if showLogo()}
					<img
						src={`/media/${branding()?.logoMediaId}`}
						alt={`${companyName()} logo`}
						class="h-10 w-auto"
						loading="lazy"
					/>
				{/if}
				<span class="text-lg font-semibold">{companyName()}</span>
			</a>

			<nav class="ml-auto flex flex-wrap items-center gap-2 text-sm">
				<a class={`btn btn-ghost btn-sm ${isActive('/') ? 'btn-active' : ''}`} href="/">
					Home
				</a>
				<a
					class={`btn btn-ghost btn-sm ${isActive('/about') ? 'btn-active' : ''}`}
					href="/about"
				>
					About
				</a>
				<a
					class={`btn btn-ghost btn-sm ${isActive('/contact-us') ? 'btn-active' : ''}`}
					href="/contact-us"
				>
					Contact
				</a>
				<a class="btn btn-outline btn-sm" href="/auth/login">Login</a>
			</nav>
		</div>
	</header>

	<main class="flex-1">
		{@render children()}
	</main>

	<footer class="border-t border-base-200 bg-base-200/60">
		<div class="mx-auto w-full max-w-6xl px-6 py-8 text-sm">
			<div class="grid gap-6 md:grid-cols-[1.4fr_1fr]">
				<div class="space-y-2">
					<div class="text-base font-semibold text-base-content">{companyName()}</div>
					{#if company()?.tagline}
						<p class="max-w-md text-sm opacity-70">{company()?.tagline}</p>
					{/if}
					{#if company()?.address}
						<p class="whitespace-pre-line opacity-70">{company()?.address}</p>
					{/if}
					<div class="flex flex-col gap-1">
						{#if company()?.phone}
							<a class="link-hover link opacity-80" href={`tel:${company()?.phone}`}>
								{company()?.phone}
							</a>
						{/if}
						{#if company()?.email}
							<a class="link-hover link opacity-80" href={`mailto:${company()?.email}`}>
								{company()?.email}
							</a>
						{/if}
					</div>
					{#if company()?.businessHours}
						<p class="text-xs uppercase tracking-wide opacity-60">Business Hours</p>
						<p class="whitespace-pre-line opacity-70">{company()?.businessHours}</p>
					{/if}
				</div>

				<div class="space-y-3 md:justify-self-end md:text-right">
					{#if socialLinks().length > 0}
						<p class="text-xs uppercase tracking-wide opacity-60">Connect</p>
						<div class="flex flex-wrap gap-2 md:justify-end">
							{#each socialLinks() as link}
								<a
									class="btn btn-ghost btn-xs"
									href={link.href}
									target="_blank"
									rel="noreferrer"
								>
									{link.label}
								</a>
							{/each}
						</div>
					{/if}
				</div>
			</div>

			<div class="mt-6 flex flex-col gap-1 text-xs opacity-60 md:flex-row md:items-center md:justify-between">
				<span>&copy; {new Date().getFullYear()} {companyName()}.</span>
				<span>All rights reserved.</span>
			</div>
		</div>
	</footer>
</div>
