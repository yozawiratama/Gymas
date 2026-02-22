export type RateLimitDecision = {
	allowed: boolean;
	retryAfterMs: number | null;
	limit: number;
	remaining: number;
};

type RateState = {
	count: number;
	resetAt: number;
};

export function createFixedWindowRateLimiter(options: { windowMs: number; max: number }) {
	const state = new Map<string, RateState>();

	return (key: string | null | undefined): RateLimitDecision => {
		if (!key) {
			return {
				allowed: true,
				retryAfterMs: null,
				limit: options.max,
				remaining: options.max
			};
		}

		const now = Date.now();
		const entry = state.get(key);

		if (!entry || now >= entry.resetAt) {
			const next: RateState = { count: 1, resetAt: now + options.windowMs };
			state.set(key, next);
			return {
				allowed: true,
				retryAfterMs: null,
				limit: options.max,
				remaining: Math.max(0, options.max - 1)
			};
		}

		entry.count += 1;
		state.set(key, entry);

		if (entry.count > options.max) {
			return {
				allowed: false,
				retryAfterMs: Math.max(0, entry.resetAt - now),
				limit: options.max,
				remaining: 0
			};
		}

		return {
			allowed: true,
			retryAfterMs: null,
			limit: options.max,
			remaining: Math.max(0, options.max - entry.count)
		};
	};
}

export function retryAfterSeconds(retryAfterMs: number | null | undefined, fallbackSeconds = 60): number {
	if (!retryAfterMs || retryAfterMs <= 0) return fallbackSeconds;
	return Math.max(1, Math.ceil(retryAfterMs / 1000));
}
