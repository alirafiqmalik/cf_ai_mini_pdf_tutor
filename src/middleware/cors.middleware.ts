/**
 * CORS middleware
 */

/**
 * CORS headers configuration
 */
const CORS_HEADERS = {
	"Access-Control-Allow-Origin": "*",
	"Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
	"Access-Control-Allow-Headers": "Content-Type",
};



export function getCorsHeaders(): Record<string, string> {
	return CORS_HEADERS;
}



/**
 * Check if request is a CORS preflight
 */
export function isCorsPreFlight(request: Request): boolean {
	return request.method === 'OPTIONS';
}

/**
 * Handles CORS preflight requests
 */
export function handleCorsPreflightRequest(): Response {
	return new Response(null, {
		headers: CORS_HEADERS,
	});
}

/**
 * Adds CORS headers to a response
 */
export function addCorsHeaders(response: Response): Response {
	const newResponse = new Response(response.body, response);
	Object.entries(CORS_HEADERS).forEach(([key, value]) => {
		newResponse.headers.set(key, value);
	});
	return newResponse;
}

// function addCorsHeaders(response: Response, corsHeaders: Record<string, string>): Response {
// 	const headers = new Headers(response.headers);
// 	Object.entries(corsHeaders).forEach(([key, value]) => {
// 		headers.set(key, value);
// 	});
// 	return new Response(response.body, {
// 		status: response.status,
// 		statusText: response.statusText,
// 		headers,
// 	});
// }