import { NodeOperationError, type IDataObject, type IExecuteFunctions, type INodeExecutionData } from 'n8n-workflow';
import { resolveImage, resolveImageList } from '../shared/inputs';
import type { MultipartFile } from '../shared/multipart';
import { ideogramRequest } from '../shared/transport';
import { dryRunQs, mapOptions, readWait, sendAndFinish, styleFields, type Fields } from './common';

/** Image endpoints that take `async: true` to return a generation ID instead of waiting. */
const SUPPORTS_ASYNC = new Set([
	'generate',
	'preciseEdit',
	'remix',
	'inpaint',
	'reframe',
	'upscale',
	'removeBackground',
]);

/** Option name -> API field for the plain pass-through options. */
const PASS_THROUGH: Record<string, string> = {
	aspectRatio: 'aspect_ratio',
	resolution: 'resolution',
	size: 'size',
	outputResolution: 'output_resolution',
	renderingSpeed: 'rendering_speed',
	quality: 'quality',
	background: 'background',
	magicPrompt: 'magic_prompt',
	negativePrompt: 'negative_prompt',
	numImages: 'num_images',
	seed: 'seed',
	webhookUrl: 'webhook_url',
	upscaleFactor: 'upscale_factor',
	numInferenceSteps: 'num_inference_steps',
	customWidth: 'custom_width',
	customHeight: 'custom_height',
	imageWeight: 'image_weight',
	contextWindow: 'context_window',
	prompt: 'prompt',
	strength: 'strength',
	sharpen: 'sharpen',
	denoise: 'denoise',
	fixCompression: 'fix_compression',
	subjectDetection: 'subject_detection',
};

