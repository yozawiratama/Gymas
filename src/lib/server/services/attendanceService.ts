import { getRuntimeConfig } from '$lib/server/config';
import { localTxWithOutbox } from '$lib/server/db/localTx';
import { createCheckIn, findRecentCheckIn } from '$lib/server/repositories/attendanceRepository';
import { findMemberForCheckIn } from '$lib/server/repositories/memberRepository';
import { getAttendanceSettings } from '$lib/server/services/appSettingService';
import { isMemberEligibleForCheckIn } from '$lib/server/services/membershipService';
import { badRequest, conflict, notFound } from '$lib/server/httpErrors';

export type AttendanceCheckInInput = {
	branchId: string;
	memberId?: string;
	memberCode?: string;
	source?: 'MANUAL' | 'AUTO';
};

export type AttendanceMemberSummary = {
	id: string;
	memberCode: string;
	displayName: string;
	status: string;
};

export type AttendanceCheckInResult = {
	attendance: {
		id: string;
		memberId: string;
		membershipId: string | null;
		checkInAt: Date;
		checkOutAt: Date | null;
		source: string;
		memberSnapshot: unknown;
		createdAt: Date;
	};
	outbox: {
		type: string;
		idempotencyKey: string;
	} | null;
	duplicate: boolean;
	member: AttendanceMemberSummary;
};

function formatCheckInDate(checkInAt: Date): string {
	return checkInAt.toISOString().slice(0, 10);
}

function formatDisplayName(firstName: string, lastName: string): string {
	return `${firstName} ${lastName}`.trim();
}

export async function checkInMember(input: AttendanceCheckInInput): Promise<AttendanceCheckInResult> {
	const memberId = input.memberId?.trim() || undefined;
	const memberCode = input.memberCode?.trim() || undefined;

	if (!memberId && !memberCode) {
		throw badRequest('Member selection is required.', 'INVALID_INPUT');
	}

	const settings = await getAttendanceSettings(input.branchId);
	const duplicateWindowMs = settings.duplicateWindowMinutes * 60 * 1000;

	const { deviceId, gymId } = getRuntimeConfig();
	const checkInAt = new Date();
	const source: 'MANUAL' | 'AUTO' = input.source ?? 'MANUAL';

	return localTxWithOutbox<AttendanceCheckInResult>(async (tx) => {
		const member = await findMemberForCheckIn(tx, {
			branchId: input.branchId,
			memberId,
			memberCode
		});

		if (!member) {
			throw notFound('Member not found.', 'MEMBER_NOT_FOUND');
		}

		if (member.status !== 'ACTIVE') {
			throw conflict('Member inactive.', 'MEMBER_INACTIVE');
		}

		const memberSummary: AttendanceMemberSummary = {
			id: member.id,
			memberCode: member.memberCode,
			displayName: formatDisplayName(member.firstName, member.lastName),
			status: member.status
		};

		const duplicateSince = new Date(checkInAt.getTime() - duplicateWindowMs);
		const recent = await findRecentCheckIn(tx, {
			memberId: member.id,
			branchId: input.branchId,
			since: duplicateSince
		});

		if (recent) {
			// Duplicate check-ins return a success payload with duplicate=true for idempotent UX.
			return {
				result: {
					attendance: recent,
					outbox: null,
					duplicate: true,
					member: memberSummary
				},
				outbox: null
			};
		}

		const eligibility = await isMemberEligibleForCheckIn(input.branchId, member.id, checkInAt, {
			blockIfExpired: settings.blockIfExpired,
			blockIfFrozen: settings.blockIfFrozen,
			graceDays: settings.graceDays,
			allowWithoutActiveMembership: settings.allowWithoutActiveMembership
		});

		if (!eligibility.eligible) {
			let code = 'MEMBERSHIP_EXPIRED';
			if (eligibility.status === 'FROZEN') {
				code = 'MEMBERSHIP_FROZEN';
			} else if (eligibility.membershipState === 'CANCELLED') {
				code = 'MEMBERSHIP_CANCELLED';
			} else if (eligibility.membershipState === 'NONE') {
				code = 'MEMBERSHIP_REQUIRED';
			}
			throw conflict(eligibility.reason ?? 'Membership not eligible.', code);
		}

		const membershipSnapshot = eligibility.membership
			? {
					id: eligibility.membership.id,
					planId: eligibility.membership.planId,
					planName: eligibility.membership.planName,
					startAt: eligibility.membership.startAt.toISOString(),
					endAt: eligibility.membership.endAt.toISOString(),
					cancelledAt: eligibility.membership.cancelledAt
						? eligibility.membership.cancelledAt.toISOString()
						: null,
					state: eligibility.membershipState
			  }
			: null;

		const memberSnapshot = {
			id: member.id,
			memberCode: member.memberCode,
			firstName: member.firstName,
			lastName: member.lastName,
			email: member.email,
			phone: member.phone,
			status: member.status,
			membership: membershipSnapshot,
			membershipState: eligibility.membershipState
		};

		const attendance = await createCheckIn(tx, {
			memberId: member.id,
			branchId: input.branchId,
			membershipId: eligibility.membership?.id ?? null,
			checkInAt,
			source,
			memberSnapshot
		});

		const payload = {
			attendanceId: attendance.id,
			memberId: member.id,
			checkinAt: attendance.checkInAt.toISOString(),
			checkinDate: formatCheckInDate(attendance.checkInAt),
			snapshots: {
				member: memberSnapshot
			},
			deviceId,
			gymId
		};

		const idempotencyKey = `attendance-checkin:${attendance.id}`;

		return {
			result: {
				attendance,
				outbox: {
					type: 'ATTENDANCE_CHECKIN',
					idempotencyKey
				},
				duplicate: false,
				member: memberSummary
			},
			outbox: {
				type: 'ATTENDANCE_CHECKIN',
				payload,
				idempotencyKey
			}
		};
	});
}
