import type { INodeProperties } from 'n8n-workflow';
import { outputOptions, waitProperties } from './shared';

const resource = ['generation'];

export const generationDescription: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show: { resource } },
		options: [
			{
				name: 'Get',
				value: 'get',
				action: 'Get a generation',
				description:
					'Get the status and, once completed, the results of a generation by its ID (async requests, video and tools)',
			},
		],
		default: 'get',
	},
	{
		displayName: 'Generation ID',
		name: 'generationId',
		type: 'string',
		default: '',
		required: true,
		placeholder: 'e.g. 1f2e3d4c-...',
		description: 'The generation_id returned by a previous request',
		displayOptions: { show: { resource, operation: ['get'] } },
	},
	...waitProperties({ resource, operation: ['get'] }, false, 300),
	outputOptions({ resource, operation: ['get'] }),
];
