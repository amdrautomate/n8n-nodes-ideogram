import type { IDataObject, IExecuteFunctions, INodeExecutionData } from 'n8n-workflow';
import { ideogramRequest } from '../shared/transport';

export async function executeAccount(
	this: IExecuteFunctions,
	itemIndex: number,
): Promise<INodeExecutionData[]> {
	const operation = this.getNodeParameter('operation', itemIndex) as string;

	if (operation === 'getApiKeys') {
		const response = await ideogramRequest.call(
			this,
			{ method: 'GET', path: '/v2/account/api-keys' },
			itemIndex,
		);
		const keys = Array.isArray(response.data)
			? (response.data as IDataObject[])
			: Array.isArray(response.api_keys)
				? (response.api_keys as IDataObject[])
				: undefined;
		if (keys) return keys.map((json) => ({ json, pairedItem: { item: itemIndex } }));
		return [{ json: response, pairedItem: { item: itemIndex } }];
	}

	const options = this.getNodeParameter('options', itemIndex, {}) as IDataObject;
	const qs: IDataObject = {};
	const end = options.endTime ? new Date(options.endTime as string) : new Date();
	const start = options.startTime
		? new Date(options.startTime as string)
		: new Date(end.getTime() - 7 * 24 * 60 * 60 * 1000);
	qs.start_time = start.toISOString();
	qs.end_time = end.toISOString();
	qs.bucket_width = (options.bucketWidth as string) || '1d';
	if (Array.isArray(options.sources) && options.sources.length > 0) {
		qs.sources = (options.sources as string[]).join(',');
	}

	const response = await ideogramRequest.call(
		this,
		{ method: 'GET', path: '/v2/account/usage', qs },
		itemIndex,
	);
	const buckets = Array.isArray(response.buckets) ? (response.buckets as IDataObject[]) : [];
	if (buckets.length === 0) return [{ json: response, pairedItem: { item: itemIndex } }];
	return buckets.map((json) => ({ json, pairedItem: { item: itemIndex } }));
}
