/**
 * Environment and Configuration Types
 */

export interface Env {
	AI: any; // Cloudflare Workers AI binding
	pdf_tutor_storage: R2Bucket;
}

export interface ExecutionContext {
	waitUntil(promise: Promise<any>): void;
	passThroughOnException(): void;
}
