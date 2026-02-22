import {
	getAppSettingRows,
	getAppSettingValues,
	upsertAppSettings
} from '$lib/server/repositories/appSettingRepository';
import { record as recordAudit } from '$lib/server/services/auditService';

const ATTENDANCE_SETTING_KEYS = {
	duplicateWindowMinutes: 'attendance.duplicateWindowMinutes',
	requireAuth: 'attendance.requireAuth',
	requireMemberCode: 'attendance.requireMemberCode',
	blockIfExpired: 'attendance.blockIfExpired',
	blockIfFrozen: 'attendance.blockIfFrozen',
	graceDays: 'attendance.graceDays',
	allowWithoutActiveMembership: 'attendance.allowWithoutActiveMembership'
} as const;

const BRANDING_SETTING_KEYS = {
	companyName: 'branding.companyName',
	logoMediaId: 'branding.logoMediaId',
	showLogoOnLogin: 'branding.showLogoOnLogin',
	showLogoOnLayout: 'branding.showLogoOnLayout'
} as const;

const COMPANY_SETTING_KEYS = {
	companyName: 'company.companyName',
	tagline: 'company.tagline',
	address: 'company.address',
	phone: 'company.phone',
	whatsapp: 'company.whatsapp',
	email: 'company.email',
	instagramUrl: 'company.instagramUrl',
	facebookUrl: 'company.facebookUrl',
	websiteUrl: 'company.websiteUrl',
	googleMapsUrl: 'company.googleMapsUrl',
	businessHours: 'company.businessHours'
} as const;

export type AttendanceSettings = {
	duplicateWindowMinutes: number;
	requireAuth: boolean;
	requireMemberCode: boolean;
	blockIfExpired: boolean;
	blockIfFrozen: boolean;
	graceDays: number;
	allowWithoutActiveMembership: boolean;
};

export type BrandingSettings = {
	companyName: string;
	logoMediaId: string | null;
	showLogoOnLogin: boolean;
	showLogoOnLayout: boolean;
};

export type CompanySettings = {
	companyName: string;
	tagline: string | null;
	address: string | null;
	phone: string | null;
	whatsapp: string | null;
	email: string | null;
	instagramUrl: string | null;
	facebookUrl: string | null;
	websiteUrl: string | null;
	googleMapsUrl: string | null;
	businessHours: string | null;
};

export type CompanySettingsSnapshot = CompanySettings & {
	updatedAt: Date | null;
};

export type AuditContext = {
	actorUserId?: string | null;
	ip?: string | null;
	userAgent?: string | null;
};

const DEFAULT_ATTENDANCE_SETTINGS: AttendanceSettings = {
	duplicateWindowMinutes: 5,
	requireAuth: false,
	requireMemberCode: false,
	blockIfExpired: true,
	blockIfFrozen: true,
	graceDays: 0,
	allowWithoutActiveMembership: false
};

const DEFAULT_BRANDING_SETTINGS: BrandingSettings = {
	companyName: 'Gymas',
	logoMediaId: null,
	showLogoOnLogin: true,
	showLogoOnLayout: true
};

const DEFAULT_COMPANY_SETTINGS: CompanySettings = {
	companyName: 'Gymas',
	tagline: null,
	address: null,
	phone: null,
	whatsapp: null,
	email: null,
	instagramUrl: null,
	facebookUrl: null,
	websiteUrl: null,
	googleMapsUrl: null,
	businessHours: null
};

function parseNumberSetting(
	value: string | undefined,
	fallback: number,
	min: number,
	max: number
): number {
	if (value === undefined) {
		return fallback;
	}

	const parsed = Number.parseInt(value, 10);
	if (Number.isNaN(parsed)) {
		return fallback;
	}

	return Math.min(Math.max(parsed, min), max);
}

function normalizeStringSetting(value: string | undefined): string | undefined {
	if (value === undefined) {
		return undefined;
	}

	const trimmed = value.trim();
	return trimmed.length > 0 ? trimmed : undefined;
}

function parseBooleanSetting(value: string | undefined, fallback: boolean): boolean {
	if (value === undefined) {
		return fallback;
	}

	const normalized = value.trim().toLowerCase();
	if (['true', '1', 'yes', 'y', 'on'].includes(normalized)) {
		return true;
	}
	if (['false', '0', 'no', 'n', 'off'].includes(normalized)) {
		return false;
	}

	return fallback;
}

export async function getString(branchId: string, key: string, fallback: string): Promise<string> {
	const values = await getAppSettingValues(branchId, [key]);
	return normalizeStringSetting(values[key]) ?? fallback;
}

export async function getBool(branchId: string, key: string, fallback: boolean): Promise<boolean> {
	const values = await getAppSettingValues(branchId, [key]);
	return parseBooleanSetting(values[key], fallback);
}

