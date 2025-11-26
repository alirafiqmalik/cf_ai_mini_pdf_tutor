/**
 * PDF Controller
 * Handles PDF upload, retrieval, listing, and deletion
 */

import { Env, UploadedFile } from '../types';
import * as storageService from '../services/storage.service';
import * as pdfService from '../services/pdf.service';
import * as llmService from '../services/llm.service';
import * as validationService from '../services/validation.service';
import { createJsonResponse, createErrorResponse, createNotFoundResponse } from '../utils/response.utils';
import { validateFilename } from '../utils/storage.utils';
import { ValidationError, NotFoundError } from '../middleware/error.middleware';
import { createLogger } from '../utils/logger.utils';

const logger = createLogger('PDFController');

/**
 * Handle PDF upload
 */
export async function handleUpload(
	request: Request,
	env: Env,
	ctx: ExecutionContext,
	corsHeaders: Record<string, string>
): Promise<Response> {
	try {
		const formData = await request.formData();
		const file = formData.get('pdf') as File;
		
		if (!file) {
			throw new ValidationError('No PDF file provided');
		}
		
		// Validate file
		const validation = validationService.validatePdfFile(file);
		if (!validation.valid) {
			throw new ValidationError(validation.error!);
		}
		
		// Generate unique filename
		const timestamp = Date.now();
		// TODO: assign randomly geenarted name to uploaded file and create methods to handle the reterival/access of original name and path name (to avoid advanced path traversal attacks on filenames)  
		const filename = `${file.name}`;
		
		// Get file buffer
		const fileBuffer = await file.arrayBuffer();
		
		// Store PDF and metadata
		await storageService.storePdf(filename, fileBuffer, env);
		
		const metadata: UploadedFile = {
			filename,
			timestamp,
			size: file.size,
			originalName: file.name
		};
		
	await storageService.storeMetadata(filename, metadata, env);
	
	// Schedule PDF processing in background
	ctx.waitUntil(processPdf(filename, fileBuffer, metadata, env));
	
	logger.info(`PDF uploaded successfully: ${filename}`);
		
		return createJsonResponse({
			success: true,
			filename,
			timestamp,
			size: file.size,
			message: 'PDF uploaded successfully'
		}, 200);
		
	} catch (error) {
		logger.error('Upload error', error);
		
		if (error instanceof ValidationError) {
			return createErrorResponse(error.message, 400);
		}
		
		return createErrorResponse('Failed to upload PDF', 500);
	}
}

/**
 * Process PDF in background (generate transcripts and MCQs)
 */
async function processPdf(
    filename: string,
    fileBuffer: ArrayBuffer,
    metadata: UploadedFile,
    env: Env
): Promise<void> {
    // Progress tracking for interval logging
    const progressStatus = {
        currentPage: 0,
        totalPages: 0,
        stage: 'initializing'
    };
    
    // Set up interval-based progress logging (every 10 seconds)
    const progressInterval = setInterval(() => {
        console.info(`[Background Processing] ${filename} - Stage: ${progressStatus.stage}, Page: ${progressStatus.currentPage}/${progressStatus.totalPages}`);
    }, 10000);
    
    try {
        logger.info(`Starting processing for: ${filename}`);
        progressStatus.stage = 'extracting';
        
        // Extract text from PDF using unpdf
        const { pages: pages, numPages: numPages  } = await pdfService.extractPdfText(fileBuffer);
        logger.info(`Extracted ${numPages} pages from ${filename}`);
        
        progressStatus.totalPages = numPages;
        progressStatus.stage = 'generating';
        
        // ===== GENERATE TRANSCRIPTS AND MCQS WITH TRIMMED TEXT =====
        const allTranscripts: Record<number, string> = {};
        const allMcqs: Record<string, any[]> = {};
        
        for (let pageNum = 1; pageNum <= numPages; pageNum++) {
            progressStatus.currentPage = pageNum;
            const pageText = pages[pageNum - 1];
            logger.info(`awaiting transcript ${pageNum}`);
            // Generate transcript with trimmed text
            const transcript = await llmService.generateTranscript(
                pageText,
                pageNum,
                env
            );
			logger.info(`Got transcript  ${pageNum}`);
            allTranscripts[pageNum] = transcript;
            
            // Generate MCQs with trimmed text
            const mcqs = await llmService.generateMcqs(
                pageText,
                pageNum,
                env
            );
            allMcqs[pageNum.toString()] = mcqs;
            
            logger.info(`Processed page ${pageNum}/${numPages} for ${filename}`);
        }
        
        progressStatus.stage = 'storing';
        // Store results in R2
        await storageService.storeTranscript(filename, allTranscripts, env);
        await storageService.storeMcqs(filename, allMcqs, env);
        
        progressStatus.stage = 'completed';
        logger.info(`Processing completed for: ${filename}`);
    } catch (error) {
        progressStatus.stage = 'failed';
        logger.error(`Processing failed for ${filename}`, error);
    } finally {
        // Clean up interval
        clearInterval(progressInterval);
        console.info(`[Background Processing] ${filename} - Final status: ${progressStatus.stage}, Processed ${progressStatus.currentPage}/${progressStatus.totalPages} pages`);
    }
}

