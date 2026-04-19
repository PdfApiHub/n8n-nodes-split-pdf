import type {
	IExecuteFunctions,
	INodeExecutionData,
	INodeProperties,
} from 'n8n-workflow';
import { normalizeUrl, prepareBinaryResponse, parseJsonResponseBody, createSingleFileMultipart, checkApiResponse } from '../helpers';

/* ================================================================
 *  Field descriptions – Split PDF
 * ================================================================ */

export const description: INodeProperties[] = [
	// ─── 1. Input ───────────────────────────────────────────────────
	{
		displayName: 'Input Type',
		name: 'split_input_type',
		type: 'options',
		options: [
			{ name: 'URL (Default)', value: 'url', description: 'Provide a publicly accessible PDF URL' },
			{ name: 'Binary File', value: 'file', description: 'Use a PDF file from a previous node\'s binary output' },
		],
		default: 'url',
		description: 'How to provide the PDF to split',
		displayOptions: { show: { operation: ['splitPdf'] } },
	},
	{
		displayName: 'PDF URL',
		name: 'url',
		type: 'string',
		default: '',
		placeholder: 'https://pdfapihub.com/sample.pdf',
		description: 'Public URL of the PDF to split. Google Drive share links are auto-converted.',
		displayOptions: { show: { operation: ['splitPdf'], split_input_type: ['url'] } },
	},
	{
		displayName: 'Binary Property Name',
		name: 'split_file_binary_property',
		type: 'string',
		default: 'data',
		description: 'Binary property containing the PDF file to split',
		displayOptions: { show: { operation: ['splitPdf'], split_input_type: ['file'] } },
	},

	// ─── 2. Split Mode ──────────────────────────────────────────────
	{
		displayName: 'Split Mode',
		name: 'splitType',
		type: 'options',
		options: [
			{
				name: 'Each Page (Default)',
				value: 'each',
				description: 'One PDF per page — every page becomes its own file',
			},
			{
				name: 'Specific Pages',
				value: 'pages',
				description: 'Extract specific pages or ranges into separate PDFs',
			},
			{
				name: 'Equal Chunks',
				value: 'chunks',
				description: 'Split into N roughly equal parts',
			},
		],
		default: 'each',
		description: 'How to split the PDF',
		displayOptions: { show: { operation: ['splitPdf'] } },
	},
	{
		displayName: 'Pages',
		name: 'pages',
		type: 'string',
		default: '',
		required: true,
		placeholder: '1-3,5,8-10',
		description: 'Pages to extract. Supports single pages (1,3,5), ranges (1-5), open-ended ranges (5- = page 5 to end), or mixed (1-3,5,8-). Each comma group becomes a separate PDF.',
		displayOptions: { show: { operation: ['splitPdf'], splitType: ['pages'] } },
	},
	{
		displayName: 'Number of Chunks',
		name: 'chunks',
		type: 'number',
		default: 2,
		required: true,
		typeOptions: { minValue: 2, maxValue: 100 },
		description: 'Number of roughly equal parts to split the PDF into (2–100)',
		displayOptions: { show: { operation: ['splitPdf'], splitType: ['chunks'] } },
	},

	// ─── 3. Output ──────────────────────────────────────────────────
	{
		displayName: 'Output Format',
		name: 'output',
		type: 'options',
		options: [
			{
				name: 'URL (Hosted Link) (Default)',
				value: 'url',
				description: 'Returns download URLs for each split PDF plus a ZIP — hosted for 30 days',
			},
			{
				name: 'Base64 (Inline Data)',
				value: 'base64',
				description: 'Returns a base64-encoded ZIP of the split PDFs inside JSON',
			},
			{
				name: 'Binary File (Download)',
				value: 'file',
				description: 'Returns the ZIP as raw binary — great for piping into other nodes',
			},
		],
		default: 'url',
		description: 'How the split PDFs are returned (output is always a ZIP when using File or Base64)',
		displayOptions: { show: { operation: ['splitPdf'] } },
	},
	{
		displayName: 'Output Filename',
		name: 'split_output_filename',
		type: 'string',
		default: 'pdf_split.zip',
		placeholder: 'report-pages.zip',
		description: 'Filename for the output ZIP – .zip is appended automatically if omitted',
		displayOptions: { show: { operation: ['splitPdf'] } },
	},
];

/* ================================================================
 *  Execute handler
 * ================================================================ */

export async function execute(
	this: IExecuteFunctions,
	index: number,
	returnData: INodeExecutionData[],
): Promise<void> {
	const splitInputType = this.getNodeParameter('split_input_type', index) as string;
	const splitType = this.getNodeParameter('splitType', index) as string;
	const output = this.getNodeParameter('output', index) as string;
	const outputFilename = this.getNodeParameter('split_output_filename', index, 'pdf_split.zip') as string;

	const body: Record<string, unknown> = { output, output_filename: outputFilename };

	if (splitInputType === 'url') {
		const pdfUrl = this.getNodeParameter('url', index, '') as string;
		body.url = normalizeUrl(pdfUrl);
	}

	if (splitType === 'pages') {
		body.pages = this.getNodeParameter('pages', index) as string;
	} else if (splitType === 'each') {
		body.mode = 'each';
	} else if (splitType === 'chunks') {
		body.chunks = this.getNodeParameter('chunks', index) as number;
	}

	const safeName = outputFilename.endsWith('.zip') ? outputFilename : `${outputFilename}.zip`;

	if (output === 'file') {
		const requestOptions =
			splitInputType === 'file'
				? await createSingleFileMultipart.call(
						this,
						index,
						this.getNodeParameter('split_file_binary_property', index) as string,
						body as Record<string, string | number | boolean>,
					)
				: { body, json: true };

		const responseData = await this.helpers.httpRequestWithAuthentication.call(
			this,
			'pdfapihubApi',
			{
				method: 'POST',
				url: 'https://pdfapihub.com/api/v1/pdf/split',
				...requestOptions,
				encoding: 'arraybuffer',
				returnFullResponse: true,
				ignoreHttpStatusErrors: true,
			},
		) as { body: ArrayBuffer; statusCode: number; headers?: Record<string, unknown> };

		if (responseData.statusCode >= 400) {
			let errorBody: unknown;
			try { errorBody = JSON.parse(Buffer.from(responseData.body).toString('utf8')); } catch { errorBody = {}; }
			checkApiResponse(this, responseData.statusCode, errorBody, index);
		}

		returnData.push(
			await prepareBinaryResponse.call(
				this,
				index,
				responseData,
				safeName,
				'application/zip',
			),
		);
	} else {
		const requestOptions =
			splitInputType === 'file'
				? await createSingleFileMultipart.call(
						this,
						index,
						this.getNodeParameter('split_file_binary_property', index) as string,
						body as Record<string, string | number | boolean>,
					)
				: { body, json: true };

		const responseData = await this.helpers.httpRequestWithAuthentication.call(
			this,
			'pdfapihubApi',
			{
				method: 'POST',
				url: 'https://pdfapihub.com/api/v1/pdf/split',
				...requestOptions,
				returnFullResponse: true,
				ignoreHttpStatusErrors: true,
			},
		) as { body: unknown; statusCode: number };

		checkApiResponse(this, responseData.statusCode, responseData.body, index);
		returnData.push(parseJsonResponseBody(responseData.body, index));
	}
}
