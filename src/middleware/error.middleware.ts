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
export function handleError(error: any): Response {
	logger.error('Request error', error);
	
	// Handle known error types
	if (error instanceof ValidationError) {
		return createErrorResponse(error.message, 400);
	}
	
	if (error instanceof NotFoundError) {
		return createErrorResponse(error.message, 404);
	}
	
	if (error instanceof UnauthorizedError) {
		return createErrorResponse(error.message, 401);
	}
	
	// Default to server error
	return createServerErrorResponse(
		'An unexpected error occurred. Please try again later.'
	);
}

/**
 * Custom application error
 */
export class AppError extends Error {
	constructor(
		message: string,
		public statusCode: number = 500,
		public details?: string,
	) {
		super(message);
		this.name = "AppError";
	}
}

/**
 * Custom error classes
 */
export class ValidationError extends Error {
	constructor(
		message: string

	) {
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
