/**
 * Cloudflare AI Search (AutoRAG) Types
 */

/**
 * AI Search document to be indexed
 */
export interface AISearchDocument {
	id: string;
	text: string;
	metadata?: Record<string, any>;
}

/**
 * AI Search index options
 */
export interface AISearchIndexOptions {
	documents: AISearchDocument[];
}

/**
 * AI Search query result
 */
export interface AISearchResult {
	id: string;
	text: string;
	score: number;
	metadata?: Record<string, any>;
}

/**
 * AI Search query options
 */
export interface AISearchQueryOptions {
	query: string;
	topK?: number;
	returnText?: boolean;
	returnMetadata?: boolean;
}

/**
 * AI Search response
 */
export interface AISearchResponse {
	results: AISearchResult[];
	count: number;
}

/**
 * AI Search delete options
 */
export interface AISearchDeleteOptions {
	ids: string[];
}
