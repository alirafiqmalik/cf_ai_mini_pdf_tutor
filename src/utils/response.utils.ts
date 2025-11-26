/**
 * Response Utility Functions
 * Standardized response builders for consistent API responses
 */

import { ApiResponse, ErrorResponse } from '../types';

/**
 * Create a standardized JSON response
 */
export function createJsonResponse<T = any>(
	data: T,
	status: number = 200
): Response {
	return new Response(JSON.stringify(data), {
		status,
		headers: { 'Content-Type': 'application/json' },
	});
}

/**
 * Create a success response
 */
export function createSuccessResponse<T = any>(
	data: T
): Response {
	const response: ApiResponse<T> = {
		success: true,
		data
	};
	return createJsonResponse(response, 200);
}

/**
 * Create an error response
 */
export function createErrorResponse(
	error: string,
	status: number = 500,
	details?: string
): Response {
	const body: ErrorResponse = { error, details };
	return createJsonResponse(body, status);
}

/**
 * Create a not found response
 */
export function createNotFoundResponse(
	message: string = 'Resource not found'
): Response {
	return createErrorResponse(message, 404);
}

/**
 * Create a server error response
 */
export function createServerErrorResponse(
	message: string = 'Internal server error'
): Response {
	return createErrorResponse(message, 500);
}

/**
 * Create a method not allowed response
 */
export function methodNotAllowed(): Response {
	return new Response('Method not allowed', { status: 405 });
}