/**
 * Handle get PDF
 */
export async function handleGetPdf(
	request: Request,
	env: Env,
	ctx: ExecutionContext,
	corsHeaders: Record<string, string>
): Promise<Response> {
	try {
		const url = new URL(request.url);
		const encodedFilename = url.pathname.replace('/get-pdf/', '');
		const filename = decodeURIComponent(encodedFilename);
		
		logger.info(`Get PDF request - Encoded: ${encodedFilename}, Decoded: ${filename}`);
		
		// Validate filename
		if (!validateFilename(filename)) {
			throw new ValidationError('Invalid filename');
		}
		
		// Get PDF from storage
		const pdfBuffer = await storageService.getPdf(filename, env);
		
		if (!pdfBuffer) {
			throw new NotFoundError('PDF not found');
		}
		
		return new Response(pdfBuffer, {
			headers: {
				...corsHeaders,
				'Content-Type': 'application/pdf',
				'Content-Disposition': `inline; filename="${filename}"`,
			}
		});
		
	} catch (error) {
		logger.error('Get PDF error', error);
		
		if (error instanceof NotFoundError) {
			return createNotFoundResponse(error.message);
		}
		
		if (error instanceof ValidationError) {
			return createErrorResponse(error.message, 400);
		}
		
		return createErrorResponse('Failed to retrieve PDF', 500);
	}
}

/**
 * Handle list PDFs
 */
export async function handleListPdfs(
	request: Request,
	env: Env,
	ctx: ExecutionContext,
	corsHeaders: Record<string, string>
): Promise<Response> {
	try {
		const files = await storageService.listPdfs(env);
		
		return createJsonResponse({
			success: true,
			count: files.length,
			files
		}, 200);
		
	} catch (error) {
		logger.error('List PDFs error', error);
		return createErrorResponse('Failed to list PDFs', 500);
	}
}

/**
 * Handle delete PDF
 */
export async function handleDeletePdf(
	request: Request,
	env: Env,
	ctx: ExecutionContext,
	corsHeaders: Record<string, string>
): Promise<Response> {
	try {
		const url = new URL(request.url);
		const filename = url.pathname.replace('/delete-pdf/', '');
		
		// Validate filename
		if (!validateFilename(filename)) {
			throw new ValidationError('Invalid filename');
		}
		
		// Delete all associated data
		await storageService.deleteAllFileData(filename, env);
		
		logger.info(`PDF deleted: ${filename}`);
		
		return createJsonResponse({
			success: true,
			message: 'PDF deleted successfully'
		}, 200);
		
	} catch (error) {
		logger.error('Delete PDF error', error);
		
		if (error instanceof ValidationError) {
			return createErrorResponse(error.message, 400);
		}
		
		return createErrorResponse('Failed to delete PDF', 500);
	}
}