export async function set(branchId: string, key: string, value: string): Promise<void> {
	await upsertAppSettings(branchId, [{ key, value }]);
}

export async function getAttendanceSettings(branchId: string): Promise<AttendanceSettings> {
	const values = await getAppSettingValues(branchId, Object.values(ATTENDANCE_SETTING_KEYS));

	return {
		duplicateWindowMinutes: parseNumberSetting(
			values[ATTENDANCE_SETTING_KEYS.duplicateWindowMinutes],
			DEFAULT_ATTENDANCE_SETTINGS.duplicateWindowMinutes,
			1,
			60
		),
		requireAuth: parseBooleanSetting(
			values[ATTENDANCE_SETTING_KEYS.requireAuth],
			DEFAULT_ATTENDANCE_SETTINGS.requireAuth
		),
		requireMemberCode: parseBooleanSetting(
			values[ATTENDANCE_SETTING_KEYS.requireMemberCode],
			DEFAULT_ATTENDANCE_SETTINGS.requireMemberCode
		),
		blockIfExpired: parseBooleanSetting(
			values[ATTENDANCE_SETTING_KEYS.blockIfExpired],
			DEFAULT_ATTENDANCE_SETTINGS.blockIfExpired
		),
		blockIfFrozen: parseBooleanSetting(
			values[ATTENDANCE_SETTING_KEYS.blockIfFrozen],
			DEFAULT_ATTENDANCE_SETTINGS.blockIfFrozen
		),
		graceDays: parseNumberSetting(
			values[ATTENDANCE_SETTING_KEYS.graceDays],
			DEFAULT_ATTENDANCE_SETTINGS.graceDays,
			0,
			30
		),
		allowWithoutActiveMembership: parseBooleanSetting(
			values[ATTENDANCE_SETTING_KEYS.allowWithoutActiveMembership],
			DEFAULT_ATTENDANCE_SETTINGS.allowWithoutActiveMembership
		)
	};
}

export async function getBrandingSettings(branchId: string): Promise<BrandingSettings> {
	const values = await getAppSettingValues(branchId, Object.values(BRANDING_SETTING_KEYS));

	const companyName =
		normalizeStringSetting(values[BRANDING_SETTING_KEYS.companyName]) ??
		DEFAULT_BRANDING_SETTINGS.companyName;
	const logoMediaId = normalizeStringSetting(values[BRANDING_SETTING_KEYS.logoMediaId]) ?? null;

	return {
		companyName,
		logoMediaId,
		showLogoOnLogin: parseBooleanSetting(
			values[BRANDING_SETTING_KEYS.showLogoOnLogin],
			DEFAULT_BRANDING_SETTINGS.showLogoOnLogin
		),
		showLogoOnLayout: parseBooleanSetting(
			values[BRANDING_SETTING_KEYS.showLogoOnLayout],
			DEFAULT_BRANDING_SETTINGS.showLogoOnLayout
		)
	};
}

export async function getCompanySettings(
	branchId: string,
	options: { fallbackCompanyName?: string } = {}
): Promise<CompanySettingsSnapshot> {
	const keys = Object.values(COMPANY_SETTING_KEYS);
	const rows = await getAppSettingRows(branchId, keys);
	const values: Record<string, string | undefined> = {};
	for (const key of keys) {
		values[key] = undefined;
	}
	for (const row of rows) {
		values[row.key] = row.value;
	}

	let fallbackName = normalizeStringSetting(options.fallbackCompanyName);
	if (!fallbackName) {
		const branding = await getBrandingSettings(branchId);
		fallbackName = branding.companyName;
	}

	const companyName =
		normalizeStringSetting(values[COMPANY_SETTING_KEYS.companyName]) ??
		fallbackName ??
		DEFAULT_COMPANY_SETTINGS.companyName;

	const updatedAt =
		rows.length > 0
			? new Date(Math.max(...rows.map((row) => row.updatedAt.getTime())))
			: null;

	return {
		companyName,
		tagline: normalizeStringSetting(values[COMPANY_SETTING_KEYS.tagline]) ?? null,
		address: normalizeStringSetting(values[COMPANY_SETTING_KEYS.address]) ?? null,
		phone: normalizeStringSetting(values[COMPANY_SETTING_KEYS.phone]) ?? null,
		whatsapp: normalizeStringSetting(values[COMPANY_SETTING_KEYS.whatsapp]) ?? null,
		email: normalizeStringSetting(values[COMPANY_SETTING_KEYS.email]) ?? null,
		instagramUrl: normalizeStringSetting(values[COMPANY_SETTING_KEYS.instagramUrl]) ?? null,
		facebookUrl: normalizeStringSetting(values[COMPANY_SETTING_KEYS.facebookUrl]) ?? null,
		websiteUrl: normalizeStringSetting(values[COMPANY_SETTING_KEYS.websiteUrl]) ?? null,
		googleMapsUrl: normalizeStringSetting(values[COMPANY_SETTING_KEYS.googleMapsUrl]) ?? null,
		businessHours: normalizeStringSetting(values[COMPANY_SETTING_KEYS.businessHours]) ?? null,
		updatedAt
	};
}

