<script lang="ts">
	import { tick } from 'svelte';
	import AlertBanner from '$lib/components/AlertBanner.svelte';
	import EmptyState from '$lib/components/EmptyState.svelte';

	let { data, form } = $props();

	const formatDateTime = (value: string | null | undefined) => {
		if (!value) return '--';
		return new Date(value).toLocaleString();
	};

	const pendingCount = () => form?.pendingOutboxCount ?? data.pendingOutboxCount;
	const searchResults = () => form?.searchResults ?? data.searchResults ?? [];
	const searchQuery = () => form?.searchQuery ?? '';
	const checkInResult = () => form?.checkInResult ?? null;

	const statusBadgeClass = (status: string) =>
		status === 'ACTIVE' ? 'badge-success' : 'badge-ghost';

	let searchInput = $state<HTMLInputElement | null>(null);
	let resultsContainer = $state<HTMLDivElement | null>(null);
	let resultButtons = $state<HTMLButtonElement[]>([]);
	let selectedIndex = $state(-1);
	let resultsCount = $state(0);
	let focusAfterCheckIn = $state(false);
	let lastCheckInKey = $state('');

	const syncResults = () => {
		const count = searchResults().length;
		if (count !== resultsCount) {
			resultsCount = count;
			resultButtons = [];
			selectedIndex = count ? 0 : -1;
		}
	};

	const trackCheckIn = () => {
		const result = checkInResult();
		const key = result ? `${result.member.id}-${result.checkedInAt}` : '';
		if (key && key !== lastCheckInKey) {
			lastCheckInKey = key;
			focusAfterCheckIn = true;
		}
	};

	const submitSelected = (index: number) => {
		const button = resultButtons[index];
		if (button) {
			button.click();
		}
	};

	const isSingleResultReady = () => {
		if (searchResults().length !== 1) return false;
		const currentValue = searchInput?.value?.trim() ?? '';
		return currentValue !== '' && currentValue === searchQuery();
	};

	const handleSearchKeydown = (event: KeyboardEvent) => {
		if (event.key === 'Enter' && isSingleResultReady()) {
			event.preventDefault();
			submitSelected(0);
			return;
		}

		if (event.key === 'ArrowDown' && searchResults().length) {
			event.preventDefault();
			if (selectedIndex < 0) selectedIndex = 0;
			resultsContainer?.focus();
		}
	};

	const handleResultsKeydown = (event: KeyboardEvent) => {
		const max = searchResults().length - 1;
		if (max < 0) return;

		switch (event.key) {
			case 'ArrowDown':
				event.preventDefault();
				selectedIndex = selectedIndex >= max ? 0 : selectedIndex + 1;
				break;
			case 'ArrowUp':
				event.preventDefault();
				selectedIndex = selectedIndex <= 0 ? max : selectedIndex - 1;
				break;
			case 'Home':
				event.preventDefault();
				selectedIndex = 0;
				break;
			case 'End':
				event.preventDefault();
				selectedIndex = max;
				break;
			case 'Enter':
				event.preventDefault();
				if (selectedIndex >= 0) submitSelected(selectedIndex);
				break;
			case 'Escape':
				event.preventDefault();
				searchInput?.focus();
				break;
		}
	};

	$effect(() => {
		syncResults();
		trackCheckIn();
	});

	$effect(() => {
		if (!focusAfterCheckIn) return;
		focusAfterCheckIn = false;
		tick().then(() => {
			if (searchInput) {
				searchInput.focus();
				searchInput.select();
			}
		});
	});
</script>

<svelte:head>
	<title>Attendance Check-In</title>
</svelte:head>

