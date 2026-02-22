import { badRequest } from '$lib/server/httpErrors';

type DataSource = FormData | URLSearchParams | Record<string, unknown> | null | undefined;

type StringOptions = {
	min?: number;
	max?: number;
	trim?: boolean;
	required?: boolean;
	label?: string;
};

type IntOptions = {
	min?: number;
	max?: number;
	default?: number;
	label?: string;
};

type BoolOptions = {
	default?: boolean;
	label?: string;
};

type IdOptions = {
	minLength?: number;
	maxLength?: number;
	pattern?: RegExp;
	label?: string;
};

function readValue(source: DataSource, key: string): unknown {
	if (!source) return null;
	if (source instanceof URLSearchParams) {
		return source.get(key);
	}
	if (source instanceof FormData) {
		return source.get(key);
	}
	return source[key];
}

function labelFor(key: string, label?: string): string {
	if (label) return label;
	return key
		.split(/[_-]/g)
		.map((part) => part.slice(0, 1).toUpperCase() + part.slice(1))
		.join(' ');
}

export function parseString(source: DataSource, key: string, options: StringOptions = {}): string {
	const label = labelFor(key, options.label);
	const raw = readValue(source, key);

	if (raw == null) {
		if (options.required === false) {
			return '';
		}
		throw badRequest(`${label} is required.`);
	}

	if (typeof raw !== 'string') {
		throw badRequest(`${label} must be a string.`);
	}

	const value = options.trim ? raw.trim() : raw;

	if (!value) {
		if (options.required === false) {
			return '';
		}
		throw badRequest(`${label} is required.`);
	}

	if (options.min && value.length < options.min) {
		throw badRequest(`${label} must be at least ${options.min} characters.`);
	}

	if (options.max && value.length > options.max) {
		throw badRequest(`${label} must be ${options.max} characters or less.`);
	}

	return value;
}

export function parseInt(source: DataSource, key: string, options: IntOptions = {}): number {
	const label = labelFor(key, options.label);
	const raw = readValue(source, key);

	if (raw == null || raw === '') {
		if (options.default !== undefined) {
			return options.default;
		}
		throw badRequest(`${label} is required.`);
	}

	const value =
		typeof raw === 'number' ? Math.trunc(raw) : Number.parseInt(String(raw), 10);

	if (!Number.isFinite(value)) {
		throw badRequest(`${label} must be a number.`);
	}

	if (options.min !== undefined && value < options.min) {
		throw badRequest(`${label} must be at least ${options.min}.`);
	}

	if (options.max !== undefined && value > options.max) {
		throw badRequest(`${label} must be ${options.max} or less.`);
	}

	return value;
}

export function parseBool(source: DataSource, key: string, options: BoolOptions = {}): boolean {
	const label = labelFor(key, options.label);
	const raw = readValue(source, key);

	if (raw == null || raw === '') {
		return options.default ?? false;
	}

	if (typeof raw === 'boolean') {
		return raw;
	}

	const normalized = String(raw).toLowerCase();
	if (['true', '1', 'on', 'yes'].includes(normalized)) {
		return true;
	}
	if (['false', '0', 'off', 'no'].includes(normalized)) {
		return false;
	}

	throw badRequest(`${label} must be a boolean.`);
}

export function parseId(
	params: Record<string, string | undefined>,
	key: string,
	options: IdOptions = {}
): string {
	const label = labelFor(key, options.label);
	const raw = params[key];

	if (!raw) {
		throw badRequest(`${label} is required.`);
	}

	const value = raw.trim();
	if (!value) {
		throw badRequest(`${label} is required.`);
	}

	const minLength = options.minLength ?? 3;
	const maxLength = options.maxLength ?? 64;
	const pattern = options.pattern ?? /^[a-z0-9]+$/i;

	if (value.length < minLength || value.length > maxLength) {
		throw badRequest(`${label} is invalid.`);
	}

	if (!pattern.test(value)) {
		throw badRequest(`${label} is invalid.`);
	}

	return value;
}

export function parsePageParams(
	url: URL | { searchParams: URLSearchParams },
	options: { pageDefault?: number; pageSizeDefault?: number; maxPageSize?: number } = {}
) {
	const params = url.searchParams;
	const page = parseInt(params, 'page', {
		min: 1,
		default: options.pageDefault ?? 1,
		label: 'Page'
	});
	const pageSize = parseInt(params, 'pageSize', {
		min: 1,
		max: options.maxPageSize ?? 50,
		default: options.pageSizeDefault ?? 20,
		label: 'Page size'
	});

	return { page, pageSize };
}
