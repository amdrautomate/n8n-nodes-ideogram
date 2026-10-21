import {
	NodeApiError,
	NodeOperationError,
	sleep,
	type IDataObject,
	type IExecuteFunctions,
	type IHttpRequestMethods,
	type IHttpRequestOptions,
	type JsonObject,
} from 'n8n-workflow';
import { encodeMultipart, type MultipartFieldValue, type MultipartFile } from './multipart';

export const IDEOGRAM_BASE_URL = 'https://api.ideogram.ai';
export const USER_AGENT = 'n8n-nodes-ideogram';
const CREDENTIAL = 'ideogramApi';

export interface IdeogramRequest {
	method: IHttpRequestMethods;
	path: string;
	qs?: IDataObject;
	/** Text fields of the request body. Arrays are sent as repeated multipart fields or JSON arrays. */
	fields?: Record<string, MultipartFieldValue | IDataObject | undefined>;
	/** File parts. When present the body is multipart/form-data, otherwise JSON. */
	files?: MultipartFile[];
}

/** Human-readable hints for Ideogram's reject reasons and HTTP statuses. */
const REJECT_HINTS: Record<string, string> = {
	insufficient_funds:
		'The API balance of this Ideogram account is empty. Add credits in the API dashboard (Billing).',
	subscription_required: 'This endpoint needs an Ideogram subscription on the account.',
	daily_limit: 'The daily generation limit of this account was reached.',
	priority_credit_required: 'This request needs priority credits on the account.',
	inflight_limit:
		'Too many requests are running at once (default limit: 10 in flight). Reduce concurrency or wait.',
	feature_limit: 'This feature is not enabled for the account.',
};

const STATUS_HINTS: Record<number, string> = {
	401: 'Ideogram rejected the API key. Check the Ideogram API credential.',
	402: 'Ideogram needs a payment method and credits on the API account before it accepts requests.',
	403: 'The API key is not allowed to call this endpoint.',
	404: 'Ideogram could not find that resource. Check the ID and the model name.',
	413: 'An uploaded file is too large for this endpoint.',
	422: 'Ideogram rejected the request fields. Check the parameter values for this model.',
	429: 'Ideogram rate limit reached. Wait a moment and retry.',
};

function parseBody(raw: unknown): IDataObject {
	if (raw === undefined || raw === null || raw === '') return {};
	if (Buffer.isBuffer(raw)) raw = raw.toString('utf8');
	if (typeof raw === 'string') {
		try {
			return JSON.parse(raw) as IDataObject;
		} catch {
			return { message: raw.slice(0, 500) };
		}
	}
	return raw as IDataObject;
}

/** Raises a NodeApiError with Ideogram's own error text and a hint on how to fix it. */
export function throwIdeogramError(
	context: IExecuteFunctions,
	status: number,
	body: IDataObject,
	itemIndex: number,
): never {
	const rejectReason = body.reject_reason as string | undefined;
	const message =
		(typeof body.error === 'string' ? body.error : undefined) ??
		(typeof body.message === 'string' ? body.message : undefined) ??
		(typeof body.detail === 'string' ? body.detail : undefined) ??
		(Array.isArray(body.detail) ? JSON.stringify(body.detail) : undefined) ??
		`Ideogram returned status ${status}`;
	const description =
		(rejectReason && REJECT_HINTS[rejectReason]) ??
		STATUS_HINTS[status] ??
		(rejectReason ? `Reject reason: ${rejectReason}` : undefined);

	throw new NodeApiError(context.getNode(), body as JsonObject, {
		httpCode: String(status),
		message,
		description,
		itemIndex,
	});
}

/**
 * Sends an authenticated request to the Ideogram API and returns the parsed JSON body.
 * Multipart bodies are encoded locally when file parts are present.
 */
