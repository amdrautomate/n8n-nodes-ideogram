import type { INodeProperties } from 'n8n-workflow';
import { AD_LANGUAGES, AD_RESOLUTIONS, toolQualityOptions } from '../shared/constants';
import { alphabetical, imageInput, imageList, outputOptions, waitProperties } from './shared';

const resource = ['tool'];
const allTools = [
	'adLocalizer',
	'adResizer',
	'adVariations',
	'colorways',
	'ghostMannequin',
	'materialSwap',
	'modelPoseVariants',
	'sketchToRender',
];

const qualityOption: INodeProperties = {
	displayName: 'Quality',
	name: 'quality',
	type: 'options',
	default: 'medium',
	options: toolQualityOptions,
	description: 'Higher tiers may improve detail and take longer',
};

const numImagesOption: INodeProperties = {
	displayName: 'Number of Images',
	name: 'numImages',
	type: 'number',
	default: 1,
	typeOptions: { minValue: 1, maxValue: 8 },
	description: 'How many variations to generate; each is billed and returned as its own item',
};

const seedOption: INodeProperties = {
	displayName: 'Seed',
	name: 'seed',
	type: 'number',
	default: 0,
	description: 'Random seed for repeatable results (0 = let Ideogram choose)',
};

const aspectRatioOption: INodeProperties = {
	displayName: 'Aspect Ratio',
	name: 'aspectRatio',
	type: 'string',
	default: '',
	placeholder: 'e.g. 1:1, 3:4, 16:9',
	description: 'Output aspect ratio; defaults to the source image or 1:1 depending on the tool',
};

const promptOption: INodeProperties = {
	displayName: 'Prompt',
	name: 'prompt',
	type: 'string',
	default: '',
	description: 'Optional extra direction for the tool',
};

const webhookOption: INodeProperties = {
	displayName: 'Webhook URL',
	name: 'webhookUrl',
	type: 'string',
	default: '',
	placeholder: 'e.g. https://my-n8n.example.com/webhook/ideogram',
	description: 'HTTPS URL Ideogram posts the finished result to',
};

const dryRunOption: INodeProperties = {
	displayName: 'Dry Run (Price Only)',
	name: 'dryRun',
	type: 'boolean',
	default: false,
	description:
		'Whether to only validate and price the request. Nothing is generated or billed; the response holds the price.',
};

