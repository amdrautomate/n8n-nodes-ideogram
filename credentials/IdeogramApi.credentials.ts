import type {
	IAuthenticateGeneric,
	Icon,
	ICredentialTestRequest,
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

export class IdeogramApi implements ICredentialType {
	name = 'ideogramApi';

	displayName = 'Ideogram API';

	icon: Icon = { light: 'file:../icons/ideogram.svg', dark: 'file:../icons/ideogram.dark.svg' };

	documentationUrl = 'https://github.com/amdrautomate/n8n-nodes-ideogram#credentials';

	properties: INodeProperties[] = [
		{
			displayName: 'API Key',
			name: 'apiKey',
			type: 'string',
			typeOptions: { password: true },
			default: '',
			required: true,
			description:
				'Create one in the Ideogram API dashboard (ideogram.ai/platform > API Keys). The key is shown once. Requests are billed to the prepaid API balance of that account.',
		},
	];

	authenticate: IAuthenticateGeneric = {
		type: 'generic',
		properties: {
			headers: {
				'Api-Key': '={{$credentials.apiKey}}',
			},
		},
	};

	test: ICredentialTestRequest = {
		request: {
			baseURL: 'https://api.ideogram.ai',
			url: '/v2/account/api-keys',
			method: 'GET',
		},
	};
}
