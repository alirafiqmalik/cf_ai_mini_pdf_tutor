/**
 * Environment and Configuration Types
 */

/// <reference path="./cloudflare.d.ts" />

export interface Env {
	AI: any; // Cloudflare Workers AI binding
	pdf_tutor_storage: R2Bucket;
	DB: D1Database; // D1 Database binding for document storage
	VECTOR_INDEX: VectorizeIndex; // Vectorize index binding
}

export interface ExecutionContext {
	waitUntil(promise: Promise<any>): void;
	passThroughOnException(): void;
}
