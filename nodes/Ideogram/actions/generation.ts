import {
	NodeOperationError,
	type IDataObject,
	type IExecuteFunctions,
	type INodeExecutionData,
} from 'n8n-workflow';
import { readOutputSettings, toOutputItems } from '../shared/output';
import { ideogramRequest, waitForGeneration } from '../shared/transport';
import { readWait } from './common';

export async function executeGeneration(
	this: IExecuteFunctions,
	itemIndex: number,
): Promise<INodeExecutionData[]> {
	const generationId = String(this.getNodeParameter('generationId', itemIndex)).trim();
	if (!generationId) {
		throw new NodeOperationError(this.getNode(), "'Generation ID' is empty", { itemIndex });
	}
	const wait = readWait(this, itemIndex, 300);
	let response = await ideogramRequest.call(
		this,
		{ method: 'GET', path: `/v2/generations/${encodeURIComponent(generationId)}` },
		itemIndex,
	);
	if (wait.enabled && response.status === 'pending') {
		response = (await waitForGeneration.call(
			this,
			generationId,
			wait.maxWaitSeconds,
			itemIndex,
		)) as unknown as IDataObject;
	}
	if (response.status !== 'completed') {
		return [{ json: response, pairedItem: { item: itemIndex } }];
	}
	const settings = readOutputSettings(this, itemIndex, `ideogram-${generationId.slice(0, 8)}`);
	return await toOutputItems.call(this, response, itemIndex, settings);
}
