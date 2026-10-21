import {
	NodeApiError,
	NodeConnectionTypes,
	NodeOperationError,
	type IExecuteFunctions,
	type INodeExecutionData,
	type INodeType,
	type INodeTypeDescription,
} from 'n8n-workflow';
import { executeAccount } from './actions/account';
import { executeGeneration } from './actions/generation';
import { executeImage } from './actions/image';
import { executeTool } from './actions/tool';
import { executeVideo } from './actions/video';
import { accountDescription } from './descriptions/account';
import { generationDescription } from './descriptions/generation';
import { imageDescription } from './descriptions/image';
import { toolDescription } from './descriptions/tool';
import { videoDescription } from './descriptions/video';

/**
 * Programmatic node: almost every Ideogram endpoint takes a multipart body with image
 * files read from binary data or downloaded from URLs, several endpoints answer with a
 * pending generation that has to be polled, and results are downloaded into binary data.
 * Declarative routing cannot express those multi-step, file-carrying calls.
 */
export class Ideogram implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Ideogram',
		name: 'ideogram',
		icon: { light: 'file:../../icons/ideogram.svg', dark: 'file:../../icons/ideogram.dark.svg' },
		group: ['transform'],
		version: 1,
		subtitle: '={{ $parameter["operation"] + ": " + $parameter["resource"] }}',
		description:
			'Generate, edit, remix, upscale and describe images with crisp text rendering, generate video, and run ad and product tools with the Ideogram API',
		defaults: {
			name: 'Ideogram',
		},
		usableAsTool: true,
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		credentials: [
			{
				name: 'ideogramApi',
				required: true,
			},
		],
		properties: [
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				noDataExpression: true,
				options: [
					{ name: 'Account', value: 'account' },
					{ name: 'Generation', value: 'generation' },
					{ name: 'Image', value: 'image' },
					{ name: 'Tool', value: 'tool' },
					{ name: 'Video', value: 'video' },
				],
				default: 'image',
			},
			...accountDescription,
			...generationDescription,
			...imageDescription,
			...toolDescription,
			...videoDescription,
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];

		for (let i = 0; i < items.length; i++) {
			try {
				const resource = this.getNodeParameter('resource', i) as string;
				let results: INodeExecutionData[];
				switch (resource) {
					case 'image':
						results = await executeImage.call(this, i);
						break;
					case 'video':
						results = await executeVideo.call(this, i);
						break;
					case 'tool':
						results = await executeTool.call(this, i);
						break;
					case 'generation':
						results = await executeGeneration.call(this, i);
						break;
					case 'account':
						results = await executeAccount.call(this, i);
						break;
					default:
						throw new NodeOperationError(this.getNode(), `Unknown resource "${resource}"`, {
							itemIndex: i,
						});
				}
				returnData.push(...results);
			} catch (error) {
				if (this.continueOnFail()) {
					returnData.push({
						json: { error: (error as Error).message },
						pairedItem: { item: i },
					});
					continue;
				}
				const known = error as Error;
				if (known instanceof NodeApiError || known instanceof NodeOperationError) throw known;
				throw new NodeOperationError(this.getNode(), known, { itemIndex: i });
			}
		}

		return [returnData];
	}
}
