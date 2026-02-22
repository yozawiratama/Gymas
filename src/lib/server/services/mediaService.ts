import { mkdir, readFile, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { serverPrisma } from '$lib/server/db/server';

const MEDIA_ROOT = path.resolve('storage', 'media');
const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;
const MAX_ORIGINAL_NAME_LENGTH = 120;

const ALLOWED_MIME_TYPES = new Map<string, string>([
	['image/png', 'png'],
	['image/jpeg', 'jpg'],
	['image/webp', 'webp'],
	['image/svg+xml', 'svg']
]);

export class MediaUploadError extends Error {
	constructor(message: string) {
		super(message);
		this.name = 'MediaUploadError';
	}
}

function normalizeOriginalName(name: string | undefined | null): string | null {
	if (!name) {
		return null;
	}
	const trimmed = name.trim();
	if (!trimmed) {
		return null;
	}
	return trimmed.length > MAX_ORIGINAL_NAME_LENGTH
		? trimmed.slice(0, MAX_ORIGINAL_NAME_LENGTH)
		: trimmed;
}

function serializeMediaUri(storagePath: string, originalName: string | null): string {
	return JSON.stringify({
		path: storagePath,
		name: originalName ?? null
	});
}

function parseMediaUri(uri: string): { path: string; name: string | null } | null {
	if (!uri) {
		return null;
	}

	const trimmed = uri.trim();
	if (!trimmed) {
		return null;
	}

	if (trimmed.startsWith('{')) {
		try {
			const parsed = JSON.parse(trimmed);
			if (parsed && typeof parsed === 'object' && typeof parsed.path === 'string') {
				const name =
					typeof parsed.name === 'string' && parsed.name.trim().length > 0
						? parsed.name.trim()
						: null;
				return { path: parsed.path, name };
			}
		} catch {
			return null;
		}
	}

	return { path: trimmed, name: null };
}

async function ensureMediaRoot(): Promise<void> {
	await mkdir(MEDIA_ROOT, { recursive: true });
}

function resolveStoragePath(storagePath: string): string | null {
	if (!storagePath) {
		return null;
	}

	const resolved = path.resolve(MEDIA_ROOT, storagePath);
	const relative = path.relative(MEDIA_ROOT, resolved);

	if (!relative || relative.startsWith('..') || path.isAbsolute(relative)) {
		return null;
	}

	return resolved;
}

function validateUpload(file: File): { mimeType: string; extension: string } {
	const mimeType = file.type?.toLowerCase() ?? '';
	const extension = ALLOWED_MIME_TYPES.get(mimeType);

	if (!extension) {
		throw new MediaUploadError('Logo must be a PNG, JPG, WEBP, or SVG image.');
	}

	if (!file.size || file.size <= 0) {
		throw new MediaUploadError('Logo file is empty.');
	}

	if (file.size > MAX_UPLOAD_BYTES) {
		throw new MediaUploadError('Logo must be smaller than 5 MB.');
	}

	return { mimeType, extension };
}

export async function storeUploadedImage(branchId: string, file: File, kind: string) {
	const { mimeType, extension } = validateUpload(file);
	const originalName = normalizeOriginalName(file.name);
	const id = randomUUID();
	const storagePath = `${id}.${extension}`;
	const uri = serializeMediaUri(storagePath, originalName);

	await ensureMediaRoot();
	const absolutePath = path.join(MEDIA_ROOT, storagePath);
	const buffer = Buffer.from(await file.arrayBuffer());

	await writeFile(absolutePath, buffer);

	try {
		return await serverPrisma.media.create({
			data: {
				id,
				branchId,
				kind,
				uri,
				mimeType,
				sizeBytes: buffer.length
			}
		});
	} catch (error) {
		await unlink(absolutePath).catch(() => undefined);
		throw error;
	}
}

export async function getMediaFileById(id: string): Promise<{
	data: Buffer;
	mimeType: string;
	sizeBytes: number | null;
} | null> {
	const media = await serverPrisma.media.findUnique({
		where: { id },
		select: {
			id: true,
			uri: true,
			mimeType: true,
			sizeBytes: true
		}
	});

	if (!media) {
		return null;
	}

	const parsed = parseMediaUri(media.uri);
	if (!parsed) {
		return null;
	}

	const absolutePath = resolveStoragePath(parsed.path);
	if (!absolutePath) {
		return null;
	}

	try {
		const data = await readFile(absolutePath);
		return {
			data,
			mimeType: media.mimeType ?? 'application/octet-stream',
			sizeBytes: media.sizeBytes ?? data.length
		};
	} catch (error) {
		if (typeof error === 'object' && error !== null && 'code' in error) {
			const code = (error as { code?: string }).code;
			if (code === 'ENOENT') {
				return null;
			}
		}
		throw error;
	}
}
