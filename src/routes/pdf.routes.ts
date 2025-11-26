/**
 * PDF Routes
 * Routes for PDF upload, retrieval, listing, and deletion
 */


import * as pdfController from '../controllers/pdf.controller';

export interface Route {
	pattern: RegExp;
	method: string;
	handler: (
		request: Request,
		env: Env,
		ctx: ExecutionContext,
		corsHeaders: Record<string, string>
	) => Promise<Response>;
}

export const pdfRoutes: Route[] = [
	{
		pattern: /^\/upload-pdf$/,
		method: 'POST',
		handler: pdfController.handleUpload
	},
	{
		pattern: /^\/get-pdf\/.+$/,
		method: 'GET',
		handler: pdfController.handleGetPdf
	},
	{
		pattern: /^\/list-pdfs$/,
		method: 'GET',
		handler: pdfController.handleListPdfs
	},
	{
		pattern: /^\/delete-pdf\/.+$/,
		method: 'DELETE',
		handler: pdfController.handleDeletePdf
	}
];
