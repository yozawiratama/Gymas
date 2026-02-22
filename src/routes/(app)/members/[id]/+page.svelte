<script lang="ts">
	import AlertBanner from '$lib/components/AlertBanner.svelte';

	let { data, form } = $props();

	const profile = () => data.profile;
	const permissions = () => data.permissions;
	const planOptions = () => data.planOptions ?? [];
	const created = () => data.created ?? false;
	const updated = () => data.updated ?? false;
	const renewed = () => data.renewed ?? false;
	const statusUpdated = () => data.statusUpdated ?? false;
	const paymentVoided = () => data.paymentVoided ?? false;
	const membershipCancelled = () => data.membershipCancelled ?? false;
	const member = () => profile().member;
	const membership = () => profile().membership;
	const renewalPlan = () => data.renewalPlan ?? null;
	const baseMembership = () =>
		membership().currentMembership ?? membership().lastMembership ?? null;
	const basePlanInactive = () => renewalPlan()?.isActive === false;
	const canRenewMembership = () =>
		permissions().canAssignMembership && !!baseMembership() && !basePlanInactive();

	const statusBadgeClass = (status: string) =>
		status === 'ACTIVE' ? 'badge-success' : 'badge-ghost';
	const formatMemberStatus = (status: string) => {
		if (status === 'ACTIVE') return 'Active';
		if (status === 'INACTIVE') return 'Inactive';
		return status;
	};
	const membershipStatusBadgeClass = (status: string) => {
		if (status === 'ACTIVE') return 'badge-success';
		if (status === 'FROZEN') return 'badge-warning';
		if (status === 'CANCELLED') return 'badge-error';
		return 'badge-ghost';
	};
	const formatMembershipStatus = (status: string) => {
		if (status === 'ACTIVE') return 'Active';
		if (status === 'EXPIRED') return 'Expired';
		if (status === 'FROZEN') return 'Frozen';
		if (status === 'CANCELLED') return 'Cancelled';
		if (status === 'NONE') return 'None';
		return status;
	};
	const membershipSummaryStatus = () => {
		const info = membership();
		if (info.isFrozen) return 'FROZEN';
		if (info.currentMembership) return 'ACTIVE';
		if (info.lastMembership?.cancelledAt) return 'CANCELLED';
		if (info.membershipHistory?.length) return 'EXPIRED';
		return 'NONE';
	};
	const historyStatus = (record: {
		status?: string;
		endAt?: string | null;
		cancelledAt?: string | null;
	}) => {
		if (record.status) return record.status;
		if (record.cancelledAt) return 'CANCELLED';
		if (!record.endAt) return 'ACTIVE';
		return new Date(record.endAt).getTime() < Date.now() ? 'EXPIRED' : 'ACTIVE';
	};
	const paymentStatusClass = (status: string) => {
		if (status === 'PAID') return 'badge-success';
		if (status === 'REFUNDED') return 'badge-warning';
		if (status === 'VOID') return 'badge-ghost';
		return 'badge-ghost';
	};
	const voidPaymentModalId = (paymentId: string) => `void-payment-${paymentId}`;

	const formatDate = (value: string | null | undefined) => {
		if (!value) return '—';
		return new Date(value).toLocaleDateString();
	};

	const formatMembershipRange = (
		startAt: string | null | undefined,
		endAt: string | null | undefined
	) => `${formatDate(startAt)} - ${formatDate(endAt)}`;

	const formatDateTime = (value: string | null | undefined) => {
		if (!value) return '—';
		return new Date(value).toLocaleString();
	};

	const formatAmount = (amount: string, currency: string) => `${currency} ${amount}`;
	const formatPrice = (priceCents: number | null | undefined) => {
		if (priceCents == null) return '—';
		return `USD ${(priceCents / 100).toFixed(2)}`;
	};

	const paymentMembershipOptions = () => membership().membershipHistory?.slice(0, 5) ?? [];
	const defaultPaymentMembershipId = () => membership().currentMembership?.id ?? '';

	const toDateInputValue = (date: Date) => {
		const offsetMs = date.getTimezoneOffset() * 60_000;
		return new Date(date.getTime() - offsetMs).toISOString().slice(0, 10);
	};

	const defaultPaidAt = (() => {
		const now = new Date();
		const offsetMs = now.getTimezoneOffset() * 60_000;
		return new Date(now.getTime() - offsetMs).toISOString().slice(0, 16);
	})();

	const defaultMembershipStart = (() => {
		const now = new Date();
		const offsetMs = now.getTimezoneOffset() * 60_000;
		return new Date(now.getTime() - offsetMs).toISOString().slice(0, 10);
	})();

	const startOfDay = (value: Date) => new Date(value.getFullYear(), value.getMonth(), value.getDate());

	const addDays = (value: Date, days: number) => {
		const next = new Date(value.getTime());
		next.setDate(next.getDate() + days);
		return next;
	};

	const getRenewalDefaults = () => {
		const today = startOfDay(new Date());
		const base = baseMembership();
		const baseEnd = base?.endAt ? startOfDay(new Date(base.endAt)) : null;
		const startDate =
			baseEnd && baseEnd.getTime() >= today.getTime() ? addDays(baseEnd, 1) : today;
		const durationDays = renewalPlan()?.durationDays;
		const endDate =
			typeof durationDays === 'number' && Number.isFinite(durationDays)
				? addDays(startDate, Math.max(durationDays - 1, 0))
				: null;
		return { startDate, endDate };
	};

	const defaultRenewalStart = () => toDateInputValue(getRenewalDefaults().startDate);

	const defaultRenewalEnd = () => {
		const endDate = getRenewalDefaults().endDate;
		return endDate ? toDateInputValue(endDate) : '';
	};

	const requiresRenewalEndAt = () => {
		const durationDays = renewalPlan()?.durationDays;
		return !(typeof durationDays === 'number' && Number.isFinite(durationDays));
	};

	const lockSubmit = (event: SubmitEvent) => {
		const form = event.currentTarget as HTMLFormElement | null;
		const button = form?.querySelector('button[type="submit"]') as HTMLButtonElement | null;
		if (button) {
			button.disabled = true;
			button.classList.add('btn-disabled');
		}
	};