<div class="min-h-screen bg-base-200">
	<div class="mx-auto flex max-w-6xl flex-col gap-6 p-6">
		<div class="prose max-w-none">
			<h1>Attendance Check-In</h1>
			<p class="text-sm opacity-70">
				Search members fast and record attendance with duplicate protection.
			</p>
		</div>

		{#if form?.success === false && form?.message}
			<AlertBanner kind="error">
				<span>{form.message}</span>
			</AlertBanner>
		{/if}

		{#if checkInResult()}
			{@const result = checkInResult()!}
			<AlertBanner kind={result.duplicate ? 'warning' : 'success'}>
				<div class="flex w-full items-center justify-between gap-4">
					<div>
						<p class="font-semibold">
							{#if result.duplicate}
								Already checked in
							{:else}
								Checked in successfully
							{/if}
						</p>
						<p class="text-sm opacity-80">
							{result.member.displayName} - {result.member.memberCode}
						</p>
						<p class="text-sm opacity-70">
							{#if result.duplicate}
								Already checked in at {formatDateTime(result.checkedInAt)}
							{:else}
								Checked in at {formatDateTime(result.checkedInAt)}
							{/if}
						</p>
					</div>
					<span class={`badge ${statusBadgeClass(result.member.status)}`}>
						{result.member.status}
					</span>
				</div>
			</AlertBanner>
		{/if}

		<div class="grid gap-6 lg:grid-cols-[2fr_1fr]">
			<div class="space-y-6">
				<div class="card bg-base-100 shadow">
					<div class="card-body">
						<h2 class="card-title">Search Members</h2>
						<form method="POST" action="?/search" class="flex flex-col gap-3 sm:flex-row">
							<!-- svelte-ignore a11y_autofocus -->
							<input
								class="input input-bordered flex-1"
								name="query"
								placeholder={data.settings.requireMemberCode
									? 'Enter member code'
									: 'Search by name or code'}
								autocomplete="off"
								autofocus
								bind:this={searchInput}
								onkeydown={handleSearchKeydown}
								value={searchQuery()}
							/>
							<button class="btn btn-primary" type="submit">Search</button>
						</form>
						<p class="text-xs opacity-70">
							{#if data.settings.requireMemberCode}
								Member code search only. Name search is disabled by settings.
							{:else}
								Search by member code or name. Results are limited for privacy.
							{/if}
						</p>
						<p class="text-xs opacity-60">
							Press Enter to search. When only one result matches, press Enter again to check in.
						</p>
					</div>
				</div>

				<div class="card bg-base-100 shadow">
					<div class="card-body">
						<h2 class="card-title">Results</h2>
						{#if searchResults().length > 0}
							<div
								class="space-y-3"
								tabindex="0"
								bind:this={resultsContainer}
								role="listbox"
								onkeydown={handleResultsKeydown}
							>
								{#each searchResults() as member, index}
									<form method="POST" action="?/checkIn" class="card border border-base-200">
										<input type="hidden" name="memberId" value={member.id} />
										<input type="hidden" name="searchQuery" value={searchQuery()} />
										<button
											type="submit"
											role="option"
											aria-selected={selectedIndex === index}
											bind:this={resultButtons[index]}
											onfocus={() => (selectedIndex = index)}
											onmouseenter={() => (selectedIndex = index)}
											class={`flex w-full items-center justify-between gap-4 p-4 text-left ${
												selectedIndex === index ? 'bg-base-200' : ''
											}`}
										>
											<div>
												<p class="font-semibold">{member.displayName}</p>
												<p class="text-xs opacity-70">{member.memberCode}</p>
											</div>
											<span class={`badge ${statusBadgeClass(member.status)}`}>
												{member.status}
											</span>
										</button>
									</form>
								{/each}
							</div>
						{:else}
							<EmptyState
								title={searchQuery() ? 'No members found' : 'Search for a member'}
								description={
									searchQuery()
										? 'Try a different query or check the member code.'
										: 'Run a search to see matching members.'
								}
							/>
						{/if}
					</div>
				</div>
			</div>

			<div class="space-y-6">
				<div class="card bg-base-100 shadow">
					<div class="card-body">
						<h2 class="card-title">Outbox Status</h2>
						<p class="text-sm">Pending events:</p>
						<p class="text-3xl font-semibold">{pendingCount()}</p>
					</div>
				</div>

				<div class="card bg-base-100 shadow">
					<div class="card-body">
						<h2 class="card-title">Duplicate Window</h2>
						<p class="text-sm opacity-70">
							Members cannot be checked in twice within
							<span class="font-semibold"> {data.settings.duplicateWindowMinutes} minutes</span>.
						</p>
					</div>
				</div>
			</div>
		</div>
	</div>
</div>

