import type { INodeProperties } from 'n8n-workflow';

const resource = ['account'];

export const accountDescription: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show: { resource } },
		options: [
			{
				name: 'Get Usage',
				value: 'getUsage',
				action: 'Get usage and spend',
				description: 'Get API usage and spend, bucketed by day or hour (one item per bucket)',
			},
			{
				name: 'Get Many API Keys',
				value: 'getApiKeys',
				action: 'Get many API keys',
				description: 'List the API keys of the account (redacted)',
			},
		],
		default: 'getUsage',
	},
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		displayOptions: { show: { resource, operation: ['getUsage'] } },
		options: [
			{
				displayName: 'Start Time',
				name: 'startTime',
				type: 'dateTime',
				default: '',
				description: 'Start of the range (defaults to the last 7 days)',
			},
			{
				displayName: 'End Time',
				name: 'endTime',
				type: 'dateTime',
				default: '',
				description: 'End of the range, exclusive (defaults to now)',
			},
			{
				displayName: 'Bucket Width',
				name: 'bucketWidth',
				type: 'options',
				default: '1d',
				options: [
					{ name: '1 Day (Up to 92 Days per Request)', value: '1d' },
					{ name: '1 Hour (Up to 168 Hours per Request)', value: '1h' },
				],
			},
			{
				displayName: 'Sources',
				name: 'sources',
				type: 'multiOptions',
				default: [],
				options: [
					{ name: 'API', value: 'api' },
					{ name: 'Web App', value: 'app' },
				],
				description: 'Which billing sources to include (default: both)',
			},
		],
	},
];
