import { serverPrisma } from '$lib/server/db/server';
import { ensureDefaultBranch } from '$lib/server/services/branchService';
import type { Prisma } from '$lib/server/db/prisma-server';

export type IngestEventInput = {
	id: string;
	type: string;
	payload: unknown;
	idempotencyKey: string;
	createdAt: string;
};

export type IngestRequest = {
	deviceId: string;
	gymId: string;
	events: IngestEventInput[];
};

export type RejectedEvent = {
	eventId: string;
	reasonCode: string;
	message: string;
};

export type IngestResponse = {
	acked: string[];
	rejected: RejectedEvent[];
	alreadyProcessed: string[];
	processedCount: number;
	skippedCount: number;
	errorCount: number;
};

export type RequestValidationError = {
	code: string;
	message: string;
};

type AttendanceCheckInPayload = {
	attendanceId: string;
	memberId: string;
	checkinAt: string;
	checkinDate: string;
	snapshots: {
		member: {
			id: string;
			memberCode: string;
			firstName: string;
			lastName: string;
			email: string | null;
			phone: string | null;
			status: string;
		};
	};
	deviceId: string;
	gymId: string;
};

type NormalizedEvent = {
	id: string | null;
	type: string | null;
	payload: unknown;
	idempotencyKey: string | null;
	createdAt: Date | null;
};

type EventOutcome = {
	status: 'ACKED' | 'REJECTED';
	eventId: string;
	reasonCode?: string;
	message?: string;
	alreadyProcessed?: boolean;
};

const SUPPORTED_EVENT_TYPES = new Set(['ATTENDANCE_CHECKIN']);

const REASON_CODES = {
	INVALID_REQUEST: 'INVALID_REQUEST',
	INVALID_EVENT: 'INVALID_EVENT',
	INVALID_IDEMPOTENCY_KEY: 'INVALID_IDEMPOTENCY_KEY',
	INVALID_EVENT_TIMESTAMP: 'INVALID_EVENT_TIMESTAMP',
	UNSUPPORTED_EVENT_TYPE: 'UNSUPPORTED_EVENT_TYPE',
	INVALID_PAYLOAD: 'INVALID_PAYLOAD',
	MEMBER_NOT_FOUND: 'MEMBER_NOT_FOUND',
	ATTENDANCE_CONFLICT: 'ATTENDANCE_CONFLICT',
	DEVICE_MISMATCH: 'DEVICE_MISMATCH',
	GYM_MISMATCH: 'GYM_MISMATCH'
} as const;

const DEFAULT_REJECT_MESSAGE = 'Event rejected.';

const prismaUnsafe = serverPrisma as typeof serverPrisma & {
	processedEvent: {
		findUnique: (args: unknown) => Promise<any>;
		create: (args: unknown) => Promise<any>;
	};
};

type ProcessedEventWriter = {
	processedEvent: {
		create: (args: Prisma.ProcessedEventCreateArgs) => Promise<unknown>;
	};
};

type ProcessedEventReader = {
	processedEvent: {
		findUnique: (args: any) => Promise<any>;
	};
};

type ProcessedEventLookup = {
	idempotencyKey: string;
	deviceId: string;
	eventId: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null;
}

function asNonEmptyString(value: unknown): string | null {
	if (typeof value !== 'string') return null;
	const trimmed = value.trim();
	return trimmed.length > 0 ? trimmed : null;
}

function parseIsoDate(value: unknown): Date | null {
	if (typeof value !== 'string') return null;
	const date = new Date(value);
	return Number.isNaN(date.getTime()) ? null : date;
}

async function findProcessedEvent(
	client: ProcessedEventReader,
	lookup: ProcessedEventLookup
): Promise<{ status: string; result: Prisma.JsonValue | null; eventId?: string } | null> {
	const byKey = await client.processedEvent.findUnique({
		where: { idempotencyKey: lookup.idempotencyKey }
	});

	if (byKey) {
		return byKey;
	}

	if (lookup.deviceId) {
		return client.processedEvent.findUnique({
			where: {
				deviceId_eventId: {
					deviceId: lookup.deviceId,
					eventId: lookup.eventId
				}
			}
		});
	}

	return null;
}

