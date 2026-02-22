import { getCurrentMembership, getMembershipStatusLabel, type MembershipLike } from './currentMembership';

// Dev-only self-checks for deterministic membership selection.
// This file is not imported by the app; run manually if needed.

const date = (value: string) => new Date(value);

const sampleMemberships: MembershipLike[] = [
	{
		id: 'm-001',
		startAt: date('2024-01-01T00:00:00Z'),
		endAt: date('2024-06-01T00:00:00Z'),
		createdAt: date('2024-01-01T00:00:00Z')
	},
	{
		id: 'm-002',
		startAt: date('2024-05-01T00:00:00Z'),
		endAt: date('2024-12-01T00:00:00Z'),
		createdAt: date('2024-05-01T00:00:00Z')
	},
	{
		id: 'm-003',
		startAt: date('2024-05-01T00:00:00Z'),
		endAt: date('2024-11-01T00:00:00Z'),
		createdAt: date('2024-05-02T00:00:00Z')
	}
];

const activeDate = date('2024-06-15T00:00:00Z');
const { current: activeCurrent } = getCurrentMembership(sampleMemberships, activeDate);
if (!activeCurrent || activeCurrent.id !== 'm-003') {
	throw new Error('Expected m-003 as current membership for active date.');
}
if (getMembershipStatusLabel(activeCurrent, activeDate) !== 'ACTIVE') {
	throw new Error('Expected ACTIVE status label for current membership.');
}

const pastDate = date('2025-01-01T00:00:00Z');
const { current: pastCurrent, last: pastLast } = getCurrentMembership(sampleMemberships, pastDate);
if (pastCurrent) {
	throw new Error('Expected no current membership for past date.');
}
if (!pastLast || pastLast.id !== 'm-002') {
	throw new Error('Expected m-002 as last membership for past date.');
}
