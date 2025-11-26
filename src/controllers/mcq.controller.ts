/**
 * MCQ Controller
 * Handles MCQ retrieval
 */

// 
import * as storageService from '../services/storage.service';
import * as validationService from '../services/validation.service';
import { createJsonResponse, createErrorResponse, createNotFoundResponse } from '../utils/response.utils';
import { ValidationError, NotFoundError } from '../middleware/error.middleware';
import { createLogger } from '../utils/logger.utils';

const logger = createLogger('McqController');

// In-memory storage for file metadata
const fileMetadata = new Map<string, any>();

/**
 * Handle get MCQs
 */
export async function handleGetMcqs(
	request: Request,
	env: Env,

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
		logger.info(`Get MCQs - Encoded: ${encodedDoc}, Decoded: ${filename}, Page: ${pageNumber}`);
		
		// Validate page number
		const validation = validationService.validatePageNumber(pageNumber);
		if (!validation.valid) {
			throw new ValidationError(validation.error!);
		}
		
		// Get MCQs from storage
		const questions = await storageService.getMcqs(filename, pageNumber, env);
		
		if (!questions || questions.length === 0) {
			throw new NotFoundError('MCQ questions are being processed. Please wait...');
		}
		
		return createJsonResponse({
			success: true,
			filename,
			page: pageNumber,
			count: questions.length,
			questions,
			source: 'r2'
		}, 200);
		
	} catch (error) {
		logger.error('Get MCQs error', error);
		
		if (error instanceof NotFoundError) {
			return createNotFoundResponse(error.message);
		}
		
		if (error instanceof ValidationError) {
			return createErrorResponse(error.message, 400);
		}
		
		return createErrorResponse('Failed to retrieve MCQs', 500);
	}
}

/**
 * Set file metadata (helper function)
 */
export function setFileMetadata(metadata: Map<string, any>): void {
	metadata.forEach((value, key) => {
		fileMetadata.set(key, value);
	});
}