async function resolveProcessedEventConflict(
	error: unknown,
	lookup: ProcessedEventLookup,
	eventId: string
): Promise<EventOutcome | null> {
	if (!isUniqueConstraintError(error)) {
		return null;
	}

	const existing = await findProcessedEvent(prismaUnsafe, lookup);
	if (existing) {
		return mapProcessedEvent(existing, eventId, true);
	}

	return null;
}

export function validateIngestRequest(payload: unknown):
	| { ok: true; data: IngestRequest }
	| { ok: false; error: RequestValidationError } {
	if (!isRecord(payload)) {
		return {
			ok: false,
			error: {
				code: REASON_CODES.INVALID_REQUEST,
				message: 'Request body must be a JSON object.'
			}
		};
	}

	const deviceId = asNonEmptyString(payload.deviceId);
	const gymId = asNonEmptyString(payload.gymId);
	const events = Array.isArray(payload.events) ? payload.events : null;

	if (!deviceId || !gymId || !events) {
		return {
			ok: false,
			error: {
				code: REASON_CODES.INVALID_REQUEST,
				message: 'deviceId, gymId, and events[] are required.'
			}
		};
	}

	return {
		ok: true,
		data: {
			deviceId,
			gymId,
			events: events.map((event) => ({
				id: isRecord(event) && typeof event.id === 'string' ? event.id : '',
				type: isRecord(event) && typeof event.type === 'string' ? event.type : '',
				payload: isRecord(event) ? event.payload : null,
				idempotencyKey:
					isRecord(event) && typeof event.idempotencyKey === 'string'
						? event.idempotencyKey
						: '',
				createdAt:
					isRecord(event) && typeof event.createdAt === 'string'
						? event.createdAt
						: ''
			}))
		}
	};
}

export async function ingestPushBatch(input: IngestRequest): Promise<IngestResponse> {
	const branch = await ensureDefaultBranch();
	const response: IngestResponse = {
		acked: [],
		rejected: [],
		alreadyProcessed: [],
		processedCount: 0,
		skippedCount: 0,
		errorCount: 0
	};

	for (const rawEvent of input.events) {
		const outcome = await processEvent(input.deviceId, input.gymId, branch.id, rawEvent);

		if (outcome.status === 'ACKED') {
			response.acked.push(outcome.eventId);
		} else {
			response.rejected.push({
				eventId: outcome.eventId,
				reasonCode: outcome.reasonCode ?? REASON_CODES.INVALID_EVENT,
				message: outcome.message ?? DEFAULT_REJECT_MESSAGE
			});
		}

		if (outcome.alreadyProcessed) {
			response.alreadyProcessed.push(outcome.eventId);
		}
	}

	response.processedCount = response.acked.length;
	response.skippedCount = response.alreadyProcessed.length;
	response.errorCount = response.rejected.length;

	return response;
}

async function processEvent(
	deviceId: string,
	gymId: string,
	branchId: string,
	rawEvent: IngestEventInput
): Promise<EventOutcome> {
	const normalized = normalizeEvent(rawEvent);
	const eventId = normalized.id ?? 'unknown';

	if (!normalized.id) {
		return rejectEvent(eventId, REASON_CODES.INVALID_EVENT, 'Event id is required.');
	}

	if (!normalized.idempotencyKey) {
		return rejectEvent(
			eventId,
			REASON_CODES.INVALID_IDEMPOTENCY_KEY,
			'Event idempotencyKey is required.'
		);
	}

	if (!normalized.type) {
		return await recordRejectionIfPossible(
			normalized,
			deviceId,
			gymId,
			rejectEvent(eventId, REASON_CODES.INVALID_EVENT, 'Event type is required.')
		);
	}

	if (!normalized.createdAt) {
		return await recordRejectionIfPossible(
			normalized,
			deviceId,
			gymId,
			rejectEvent(eventId, REASON_CODES.INVALID_EVENT_TIMESTAMP, 'Event createdAt is invalid.')
		);
	}

	if (!SUPPORTED_EVENT_TYPES.has(normalized.type)) {
		return await recordRejectionIfPossible(
			normalized,
			deviceId,
			gymId,
			rejectEvent(
				eventId,
				REASON_CODES.UNSUPPORTED_EVENT_TYPE,
				`Unsupported event type: ${normalized.type}.`
			)
		);
	}

	if (normalized.type === 'ATTENDANCE_CHECKIN') {
		const payloadValidation = validateAttendanceCheckInPayload(normalized.payload);
		if (!payloadValidation.ok) {
			return await recordRejectionIfPossible(
				normalized,
				deviceId,
				gymId,
				rejectEvent(eventId, REASON_CODES.INVALID_PAYLOAD, payloadValidation.message)
			);
		}

		const { payload, checkInAt } = payloadValidation;

		if (payload.deviceId !== deviceId) {
			return await recordRejectionIfPossible(
				normalized,
				deviceId,
				gymId,
				rejectEvent(eventId, REASON_CODES.DEVICE_MISMATCH, 'Payload deviceId mismatch.')
			);
		}

		if (payload.gymId !== gymId) {
			return await recordRejectionIfPossible(
				normalized,
				deviceId,
				gymId,
				rejectEvent(eventId, REASON_CODES.GYM_MISMATCH, 'Payload gymId mismatch.')
			);
		}

		return await applyAttendanceCheckIn({
			deviceId,
			gymId,
			branchId,
			event: {
				id: normalized.id,
				idempotencyKey: normalized.idempotencyKey,
				type: normalized.type
			},
			payload,
			checkInAt
		});
	}

	return rejectEvent(eventId, REASON_CODES.UNSUPPORTED_EVENT_TYPE, 'Unsupported event type.');
}

