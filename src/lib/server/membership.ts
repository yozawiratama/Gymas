import { isMembershipCancelledAt, type MembershipLike } from '$lib/server/memberships/currentMembership';

export type MembershipState = 'ACTIVE' | 'GRACE' | 'EXPIRED' | 'CANCELLED';

const startOfDay = (value: Date) => new Date(value.getFullYear(), value.getMonth(), value.getDate());

const endOfDay = (value: Date) =>
	new Date(value.getFullYear(), value.getMonth(), value.getDate(), 23, 59, 59, 999);

const addDays = (value: Date, days: number) => {
	const next = new Date(value.getTime());
	next.setDate(next.getDate() + days);
	return next;
};

export function isMembershipActive(membership: MembershipLike, atDate: Date): boolean {
	return getMembershipState(membership, atDate, 0) === 'ACTIVE';
}

export function getMembershipState(
	membership: MembershipLike,
	atDate: Date,
	graceDays = 0
): MembershipState {
	if (isMembershipCancelledAt(membership, atDate)) return 'CANCELLED';

	const start = startOfDay(membership.startAt);
	const end = endOfDay(membership.endAt);
	const at = atDate.getTime();

	if (at >= start.getTime() && at <= end.getTime()) {
		return 'ACTIVE';
	}

	const safeGraceDays =
		Number.isFinite(graceDays) && graceDays > 0 ? Math.floor(graceDays) : 0;

	if (safeGraceDays > 0 && at > end.getTime()) {
		const graceEnd = endOfDay(addDays(end, safeGraceDays));
		if (at <= graceEnd.getTime()) {
			return 'GRACE';
		}
	}

	return 'EXPIRED';
}
