import { isProd } from '$lib/server/runtimeEnv';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';
export type LogFields = Record<string, unknown>;
export type LogPayload = LogFields & { message: string };

type LogRecord = {
	level: LogLevel;
	message: string;
	time: string;
} & LogFields;

function normalizeValue(value: unknown): unknown {
	if (value instanceof Error) {
		return {
			name: value.name,
			message: value.message,
			stack: value.stack
		};
	}

	if (value instanceof Date) {
		return value.toISOString();
	}

	if (typeof value === 'bigint') {
		return value.toString();
	}

	return value;
}

function normalizeFields(fields?: LogFields): LogFields {
	if (!fields) return {};
	const normalized: LogFields = {};
	for (const [key, value] of Object.entries(fields)) {
		normalized[key] = normalizeValue(value);
	}
	return normalized;
}

function writeLog(level: LogLevel, record: LogRecord) {
	if (isProd()) {
		process.stdout.write(`${JSON.stringify(record)}\n`);
		return;
	}

	if (level === 'debug') {
		console.debug(record);
		return;
	}
	if (level === 'error') {
		console.error(record);
		return;
	}
	if (level === 'warn') {
		console.warn(record);
		return;
	}
	console.log(record);
}

export function log(level: LogLevel, message: string, fields?: LogFields) {
	const record: LogRecord = {
		level,
		message,
		time: new Date().toISOString(),
		...normalizeFields(fields)
	};

	if (isProd()) {
		writeLog(level, record);
		return;
	}

	const { level: _level, message: _message, time, ...rest } = record;
	const readable = `[${_level}] ${_message}`;
	writeLog(level, { level, message: readable, time, ...rest });
}

function logFromPayload(level: LogLevel, payload: LogPayload) {
	const { message, ...fields } = payload;
	log(level, message, fields);
}

export const logDebug = (payload: LogPayload) => logFromPayload('debug', payload);
export const logInfo = (payload: LogPayload) => logFromPayload('info', payload);
export const logWarn = (payload: LogPayload) => logFromPayload('warn', payload);
export const logError = (payload: LogPayload) => logFromPayload('error', payload);

export const logger = {
	debug: (message: string, fields?: LogFields) => log('debug', message, fields),
	info: (message: string, fields?: LogFields) => log('info', message, fields),
	warn: (message: string, fields?: LogFields) => log('warn', message, fields),
	error: (message: string, fields?: LogFields) => log('error', message, fields)
};
