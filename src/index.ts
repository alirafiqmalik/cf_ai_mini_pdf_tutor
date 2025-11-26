/**
 * Main Application Entry Point
 * Cloudflare Workers PDF Tutor Application
 * 
 * This is the main entry point that handles all incoming requests
 * and routes them to appropriate controllers.
 */

import { Env } from './types'
import { findRoute } from './routes';
import { addCorsHeaders, getCorsHeaders, handleCorsPreflightRequest, isCorsPreFlight } from './middleware/cors.middleware';
import { handleError } from './middleware/error.middleware';
import { createNotFoundResponse } from './utils/response.utils';
import { createLogger } from './utils/logger.utils';

const logger = createLogger('MainApp');

/**
 * Main fetch handler
 * Entry point for all HTTP requests
 */
export default {
	async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
		const url = new URL(request.url);
		const corsHeaders = getCorsHeaders();

		// Handle CORS preflight requests
		if (isCorsPreFlight(request)) {
			return handleCorsPreflightRequest();
		}

		try {
			// Log incoming request
			logger.info(`${request.method} ${url.pathname}`);

			// Find matching route
			const route = findRoute(url.pathname, request.method);

			if (route) {
				// Execute route handler
				const response = await route.handler(request, env, ctx, corsHeaders);
				// Add CORS headers to response
				return addCorsHeaders(response);
			}

			// No route found
			logger.warn(`Route not found: ${request.method} ${url.pathname}`);
			const response = createNotFoundResponse('Route not found');
			return addCorsHeaders(response);

		} catch (error) {
			// Global error handler
			const response = handleError(error);
			return addCorsHeaders(response);
		}
	},
};
