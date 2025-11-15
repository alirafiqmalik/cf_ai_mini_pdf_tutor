/**
 * Cloudflare Workers Type Definitions
 */

// R2 Bucket type
declare global {
	interface R2Bucket {
		get(key: string): Promise<R2Object | null>;
		put(key: string, value: ArrayBuffer | string): Promise<void>;
		delete(key: string): Promise<void>;
		list(options?: { prefix?: string }): Promise<{ objects: R2Object[] }>;
	}

	interface R2Object {
		key: string;
		arrayBuffer(): Promise<ArrayBuffer>;
		text(): Promise<string>;
	}

	// D1 Database type
	interface D1Database {
		prepare(query: string): D1PreparedStatement;
		dump(): Promise<ArrayBuffer>;
		batch<T = unknown>(statements: D1PreparedStatement[]): Promise<D1Result<T>[]>;
		exec(query: string): Promise<D1ExecResult>;
	}

	interface D1PreparedStatement {
		bind(...values: any[]): D1PreparedStatement;
		first<T = unknown>(colName?: string): Promise<T | null>;
		run<T = unknown>(): Promise<D1Result<T>>;
		all<T = unknown>(): Promise<D1Result<T>>;
		raw<T = unknown>(): Promise<T[]>;
	}

	interface D1Result<T = unknown> {
		results?: T[];
		success: boolean;
		error?: string;
		meta: {
			duration: number;
			size_after: number;
			rows_read: number;
			rows_written: number;
		};
	}

	interface D1ExecResult {
		count: number;
		duration: number;
	}

	// Vectorize Index type
	interface VectorizeIndex {
		upsert(vectors: VectorizeVector[]): Promise<VectorizeUpsertResponse>;
		query(vector: number[], options?: VectorizeQueryOptions): Promise<VectorizeQueryResult>;
		deleteByIds(ids: string[]): Promise<VectorizeDeleteResponse>;
		getByIds(ids: string[]): Promise<VectorizeVector[]>;
		describe(): Promise<VectorizeIndexInfo>;
	}

	interface VectorizeVector {
		id: string;
		values: number[];
		metadata?: Record<string, any>;
	}

	interface VectorizeQueryOptions {
		topK?: number;
		filter?: Record<string, any>;
		returnValues?: boolean;
		returnMetadata?: boolean;
	}

	interface VectorizeQueryResult {
		matches: Array<{
			id: string;
			score: number;
			values?: number[];
			metadata?: Record<string, any>;
		}>;
		count: number;
	}

	interface VectorizeUpsertResponse {
		count: number;
		ids: string[];
	}

	interface VectorizeDeleteResponse {
		count: number;
		ids: string[];
	}

	interface VectorizeIndexInfo {
		name: string;
		description?: string;
		dimensions: number;
		metric: 'cosine' | 'euclidean' | 'dot-product';
		count: number;
	}
}

export {};
