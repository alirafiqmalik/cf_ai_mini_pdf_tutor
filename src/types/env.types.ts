/**
 * Environment and configuration types
 */

export interface Env {
	/**
	 * Binding for the Workers AI API.
	 */
	AI: Ai;

	/**
	 * Binding for static assets.
	 */
	// ASSETS: { fetch: (request: Request) => Promise<Response> };
}

