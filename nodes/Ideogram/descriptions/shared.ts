import type { IDisplayOptions, INodeProperties } from 'n8n-workflow';

type Show = NonNullable<IDisplayOptions['show']>;

/**
 * Builders for the parameter groups every operation shares: image inputs (binary data or
 * URL), the Wait for Completion pair, the output options and the dry-run switch.
 */

interface ImageInputOptions {
	/** Prefix of the three parameter names: `<name>Source`, `<name>BinaryProperty`, `<name>Url`. */
	name: string;
	displayName: string;
	description: string;
	required: boolean;
	show: Show;
}

/** Three parameters that let the user supply one image from binary data or a public URL. */
export function imageInput({
	name,
	displayName,
	description,
	required,
	show,
}: ImageInputOptions): INodeProperties[] {
	const sourceOptions = [
		{ name: 'Binary Data', value: 'binary', description: 'A binary property of the input item' },
		{ name: 'URL', value: 'url', description: 'A public http(s) URL the node downloads' },
	];
	if (!required) {
		sourceOptions.unshift({ name: 'None', value: 'none', description: 'Do not send this image' });
	}
	const source: INodeProperties = {
		displayName,
		name: `${name}Source`,
		type: 'options',
		default: 'binary',
		description,
		options: sourceOptions,
		displayOptions: { show },
	};
	if (!required) source.default = 'none';
	return [
		source,
		{
			displayName: `${displayName} Binary Property`,
			name: `${name}BinaryProperty`,
			type: 'string',
			default: 'data',
			required,
			description: 'Name of the binary property of the input item that holds the image',
			displayOptions: { show: { ...show, [`${name}Source`]: ['binary'] } },
		},
		{
			displayName: `${displayName} URL`,
			name: `${name}Url`,
			type: 'string',
			default: '',
			required,
			placeholder: 'e.g. https://example.com/photo.png',
			description: 'Public URL of the image (JPEG, PNG or WEBP unless the model says otherwise)',
			displayOptions: { show: { ...show, [`${name}Source`]: ['url'] } },
		},
	];
}

/** One string parameter that lists several images as binary property names or URLs. */
export function imageList(
	name: string,
	displayName: string,
	description: string,
	show: Show,
	required = false,
): INodeProperties {
	return {
		displayName,
		name,
		type: 'string',
		default: '',
		required,
		placeholder: 'e.g. data, https://example.com/ref.png',
		description: `${description} Comma-separated list of binary property names of the input item and/or public URLs`,
		displayOptions: { show },
	};
}

/** "Wait for Completion" and "Max Wait" for operations that may return a pending generation. */
export function waitProperties(show: Show, defaultWait = true, defaultMaxWait = 180): INodeProperties[] {
	const wait: INodeProperties = {
		displayName: 'Wait for Completion',
		name: 'waitForCompletion',
		type: 'boolean',
		default: true,
		description:
			'Whether to wait until the result is ready and return it, instead of returning the pending generation ID (fetch it later with Generation > Get)',
		displayOptions: { show },
	};
	wait.default = defaultWait;
	return [
		wait,
		{
			displayName: 'Max Wait (Seconds)',
			name: 'maxWaitSeconds',
			type: 'number',
			default: defaultMaxWait,
			typeOptions: { minValue: 5 },
			description: 'How long to poll for the result before the node fails',
			displayOptions: { show: { ...show, waitForCompletion: [true] } },
		},
	];
}

/** Output options: download result files into binary data. */
export function outputOptions(show: Show): INodeProperties {
	return {
		displayName: 'Output Options',
		name: 'outputOptions',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		displayOptions: { show },
		options: [
			{
				displayName: 'Download Files',
				name: 'download',
				type: 'boolean',
				default: true,
				description:
					'Whether to download each result into binary data. Ideogram result URLs expire, so keep this on unless you only need the metadata.',
			},
			{
				displayName: 'Binary Property',
				name: 'binaryProperty',
				type: 'string',
				default: 'data',
				description: 'Name of the binary property that receives the downloaded file',
			},
		],
	};
}

/** Sorts collection options by display name, as n8n's UI guidelines ask. */
export function alphabetical(options: INodeProperties[]): INodeProperties[] {
	return [...options].sort((a, b) => a.displayName.localeCompare(b.displayName));
}

/** Option entries shared by most generation operations (appended to each Options collection). */
export const commonGenerationOptions: INodeProperties[] = [
	{
		displayName: 'Number of Images',
		name: 'numImages',
		type: 'number',
		default: 1,
		typeOptions: { minValue: 1, maxValue: 8 },
		description: 'How many images to generate. Each one is billed and returned as its own item.',
	},
	{
		displayName: 'Seed',
		name: 'seed',
		type: 'number',
		default: 0,
		description: 'Random seed for reproducible results (0 = let Ideogram choose)',
	},
	{
		displayName: 'Webhook URL',
		name: 'webhookUrl',
		type: 'string',
		default: '',
		placeholder: 'e.g. https://my-n8n.example.com/webhook/ideogram',
		description:
			'HTTPS URL Ideogram posts the finished result to. Useful with Wait for Completion off: an n8n Webhook node can receive it.',
	},
	{
		displayName: 'Dry Run (Price Only)',
		name: 'dryRun',
		type: 'boolean',
		default: false,
		description:
			'Whether to only validate and price the request. Nothing is generated or billed; the response holds the price.',
	},
];

/** Copyright detection switch, available on Ideogram models. */
export const copyrightOption: INodeProperties = {
	displayName: 'Enable Copyright Detection',
	name: 'enableCopyrightDetection',
	type: 'boolean',
	default: false,
	description:
		'Whether to run copyright detection on the results (adds latency; flagged images carry a flag in the output)',
};
