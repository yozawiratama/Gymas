<script lang="ts">
	import { page } from '$app/stores';

	let { data, children } = $props();

	const branding = () => data?.branding;
	const companyName = () => branding()?.companyName ?? 'Gymas';
	const activeBranch = () => data?.branch;
	const branches = () => data?.branches ?? [];
	const canSwitchBranch = () => data?.canSwitchBranch;
	const navItems = () => data?.navItems ?? [];
	const showNav = () => navItems().length > 0;
	const isActive = (path: string) => $page.url.pathname.startsWith(path);
</script>

{#if branding()}
	<header class="sticky top-0 z-30 border-b border-base-200 bg-base-100/95 backdrop-blur">
		<div class="mx-auto flex w-full max-w-6xl items-center gap-3 px-6 py-3">
			<div class="flex items-center gap-3">
				{#if branding()?.showLogoOnLayout && branding()?.logoMediaId}
					<img
						src={`/media/${branding()?.logoMediaId}`}
						alt={`${companyName()} logo`}
						class="h-8 w-auto"
						loading="lazy"
					/>
				{/if}
				<div class="flex flex-col">
					<span class="text-lg font-semibold">{companyName()}</span>
					{#if activeBranch()}
						<span class="text-xs opacity-70">
							Branch: {activeBranch()?.name}
							{#if activeBranch()?.code}
								({activeBranch()?.code})
							{/if}
						</span>
					{/if}
				</div>
			</div>
			{#if canSwitchBranch() && branches().length > 0}
				<form
					method="POST"
					action="/admin/branches/switch"
					class="ml-auto flex items-center gap-2"
				>
					<select class="select select-bordered select-sm" name="branchId">
						{#each branches() as branch}
							<option
								value={branch.id}
								selected={activeBranch()?.id === branch.id}
							>
								{branch.name}{branch.code ? ` (${branch.code})` : ''}
							</option>
						{/each}
					</select>
					<button class="btn btn-sm" type="submit">Switch</button>
				</form>
			{/if}
		</div>
	</header>
{/if}

{#if showNav()}
	<nav class="border-b border-base-200 bg-base-100/95">
		<div class="mx-auto flex w-full max-w-6xl items-center gap-2 px-6 py-2">
			<div class="tabs tabs-boxed">
				{#each navItems() as item}
					<a
						class={`tab ${isActive(item.matchPrefix ?? item.href) ? 'tab-active' : ''}`}
						href={item.href}
					>
						{item.label}
					</a>
				{/each}
			</div>
		</div>
	</nav>
{/if}

{@render children()}
