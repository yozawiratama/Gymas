export type MembershipLike = {
	id: string;
	startAt: Date;
	endAt: Date;
	createdAt?: Date | null;
	cancelledAt?: Date | null;
};

export type CurrentMembershipResult<T extends MembershipLike> = {
	current: T | null;
	last: T | null;
};

// Membership invariants:
// - Member status is distinct from membership status.
// - A membership is active at a given date if startAt <= date <= endAt (inclusive).
// - Current membership selection is deterministic:
//   1) Prefer memberships active at the given date.
//   2) If multiple are active, choose the one with the latest startAt,
//      tie-breaker latest createdAt, then highest id (lexical).
//   3) If none are active, choose the most recent past membership
//      (latest endAt, then createdAt, then id) as "last".

export function isMembershipCancelledAt(membership: MembershipLike, atDate: Date): boolean {
	if (!membership.cancelledAt) return false;
	return membership.cancelledAt.getTime() <= atDate.getTime();
}

export function isMembershipActiveAt(membership: MembershipLike, atDate: Date): boolean {
	const at = atDate.getTime();
	if (isMembershipCancelledAt(membership, atDate)) {
		return false;
	}
	return membership.startAt.getTime() <= at && membership.endAt.getTime() >= at;
}

function compareByStartCreatedId(candidate: MembershipLike, current: MembershipLike): number {
	const startDiff = candidate.startAt.getTime() - current.startAt.getTime();
	if (startDiff !== 0) return startDiff;

	const candidateCreated = candidate.createdAt?.getTime() ?? 0;
	const currentCreated = current.createdAt?.getTime() ?? 0;
	const createdDiff = candidateCreated - currentCreated;
	if (createdDiff !== 0) return createdDiff;

	return compareIds(candidate.id, current.id);
}

function getEffectiveEndAt(membership: MembershipLike, atDate: Date): Date {
	const cancelledAt = membership.cancelledAt ?? null;
	if (cancelledAt && cancelledAt.getTime() <= atDate.getTime()) {
		return cancelledAt;
	}
	return membership.endAt;
}

function compareByEndCreatedId(
	candidate: MembershipLike,
	current: MembershipLike,
	atDate: Date
): number {
	const endDiff =
		getEffectiveEndAt(candidate, atDate).getTime() -
		getEffectiveEndAt(current, atDate).getTime();
	if (endDiff !== 0) return endDiff;

	const candidateCreated = candidate.createdAt?.getTime() ?? 0;
	const currentCreated = current.createdAt?.getTime() ?? 0;
	const createdDiff = candidateCreated - currentCreated;
	if (createdDiff !== 0) return createdDiff;

	return compareIds(candidate.id, current.id);
}

function compareIds(candidateId: string, currentId: string): number {
	const candidateNumeric = /^\d+$/.test(candidateId);
	const currentNumeric = /^\d+$/.test(currentId);
	if (candidateNumeric && currentNumeric) {
		return Number(candidateId) - Number(currentId);
	}
	if (candidateId === currentId) return 0;
	return candidateId > currentId ? 1 : -1;
}

function pickPreferred<T extends MembershipLike>(
	items: T[],
	compare: (candidate: T, current: T) => number
): T | null {
	let preferred: T | null = null;
	for (const item of items) {
		if (!preferred || compare(item, preferred) > 0) {
			preferred = item;
		}
	}
	return preferred;
}

export function getCurrentMembership<T extends MembershipLike>(
	memberships: T[],
	atDate: Date = new Date()
): CurrentMembershipResult<T> {
	const active: T[] = [];
	const past: T[] = [];
	const at = atDate.getTime();

	for (const membership of memberships) {
		if (isMembershipActiveAt(membership, atDate)) {
			active.push(membership);
		} else if (isMembershipCancelledAt(membership, atDate) || membership.endAt.getTime() < at) {
			past.push(membership);
		}
	}

	const current = pickPreferred(active, compareByStartCreatedId);
	const last = pickPreferred(past, (candidate, currentPick) =>
		compareByEndCreatedId(candidate, currentPick, atDate)
	);

	return { current, last };
}

export function getMembershipStatusLabel(
	membership: MembershipLike | null | undefined,
	atDate: Date = new Date()
): 'ACTIVE' | 'EXPIRED' | 'CANCELLED' {
	if (!membership) return 'EXPIRED';
	if (isMembershipCancelledAt(membership, atDate)) return 'CANCELLED';
	return isMembershipActiveAt(membership, atDate) ? 'ACTIVE' : 'EXPIRED';
}
