/**
 * Main Application Entry Point
 * Cloudflare Workers PDF Tutor Application
 * 
 * This is the main entry point that handles all incoming requests
 * and routes them to appropriate controllers.
 */

import { Env, ExecutionContext } from './types';
import { findRoute } from './routes';
import { getCorsHeaders, handleCorsPreFlight, isCorsPreFlight } from './middleware/cors.middleware';
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
			return handleCorsPreFlight();
		}

		try {
			// Log incoming request
			logger.info(`${request.method} ${url.pathname}`);

			// Find matching route
			const route = findRoute(url.pathname, request.method);

			if (route) {
				// Execute route handler
				return await route.handler(request, env, ctx, corsHeaders);
			}

			// No route found
			logger.warn(`Route not found: ${request.method} ${url.pathname}`);
			return createNotFoundResponse('Route not found', corsHeaders);

		} catch (error) {
			// Global error handler
			return handleError(error, corsHeaders);
		}
	},
};