export async function updateAttendanceSettings(
	branchId: string,
	settings: AttendanceSettings,
	audit?: AuditContext
): Promise<void> {
	const previous = await getAttendanceSettings(branchId);

	await upsertAppSettings(branchId, [
		{
			key: ATTENDANCE_SETTING_KEYS.duplicateWindowMinutes,
			value: String(settings.duplicateWindowMinutes)
		},
		{
			key: ATTENDANCE_SETTING_KEYS.requireAuth,
			value: String(settings.requireAuth)
		},
		{
			key: ATTENDANCE_SETTING_KEYS.requireMemberCode,
			value: String(settings.requireMemberCode)
		},
		{
			key: ATTENDANCE_SETTING_KEYS.blockIfExpired,
			value: String(settings.blockIfExpired)
		},
		{
			key: ATTENDANCE_SETTING_KEYS.blockIfFrozen,
			value: String(settings.blockIfFrozen)
		},
		{
			key: ATTENDANCE_SETTING_KEYS.graceDays,
			value: String(settings.graceDays)
		},
		{
			key: ATTENDANCE_SETTING_KEYS.allowWithoutActiveMembership,
			value: String(settings.allowWithoutActiveMembership)
		}
	]);

	const changedKeys: string[] = [];
	if (previous.duplicateWindowMinutes !== settings.duplicateWindowMinutes) {
		changedKeys.push(ATTENDANCE_SETTING_KEYS.duplicateWindowMinutes);
	}
	if (previous.requireAuth !== settings.requireAuth) {
		changedKeys.push(ATTENDANCE_SETTING_KEYS.requireAuth);
	}
	if (previous.requireMemberCode !== settings.requireMemberCode) {
		changedKeys.push(ATTENDANCE_SETTING_KEYS.requireMemberCode);
	}
	if (previous.blockIfExpired !== settings.blockIfExpired) {
		changedKeys.push(ATTENDANCE_SETTING_KEYS.blockIfExpired);
	}
	if (previous.blockIfFrozen !== settings.blockIfFrozen) {
		changedKeys.push(ATTENDANCE_SETTING_KEYS.blockIfFrozen);
	}
	if (previous.graceDays !== settings.graceDays) {
		changedKeys.push(ATTENDANCE_SETTING_KEYS.graceDays);
	}
	if (previous.allowWithoutActiveMembership !== settings.allowWithoutActiveMembership) {
		changedKeys.push(ATTENDANCE_SETTING_KEYS.allowWithoutActiveMembership);
	}

	await recordAudit({
		action: 'SETTINGS_UPDATED',
		actorUserId: audit?.actorUserId ?? null,
		entityType: 'AttendanceSettings',
		entityId: null,
		meta: {
			area: 'attendance',
			changedKeys
		},
		ip: audit?.ip ?? null,
		userAgent: audit?.userAgent ?? null
	});
}

