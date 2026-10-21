import { NodeOperationError, type IDataObject, type IExecuteFunctions } from 'n8n-workflow';
import type { MultipartFile } from './multipart';
import { downloadUrl } from './transport';

/**
 * Helpers that turn node parameters into request fields and file parts.
 *
 * Image inputs follow one convention across the node: a parameter named `<name>Source`
 * chooses between the binary data of the input item and a public URL, with the actual
 * value in `<name>BinaryProperty` or `<name>Url`. List inputs (several images) take a
 * comma-separated list of binary property names or URLs.
 */

const MIME_BY_EXTENSION: Record<string, string> = {
	jpg: 'image/jpeg',
	jpeg: 'image/jpeg',
	png: 'image/png',
	webp: 'image/webp',
	gif: 'image/gif',
	bmp: 'image/bmp',
	tif: 'image/tiff',
	tiff: 'image/tiff',
	heic: 'image/heic',
	heif: 'image/heif',
	avif: 'image/avif',
	mp4: 'video/mp4',
};

function guessContentType(filename: string, fallback: string): string {
	const ext = filename.split('?')[0].split('.').pop()?.toLowerCase() ?? '';
	return MIME_BY_EXTENSION[ext] ?? fallback;
}

function filenameFromUrl(url: string, fallback: string): string {
	try {
		const last = new URL(url).pathname.split('/').filter(Boolean).pop();
		return last && last.includes('.') ? last : fallback;
	} catch {
		return fallback;
	}
}

/** Reads one binary property of the item into a file part. */
export async function fileFromBinary(
	this: IExecuteFunctions,
	itemIndex: number,
	binaryProperty: string,
	field: string,
): Promise<MultipartFile> {
	const property = binaryProperty.trim();
	const binary = this.helpers.assertBinaryData(itemIndex, property);
	const data = await this.helpers.getBinaryDataBuffer(itemIndex, property);
	const filename = binary.fileName ?? `${field}.${binary.fileExtension ?? 'png'}`;
	return {
		field,
		filename,
		contentType: binary.mimeType || guessContentType(filename, 'application/octet-stream'),
		data,
	};
}

/** Downloads a public URL into a file part. */
export async function fileFromUrl(
	this: IExecuteFunctions,
	url: string,
	field: string,
	itemIndex: number,
): Promise<MultipartFile> {
	const trimmed = url.trim();
	if (!/^https?:\/\//i.test(trimmed)) {
		throw new NodeOperationError(this.getNode(), `'${field}' must be an http(s) URL`, {
			itemIndex,
			description: `Got: ${trimmed.slice(0, 80)}`,
		});
	}
	const downloaded = await downloadUrl.call(this, trimmed);
	const filename = filenameFromUrl(trimmed, `${field}.png`);
	const contentType = downloaded.contentType.startsWith('image/')
		? downloaded.contentType.split(';')[0]
		: guessContentType(filename, 'image/png');
	return { field, filename, contentType, data: downloaded.data };
}

/**
 * Resolves a single image parameter group (`<name>Source`, `<name>BinaryProperty`,
 * `<name>Url`) into a file part. Returns undefined when the group is optional and empty.
 */
export async function resolveImage(
	this: IExecuteFunctions,
	itemIndex: number,
	name: string,
	field: string,
	required: boolean,
): Promise<MultipartFile | undefined> {
	const source = this.getNodeParameter(`${name}Source`, itemIndex, 'binary') as string;
	if (source === 'none') {
		if (required) {
			throw new NodeOperationError(this.getNode(), `'${field}' is required for this operation`, {
				itemIndex,
			});
		}
		return undefined;
	}
	if (source === 'url') {
		const url = this.getNodeParameter(`${name}Url`, itemIndex, '') as string;
		if (!url.trim()) {
			if (required) {
				throw new NodeOperationError(this.getNode(), `'${field}' URL is empty`, { itemIndex });
			}
			return undefined;
		}
		return await fileFromUrl.call(this, url, field, itemIndex);
	}
	const property = this.getNodeParameter(`${name}BinaryProperty`, itemIndex, 'data') as string;
	if (!property.trim()) {
		if (required) {
			throw new NodeOperationError(this.getNode(), `'${field}' binary property is empty`, {
				itemIndex,
			});
		}
		return undefined;
	}
	return await fileFromBinary.call(this, itemIndex, property, field);
}

/**
 * Resolves a comma-separated list of binary property names or URLs into file parts
 * that share one multipart field name (Ideogram reads repeated fields as arrays).
 */
export async function resolveImageList(
	this: IExecuteFunctions,
	itemIndex: number,
	value: unknown,
	field: string,
	max?: number,
): Promise<MultipartFile[]> {
	const entries = String(value ?? '')
		.split(/[,\n]/)
		.map((entry) => entry.trim())
		.filter(Boolean);
	if (max !== undefined && entries.length > max) {
		throw new NodeOperationError(
			this.getNode(),
			`'${field}' accepts at most ${max} images (got ${entries.length})`,
			{ itemIndex },
		);
	}
	const files: MultipartFile[] = [];
	for (const entry of entries) {
		files.push(
			/^https?:\/\//i.test(entry)
				? await fileFromUrl.call(this, entry, field, itemIndex)
				: await fileFromBinary.call(this, itemIndex, entry, field),
		);
	}
	return files;
}

/** Comma-separated string to an array of trimmed non-empty strings. */
export function splitList(value: unknown): string[] {
	if (Array.isArray(value)) return value.map(String).map((v) => v.trim()).filter(Boolean);
	return String(value ?? '')
		.split(/[,\n]/)
		.map((v) => v.trim())
		.filter(Boolean);
}

/** Parses a JSON parameter that may arrive as a string or an already-parsed value. */
export function parseJson(
	context: IExecuteFunctions,
	value: unknown,
	displayName: string,
	itemIndex: number,
): IDataObject | IDataObject[] | undefined {
	if (value === undefined || value === null) return undefined;
	if (typeof value !== 'string') return value as IDataObject | IDataObject[];
	const trimmed = value.trim();
	if (trimmed === '') return undefined;
	try {
		return JSON.parse(trimmed) as IDataObject | IDataObject[];
	} catch {
		throw new NodeOperationError(context.getNode(), `'${displayName}' must be valid JSON`, {
			itemIndex,
			description: 'Check for missing quotes, unquoted keys or trailing commas',
		});
	}
}

/** Copies the non-empty entries of a collection parameter, renaming keys as given. */
export function pickFields(
	source: IDataObject,
	mapping: Record<string, string>,
): Record<string, string | number | boolean> {
	const out: Record<string, string | number | boolean> = {};
	for (const [paramName, apiName] of Object.entries(mapping)) {
		const value = source[paramName];
		if (value === undefined || value === null || value === '') continue;
		out[apiName] = value as string | number | boolean;
	}
	return out;
}