export async function ideogramRequest(
	this: IExecuteFunctions,
	request: IdeogramRequest,
	itemIndex: number,
): Promise<IDataObject> {
	const headers: IDataObject = { Accept: 'application/json', 'User-Agent': USER_AGENT };
	let body: Buffer | string | undefined;

	if (request.files && request.files.length > 0) {
		const textFields: Record<string, MultipartFieldValue | undefined> = {};
		for (const [key, value] of Object.entries(request.fields ?? {})) {
			if (value === undefined || value === null || value === '') continue;
			textFields[key] =
				typeof value === 'object' && !Array.isArray(value)
					? JSON.stringify(value)
					: (value as MultipartFieldValue);
		}
		const encoded = encodeMultipart(textFields, request.files);
		headers['Content-Type'] = encoded.contentType;
		headers['Content-Length'] = encoded.body.length;
		body = encoded.body;
	} else if (request.fields && Object.keys(request.fields).length > 0) {
		const json: IDataObject = {};
		for (const [key, value] of Object.entries(request.fields)) {
			if (value === undefined || value === null || value === '') continue;
			json[key] = value;
		}
		headers['Content-Type'] = 'application/json';
		body = JSON.stringify(json);
	}

	const options: IHttpRequestOptions = {
		method: request.method,
		url: `${IDEOGRAM_BASE_URL}${request.path}`,
		qs: request.qs,
		headers,
		body,
		json: false,
		returnFullResponse: true,
		ignoreHttpStatusErrors: true,
		timeout: 300_000,
	};
	if (body === undefined) delete options.body;

	const response = (await this.helpers.httpRequestWithAuthentication.call(
		this,
		CREDENTIAL,
		options,
	)) as { statusCode: number; body: unknown };

	const parsed = parseBody(response.body);
	if (response.statusCode >= 400) {
		throwIdeogramError(this, response.statusCode, parsed, itemIndex);
	}
	return parsed;
}

/** Downloads a (short-lived) result URL into a Buffer, with its content type. */
export async function downloadUrl(
	this: IExecuteFunctions,
	url: string,
): Promise<{ data: Buffer; contentType: string }> {
	const response = (await this.helpers.httpRequest({
		method: 'GET',
		url,
		encoding: 'arraybuffer',
		returnFullResponse: true,
		headers: { 'User-Agent': USER_AGENT },
		timeout: 300_000,
	})) as { body: Buffer | ArrayBuffer; headers: Record<string, string> };
	const data = Buffer.isBuffer(response.body)
		? response.body
		: Buffer.from(response.body as ArrayBuffer);
	return { data, contentType: response.headers?.['content-type'] ?? 'application/octet-stream' };
}

export interface GenerationStatus {
	generation_id?: string;
	status?: string;
	failure_reason?: string;
	data?: IDataObject[];
	[key: string]: unknown;
}

/**
 * Polls GET /v2/generations/{id} until the generation is completed or failed, or the
 * time budget runs out. Async image requests, video and tool endpoints all end up here.
 */
export async function waitForGeneration(
	this: IExecuteFunctions,
	generationId: string,
	maxWaitSeconds: number,
	itemIndex: number,
	pollIntervalMs = 4000,
): Promise<GenerationStatus> {
	const started = Date.now();
	let last: GenerationStatus = { generation_id: generationId, status: 'pending' };
	while (Date.now() - started < maxWaitSeconds * 1000) {
		await sleep(pollIntervalMs);
		last = (await ideogramRequest.call(
			this,
			{ method: 'GET', path: `/v2/generations/${encodeURIComponent(generationId)}` },
			itemIndex,
		)) as GenerationStatus;
		if (last.status === 'completed') return last;
		if (last.status === 'failed') {
			throw new NodeOperationError(
				this.getNode(),
				`Ideogram generation ${generationId} failed: ${String(last.failure_reason ?? 'no reason given')}`,
				{ itemIndex },
			);
		}
	}
	throw new NodeOperationError(
		this.getNode(),
		`Ideogram generation ${generationId} is still pending after ${maxWaitSeconds} seconds`,
		{
			itemIndex,
			description:
				'Increase "Max Wait" or turn off "Wait for Completion" and fetch the result later with Generation > Get.',
		},
	);
}
