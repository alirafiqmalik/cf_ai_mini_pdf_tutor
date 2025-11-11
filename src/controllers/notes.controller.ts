/**
 * Notes Controller
 * Handles note CRUD operations
 */

import { Env, ExecutionContext, Note } from '../types';
import * as validationService from '../services/validation.service';
import { createJsonResponse, createErrorResponse } from '../utils/response.utils';
import { ValidationError } from '../middleware/error.middleware';
import { createLogger } from '../utils/logger.utils';

const logger = createLogger('NotesController');

// In-memory storage for notes
// In production, this should be stored in R2 or Durable Objects
const notes = new Map<string, Note[]>();

/**
 * Handle save note
 */
export async function handleSaveNote(
	request: Request,
	env: Env,
	ctx: ExecutionContext,
	corsHeaders: Record<string, string>
): Promise<Response> {
	try {
		const data = await request.json() as { doc: string; page: number; note: string };
		
		// Decode document ID
		const filename = data.doc;
		logger.info(`Save note - Doc: ${filename}, Page: ${data.page}`);
		
		// Validate inputs
		const filenameValidation = validationService.validateFilename(filename);
		if (!filenameValidation.valid) {
			throw new ValidationError(filenameValidation.error!);
		}
		
		const pageValidation = validationService.validatePageNumber(data.page);
		if (!pageValidation.valid) {
			throw new ValidationError(pageValidation.error!);
		}
		
		const noteValidation = validationService.validateNote(data.note);
		if (!noteValidation.valid) {
			throw new ValidationError(noteValidation.error!);
		}
		
		// Create note object
		const note: Note = {
			filename: filename,
			page: data.page,
			note: validationService.sanitizeString(data.note),
			timestamp: Date.now()
		};
		
		// Store note
		const fileNotes = notes.get(filename) || [];
		fileNotes.push(note);
		notes.set(filename, fileNotes);
		
		logger.info(`Note saved for ${filename}, page ${data.page}`);
		
		return createJsonResponse({
			success: true,
			message: 'Note saved successfully',
			note
		}, 200, corsHeaders);
		
	} catch (error) {
		logger.error('Save note error', error);
		
		if (error instanceof ValidationError) {
			return createErrorResponse(error.message, 400, corsHeaders);
		}
		
		return createErrorResponse('Failed to save note', 500, corsHeaders);
	}
}

/**
 * Handle get notes
 */
export async function handleGetNotes(
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
		logger.info(`Get notes - Encoded: ${encodedDoc}, Decoded: ${filename}`);
		
		// Validate filename
		const validation = validationService.validateFilename(filename);
		if (!validation.valid) {
			throw new ValidationError(validation.error!);
		}
		
		// Get notes
		const fileNotes = notes.get(filename) || [];
		
		return createJsonResponse({
			success: true,
			filename,
			count: fileNotes.length,
			notes: fileNotes
		}, 200, corsHeaders);
		
	} catch (error) {
		logger.error('Get notes error', error);
		
		if (error instanceof ValidationError) {
			return createErrorResponse(error.message, 400, corsHeaders);
		}
		
		return createErrorResponse('Failed to retrieve notes', 500, corsHeaders);
	}
}