function normalizeEvent(event: IngestEventInput): NormalizedEvent {
	return {
		id: asNonEmptyString(event.id),
		type: asNonEmptyString(event.type),
		payload: event.payload,
		idempotencyKey: asNonEmptyString(event.idempotencyKey),
		createdAt: parseIsoDate(event.createdAt)
	};
}

function validateAttendanceCheckInPayload(
	payload: unknown
):
	| { ok: true; payload: AttendanceCheckInPayload; checkInAt: Date }
	| { ok: false; message: string } {
	if (!isRecord(payload)) {
		return { ok: false, message: 'Payload must be an object.' };
	}

	const attendanceId = asNonEmptyString(payload.attendanceId);
	const memberId = asNonEmptyString(payload.memberId);
	const checkinAt = parseIsoDate(payload.checkinAt);
	const checkinDate = asNonEmptyString(payload.checkinDate);
	const deviceId = asNonEmptyString(payload.deviceId);
	const gymId = asNonEmptyString(payload.gymId);

	if (!attendanceId || !memberId || !checkinAt || !checkinDate || !deviceId || !gymId) {
		return { ok: false, message: 'Missing required attendance check-in fields.' };
	}

	if (!isRecord(payload.snapshots) || !isRecord(payload.snapshots.member)) {
		return { ok: false, message: 'snapshots.member is required.' };
	}

	const member = payload.snapshots.member;
	const memberSnapshot = {
		id: asNonEmptyString(member.id),
		memberCode: asNonEmptyString(member.memberCode),
		firstName: asNonEmptyString(member.firstName),
		lastName: asNonEmptyString(member.lastName),
		email:
			member.email === null ? null : asNonEmptyString(member.email) ?? null,
		phone:
			member.phone === null ? null : asNonEmptyString(member.phone) ?? null,
		status: asNonEmptyString(member.status)
	};

	if (
		!memberSnapshot.id ||
		!memberSnapshot.memberCode ||
		!memberSnapshot.firstName ||
		!memberSnapshot.lastName ||
		!memberSnapshot.status
	) {
		return { ok: false, message: 'snapshots.member is missing required fields.' };
	}

	if (memberSnapshot.id !== memberId) {
		return { ok: false, message: 'memberId must match snapshots.member.id.' };
	}

	const normalizedMemberSnapshot: AttendanceCheckInPayload['snapshots']['member'] = {
		id: memberSnapshot.id!,
		memberCode: memberSnapshot.memberCode!,
		firstName: memberSnapshot.firstName!,
		lastName: memberSnapshot.lastName!,
		email: memberSnapshot.email,
		phone: memberSnapshot.phone,
		status: memberSnapshot.status!
	};

	return {
		ok: true,
		payload: {
			attendanceId,
			memberId,
			checkinAt: payload.checkinAt as string,
			checkinDate,
			snapshots: { member: normalizedMemberSnapshot },
			deviceId,
			gymId
		},
		checkInAt: checkinAt
	};
}

