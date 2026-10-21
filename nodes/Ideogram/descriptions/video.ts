import type { INodeProperties } from 'n8n-workflow';
import { VIDEO_MODELS } from '../shared/constants';
import { alphabetical, imageInput, outputOptions, waitProperties } from './shared';

const resource = ['video'];
const operations = ['textToVideo', 'imageToVideo'];

export const videoDescription: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show: { resource } },
		options: [
			{
				name: 'Image to Video',
				value: 'imageToVideo',
				action: 'Animate an image into a video',
				description: 'Generate a video that starts from an image (and optionally ends on another)',
			},
			{
				name: 'Text to Video',
				value: 'textToVideo',
				action: 'Generate a video from text',
				description: 'Generate a video from a prompt with Seedance, MiniMax or Kling',
			},
		],
		default: 'textToVideo',
	},
	{
		displayName: 'Model',
		name: 'model',
		type: 'options',
		default: 'seedance-2-5',
		options: VIDEO_MODELS,
		description: 'Video is billed per second of output; see the Ideogram pricing page',
		displayOptions: { show: { resource, operation: operations } },
	},
	...imageInput({
		name: 'image',
		displayName: 'First Frame',
		description: 'The image the video starts from (JPEG, PNG or WEBP, up to 50 MB)',
		required: true,
		show: { resource, operation: ['imageToVideo'] },
	}),
	...imageInput({
		name: 'endImage',
		displayName: 'Last Frame',
		description: 'Optional image the video ends on',
		required: false,
		show: { resource, operation: ['imageToVideo'] },
	}),
	{
		displayName: 'Prompt',
		name: 'prompt',
		type: 'string',
		default: '',
		required: true,
		typeOptions: { rows: 3 },
		description: 'What should happen in the video (for Image to Video: how the first frame animates)',
		displayOptions: { show: { resource, operation: operations } },
	},
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		displayOptions: { show: { resource, operation: operations } },
		options: alphabetical([
			{
				displayName: 'Aspect Ratio',
				name: 'aspectRatio',
				type: 'options',
				default: '16x9',
				options: ['auto', '21x9', '16x9', '4x3', '1x1', '3x4', '9x16'].map((value) => ({
					name: value === 'auto' ? 'Auto (Seedance Only)' : value,
					value,
				})),
				displayOptions: { show: { '/operation': ['textToVideo'] } },
			},
			{
				displayName: 'Resolution',
				name: 'resolution',
				type: 'string',
				default: '',
				placeholder: 'e.g. 720p (Seedance) or 768P / 2K (MiniMax)',
				description:
					'Seedance 2.5: 480p, 720p, 1080p. Seedance 2.0: 480p, 720p. MiniMax: 480P, 768P, 2K, 4K. Kling uses its default.',
				displayOptions: { hide: { '/model': ['kling-3-standard'] } },
			},
			{
				displayName: 'Duration (Seconds)',
				name: 'duration',
				type: 'number',
				default: 5,
				typeOptions: { minValue: 1 },
				description: 'Length of the video; each model has its own allowed range',
			},
			{
				displayName: 'Generate Audio',
				name: 'generateAudio',
				type: 'boolean',
				default: false,
				description: 'Whether to add an audio track (roughly doubles the cost; Seedance and Kling)',
				displayOptions: { hide: { '/model': ['minimax-h3'] } },
			},
			{
				displayName: 'Negative Prompt',
				name: 'negativePrompt',
				type: 'string',
				default: '',
				description: 'What to keep out of the video (Kling)',
				displayOptions: { show: { '/model': ['kling-3-standard'] } },
			},
			{
				displayName: 'Shot Type',
				name: 'shotType',
				type: 'options',
				default: 'customize',
				options: [
					{ name: 'Customize (Follow the Prompt)', value: 'customize' },
					{ name: 'Intelligent (Model Stages the Shots)', value: 'intelligent' },
				],
				displayOptions: { show: { '/model': ['kling-3-standard'] } },
			},
			{
				displayName: 'CFG Scale',
				name: 'cfgScale',
				type: 'number',
				default: 0.5,
				typeOptions: { minValue: 0, maxValue: 1, numberPrecision: 2 },
				description: 'How closely the video follows the prompt (Kling)',
				displayOptions: { show: { '/model': ['kling-3-standard'] } },
			},
			{
				displayName: 'Webhook URL',
				name: 'webhookUrl',
				type: 'string',
				default: '',
				placeholder: 'e.g. https://my-n8n.example.com/webhook/ideogram',
				description: 'HTTPS URL Ideogram posts the finished video to',
			},
			{
				displayName: 'Dry Run (Price Only)',
				name: 'dryRun',
				type: 'boolean',
				default: false,
				description:
					'Whether to only validate and price the request. Nothing is generated or billed; the response holds the price.',
			},
		]),
	},
	...waitProperties({ resource, operation: operations }, true, 900),
	outputOptions({ resource, operation: operations }),
];
