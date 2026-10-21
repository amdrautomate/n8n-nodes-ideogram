import type { IDataObject, IExecuteFunctions, INodeExecutionData } from 'n8n-workflow';
import { COLOR_PALETTE_PRESETS } from '../shared/constants';
import { parseJson, splitList } from '../shared/inputs';
import type { MultipartFieldValue } from '../shared/multipart';
import { finishGeneration, readOutputSettings } from '../shared/output';
import { ideogramRequest, type IdeogramRequest } from '../shared/transport';

export type Fields = Record<string, MultipartFieldValue | IDataObject | undefined>;

export interface WaitSettings {
	enabled: boolean;
	maxWaitSeconds: number;
}

/** Reads the Wait for Completion pair of the current operation. */
export function readWait(context: IExecuteFunctions, itemIndex: number, defaultMax = 180): WaitSettings {
	const enabled = context.getNodeParameter('waitForCompletion', itemIndex, true) as boolean;
	const maxWaitSeconds = Number(context.getNodeParameter('maxWaitSeconds', itemIndex, defaultMax)) || defaultMax;
	return { enabled, maxWaitSeconds };
}

/** Copies option values into API fields, skipping empty values and numeric zeros where zero means "unset". */
export function mapOptions(
	options: IDataObject,
	mapping: Record<string, string>,
	zeroMeansUnset: string[] = ['seed', 'numInferenceSteps', 'customWidth', 'customHeight', 'duration'],
): Fields {
	const out: Fields = {};
	for (const [param, field] of Object.entries(mapping)) {
		const value = options[param];
		if (value === undefined || value === null || value === '') continue;
		if (typeof value === 'number' && value === 0 && zeroMeansUnset.includes(param)) continue;
		if (Array.isArray(value) && value.length === 0) continue;
		out[field] = value as MultipartFieldValue;
	}
	return out;
}

/** Ideogram 3.0 style fields shared by generate, remix, inpaint and reframe. */
export function styleFields(
	context: IExecuteFunctions,
	options: IDataObject,
	itemIndex: number,
): Fields {
	const out: Fields = {};
	if (options.styleType) out.style_type = options.styleType as string;
	if (options.stylePreset) out.style_preset = options.stylePreset as string;
	const codes = splitList(options.styleCodes);
	if (codes.length > 0) out.style_codes = codes;
	const palette = String(options.colorPalette ?? '').trim();
	if (palette) {
		if (COLOR_PALETTE_PRESETS.includes(palette.toLowerCase())) {
			out.color_palette = { name: palette.toLowerCase() };
		} else {
			out.color_palette = parseJson(context, palette, 'Color Palette', itemIndex) as IDataObject;
		}
	}
	return out;
}

/** The dry-run query string, or undefined. */
export function dryRunQs(options: IDataObject): IDataObject | undefined {
	return options.dryRun ? { dry_run: 'true' } : undefined;
}

/**
 * Sends the request and turns the answer into items. A dry run returns the price as is;
 * everything else goes through the wait/poll and download logic.
 */
export async function sendAndFinish(
	this: IExecuteFunctions,
	request: IdeogramRequest,
	itemIndex: number,
	wait: WaitSettings,
	fileBase: string,
	isDryRun: boolean,
): Promise<INodeExecutionData[]> {
	const response = await ideogramRequest.call(this, request, itemIndex);
	if (isDryRun) {
		return [{ json: { dry_run: true, ...response }, pairedItem: { item: itemIndex } }];
	}
	const settings = readOutputSettings(this, itemIndex, fileBase);
	return await finishGeneration.call(this, response, itemIndex, settings, wait);
}
