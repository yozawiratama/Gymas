import { getOutboxSummary, listRecentOutboxEvents, getPendingCount } from '$lib/server/repositories/outboxRepository';
import {
	listRecentFailedOutboxEvents,
	claimOutboxBatch,
	markOutboxSent,
	markOutboxFailed
} from '$lib/server/repositories/outboxRepository';

export async function fetchOutboxSummary() {
	return getOutboxSummary();
}

export async function fetchRecentOutboxEvents(limit = 50) {
	return listRecentOutboxEvents(limit);
}

export async function fetchPendingOutboxCount() {
	return getPendingCount();
}

export async function fetchRecentOutboxFailures(limit = 25) {
	return listRecentFailedOutboxEvents(limit);
}

export async function claimOutboxEvents(limit = 25) {
	return claimOutboxBatch(limit);
}

export async function markOutboxEventSent(id: string) {
	return markOutboxSent(id);
}

export async function markOutboxEventFailed(id: string, error: unknown) {
	return markOutboxFailed(id, error);
}
