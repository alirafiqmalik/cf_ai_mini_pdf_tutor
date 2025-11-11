/**
 * Transcript Controller
 * Handles transcript retrieval
 */

import { Env, ExecutionContext } from '../types';
import * as storageService from '../services/storage.service';
import * as validationService from '../services/validation.service';
import { createJsonResponse, createErrorResponse, createNotFoundResponse } from '../utils/response.utils';
import { ValidationError, NotFoundError } from '../middleware/error.middleware';
import { createLogger } from '../utils/logger.utils';

const logger = createLogger('TranscriptController');

// In-memory storage for file metadata (to get filename)
// This should ideally be passed or retrieved from a shared state
const fileMetadata = new Map<string, any>();

/**
 * Handle get transcript
 */
export async function handleGetTranscript(
	request: Request,
	env: Env,
	ctx: ExecutionContext,
	corsHeaders: Record<string, string>
): Promise<Response> {
	try {
		const url = new URL(request.url);
		const encodedDoc = url.searchParams.get('doc');
		const pageParam = url.searchParams.get('page');
		const pageNumber = pageParam ? parseInt(pageParam, 10) : 1;
		
		// Validate document ID
		if (!encodedDoc) {
			throw new ValidationError('Document ID is required');
		}
		
		const filename = decodeURIComponent(encodedDoc);
		logger.info(`Get transcript - Encoded: ${encodedDoc}, Decoded: ${filename}, Page: ${pageNumber}`);
		
		// Validate page number
		const validation = validationService.validatePageNumber(pageNumber);
		if (!validation.valid) {
			throw new ValidationError(validation.error!);
		}
		
		// Get transcript from storage
		const transcript = await storageService.getTranscript(filename, pageNumber, env);
		
		if (!transcript) {
			throw new NotFoundError('Transcript is being processed. Please wait...');
		}
		
		return createJsonResponse({
			success: true,
			filename,
			page: pageNumber,
			transcript,
			source: 'r2'
		}, 200, corsHeaders);
		
	} catch (error) {
		logger.error('Get transcript error', error);
		
		if (error instanceof NotFoundError) {
			return createNotFoundResponse(error.message, corsHeaders);
		}
		
		if (error instanceof ValidationError) {
			return createErrorResponse(error.message, 400, corsHeaders);
		}
		
		return createErrorResponse('Failed to retrieve transcript', 500, corsHeaders);
	}
}

/**
 * Set file metadata (helper function for maintaining state)
 */
export function setFileMetadata(metadata: Map<string, any>): void {
	metadata.forEach((value, key) => {
		fileMetadata.set(key, value);
	});
}