export async function updateCompanySettings(
	branchId: string,
	settings: CompanySettings,
	audit?: AuditContext
): Promise<void> {
	const previous = await getCompanySettings(branchId);

	await upsertAppSettings(branchId, [
		{ key: COMPANY_SETTING_KEYS.companyName, value: settings.companyName },
		{ key: COMPANY_SETTING_KEYS.tagline, value: settings.tagline ?? '' },
		{ key: COMPANY_SETTING_KEYS.address, value: settings.address ?? '' },
		{ key: COMPANY_SETTING_KEYS.phone, value: settings.phone ?? '' },
		{ key: COMPANY_SETTING_KEYS.whatsapp, value: settings.whatsapp ?? '' },
		{ key: COMPANY_SETTING_KEYS.email, value: settings.email ?? '' },
		{ key: COMPANY_SETTING_KEYS.instagramUrl, value: settings.instagramUrl ?? '' },
		{ key: COMPANY_SETTING_KEYS.facebookUrl, value: settings.facebookUrl ?? '' },
		{ key: COMPANY_SETTING_KEYS.websiteUrl, value: settings.websiteUrl ?? '' },
		{ key: COMPANY_SETTING_KEYS.googleMapsUrl, value: settings.googleMapsUrl ?? '' },
		{ key: COMPANY_SETTING_KEYS.businessHours, value: settings.businessHours ?? '' }
	]);

	const changedKeys: string[] = [];
	if (previous.companyName !== settings.companyName) {
		changedKeys.push(COMPANY_SETTING_KEYS.companyName);
	}
	if (previous.tagline !== settings.tagline) {
		changedKeys.push(COMPANY_SETTING_KEYS.tagline);
	}
	if (previous.address !== settings.address) {
		changedKeys.push(COMPANY_SETTING_KEYS.address);
	}
	if (previous.phone !== settings.phone) {
		changedKeys.push(COMPANY_SETTING_KEYS.phone);
	}
	if (previous.whatsapp !== settings.whatsapp) {
		changedKeys.push(COMPANY_SETTING_KEYS.whatsapp);
	}
	if (previous.email !== settings.email) {
		changedKeys.push(COMPANY_SETTING_KEYS.email);
	}
	if (previous.instagramUrl !== settings.instagramUrl) {
		changedKeys.push(COMPANY_SETTING_KEYS.instagramUrl);
	}
	if (previous.facebookUrl !== settings.facebookUrl) {
		changedKeys.push(COMPANY_SETTING_KEYS.facebookUrl);
	}
	if (previous.websiteUrl !== settings.websiteUrl) {
		changedKeys.push(COMPANY_SETTING_KEYS.websiteUrl);
	}
	if (previous.googleMapsUrl !== settings.googleMapsUrl) {
		changedKeys.push(COMPANY_SETTING_KEYS.googleMapsUrl);
	}
	if (previous.businessHours !== settings.businessHours) {
		changedKeys.push(COMPANY_SETTING_KEYS.businessHours);
	}

	await recordAudit({
		action: 'SETTINGS_UPDATED',
		actorUserId: audit?.actorUserId ?? null,
		entityType: 'CompanySettings',
		entityId: null,
		meta: {
			area: 'company',
			changedKeys
		},
		ip: audit?.ip ?? null,
		userAgent: audit?.userAgent ?? null
	});
}

export async function updateBrandingSettings(
	branchId: string,
	settings: BrandingSettings,
	audit?: AuditContext
): Promise<void> {
	const previous = await getBrandingSettings(branchId);

	await upsertAppSettings(branchId, [
		{
			key: BRANDING_SETTING_KEYS.companyName,
			value: settings.companyName
		},
		{
			key: BRANDING_SETTING_KEYS.showLogoOnLogin,
			value: String(settings.showLogoOnLogin)
		},
		{
			key: BRANDING_SETTING_KEYS.showLogoOnLayout,
			value: String(settings.showLogoOnLayout)
		},
		{
			key: BRANDING_SETTING_KEYS.logoMediaId,
			value: settings.logoMediaId ?? ''
		}
	]);

	const changedKeys: string[] = [];
	if (previous.companyName !== settings.companyName) {
		changedKeys.push(BRANDING_SETTING_KEYS.companyName);
	}
	if (previous.showLogoOnLogin !== settings.showLogoOnLogin) {
		changedKeys.push(BRANDING_SETTING_KEYS.showLogoOnLogin);
	}
	if (previous.showLogoOnLayout !== settings.showLogoOnLayout) {
		changedKeys.push(BRANDING_SETTING_KEYS.showLogoOnLayout);
	}
	if (previous.logoMediaId !== settings.logoMediaId) {
		changedKeys.push(BRANDING_SETTING_KEYS.logoMediaId);
	}

	await recordAudit({
		action: 'SETTINGS_UPDATED',
		actorUserId: audit?.actorUserId ?? null,
		entityType: 'Branding',
		entityId: null,
		meta: {
			area: 'branding',
			changedKeys
		},
		ip: audit?.ip ?? null,
		userAgent: audit?.userAgent ?? null
	});
}

export async function updateBrandingLogo(
	branchId: string,
	logoMediaId: string | null,
	audit?: AuditContext
): Promise<void> {
	const previous = await getBrandingSettings(branchId);

	await upsertAppSettings(branchId, [
		{
			key: BRANDING_SETTING_KEYS.logoMediaId,
			value: logoMediaId ?? ''
		}
	]);

	const changedKeys: string[] = [];
	if (previous.logoMediaId !== logoMediaId) {
		changedKeys.push(BRANDING_SETTING_KEYS.logoMediaId);
	}

	await recordAudit({
		action: 'SETTINGS_UPDATED',
		actorUserId: audit?.actorUserId ?? null,
		entityType: 'Branding',
		entityId: null,
		meta: {
			area: 'branding',
			changedKeys
		},
		ip: audit?.ip ?? null,
		userAgent: audit?.userAgent ?? null
	});
}

export const attendanceSettingKeys = ATTENDANCE_SETTING_KEYS;
export const brandingSettingKeys = BRANDING_SETTING_KEYS;
export const companySettingKeys = COMPANY_SETTING_KEYS;
