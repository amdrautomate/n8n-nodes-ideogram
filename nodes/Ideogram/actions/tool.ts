import { NodeOperationError, type IDataObject, type IExecuteFunctions, type INodeExecutionData } from 'n8n-workflow';
import { parseJson, resolveImage, resolveImageList, splitList } from '../shared/inputs';
import type { MultipartFile } from '../shared/multipart';
import { dryRunQs, mapOptions, readWait, sendAndFinish, type Fields } from './common';

const TOOL_PATHS: Record<string, string> = {
	adLocalizer: '/v2/tool/ad-localizer',
	adResizer: '/v2/tool/ad-resizer',
	adVariations: '/v2/tool/ad-variations',
	colorways: '/v2/tool/colorways',
	ghostMannequin: '/v2/tool/ghost-mannequin',
	materialSwap: '/v2/tool/material-swap',
	modelPoseVariants: '/v2/tool/model-pose-variants',
	sketchToRender: '/v2/tool/sketch-to-render',
};

/** Multipart field name of the main image per tool. */
const MAIN_IMAGE_FIELD: Record<string, string> = {
	adLocalizer: 'image',
	adResizer: 'image',
	adVariations: 'image',
	colorways: 'image',
	materialSwap: 'image',
	sketchToRender: 'sketch_image',
	modelPoseVariants: 'source_image',
};

export async function executeTool(
	this: IExecuteFunctions,
	itemIndex: number,
): Promise<INodeExecutionData[]> {
	const operation = this.getNodeParameter('operation', itemIndex) as string;
	const path = TOOL_PATHS[operation];
	if (!path) {
		throw new NodeOperationError(this.getNode(), `Unknown tool "${operation}"`, { itemIndex });
	}
	const options = this.getNodeParameter('options', itemIndex, {}) as IDataObject;
	const wait = readWait(this, itemIndex, 300);
	const files: MultipartFile[] = [];
	const fields: Fields = mapOptions(options, {
		platform: 'platform',
		prompt: 'prompt',
		exactCopy: 'exact_copy',
		aspectRatio: 'aspect_ratio',
		quality: 'quality',
		seed: 'seed',
		numImages: 'num_images',
		webhookUrl: 'webhook_url',
	});

	const mainField = MAIN_IMAGE_FIELD[operation];
	if (mainField) {
		const main = await resolveImage.call(this, itemIndex, 'image', mainField, true);
		if (main) files.push(main);
	}

	const list = async (param: string, field: string, max?: number) => {
		const value = this.getNodeParameter(param, itemIndex, '') as string;
		files.push(...(await resolveImageList.call(this, itemIndex, value, field, max)));
	};

	switch (operation) {
		case 'adResizer':
			fields.resolution = this.getNodeParameter('resolution', itemIndex) as string;
			break;
		case 'adVariations':
			fields.variation_type = this.getNodeParameter('variationType', itemIndex) as string;
			break;
		case 'adLocalizer':
			fields.language = this.getNodeParameter('language', itemIndex) as string;
			break;
		case 'colorways': {
			const colors = splitList(this.getNodeParameter('colors', itemIndex, ''));
			if (colors.length === 0) {
				throw new NodeOperationError(this.getNode(), "'Colors' needs at least one hex color", {
					itemIndex,
				});
			}
			fields.colors = colors;
			await list('masks', 'masks', 4);
			break;
		}
		case 'materialSwap':
			await list('masks', 'masks', 4);
			await list('materials', 'materials');
			break;
		case 'sketchToRender':
		case 'modelPoseVariants':
			fields.instruction = this.getNodeParameter('instruction', itemIndex) as string;
			break;
		case 'ghostMannequin': {
			fields.view = this.getNodeParameter('view', itemIndex) as string;
			if (options.instruction) fields.instruction = options.instruction as string;
			const metadata = parseJson(this, options.metadata, 'Product Metadata', itemIndex);
			if (metadata !== undefined) fields.metadata = JSON.stringify(metadata);
			const front = await resolveImage.call(this, itemIndex, 'frontImage', 'front_image', false);
			if (front) files.push(front);
			const back = await resolveImage.call(this, itemIndex, 'backImage', 'back_image', false);
			if (back) files.push(back);
			await list('garmentImages', 'garment_images');
			if (files.length === 0) {
				throw new NodeOperationError(
					this.getNode(),
					'Ghost Mannequin needs at least one garment photo (front, back or more photos)',
					{ itemIndex },
				);
			}
			break;
		}
		default:
			break;
	}

	return await sendAndFinish.call(
		this,
		{ method: 'POST', path, fields, files, qs: dryRunQs(options) },
		itemIndex,
		wait,
		`ideogram-${operation}`,
		Boolean(options.dryRun),
	);
}