</script>

<svelte:head>
	<title>{member().name}</title>
</svelte:head>

<div class="min-h-screen bg-base-200">
	<div class="mx-auto flex max-w-6xl flex-col gap-6 p-6">
		<div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
			<div class="prose max-w-none">
				<a class="link link-hover text-sm" href="/members">Back to members</a>
				<h1>{member().name}</h1>
				<p class="text-sm opacity-70">Member profile 360 overview.</p>
			</div>
			<div class="flex flex-wrap items-center gap-2">
				{#if permissions().canAssignMembership}
					<a
						class="btn btn-sm btn-outline"
						href={`/members/${member().id}/edit`}
					>
						Edit Member
					</a>
				{/if}
				<span class={`badge ${statusBadgeClass(member().status)}`}>
					{formatMemberStatus(member().status)}
				</span>
			</div>
		</div>

		<div class="grid gap-6 lg:grid-cols-3">
			{#if form?.success === false && form?.message}
				<div class="lg:col-span-3">
					<AlertBanner kind="error">
						<span>{form.message}</span>
					</AlertBanner>
				</div>
			{/if}

			{#if created() && !form}
				<div class="lg:col-span-3">
					<AlertBanner kind="success">
						<span>Member created successfully.</span>
					</AlertBanner>
				</div>
			{/if}

			{#if updated() && !form}
				<div class="lg:col-span-3">
					<AlertBanner kind="success">
						<span>Member updated successfully.</span>
					</AlertBanner>
				</div>
			{/if}

			{#if renewed() && !form}
				<div class="lg:col-span-3">
					<AlertBanner kind="success">
						<span>Membership renewed successfully.</span>
					</AlertBanner>
				</div>
			{/if}

			{#if membershipCancelled() && !form}
				<div class="lg:col-span-3">
					<AlertBanner kind="success">
						<span>Membership cancelled successfully.</span>
					</AlertBanner>
				</div>
			{/if}

			{#if statusUpdated() && !form}
				<div class="lg:col-span-3">
					<AlertBanner kind="success">
						<span>Member status updated successfully.</span>
					</AlertBanner>
				</div>
			{/if}

			{#if paymentVoided() && !form}
				<div class="lg:col-span-3">
					<AlertBanner kind="success">
						<span>Payment voided successfully.</span>
					</AlertBanner>
				</div>
			{/if}

			{#if form?.success && form?.action === 'recordPayment'}
				<div class="lg:col-span-3">
					<AlertBanner kind="success">
						<div class="flex flex-wrap items-center justify-between gap-2">
							<span>Payment recorded successfully.</span>
							<a class="btn btn-sm btn-outline" href="/payments?flash=payment-recorded">
								View payments
							</a>
						</div>
					</AlertBanner>
				</div>
			{/if}

			{#if form?.success && form?.action === 'assignMembership'}
				<div class="lg:col-span-3">
					<AlertBanner kind="success">
						<span>Membership assigned successfully.</span>
					</AlertBanner>
				</div>
			{/if}

			<div class="card bg-base-100 shadow lg:col-span-2">
				<div class="card-body space-y-4">
					<h2 class="card-title">Basic Profile</h2>
					<div class="grid gap-4 sm:grid-cols-2">
						<div>
							<p class="text-xs uppercase opacity-60">Member Code</p>
							<p class="font-semibold">{member().memberCode}</p>
						</div>
						<div>
							<p class="text-xs uppercase opacity-60">Joined</p>
							<p class="font-semibold">{formatDate(member().joinedAt)}</p>
						</div>
					</div>
					<div>
						<p class="text-xs uppercase opacity-60">Status</p>
						<div class="flex flex-wrap items-center gap-2">
							<span class={`badge ${statusBadgeClass(member().status)}`}>
								{formatMemberStatus(member().status)}
							</span>
							{#if permissions().canArchive}
								{#if member().status === 'ACTIVE'}
									<label
										for="deactivate-member-modal"
										class="btn btn-xs btn-outline btn-error"
									>
										Deactivate
									</label>
								{:else}
									<label
										for="reactivate-member-modal"
										class="btn btn-xs btn-outline btn-success"
									>
										Reactivate
									</label>
								{/if}
							{/if}
						</div>
					</div>

					{#if permissions().canArchive}
						<div>
							<p class="text-xs uppercase opacity-60">Actions</p>
							<p class="text-sm opacity-70">
								Deactivate a member to prevent future activity without deleting history.
							</p>
						</div>
					{/if}
				</div>
			</div>

			<div class="card bg-base-100 shadow">
				<div class="card-body space-y-4">
					<h2 class="card-title">Tags</h2>
					{#if profile().tags.length}
						<div class="flex flex-wrap gap-2">
							{#each profile().tags as tag}
								<span class="badge badge-outline">{tag.name}</span>
							{/each}
						</div>
					{:else}
						<p class="text-sm opacity-60">No tags assigned.</p>
					{/if}
				</div>
			</div>

			<div class="card bg-base-100 shadow">
				<div class="card-body space-y-4">
					<h2 class="card-title">Flags</h2>
					{#if profile().flags.length}
						<ul class="space-y-2 text-sm">
							{#each profile().flags as flag}
								<li class="flex items-center justify-between gap-3">
									<span class="font-medium">{flag.type}</span>
									<span class="text-xs opacity-60">{formatDateTime(flag.createdAt)}</span>
								</li>
							{/each}
						</ul>
					{:else}
						<p class="text-sm opacity-60">No active flags.</p>
					{/if}
				</div>
			</div>

			<div class="card bg-base-100 shadow lg:col-span-2">
				<div class="card-body space-y-4">
					<div class="flex items-center justify-between gap-3">
						<h2 class="card-title">Membership</h2>
						{#if permissions().canAssignMembership || permissions().canCancelMembership}
							<div class="flex flex-wrap items-center gap-2">
								{#if permissions().canAssignMembership}
									<label for="assign-membership-modal" class="btn btn-sm btn-primary">
										Assign Plan
									</label>
									{#if canRenewMembership()}
										<label for="renew-membership-modal" class="btn btn-sm btn-outline">
											Renew
										</label>
									{:else}
										<span class="btn btn-sm btn-outline btn-disabled">Renew</span>
									{/if}
								{/if}
								{#if permissions().canCancelMembership}
									{#if membership().currentMembership}
										<label
											for="cancel-membership-modal"
											class="btn btn-sm btn-error"
										>
											Cancel Membership
										</label>
									{:else}
										<span class="btn btn-sm btn-outline btn-disabled">
											Cancel Membership
										</span>
									{/if}
								{/if}
							</div>
						{/if}
					</div>

					{#if permissions().canAssignMembership && !baseMembership()}
						<p class="text-xs opacity-70">No membership to renew yet.</p>
					{:else if permissions().canAssignMembership && basePlanInactive()}
						<p class="text-xs text-warning">
							Current plan is inactive. Assign a new plan to renew.
						</p>
					{/if}

					<div class="grid gap-4 sm:grid-cols-2">
						<div>
							<p class="text-xs uppercase opacity-60">Status</p>
							<span
								class={`badge ${membershipStatusBadgeClass(membershipSummaryStatus())}`}
							>
								{formatMembershipStatus(membershipSummaryStatus())}
							</span>
							{#if !membership().currentMembership && membership().lastMembership?.cancelledAt}
								<p class="mt-1 text-xs opacity-70">
									Cancelled on {formatDate(membership().lastMembership?.cancelledAt)}
								</p>
								{#if membership().lastMembership?.cancelReason}
									<p class="mt-1 text-xs opacity-70">
										Reason: {membership().lastMembership?.cancelReason}
									</p>
								{/if}
							{/if}
						</div>
						{#if membership().currentMembership}
							<div>
								<p class="text-xs uppercase opacity-60">Current plan</p>
								<p class="font-semibold">{membership().currentMembership?.planName}</p>
							</div>
							<div>
								<p class="text-xs uppercase opacity-60">Start</p>
								<p class="font-semibold">
									{formatDate(membership().currentMembership?.startAt)}
								</p>
							</div>
							<div>
								<p class="text-xs uppercase opacity-60">Expires</p>
								<p class="font-semibold">
									{formatDate(membership().currentMembership?.endAt)}
								</p>
							</div>
						{:else}
							<div>
								<p class="text-xs uppercase opacity-60">Membership</p>
								<p class="font-semibold">No active membership</p>
							</div>
							{#if membership().lastMembership}
								<div>
									<p class="text-xs uppercase opacity-60">Last plan</p>
									<p class="font-semibold">
										{membership().lastMembership?.planName}
									</p>
								</div>
								<div>
									<p class="text-xs uppercase opacity-60">Ended</p>
									<p class="font-semibold">
										{formatDate(membership().lastMembership?.endAt)}
									</p>
								</div>
							{/if}
						{/if}
					</div>

					{#if membership().isFrozen}
						<p class="text-sm text-warning">
							This member is currently frozen. Attendance settings may block check-in.
						</p>
					{/if}

					<div>
						<h3 class="text-sm font-semibold">Membership history</h3>
						{#if membership().membershipHistory.length}
							<div class="overflow-x-auto">
								<table class="table table-sm">
									<thead>
										<tr>
											<th>Plan</th>
											<th>Start</th>
											<th>End</th>
											<th>Status</th>
										</tr>
									</thead>
									<tbody>
										{#each membership().membershipHistory as record}
											<tr>
												<td class="font-medium">{record.planName}</td>
												<td>{formatDate(record.startAt)}</td>
												<td>{formatDate(record.endAt)}</td>
												<td>
													<span
														class={`badge badge-sm ${membershipStatusBadgeClass(
															historyStatus(record)
														)}`}
													>
														{formatMembershipStatus(historyStatus(record))}
													</span>
													{#if record.cancelledAt}
														<div class="mt-1 text-xs opacity-60">
															Cancelled {formatDate(record.cancelledAt)}
														</div>
													{/if}
													{#if record.cancelReason}
														<div class="mt-1 text-xs opacity-60">
															Reason: {record.cancelReason}
														</div>
													{/if}
												</td>
											</tr>
										{/each}
									</tbody>
								</table>
							</div>
						{:else}
							<p class="text-sm opacity-60">No membership records yet.</p>
						{/if}
					</div>
				</div>
			</div>

			<div class="card bg-base-100 shadow lg:col-span-2">
				<div class="card-body space-y-4">
					<h2 class="card-title">Attendance</h2>
					<div class="grid gap-4 sm:grid-cols-2">
						<div>
							<p class="text-xs uppercase opacity-60">Total check-ins</p>
							<p class="text-2xl font-semibold">{profile().attendance.totalCount}</p>
						</div>
						<div>
							<p class="text-xs uppercase opacity-60">Last check-in</p>
							<p class="font-semibold">
								{formatDateTime(profile().attendance.lastCheckInAt)}
							</p>
						</div>
					</div>

					<div>
						<h3 class="text-sm font-semibold">Recent check-ins</h3>
						{#if profile().attendance.recent.length}
							<div class="overflow-x-auto">
								<table class="table table-sm">
									<thead>
										<tr>
											<th>Checked In</th>
										</tr>
									</thead>
									<tbody>
										{#each profile().attendance.recent as record}
											<tr>
												<td>{formatDateTime(record.checkedInAt)}</td>
											</tr>
										{/each}
									</tbody>
								</table>
							</div>
						{:else}
							<p class="text-sm opacity-60">No recent attendance records.</p>
						{/if}
					</div>
				</div>
			</div>

			<div class="card bg-base-100 shadow">
				<div class="card-body space-y-4">
					<div class="flex items-center justify-between gap-3">
						<h2 class="card-title">Payments</h2>
						{#if permissions().canRecordPayments}
							<label for="record-payment-modal" class="btn btn-sm btn-primary">
								Record Payment
							</label>
						{/if}
					</div>
					<div class="grid gap-4">
						<div>
							<p class="text-xs uppercase opacity-60">Total payments (non-voided)</p>
							<p class="text-2xl font-semibold">{profile().payments.totalCount}</p>
						</div>
						<div>
							<p class="text-xs uppercase opacity-60">Last payment (non-voided)</p>
							<p class="font-semibold">{formatDateTime(profile().payments.lastPaidAt)}</p>
						</div>
						<p class="text-xs opacity-60">
							Voided payments stay in history and are excluded from totals.
						</p>
					</div>

					{#if !permissions().canViewPayments}
						<p class="text-sm opacity-60">Payment details are restricted.</p>
					{:else if profile().payments.recent.length}
						<div class="overflow-x-auto">
							<table class="table table-sm">
								<thead>
									<tr>
										<th>Paid At</th>
										<th>Amount</th>
										<th>Method</th>
										<th>Status</th>
										{#if permissions().canVoidPayments}
											<th class="text-right">Actions</th>
										{/if}
									</tr>
								</thead>
								<tbody>
									{#each profile().payments.recent as payment}
										<tr class={payment.status === 'VOID' ? 'opacity-60' : ''}>
											<td>{formatDateTime(payment.paidAt)}</td>
											<td>
												<div class="font-mono text-sm">
													{formatAmount(payment.amount, payment.currency)}
												</div>
												{#if payment.membership}
													<div class="mt-1 text-[11px] opacity-70">
														For: {payment.membership.planName} ({formatMembershipRange(payment.membership.startAt, payment.membership.endAt)})
													</div>
												{/if}
											</td>
											<td>{payment.method ?? '—'}</td>
											<td>
												<span class={`badge badge-sm ${paymentStatusClass(payment.status)}`}>
													{payment.status}
												</span>
												{#if payment.status === 'VOID'}
													<div class="mt-1 text-[11px] uppercase tracking-wide opacity-60">
														Voided
													</div>
												{/if}
											</td>
											{#if permissions().canVoidPayments}
												<td class="text-right">
													{#if payment.status === 'VOID'}
														<span class="text-xs opacity-50">—</span>
													{:else}
														<label
															for={voidPaymentModalId(payment.id)}
															class="btn btn-xs btn-outline btn-error"
														>
															Void
														</label>
													{/if}
												</td>
											{/if}
										</tr>
									{/each}
								</tbody>
							</table>
						</div>

						{#if permissions().canVoidPayments}
							{#each profile().payments.recent as payment}
								{#if payment.status !== 'VOID'}
									<input
										type="checkbox"
										id={voidPaymentModalId(payment.id)}
										class="modal-toggle"
									/>
									<div class="modal" role="dialog">
										<div class="modal-box">
											<label
												for={voidPaymentModalId(payment.id)}
												class="btn btn-sm btn-circle btn-ghost absolute right-2 top-2"
											>
												x
											</label>
											<h3 class="text-lg font-semibold">Void Payment</h3>
											<p class="mt-2 text-sm opacity-70">
												This marks the payment as void and keeps it in history for audit.
											</p>
											<div class="mt-3 rounded-box border border-base-200 bg-base-200/40 p-3 text-sm">
												<p class="font-medium">
													{formatAmount(payment.amount, payment.currency)} via {payment.method ?? '—'}
												</p>
												<p class="opacity-70">
													Paid at {formatDateTime(payment.paidAt)}
												</p>
											</div>

											<form
												method="POST"
												action="?/voidPayment"
												class="mt-4 space-y-4"
												onsubmit={lockSubmit}
											>
												<input type="hidden" name="paymentId" value={payment.id} />

												<div class="form-control">
													<label class="label" for={`void-reason-${payment.id}`}>
														<span class="label-text">Reason (optional)</span>
													</label>
													<textarea
														id={`void-reason-${payment.id}`}
														name="reason"
														class="textarea textarea-bordered"
														rows="3"
														maxlength="500"
														placeholder="Add a short reason for voiding this payment"
													></textarea>
												</div>

												<div class="modal-action">
													<label for={voidPaymentModalId(payment.id)} class="btn btn-ghost">
														Keep Payment
													</label>
													<button class="btn btn-error" type="submit">
														Void Payment
													</button>
												</div>
											</form>
										</div>
									</div>
								{/if}
							{/each}
						{/if}
					{:else}
						<p class="text-sm opacity-60">No recent payment records.</p>
					{/if}
				</div>
			</div>

			{#if permissions().canRecordPayments}
				<input type="checkbox" id="record-payment-modal" class="modal-toggle" />
				<div class="modal" role="dialog">
					<div class="modal-box">
						<label
							for="record-payment-modal"
							class="btn btn-sm btn-circle btn-ghost absolute right-2 top-2"
						>
							x
						</label>
						<h3 class="text-lg font-semibold">Record Payment</h3>
						<form
							method="POST"
							action="?/recordPayment"
							class="mt-4 space-y-4"
							onsubmit={lockSubmit}
						>
							<div class="form-control">
								<label class="label" for="amount">
									<span class="label-text">Amount</span>
								</label>
								<!-- svelte-ignore a11y_autofocus -->
								<input
									id="amount"
									name="amount"
									type="number"
									inputmode="decimal"
									min="0.01"
									step="0.01"
									class="input input-bordered"
									required
									placeholder="0.00"
									autofocus
								/>
							</div>

							<div class="form-control">
								<label class="label" for="paidAt">
									<span class="label-text">Paid at</span>
								</label>
								<input
									id="paidAt"
									name="paidAt"
									type="datetime-local"
									class="input input-bordered"
									value={defaultPaidAt}
								/>
							</div>

							<div class="form-control">
								<label class="label" for="method">
									<span class="label-text">Method</span>
								</label>
								<select id="method" name="method" class="select select-bordered">
									<option value="CASH" selected>Cash</option>
									<option value="CARD">Card</option>
									<option value="TRANSFER">Transfer</option>
									<option value="OTHER">Other</option>
								</select>
							</div>

							{#if paymentMembershipOptions().length}
								<div class="form-control">
									<label class="label" for="membershipId">
										<span class="label-text">Apply to Membership (optional)</span>
									</label>
									<select
										id="membershipId"
										name="membershipId"
										class="select select-bordered"
									>
										<option value="" selected={!defaultPaymentMembershipId()}>
											— None —
										</option>
										{#each paymentMembershipOptions() as membershipOption}
											<option
												value={membershipOption.id}
												selected={membershipOption.id === defaultPaymentMembershipId()}
											>
												{membershipOption.planName} ({formatMembershipRange(
													membershipOption.startAt,
													membershipOption.endAt
												)})
											</option>
										{/each}
									</select>
								</div>
							{/if}

							<div class="form-control">
								<label class="label" for="note">
									<span class="label-text">Note (optional)</span>
								</label>
								<textarea
									id="note"
									name="note"
									class="textarea textarea-bordered"
									rows="3"
									placeholder="Add a short note"
								></textarea>
							</div>

							<div class="modal-action">
								<label for="record-payment-modal" class="btn btn-ghost">Cancel</label>
								<button class="btn btn-primary" type="submit">Save Payment</button>
							</div>
						</form>
					</div>
				</div>
			{/if}

			{#if permissions().canAssignMembership}
				<input type="checkbox" id="assign-membership-modal" class="modal-toggle" />
				<div class="modal" role="dialog">
					<div class="modal-box">
						<label
							for="assign-membership-modal"
							class="btn btn-sm btn-circle btn-ghost absolute right-2 top-2"
						>
							x
						</label>
						<h3 class="text-lg font-semibold">Assign Membership Plan</h3>

						{#if planOptions().length === 0}
							<p class="mt-4 text-sm opacity-70">
								No active membership plans are available. Create a plan first.
							</p>
						{:else}
							<form
								method="POST"
								action="?/assignMembership"
								class="mt-4 space-y-4"
								onsubmit={lockSubmit}
							>
								<div class="form-control">
									<label class="label" for="planId">
										<span class="label-text">Plan</span>
									</label>
									<!-- svelte-ignore a11y_autofocus -->
									<select
										id="planId"
										name="planId"
										class="select select-bordered"
										required
										autofocus
									>
										{#if planOptions().length}
											<option value="" disabled selected>
												Select a plan
											</option>
										{/if}
										{#each planOptions() as plan}
											<option value={plan.id}>
												{plan.name} · {plan.durationDays} days · {formatPrice(plan.priceCents)}
											</option>
										{/each}
									</select>
								</div>

								<div class="form-control">
									<label class="label" for="startAt">
										<span class="label-text">Start date</span>
									</label>
									<input
										id="startAt"
										name="startAt"
										type="date"
										class="input input-bordered"
										required
										value={defaultMembershipStart}
									/>
								</div>

								<div class="form-control">
									<label class="label" for="endAt">
										<span class="label-text">End date (optional)</span>
									</label>
									<input
										id="endAt"
										name="endAt"
										type="date"
										class="input input-bordered"
									/>
									<p class="text-xs opacity-70">
										Leave blank to use the plan duration.
									</p>
								</div>

								<div class="modal-action">
									<label for="assign-membership-modal" class="btn btn-ghost">Cancel</label>
									<button class="btn btn-primary" type="submit">Assign Plan</button>
								</div>
							</form>
						{/if}
					</div>
				</div>
			{/if}

			{#if permissions().canAssignMembership}
				<input type="checkbox" id="renew-membership-modal" class="modal-toggle" />
				<div class="modal" role="dialog">
					<div class="modal-box">
						<label
							for="renew-membership-modal"
							class="btn btn-sm btn-circle btn-ghost absolute right-2 top-2"
						>
							x
						</label>
						<h3 class="text-lg font-semibold">Renew Membership</h3>

						{#if !baseMembership()}
							<p class="mt-4 text-sm opacity-70">No membership to renew yet.</p>
						{:else if basePlanInactive()}
							<p class="mt-4 text-sm text-warning">
								Current plan is inactive. Assign a new plan to renew.
							</p>
						{:else}
							<form
								method="POST"
								action="?/renewMembership"
								class="mt-4 space-y-4"
								onsubmit={lockSubmit}
							>
								<input type="hidden" name="planId" value={baseMembership()?.planId} />

								<div class="rounded-box border border-base-200 bg-base-200/40 p-3 text-sm">
									<p class="font-semibold">
										Renewing plan: {baseMembership()?.planName}
									</p>
									{#if renewalPlan()?.durationDays}
										<p class="opacity-70">
											Duration: {renewalPlan()?.durationDays} days
										</p>
									{/if}
								</div>

								<div class="form-control">
									<label class="label" for="renew-startAt">
										<span class="label-text">Start date</span>
									</label>
									<input
										id="renew-startAt"
										name="startAt"
										type="date"
										class="input input-bordered"
										required
										value={defaultRenewalStart()}
									/>
								</div>

								<div class="form-control">
									<label class="label" for="renew-endAt">
										<span class="label-text">End date</span>
									</label>
									<input
										id="renew-endAt"
										name="endAt"
										type="date"
										class="input input-bordered"
										value={defaultRenewalEnd()}
										required={requiresRenewalEndAt()}
									/>
									{#if requiresRenewalEndAt()}
										<p class="text-xs opacity-70">
											End date is required when the plan has no duration.
										</p>
									{:else}
										<p class="text-xs opacity-70">
											Leave as-is to keep the default duration. You can override if needed.
										</p>
										{/if}
								</div>

								<div class="divider text-xs uppercase opacity-60">Payment Required</div>

								<div class="form-control">
									<label class="label" for="renew-amount">
										<span class="label-text">Amount</span>
									</label>
									<input
										id="renew-amount"
										name="amount"
										type="number"
										inputmode="decimal"
										min="0.01"
										step="0.01"
										class="input input-bordered"
										required
										placeholder="0.00"
									/>
								</div>

								<div class="form-control">
									<label class="label" for="renew-paidAt">
										<span class="label-text">Paid at</span>
									</label>
									<input
										id="renew-paidAt"
										name="paidAt"
										type="datetime-local"
										class="input input-bordered"
										value={defaultPaidAt}
									/>
								</div>

								<div class="form-control">
									<label class="label" for="renew-method">
										<span class="label-text">Method</span>
									</label>
									<select id="renew-method" name="method" class="select select-bordered">
										<option value="CASH" selected>Cash</option>
										<option value="CARD">Card</option>
										<option value="TRANSFER">Transfer</option>
										<option value="OTHER">Other</option>
									</select>
								</div>

								<div class="form-control">
									<label class="label" for="renew-note">
										<span class="label-text">Note (optional)</span>
									</label>
									<textarea
										id="renew-note"
										name="note"
										class="textarea textarea-bordered"
										rows="3"
										placeholder="Add a short note"
									></textarea>
								</div>

								<div class="modal-action">
									<label for="renew-membership-modal" class="btn btn-ghost">Cancel</label>
									<button class="btn btn-primary" type="submit">Renew Membership</button>
								</div>
							</form>
						{/if}
					</div>
				</div>
			{/if}

			{#if permissions().canCancelMembership}
				<input type="checkbox" id="cancel-membership-modal" class="modal-toggle" />
				<div class="modal" role="dialog">
					<div class="modal-box">
						<label
							for="cancel-membership-modal"
							class="btn btn-sm btn-circle btn-ghost absolute right-2 top-2"
						>
							x
						</label>
						<h3 class="text-lg font-semibold">Cancel Membership</h3>
						<p class="mt-2 text-sm opacity-70">
							This will cancel the selected membership immediately without deleting history.
						</p>

						{#if membership().currentMembership}
							<form
								method="POST"
								action="?/cancelMembership"
								class="mt-4 space-y-4"
								onsubmit={lockSubmit}
							>
								<input
									type="hidden"
									name="membershipId"
									value={membership().currentMembership?.id}
								/>

								<div class="rounded-box border border-base-200 bg-base-200/40 p-3 text-sm">
									<p class="font-semibold">
										Cancelling plan: {membership().currentMembership?.planName}
									</p>
									<p class="opacity-70">
										Valid {formatDate(membership().currentMembership?.startAt)} to
										{formatDate(membership().currentMembership?.endAt)}
									</p>
								</div>

								<div class="form-control">
									<label class="label" for="cancel-reason">
										<span class="label-text">Reason (optional)</span>
									</label>
									<textarea
										id="cancel-reason"
										name="reason"
										class="textarea textarea-bordered"
										rows="3"
										maxlength="500"
										placeholder="Add a short reason for cancellation"
									></textarea>
								</div>

								<div class="modal-action">
									<label for="cancel-membership-modal" class="btn btn-ghost">
										Keep Membership
									</label>
									<button class="btn btn-error" type="submit">
										Cancel Membership
									</button>
								</div>
							</form>
						{:else}
							<p class="mt-4 text-sm opacity-70">No active membership to cancel.</p>
							<div class="modal-action">
								<label for="cancel-membership-modal" class="btn btn-ghost">
									Close
								</label>
							</div>
						{/if}
					</div>
				</div>
			{/if}

			{#if permissions().canArchive}
				<input type="checkbox" id="deactivate-member-modal" class="modal-toggle" />
				<div class="modal" role="dialog">
					<div class="modal-box">
						<label
							for="deactivate-member-modal"
							class="btn btn-sm btn-circle btn-ghost absolute right-2 top-2"
						>
							x
						</label>
						<h3 class="text-lg font-semibold">Deactivate Member</h3>
						<p class="mt-2 text-sm opacity-70">
							This will mark the member as inactive but keep all history intact.
						</p>
						<form
							method="POST"
							action="?/deactivateMember"
							class="mt-4 space-y-4"
							onsubmit={lockSubmit}
						>
							<div class="modal-action">
								<label for="deactivate-member-modal" class="btn btn-ghost">Cancel</label>
								<button class="btn btn-error" type="submit">Deactivate</button>
							</div>
						</form>
					</div>
				</div>

				<input type="checkbox" id="reactivate-member-modal" class="modal-toggle" />
				<div class="modal" role="dialog">
					<div class="modal-box">
						<label
							for="reactivate-member-modal"
							class="btn btn-sm btn-circle btn-ghost absolute right-2 top-2"
						>
							x
						</label>
						<h3 class="text-lg font-semibold">Reactivate Member</h3>
						<p class="mt-2 text-sm opacity-70">
							This will restore the member to active status.
						</p>
						<form
							method="POST"
							action="?/reactivateMember"
							class="mt-4 space-y-4"
							onsubmit={lockSubmit}
						>
							<div class="modal-action">
								<label for="reactivate-member-modal" class="btn btn-ghost">Cancel</label>
								<button class="btn btn-success" type="submit">Reactivate</button>
							</div>
						</form>
					</div>
				</div>
			{/if}

			<div class="card bg-base-100 shadow lg:col-span-3">
				<div class="card-body space-y-4">
					<h2 class="card-title">Notes</h2>
					{#if !permissions().canViewNotes}
						<p class="text-sm opacity-60">Notes are available to admins only.</p>
					{:else if profile().notes.length}
						<div class="space-y-3">
							{#each profile().notes as note}
								<div class="rounded-box border border-base-200 bg-base-200/40 p-3">
									<div class="flex items-center justify-between gap-2">
										<p class="text-sm font-semibold">{note.author}</p>
										<p class="text-xs opacity-60">{formatDateTime(note.createdAt)}</p>
									</div>
									<p class="text-sm">{note.text}</p>
								</div>
							{/each}
						</div>
					{:else}
						<p class="text-sm opacity-60">No notes recorded yet.</p>
					{/if}
				</div>
			</div>
		</div>
	</div>
</div>





