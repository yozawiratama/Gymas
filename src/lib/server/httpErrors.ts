import { json } from '@sveltejs/kit';

export const UNKNOWN_ERROR_CODE = 'INTERNAL_ERROR';
export const UNKNOWN_ERROR_MESSAGE = 'Something went wrong.';

export type PublicErrorInfo = {
	status: number;
	code: string;
	message: string;
};

export type AppErrorOptions = {
	status: number;
	code: string;
	publicMessage: string;
	internalMessage?: string;
	cause?: unknown;
};

export class AppError extends Error {
	status: number;
	code: string;
	publicMessage: string;
	cause?: unknown;

	constructor(options: AppErrorOptions) {
		super(options.internalMessage ?? options.publicMessage);
		this.name = 'AppError';
		this.status = options.status;
		this.code = options.code;
		this.publicMessage = options.publicMessage;
		this.cause = options.cause;
	}
}

export function isAppError(error: unknown): error is AppError {
	return error instanceof AppError;
}

export function badRequest(
	publicMessage = 'Invalid request.',
	code = 'INVALID_INPUT',
	internalMessage?: string
) {
	return new AppError({
		status: 400,
		code,
		publicMessage,
		internalMessage
	});
}

export function unauthorized(
	publicMessage = 'Unauthorized.',
	code = 'UNAUTHORIZED',
	internalMessage?: string
) {
	return new AppError({
		status: 401,
		code,
		publicMessage,
		internalMessage
	});
}

export function forbidden(publicMessage = 'Forbidden.', code = 'FORBIDDEN', internalMessage?: string) {
	return new AppError({
		status: 403,
		code,
		publicMessage,
		internalMessage
	});
}

export function notFound(publicMessage = 'Not found.', code = 'NOT_FOUND', internalMessage?: string) {
	return new AppError({
		status: 404,
		code,
		publicMessage,
		internalMessage
	});
}

export function conflict(publicMessage = 'Conflict.', code = 'CONFLICT', internalMessage?: string) {
	return new AppError({
		status: 409,
		code,
		publicMessage,
		internalMessage
	});
}

export function tooManyRequests(
	publicMessage = 'Too many requests.',
	code = 'TOO_MANY_REQUESTS',
	internalMessage?: string
) {
	return new AppError({
		status: 429,
		code,
		publicMessage,
		internalMessage
	});
}

export function toPublicError(error: unknown): PublicErrorInfo {
	if (isAppError(error)) {
		return {
			status: error.status,
			code: error.code,
			message: error.publicMessage
		};
	}

	return {
		status: 500,
		code: UNKNOWN_ERROR_CODE,
		message: UNKNOWN_ERROR_MESSAGE
	};
}

type ErrorPayload = Record<string, unknown>;

function errorJson(status: number, code: string, message: string, payload?: ErrorPayload) {
	return json(
		{
			...(payload ?? {}),
			error: { code, message }
		},
		{ status }
	);
}

export function unauthorizedJson(
	message = 'Unauthorized.',
	code = 'UNAUTHORIZED',
	payload?: ErrorPayload
) {
	return errorJson(401, code, message, payload);
}

export function forbiddenJson(
	message = 'Forbidden.',
	code = 'FORBIDDEN',
	payload?: ErrorPayload
) {
	return errorJson(403, code, message, payload);
}

export function notFoundJson(
	message = 'Not found.',
	code = 'NOT_FOUND',
	payload?: ErrorPayload
) {
	return errorJson(404, code, message, payload);
}