export const toolDescription: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show: { resource } },
		options: [
			{
				name: 'Ad Localizer',
				value: 'adLocalizer',
				action: 'Localize an ad',
				description: 'Translate the copy of an ad into another language, keeping layout, logos and product',
			},
			{
				name: 'Ad Resizer',
				value: 'adResizer',
				action: 'Resize an ad',
				description: 'Reframe an ad creative to a standard ad size, inside the platform safe zone',
			},
			{
				name: 'Ad Variations',
				value: 'adVariations',
				action: 'Create ad variations',
				description: 'Vary the people, setting, group size or scene of an ad',
			},
			{
				name: 'Colorways',
				value: 'colorways',
				action: 'Recolor a product',
				description: 'Recolor masked regions of a product photo to given hex colors',
			},
			{
				name: 'Ghost Mannequin',
				value: 'ghostMannequin',
				action: 'Create a ghost mannequin shot',
				description: 'Turn garment photos into a ghost-mannequin product image',
			},
			{
				name: 'Material Swap',
				value: 'materialSwap',
				action: 'Swap materials of a product',
				description: 'Replace the material of masked regions with reference materials',
			},
			{
				name: 'Model Pose Variants',
				value: 'modelPoseVariants',
				action: 'Create model pose variants',
				description: 'Re-pose the model in a fashion image from a plain-language direction',
			},
			{
				name: 'Sketch to Render',
				value: 'sketchToRender',
				action: 'Render a fashion sketch',
				description: 'Render a fashion sketch as a product image',
			},
		],
		default: 'adResizer',
	},

	// Main image of most tools
	...imageInput({
		name: 'image',
		displayName: 'Image',
		description: 'The source image (JPEG, PNG or WEBP, up to 25 MB)',
		required: true,
		show: {
			resource,
			operation: ['adLocalizer', 'adResizer', 'adVariations', 'colorways', 'materialSwap'],
		},
	}),
	...imageInput({
		name: 'image',
		displayName: 'Sketch',
		description: 'The fashion sketch to render (up to 50 MB)',
		required: true,
		show: { resource, operation: ['sketchToRender'] },
	}),
	...imageInput({
		name: 'image',
		displayName: 'Source Image',
		description: 'The fashion image whose model is re-posed (up to 50 MB)',
		required: true,
		show: { resource, operation: ['modelPoseVariants'] },
	}),

	// ---- Ad Resizer
	{
		displayName: 'Resolution',
		name: 'resolution',
		type: 'options',
		default: '1080x1080',
		required: true,
		options: AD_RESOLUTIONS.map((value) => ({ name: value, value })),
		description: 'Target ad size',
		displayOptions: { show: { resource, operation: ['adResizer'] } },
	},
	// ---- Ad Variations
	{
		displayName: 'Variation Type',
		name: 'variationType',
		type: 'options',
		default: 'setting',
		required: true,
		options: [
			{ name: 'People', value: 'people', description: 'Replace the people with different talent' },
			{ name: 'Setting', value: 'setting', description: 'Move the scene to another setting' },
			{ name: 'Group Size', value: 'group_size', description: 'Change how many people appear' },
			{ name: 'Scene', value: 'scene', description: 'Change the whole scene' },
		],
		displayOptions: { show: { resource, operation: ['adVariations'] } },
	},
	// ---- Ad Localizer
	{
		displayName: 'Language',
		name: 'language',
		type: 'options',
		default: 'es',
		required: true,
		options: AD_LANGUAGES,
		description: 'Target language of the copy (one language per request)',
		displayOptions: { show: { resource, operation: ['adLocalizer'] } },
	},
	// ---- Colorways
	{
		displayName: 'Hex Codes',
		name: 'colors',
		type: 'color',
		default: '',
		required: true,
		placeholder: 'e.g. #B3202C, #1F4E79',
		description:
			'Comma-separated six-digit hex colors, one per mask, in the same order as the masks',
		displayOptions: { show: { resource, operation: ['colorways'] } },
	},
	imageList(
		'masks',
		'Masks',
		'Up to 4 black-and-white masks marking the regions to recolor, paired by position with the hex codes.',
		{ resource, operation: ['colorways'] },
		true,
	),
	// ---- Material Swap
	imageList(
		'masks',
		'Masks',
		'Up to 4 masks marking the regions to change.',
		{ resource, operation: ['materialSwap'] },
	),
	imageList(
		'materials',
		'Materials',
		'Material reference images, paired by position with the masks.',
		{ resource, operation: ['materialSwap'] },
		true,
	),
	// ---- Sketch to Render / Model Pose Variants
	{
		displayName: 'Instruction',
		name: 'instruction',
		type: 'string',
		default: '',
		required: true,
		typeOptions: { rows: 2 },
		description:
			'Sketch to Render: material and rendering direction. Model Pose Variants: the pose or camera direction.',
		displayOptions: { show: { resource, operation: ['sketchToRender', 'modelPoseVariants'] } },
	},
	// ---- Ghost Mannequin
	{
		displayName: 'View',
		name: 'view',
		type: 'options',
		default: 'front',
		required: true,
		options: [
			{ name: 'Front', value: 'front' },
			{ name: 'Three Quarter', value: 'three_quarter' },
			{ name: 'Back', value: 'back' },
		],
		description: 'Camera view of the output garment',
		displayOptions: { show: { resource, operation: ['ghostMannequin'] } },
	},
	...imageInput({
		name: 'frontImage',
		displayName: 'Front Photo',
		description: 'Front-view garment photo (up to 50 MB)',
		required: false,
		show: { resource, operation: ['ghostMannequin'] },
	}),
	...imageInput({
		name: 'backImage',
		displayName: 'Back Photo',
		description: 'Back-view garment photo',
		required: false,
		show: { resource, operation: ['ghostMannequin'] },
	}),
	imageList(
		'garmentImages',
		'More Garment Photos',
		'Additional photos of the same garment (sides, top, details).',
		{ resource, operation: ['ghostMannequin'] },
	),

	// ---- Options per tool
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		displayOptions: { show: { resource, operation: allTools } },
		options: alphabetical([
			{
				displayName: 'Platform',
				name: 'platform',
				type: 'options',
				default: 'meta',
				options: [
					{ name: 'Google', value: 'google' },
					{ name: 'Meta', value: 'meta' },
					{ name: 'Meta Reels', value: 'meta_reels' },
					{ name: 'Meta Stories', value: 'meta_stories' },
					{ name: 'Snapchat', value: 'snapchat' },
					{ name: 'TikTok', value: 'tiktok' },
				],
				description: 'Keep the ad inside this platform\'s published safe zone',
				displayOptions: { show: { '/operation': ['adResizer'] } },
			},
			{
				...promptOption,
				description:
					'Optional edit instruction while reframing, for example "remove the logo" (Ad Resizer), direction for the variation (Ad Variations) or for the localization (Ad Localizer)',
				displayOptions: { show: { '/operation': ['adResizer', 'adVariations', 'adLocalizer'] } },
			},
			{
				displayName: 'Exact Copy',
				name: 'exactCopy',
				type: 'string',
				default: '',
				typeOptions: { rows: 3 },
				placeholder: 'Shop now => Comprar ahora\nFree shipping => Envío gratis',
				description: 'Pre-approved wording, one "original => replacement" mapping per line',
				displayOptions: { show: { '/operation': ['adLocalizer'] } },
			},
			{
				...aspectRatioOption,
				displayOptions: {
					show: {
						'/operation': ['colorways', 'materialSwap', 'sketchToRender', 'ghostMannequin', 'modelPoseVariants'],
					},
				},
			},
			{
				displayName: 'Garment Instruction',
				name: 'instruction',
				type: 'string',
				default: '',
				description: 'Reconstruction guidance or identity-critical garment details',
				displayOptions: { show: { '/operation': ['ghostMannequin'] } },
			},
			{
				displayName: 'Product Metadata (JSON)',
				name: 'metadata',
				type: 'json',
				default: '',
				placeholder: '{ "title": "Linen shirt", "brand": "Acme" }',
				description: 'Factual product context as a JSON object',
				displayOptions: { show: { '/operation': ['ghostMannequin'] } },
			},
			qualityOption,
			{
				...seedOption,
				displayOptions: {
					show: {
						'/operation': ['adLocalizer', 'sketchToRender', 'ghostMannequin', 'modelPoseVariants'],
					},
				},
			},
			{
				...numImagesOption,
				displayOptions: {
					show: {
						'/operation': ['adResizer', 'adVariations', 'adLocalizer', 'sketchToRender', 'modelPoseVariants'],
					},
				},
			},
			webhookOption,
			dryRunOption,
		]),
	},
	...waitProperties({ resource, operation: allTools }, true, 300),
	outputOptions({ resource, operation: allTools }),
];
