import type { IDataObject, IExecuteFunctions, INodeExecutionData } from 'n8n-workflow';
import { resolveImage } from '../shared/inputs';
import type { MultipartFile } from '../shared/multipart';
import { dryRunQs, mapOptions, readWait, sendAndFinish, type Fields } from './common';

export async function executeVideo(
	this: IExecuteFunctions,
	itemIndex: number,
): Promise<INodeExecutionData[]> {
	const operation = this.getNodeParameter('operation', itemIndex) as string;
	const model = this.getNodeParameter('model', itemIndex) as string;
	const options = this.getNodeParameter('options', itemIndex, {}) as IDataObject;
	const wait = readWait(this, itemIndex, 900);
	const files: MultipartFile[] = [];

	const fields: Fields = {
		prompt: this.getNodeParameter('prompt', itemIndex) as string,
		...mapOptions(options, {
			resolution: 'resolution',
			duration: 'duration',
			negativePrompt: 'negative_prompt',
			shotType: 'shot_type',
			webhookUrl: 'webhook_url',
		}),
	};
	if (operation === 'textToVideo' && options.aspectRatio) {
		fields.aspect_ratio = options.aspectRatio as string;
	}
	if (options.generateAudio !== undefined && model !== 'minimax-h3') {
		fields.generate_audio = options.generateAudio as boolean;
	}
	if (options.cfgScale !== undefined && model === 'kling-3-standard') {
		fields.cfg_scale = String(options.cfgScale);
	}
	if (model !== 'kling-3-standard') {
		delete fields.negative_prompt;
		delete fields.shot_type;
	}

	const kind = operation === 'textToVideo' ? 'text-to-video' : 'image-to-video';
	if (operation === 'imageToVideo') {
		const first = await resolveImage.call(this, itemIndex, 'image', 'image', true);
		if (first) files.push(first);
		const last = await resolveImage.call(this, itemIndex, 'endImage', 'end_image', false);
		if (last) files.push(last);
	}

	return await sendAndFinish.call(
		this,
		{ method: 'POST', path: `/v2/video/generate/${model}-${kind}`, fields, files, qs: dryRunQs(options) },
		itemIndex,
		wait,
		`ideogram-video-${model}`,
		Boolean(options.dryRun),
	);
}
