/**
 * CORS Middleware
 * Handles Cross-Origin Resource Sharing
 */

import { CONFIG } from '../config/constants';

/**
 * Get CORS headers
 */
export function getCorsHeaders(): Record<string, string> {
	return {
		'Access-Control-Allow-Origin': CONFIG.ALLOWED_ORIGINS[0],
		'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
		'Access-Control-Allow-Headers': 'Content-Type',
		'Access-Control-Max-Age': '86400',
	};
}

/**
 * Handle CORS preflight requests
 */
export function handleCorsPreFlight(): Response {
	return new Response(null, {
		status: 204,
		headers: getCorsHeaders()
	});
}

/**
 * Check if request is a CORS preflight
 */
export function isCorsPreFlight(request: Request): boolean {
	return request.method === 'OPTIONS';
}
