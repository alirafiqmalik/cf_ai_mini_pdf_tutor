/**
 * Error Middleware
 * Centralized error handling
 */

import { createLogger } from '../utils/logger.utils';
import { createErrorResponse, createServerErrorResponse } from '../utils/response.utils';

const logger = createLogger('ErrorMiddleware');

/**
 * Handle errors and return appropriate response
 */
export function handleError(
	error: any,
	corsHeaders: Record<string, string>
): Response {
	logger.error('Request error', error);
	
	// Handle known error types
	if (error instanceof ValidationError) {
		return createErrorResponse(error.message, 400, corsHeaders);
	}
	
	if (error instanceof NotFoundError) {
		return createErrorResponse(error.message, 404, corsHeaders);
	}
	
	if (error instanceof UnauthorizedError) {
		return createErrorResponse(error.message, 401, corsHeaders);
	}
	
	// Default to server error
	return createServerErrorResponse(
		'An unexpected error occurred. Please try again later.',
		corsHeaders
	);
}

/**
 * Custom error classes
 */
export class ValidationError extends Error {
	constructor(message: string) {
		super(message);
		this.name = 'ValidationError';
	}
}

export class NotFoundError extends Error {
	constructor(message: string) {
		super(message);
		this.name = 'NotFoundError';
	}
}

export class UnauthorizedError extends Error {
	constructor(message: string) {
		super(message);
		this.name = 'UnauthorizedError';
	}
}