async function applyAttendanceCheckIn(params: {
	deviceId: string;
	gymId: string;
	branchId: string;
	event: { id: string; idempotencyKey: string; type: string };
	payload: AttendanceCheckInPayload;
	checkInAt: Date;
}): Promise<EventOutcome> {
	const lookup = {
		idempotencyKey: params.event.idempotencyKey,
		deviceId: params.deviceId,
		eventId: params.event.id
	};

	try {
		return await serverPrisma.$transaction(async (tx) => {
			const existing = await findProcessedEvent(tx, lookup);
			if (existing) {
				return mapProcessedEvent(existing, params.event.id, true);
			}

			const member = await tx.member.findUnique({
				where: { id: params.payload.memberId },
				select: { id: true, branchId: true }
			});

			if (!member || member.branchId !== params.branchId) {
				const rejection = rejectEvent(
					params.event.id,
					REASON_CODES.MEMBER_NOT_FOUND,
					'Member not found.'
				);

				await createProcessedEvent(tx, {
					deviceId: params.deviceId,
					gymId: params.gymId,
					eventId: params.event.id,
					eventType: params.event.type,
					idempotencyKey: params.event.idempotencyKey,
					status: 'REJECTED',
					result: {
						reasonCode: rejection.reasonCode,
						message: rejection.message
					}
				});

				return rejection;
			}

			const existingAttendance = await tx.attendance.findUnique({
				where: { id: params.payload.attendanceId },
				select: { id: true, memberId: true, branchId: true }
			});

			if (existingAttendance) {
				if (
					existingAttendance.memberId !== params.payload.memberId ||
					existingAttendance.branchId !== params.branchId
				) {
					const rejection = rejectEvent(
						params.event.id,
						REASON_CODES.ATTENDANCE_CONFLICT,
						'Attendance record exists with a different memberId.'
					);

					await createProcessedEvent(tx, {
						deviceId: params.deviceId,
						gymId: params.gymId,
						eventId: params.event.id,
						eventType: params.event.type,
						idempotencyKey: params.event.idempotencyKey,
						status: 'REJECTED',
						result: {
							reasonCode: rejection.reasonCode,
							message: rejection.message
						}
					});

					return rejection;
				}

				const acked = ackEvent(params.event.id);
				await createProcessedEvent(tx, {
					deviceId: params.deviceId,
					gymId: params.gymId,
					eventId: params.event.id,
					eventType: params.event.type,
					idempotencyKey: params.event.idempotencyKey,
					status: 'ACKED',
					result: {
						attendanceId: existingAttendance.id,
						memberId: existingAttendance.memberId,
						preExisting: true
					}
				});

				return acked;
			}

			let attendance: { id: string; memberId: string } | null = null;

			try {
				attendance = await tx.attendance.create({
					data: {
						id: params.payload.attendanceId,
						memberId: params.payload.memberId,
						branchId: params.branchId,
						checkInAt: params.checkInAt,
						memberSnapshot: params.payload.snapshots.member
					},
					select: { id: true, memberId: true }
				});
			} catch (error) {
				if (isUniqueConstraintError(error)) {
					const conflict = await tx.attendance.findUnique({
						where: { id: params.payload.attendanceId },
						select: { id: true, memberId: true, branchId: true }
					});

					if (conflict) {
						if (
							conflict.memberId !== params.payload.memberId ||
							conflict.branchId !== params.branchId
						) {
							const rejection = rejectEvent(
								params.event.id,
								REASON_CODES.ATTENDANCE_CONFLICT,
								'Attendance record exists with a different memberId.'
							);

							await createProcessedEvent(tx, {
								deviceId: params.deviceId,
								gymId: params.gymId,
								eventId: params.event.id,
								eventType: params.event.type,
								idempotencyKey: params.event.idempotencyKey,
								status: 'REJECTED',
								result: {
									reasonCode: rejection.reasonCode,
									message: rejection.message
								}
							});

							return rejection;
						}

						const acked = ackEvent(params.event.id);
						await createProcessedEvent(tx, {
							deviceId: params.deviceId,
							gymId: params.gymId,
							eventId: params.event.id,
							eventType: params.event.type,
							idempotencyKey: params.event.idempotencyKey,
							status: 'ACKED',
							result: {
								attendanceId: conflict.id,
								memberId: conflict.memberId,
								preExisting: true
							}
						});

						return acked;
					}

					const acked = ackEvent(params.event.id);
					await createProcessedEvent(tx, {
						deviceId: params.deviceId,
						gymId: params.gymId,
						eventId: params.event.id,
						eventType: params.event.type,
						idempotencyKey: params.event.idempotencyKey,
						status: 'ACKED',
						result: {
							attendanceId: params.payload.attendanceId,
							memberId: params.payload.memberId,
							preExisting: true,
							assumed: true
						}
					});

					return acked;
				}

				throw error;
			}

			if (!attendance) {
				throw new Error('Attendance create failed.');
			}

			const acked = ackEvent(params.event.id);
			await createProcessedEvent(tx, {
				deviceId: params.deviceId,
				gymId: params.gymId,
				eventId: params.event.id,
				eventType: params.event.type,
				idempotencyKey: params.event.idempotencyKey,
				status: 'ACKED',
				result: {
					attendanceId: attendance.id,
					memberId: attendance.memberId
				}
			});

			return acked;
		});
	} catch (error) {
		const resolved = await resolveProcessedEventConflict(error, lookup, params.event.id);
		if (resolved) {
			return resolved;
		}

		throw error;
	}
}

