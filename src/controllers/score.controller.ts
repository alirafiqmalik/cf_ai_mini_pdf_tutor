/**
 * Score Controller
 * Handles score management
 */

import { Env, ExecutionContext } from '../types';
import * as validationService from '../services/validation.service';
import { createJsonResponse, createErrorResponse } from '../utils/response.utils';
import { ValidationError } from '../middleware/error.middleware';
import { createLogger } from '../utils/logger.utils';

const logger = createLogger('ScoreController');

// In-memory storage for scores
// In production, this should be stored in R2 or Durable Objects
const scores = new Map<string, number>();

/**
 * Handle get score
 */
export async function handleGetScore(
	request: Request,
	env: Env,
	ctx: ExecutionContext,
	corsHeaders: Record<string, string>
): Promise<Response> {
	try {
		const url = new URL(request.url);
		const encodedDoc = url.searchParams.get('doc');
		
		if (!encodedDoc) {
			throw new ValidationError('Document ID is required');
		}
		
		const filename = decodeURIComponent(encodedDoc);
		logger.info(`Get score - Encoded: ${encodedDoc}, Decoded: ${filename}`);
		
		// Validate filename
		const validation = validationService.validateFilename(filename);
		if (!validation.valid) {
			throw new ValidationError(validation.error!);
		}
		
		// Get score
		const score = scores.get(filename) || 0;
		
		return createJsonResponse({
			success: true,
			filename,
			score
		}, 200, corsHeaders);
		
	} catch (error) {
		logger.error('Get score error', error);
		
		if (error instanceof ValidationError) {
			return createErrorResponse(error.message, 400, corsHeaders);
		}
		
		return createErrorResponse('Failed to retrieve score', 500, corsHeaders);
	}
}

/**
 * Handle save score
 */
export async function handleSaveScore(
	request: Request,
	env: Env,
	ctx: ExecutionContext,
	corsHeaders: Record<string, string>
): Promise<Response> {
	try {
		const data = await request.json() as { doc: string; score: number };
		
		// Decode document ID
		const filename = data.doc;
		logger.info(`Save score - Doc: ${filename}, Score: ${data.score}`);
		
		// Validate inputs
		const filenameValidation = validationService.validateFilename(filename);
		if (!filenameValidation.valid) {
			throw new ValidationError(filenameValidation.error!);
		}
		
		const scoreValidation = validationService.validateScore(data.score);
		if (!scoreValidation.valid) {
			throw new ValidationError(scoreValidation.error!);
		}
		
		// Store score
		scores.set(filename, data.score);
		
		logger.info(`Score saved for ${filename}: ${data.score}`);
		
		return createJsonResponse({
			success: true,
			message: 'Score saved successfully',
			filename: filename,
			score: data.score
		}, 200, corsHeaders);
		
	} catch (error) {
		logger.error('Save score error', error);
		
		if (error instanceof ValidationError) {
			return createErrorResponse(error.message, 400, corsHeaders);
		}
		
		return createErrorResponse('Failed to save score', 500, corsHeaders);
	}
}
