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
}

export {};