async function recordRejectionIfPossible(
	normalized: NormalizedEvent,
	deviceId: string,
	gymId: string,
	outcome: EventOutcome
): Promise<EventOutcome> {
	if (!normalized.id || !normalized.idempotencyKey || !normalized.type) {
		return outcome;
	}

	const eventId = normalized.id;
	const eventType = normalized.type;
	const idempotencyKey = normalized.idempotencyKey;

	const lookup = {
		idempotencyKey,
		deviceId,
		eventId
	};

	try {
		return await serverPrisma.$transaction(async (tx) => {
			const existing = await findProcessedEvent(tx, lookup);
			if (existing) {
				return mapProcessedEvent(existing, eventId, true);
			}

			await createProcessedEvent(tx, {
				deviceId,
				gymId,
				eventId,
				eventType,
				idempotencyKey,
				status: 'REJECTED',
				result: {
					reasonCode: outcome.reasonCode,
					message: outcome.message
				}
			});

			return outcome;
		});
	} catch (error) {
		const resolved = await resolveProcessedEventConflict(error, lookup, normalized.id);
		if (resolved) {
			return resolved;
		}

		throw error;
	}
}

function rejectEvent(eventId: string, reasonCode: string, message: string): EventOutcome {
	return {
		status: 'REJECTED',
		eventId,
		reasonCode,
		message
	};
}

function ackEvent(eventId: string): EventOutcome {
	return {
		status: 'ACKED',
		eventId
	};
}

function mapProcessedEvent(
	record: { status: string; result: Prisma.JsonValue | null; eventId?: string },
	eventId: string,
	alreadyProcessed = true
): EventOutcome {
	const result = record.result as { reasonCode?: string; message?: string } | null;
	const resolvedEventId = typeof record.eventId === 'string' ? record.eventId : eventId;

	if (record.status === 'REJECTED') {
		return {
			status: 'REJECTED',
			eventId: resolvedEventId,
			reasonCode: result?.reasonCode ?? REASON_CODES.INVALID_EVENT,
			message: result?.message ?? DEFAULT_REJECT_MESSAGE,
			alreadyProcessed
		};
	}

	return {
		status: 'ACKED',
		eventId: resolvedEventId,
		alreadyProcessed
	};
}

function isUniqueConstraintError(error: unknown): boolean {
	return (
		isRecord(error) &&
		typeof error.code === 'string' &&
		error.code === 'P2002'
	);
}

async function createProcessedEvent(
	client: ProcessedEventWriter,
	data: {
		deviceId: string;
		gymId: string;
		eventId: string;
		eventType: string;
		idempotencyKey: string;
		status: 'ACKED' | 'REJECTED';
		result: Prisma.InputJsonValue;
	}
) {
	await client.processedEvent.create({
		data: {
			idempotencyKey: data.idempotencyKey,
			eventId: data.eventId,
			eventType: data.eventType,
			deviceId: data.deviceId,
			gymId: data.gymId,
			status: data.status,
			result: data.result
		}
	});
}
