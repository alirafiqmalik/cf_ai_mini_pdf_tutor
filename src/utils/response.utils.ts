/**
 * Response Utility Functions
 * Standardized response builders for consistent API responses
 */

import { ApiResponse } from '../types';

/**
 * Create a standardized JSON response
 */
export function createJsonResponse<T = any>(
	data: T,
	status: number = 200,
	corsHeaders: Record<string, string> = {}
): Response {
	return new Response(JSON.stringify(data), {
		status,
		headers: {
			...corsHeaders,
			'Content-Type': 'application/json',
		}
	});
}

/**
 * Create a success response
 */
export function createSuccessResponse<T = any>(
	data: T,
	corsHeaders: Record<string, string> = {}
): Response {
	const response: ApiResponse<T> = {
		success: true,
		data
	};
	return createJsonResponse(response, 200, corsHeaders);
}

/**
 * Create an error response
 */
export function createErrorResponse(
	error: string,
	status: number = 400,
	corsHeaders: Record<string, string> = {}
): Response {
	const response: ApiResponse = {
		success: false,
		error
	};
	return createJsonResponse(response, status, corsHeaders);
}

/**
 * Create a not found response
 */
export function createNotFoundResponse(
	message: string = 'Resource not found',
	corsHeaders: Record<string, string> = {}
): Response {
	return createErrorResponse(message, 404, corsHeaders);
}

/**
 * Create a server error response
 */
export function createServerErrorResponse(
	message: string = 'Internal server error',
	corsHeaders: Record<string, string> = {}
): Response {
	return createErrorResponse(message, 500, corsHeaders);
}
