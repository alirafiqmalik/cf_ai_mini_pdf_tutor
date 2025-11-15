/**
 * RAG (Retrieval Augmented Generation) Types
 */

/**
 * Text chunk with metadata
 */
export interface TextChunk {
	text: string;
	chunkIndex: number;
	pageNumber: number;
	startChar: number;
	endChar: number;
}

/**
 * Chunked document data
 */
export interface ChunkedDocument {
	filename: string;
	fullText: string;
	pageChunks: Record<number, string[]>; // { pageNumber: [chunks...] }
	totalPages: number;
	totalChunks: number;
}

/**
 * Vector embedding result
 */
export interface EmbeddingResult {
	embedding: number[];
	dimensions: number;
}

/**
 * Page embeddings
 */
export interface PageEmbeddings {
	pageNumber: number;
	embedding: number[];
}

/**
 * Document vectors for storage
 */
export interface DocumentVectors {
	id: string; // filename
	fullTextEmbedding: number[];
	pageEmbeddings: Record<number, number[]>; // { pageNumber: embedding }
}

/**
 * D1 Database schema for document storage
 */
export interface D1Document {
	id: string; // filename
	fullText: string;
	pageTexts: string; // JSON stringified Record<number, string[]>
	createdAt: string;
	updatedAt: string;
}

/**
 * Vectorize index metadata
 */
export interface VectorMetadata {
	filename: string;
	pageNumber?: number;
	type: 'full' | 'page';
	timestamp: number;
}

/**
 * Vector query result
 */
export interface VectorQueryResult {
	id: string;
	score: number;
	metadata: VectorMetadata;
	vector?: number[];
}

/**
 * RAG query options
 */
export interface RAGQueryOptions {
	topK?: number;
	scoreThreshold?: number;
	pageNumber?: number;
}

/**
 * Augmented prompt data
 */
export interface AugmentedPromptData {
	originalPrompt: string;
	relevantText: string;
	augmentedPrompt: string;
	sources: Array<{
		pageNumber?: number;
		score: number;
	}>;
}
