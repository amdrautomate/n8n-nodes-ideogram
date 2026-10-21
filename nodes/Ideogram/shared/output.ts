import type { IDataObject, IExecuteFunctions, INodeExecutionData } from 'n8n-workflow';
import { downloadUrl, waitForGeneration, type GenerationStatus } from './transport';

export interface OutputSettings {
	/** Download every result URL into binary data (one item per result). */
	download: boolean;
	/** Name of the binary property that receives the file. */
	binaryProperty: string;
	/** Base name for the file; the extension follows the content type. */
	fileBase: string;
}

/** Reads the shared output parameters of an operation. */
export function readOutputSettings(
	context: IExecuteFunctions,
	itemIndex: number,
	fileBase: string,
): OutputSettings {
	const options = context.getNodeParameter('outputOptions', itemIndex, {}) as IDataObject;
	return {
		download: options.download === undefined ? true : (options.download as boolean),
		binaryProperty: ((options.binaryProperty as string) || 'data').trim(),
		fileBase,
	};
}

function extensionFor(contentType: string, url: string): string {
	const byType: Record<string, string> = {
		'image/png': 'png',
		'image/jpeg': 'jpg',
		'image/webp': 'webp',
		'image/svg+xml': 'svg',
		'video/mp4': 'mp4',
		'video/webm': 'webm',
	};
	const type = contentType.split(';')[0].trim();
	if (byType[type]) return byType[type];
	const fromUrl = url.split('?')[0].split('.').pop() ?? '';
	return /^[a-z0-9]{2,5}$/i.test(fromUrl) ? fromUrl.toLowerCase() : 'bin';
}

/**
 * Turns an Ideogram response into node items. The `data` array of a response holds one
 * entry per generated image or video; each becomes its own item so that downstream nodes
 * can work on them one by one. With `download` on, the file behind `url` is fetched into
 * binary data (result URLs expire, so this is the default).
 */
export async function toOutputItems(
	this: IExecuteFunctions,
	response: IDataObject,
	itemIndex: number,
	settings: OutputSettings,
): Promise<INodeExecutionData[]> {
	const results = Array.isArray(response.data) ? (response.data as IDataObject[]) : undefined;
	if (!results || results.length === 0) {
		return [{ json: response, pairedItem: { item: itemIndex } }];
	}

	const meta: IDataObject = { ...response };
	delete meta.data;

	const items: INodeExecutionData[] = [];
	for (let index = 0; index < results.length; index++) {
		const result = results[index];
		const json: IDataObject = { ...meta, ...result, index };
		const item: INodeExecutionData = { json, pairedItem: { item: itemIndex } };
		const url = result.url as string | undefined;
		if (settings.download && url) {
			const downloaded = await downloadUrl.call(this, url);
			const extension = extensionFor(downloaded.contentType, url);
			const suffix = results.length > 1 ? `-${index + 1}` : '';
			item.binary = {
				[settings.binaryProperty]: await this.helpers.prepareBinaryData(
					downloaded.data,
					`${settings.fileBase}${suffix}.${extension}`,
					downloaded.contentType.split(';')[0].trim(),
				),
			};
		}
		items.push(item);
	}
	return items;
}

/**
 * Completes an operation whose response may be a finished result or a pending
 * generation: waits when asked and allowed, then produces the output items.
 */
export async function finishGeneration(
	this: IExecuteFunctions,
	response: IDataObject,
	itemIndex: number,
	settings: OutputSettings,
	wait: { enabled: boolean; maxWaitSeconds: number },
): Promise<INodeExecutionData[]> {
	const hasResults = Array.isArray(response.data) && (response.data as unknown[]).length > 0;
	const generationId = response.generation_id as string | undefined;
	let final: IDataObject = response;

	if (!hasResults && generationId && wait.enabled) {
		const status = (response.status as string | undefined) ?? 'pending';
		if (status !== 'completed') {
			final = (await waitForGeneration.call(
				this,
				generationId,
				wait.maxWaitSeconds,
				itemIndex,
			)) as GenerationStatus as IDataObject;
		}
	}
	return await toOutputItems.call(this, final, itemIndex, settings);
}
