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
	ASSETS: Fetcher;

	/**
	 * Binding for R2 storage bucket.
	 */
	pdf_tutor_storage: R2Bucket;
}

