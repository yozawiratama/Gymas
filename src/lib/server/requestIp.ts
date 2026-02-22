import type { RequestEvent } from '@sveltejs/kit';

export function getRequestIp(event: RequestEvent): string | null {
	const forwarded = event.request.headers.get('x-forwarded-for');
	if (forwarded) {
		const first = forwarded.split(',')[0]?.trim();
		if (first) {
			return first;
		}
	}

	return event.getClientAddress?.() ?? null;
}
