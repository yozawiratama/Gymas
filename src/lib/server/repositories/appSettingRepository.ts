import { serverPrisma } from '$lib/server/db/server';

export type AppSettingPair = {
	key: string;
	value: string;
};

export async function getAppSettingValues(
	branchId: string,
	keys: string[]
): Promise<Record<string, string | undefined>> {
	if (keys.length === 0) {
		return {};
	}

	const rows = await serverPrisma.appSetting.findMany({
		where: {
			branchId,
			key: {
				in: keys
			}
		},
		select: {
			key: true,
			value: true
		}
	});

	const result: Record<string, string | undefined> = {};
	for (const key of keys) {
		result[key] = undefined;
	}
	for (const row of rows) {
		result[row.key] = row.value;
	}

	return result;
}

export type AppSettingRow = {
	key: string;
	value: string;
	updatedAt: Date;
};

export async function getAppSettingRows(
	branchId: string,
	keys: string[]
): Promise<AppSettingRow[]> {
	if (keys.length === 0) {
		return [];
	}

	return serverPrisma.appSetting.findMany({
		where: {
			branchId,
			key: {
				in: keys
			}
		},
		select: {
			key: true,
			value: true,
			updatedAt: true
		}
	});
}

export async function upsertAppSettings(branchId: string, items: AppSettingPair[]): Promise<void> {
	if (items.length === 0) {
		return;
	}

	await serverPrisma.$transaction(
		items.map((item) =>
			serverPrisma.appSetting.upsert({
				where: {
					branchId_key: {
						branchId,
						key: item.key
					}
				},
				update: { value: item.value },
				create: { branchId, key: item.key, value: item.value }
			})
		)
	);
}