export async function executeImage(
	this: IExecuteFunctions,
	itemIndex: number,
): Promise<INodeExecutionData[]> {
	const operation = this.getNodeParameter('operation', itemIndex) as string;
	const options = this.getNodeParameter('options', itemIndex, {}) as IDataObject;
	const model = (this.getNodeParameter('model', itemIndex, '') as string) || '';
	const wait = readWait(this, itemIndex);
	const files: MultipartFile[] = [];
	const fields: Fields = mapOptions(options, PASS_THROUGH);

	// Booleans need explicit handling: false is a valid value for some, "unset" for others.
	if (options.private !== undefined) fields.private = options.private as boolean;
	if (options.enableCopyrightDetection === true) fields.enable_copyright_detection = true;
	if (options.faceEnhancement !== undefined) fields.face_enhancement = options.faceEnhancement as boolean;

	// Resolution tier: Nano Banana spells it 1K/2K/4K, "auto" spells it 1k/2k/4k.
	if (options.resolutionTier) {
		const tier = String(options.resolutionTier);
		fields.resolution_tier = model.startsWith('nano-banana') ? tier.toUpperCase() : tier.toLowerCase();
	}
	// Topaz takes its sliders as decimal strings.
	for (const key of ['strength', 'sharpen', 'denoise', 'fix_compression']) {
		if (fields[key] !== undefined) fields[key] = String(fields[key]);
	}

	const addImage = async (name: string, field: string, required: boolean) => {
		const file = await resolveImage.call(this, itemIndex, name, field, required);
		if (file) files.push(file);
	};
	const addList = async (param: string, field: string, max?: number) => {
		const value = this.getNodeParameter(param, itemIndex, '') as string;
		files.push(...(await resolveImageList.call(this, itemIndex, value, field, max)));
	};

	let path: string;
	let fileBase = `ideogram-${operation}`;

	switch (operation) {
		case 'generate': {
			path = `/v2/image/generate/${model}`;
			fields.prompt = this.getNodeParameter('prompt', itemIndex) as string;
			Object.assign(fields, styleFields(this, options, itemIndex));
			if (this.getNodeParameter('sourceImages', itemIndex, '') as string) {
				await addList('sourceImages', 'images', 16);
			}
			await addImage('mask', 'mask', false);
			if (options.styleReferenceImages) {
				files.push(
					...(await resolveImageList.call(
						this,
						itemIndex,
						options.styleReferenceImages,
						'style_reference_images',
						10,
					)),
				);
			}
			break;
		}
		case 'preciseEdit': {
			path = '/v2/image/precise-edit/ideogram-4-5';
			fields.prompt = this.getNodeParameter('prompt', itemIndex) as string;
			await addImage('image', 'image', true);
			await addImage('mask', 'mask', false);
			await addList('referenceImages', 'reference_images', 4);
			break;
		}
		case 'remix': {
			path = `/v2/image/remix/${model}`;
			fields.prompt = this.getNodeParameter('prompt', itemIndex) as string;
			Object.assign(fields, styleFields(this, options, itemIndex));
			if (options.resolutionTier) fields.resolution_tier = String(options.resolutionTier).toLowerCase();
			await addImage('image', 'image', true);
			if (options.styleReferenceImages) {
				files.push(
					...(await resolveImageList.call(
						this,
						itemIndex,
						options.styleReferenceImages,
						'style_reference_images',
						10,
					)),
				);
			}
			break;
		}
		case 'inpaint': {
			path = '/v2/image/inpaint/ideogram-3';
			fields.prompt = this.getNodeParameter('prompt', itemIndex) as string;
			Object.assign(fields, styleFields(this, options, itemIndex));
			await addImage('image', 'image', true);
			await addImage('mask', 'mask', true);
			if (options.styleReferenceImages) {
				files.push(
					...(await resolveImageList.call(
						this,
						itemIndex,
						options.styleReferenceImages,
						'style_reference_images',
						10,
					)),
				);
			}
			break;
		}
		case 'reframe': {
			path = `/v2/image/reframe/${model}`;
			if (model === 'ideogram-3') {
				fields.resolution = this.getNodeParameter('resolution', itemIndex) as string;
				Object.assign(fields, styleFields(this, options, itemIndex));
				if (options.styleReferenceImages) {
					files.push(
						...(await resolveImageList.call(
							this,
							itemIndex,
							options.styleReferenceImages,
							'style_reference_images',
							10,
						)),
					);
				}
			} else {
				fields.aspect_ratio = this.getNodeParameter('aspectRatio', itemIndex) as string;
			}
			await addImage('image', 'image', true);
			break;
		}
		case 'upscale': {
			path = `/v2/image/upscale/${model}`;
			if (model === 'nano-banana-pro') {
				delete fields.upscale_factor;
			} else {
				delete fields.prompt;
				delete fields.resolution_tier;
			}
			await addImage('image', 'image', true);
			break;
		}
		case 'replaceBackground': {
			path = `/v2/image/replace-background/${model}`;
			await addImage('image', 'image', true);
			if (model === 'ideogram-4-5') {
				await addImage('backgroundReference', 'background_reference', true);
			} else {
				fields.prompt = this.getNodeParameter('prompt', itemIndex) as string;
			}
			break;
		}
		case 'removeBackground': {
			path = '/v2/image/remove-background/ideogram-1';
			await addImage('image', 'image', true);
			break;
		}
		case 'removeObject': {
			path = '/v2/image/remove-object/ideogram-1';
			await addImage('image', 'image', true);
			await addImage('mask', 'mask', true);
			break;
		}
		case 'describe': {
			path = `/v2/image/describe/${model}`;
			await addImage('image', 'image', true);
			const describeFields: Fields = {};
			if (model === 'ideogram-4') {
				if (options.includeBbox !== undefined) describeFields.include_bbox = options.includeBbox as boolean;
				if (options.includeStyleDescriptions !== undefined) {
					describeFields.include_style_descriptions = options.includeStyleDescriptions as boolean;
				}
				if (options.includeTags !== undefined) describeFields.include_tags = options.includeTags as boolean;
			}
			const response = await ideogramRequest.call(
				this,
				{ method: 'POST', path, fields: describeFields, files, qs: dryRunQs(options) },
				itemIndex,
			);
			return [{ json: response, pairedItem: { item: itemIndex } }];
		}
		default:
			throw new NodeOperationError(this.getNode(), `Unknown image operation "${operation}"`, {
				itemIndex,
			});
	}

	if (!wait.enabled && SUPPORTS_ASYNC.has(operation)) fields.async = true;
	if (model) fileBase = `${fileBase}-${model}`;

	return await sendAndFinish.call(
		this,
		{ method: 'POST', path, fields, files, qs: dryRunQs(options) },
		itemIndex,
		wait,
		fileBase,
		Boolean(options.dryRun),
	);
}
