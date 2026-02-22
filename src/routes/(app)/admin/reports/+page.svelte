<svelte:head>
	<title>Reports</title>
</svelte:head>

<div class="min-h-screen bg-base-200">
	<div class="mx-auto flex max-w-6xl flex-col gap-6 p-6">
		<div class="prose max-w-none">
			<h1>Reports</h1>
			<p class="text-sm opacity-70">
				Track attendance trends, revenue, and membership status from a single dashboard.
			</p>
		</div>

		<div class="tabs tabs-boxed">
			<a class="tab tab-active" href="/admin/reports">Overview</a>
			<a class="tab" href="/admin/reports/attendance">Attendance</a>
			<a class="tab" href="/admin/reports/revenue">Revenue</a>
			<a class="tab" href="/admin/reports/memberships">Memberships</a>
		</div>

		<div class="grid gap-4 md:grid-cols-3">
			<div class="card bg-base-100 shadow">
				<div class="card-body">
					<h2 class="card-title">Attendance</h2>
					<p class="text-sm opacity-70">
						Daily check-ins and unique member visits for a selected date range.
					</p>
					<div class="card-actions justify-end">
						<a class="btn btn-primary btn-sm" href="/admin/reports/attendance">View report</a>
					</div>
				</div>
			</div>

			<div class="card bg-base-100 shadow">
				<div class="card-body">
					<h2 class="card-title">Revenue</h2>
					<p class="text-sm opacity-70">
						Payments collected per day, with total revenue across the range.
					</p>
					<div class="card-actions justify-end">
						<a class="btn btn-primary btn-sm" href="/admin/reports/revenue">View report</a>
					</div>
				</div>
			</div>

			<div class="card bg-base-100 shadow">
				<div class="card-body">
					<h2 class="card-title">Memberships</h2>
					<p class="text-sm opacity-70">
						Snapshot of active, expired, and frozen memberships at a specific date.
					</p>
					<div class="card-actions justify-end">
						<a class="btn btn-primary btn-sm" href="/admin/reports/memberships">View report</a>
					</div>
				</div>
			</div>

			<div class="card bg-base-100 shadow">
				<div class="card-body">
					<h2 class="card-title">Expiring Memberships</h2>
					<p class="text-sm opacity-70">
						Memberships that end within the next few days for follow-up.
					</p>
					<div class="card-actions justify-end">
						<a class="btn btn-primary btn-sm" href="/reports/memberships/expiring">
							View report
						</a>
					</div>
				</div>
			</div>
		</div>
	</div>
</div>
