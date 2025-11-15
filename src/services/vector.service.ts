/**
 * Vector Service (DEPRECATED)
 * 
 * ⚠️ This service is deprecated and replaced by ai-search.service.ts
 * Using Cloudflare AI Search (AutoRAG) instead of manual Vectorize + D1.
 * 
 * This file is kept for reference only.
 * 
 * Handles Vectorize index operations and D1 database operations for RAG
 */

import { ChunkedDocument, VectorMetadata, VectorQueryResult, RAGQueryOptions, Env } from '../types';

// Deprecated RAG configuration
const RAG_CONFIG = {
	TOP_K_RESULTS: 3,
};
import { createLogger } from '../utils/logger.utils';

const logger = createLogger('VectorService');

/**
 * Initialize D1 database tables
 */
export async function initializeDatabase(env: Env): Promise<void> {
	try {
		await env.DB.prepare(`
			CREATE TABLE IF NOT EXISTS documents (
				id TEXT PRIMARY KEY,
				fullText TEXT NOT NULL,
				pageTexts TEXT NOT NULL,
				createdAt TEXT NOT NULL,
				updatedAt TEXT NOT NULL
			)
		`).run();
		
		logger.info('Database initialized successfully');
	} catch (error) {
		logger.error('Error initializing database', error);
		throw error;
	}
}

/**
 * Store document in D1 database
 */
export async function storeDocument(
	chunkedDoc: ChunkedDocument,
	env: Env
): Promise<void> {
	try {
		const now = new Date().toISOString();
		
		await env.DB.prepare(`
			INSERT OR REPLACE INTO documents (id, fullText, pageTexts, createdAt, updatedAt)
			VALUES (?, ?, ?, ?, ?)
		`).bind(
			chunkedDoc.filename,
			chunkedDoc.fullText,
			JSON.stringify(chunkedDoc.pageChunks),
			now,
			now
		).run();
		
		logger.info(`Stored document in D1: ${chunkedDoc.filename}`);
	} catch (error) {
		logger.error(`Error storing document in D1: ${chunkedDoc.filename}`, error);
		throw error;
	}
}

/**
 * Get document from D1 database
 */
export async function getDocument(
	filename: string,
	env: Env
): Promise<ChunkedDocument | null> {
	try {
		const result = await env.DB.prepare(`
			SELECT * FROM documents WHERE id = ?
		`).bind(filename).first<any>();
		
		if (!result) {
			return null;
		}
		
		const pageChunks = JSON.parse(result.pageTexts);
		
		return {
			filename: result.id,
			fullText: result.fullText,
			pageChunks,
			totalPages: Object.keys(pageChunks).length,
			totalChunks: Object.values(pageChunks).reduce((sum: number, chunks: any) => sum + chunks.length, 0)
		};
	} catch (error) {
		logger.error(`Error getting document from D1: ${filename}`, error);
		return null;
	}
}

/**
 * Delete document from D1 database
 */
export async function deleteDocument(
	filename: string,
	env: Env
): Promise<void> {
	try {
		await env.DB.prepare(`
			DELETE FROM documents WHERE id = ?
		`).bind(filename).run();
		
		logger.info(`Deleted document from D1: ${filename}`);
	} catch (error) {
		logger.error(`Error deleting document from D1: ${filename}`, error);
		throw error;
	}
}

/**
 * Upsert full text vector into Vectorize index
 */
export async function upsertFullTextVector(
	filename: string,
	embedding: number[],
	env: Env
): Promise<void> {
	try {
		const metadata: VectorMetadata = {
			filename,
			type: 'full',
			timestamp: Date.now()
		};
		
		await env.VECTOR_INDEX.upsert([
			{
				id: `${filename}:full`,
				values: embedding,
				metadata
			}
		]);
		
		logger.info(`Upserted full text vector for: ${filename}`);
	} catch (error) {
		logger.error(`Error upserting full text vector: ${filename}`, error);
		throw error;
	}
}

/**
 * Upsert page vectors into Vectorize index
 */
export async function upsertPageVectors(
	filename: string,
	pageEmbeddings: Record<number, number[]>,
	env: Env
): Promise<void> {
	try {
		const vectors = Object.entries(pageEmbeddings).map(([pageNumStr, embedding]) => {
			const pageNumber = parseInt(pageNumStr);
			const metadata: VectorMetadata = {
				filename,
				pageNumber,
				type: 'page',
				timestamp: Date.now()
			};
			
			return {
				id: `${filename}:page:${pageNumber}`,
				values: embedding,
				metadata
			};
		});
		
		// Upsert in batches if needed (Vectorize has limits)
		const batchSize = 100;
		for (let i = 0; i < vectors.length; i += batchSize) {
			const batch = vectors.slice(i, i + batchSize);
			await env.VECTOR_INDEX.upsert(batch);
		}
		
		logger.info(`Upserted ${vectors.length} page vectors for: ${filename}`);
	} catch (error) {
		logger.error(`Error upserting page vectors: ${filename}`, error);
		throw error;
	}
}

/**
 * Query full text vector from Vectorize
 */
export async function queryFullTextVector(
	filename: string,
	queryEmbedding: number[],
	env: Env,
	options: RAGQueryOptions = {}
): Promise<VectorQueryResult[]> {
	try {
		const topK = options.topK || RAG_CONFIG.TOP_K_RESULTS;
		
		const results = await env.VECTOR_INDEX.query(queryEmbedding, {
			topK,
			filter: {
				filename,
				type: 'full'
			}
		});
		
		const mappedResults: VectorQueryResult[] = results.matches.map((match: any) => ({
			id: match.id,
			score: match.score,
			metadata: match.metadata as VectorMetadata,
			vector: match.values
		}));
		
		logger.info(`Queried full text vector for ${filename}: ${mappedResults.length} results`);
		return mappedResults;
	} catch (error) {
		logger.error(`Error querying full text vector: ${filename}`, error);
		return [];
	}
}

/**
 * Query page text vector from Vectorize
 */
export async function queryPageTextVector(
	filename: string,
	pageNumber: number,
	queryEmbedding: number[],
	env: Env,
	options: RAGQueryOptions = {}
): Promise<VectorQueryResult[]> {
	try {
		const topK = options.topK || RAG_CONFIG.TOP_K_RESULTS;
		
		const results = await env.VECTOR_INDEX.query(queryEmbedding, {
			topK,
			filter: {
				filename,
				pageNumber,
				type: 'page'
			}
		});
		
		const mappedResults: VectorQueryResult[] = results.matches.map((match: any) => ({
			id: match.id,
			score: match.score,
			metadata: match.metadata as VectorMetadata,
			vector: match.values
		}));
		
		logger.info(`Queried page ${pageNumber} vector for ${filename}: ${mappedResults.length} results`);
		return mappedResults;
	} catch (error) {
		logger.error(`Error querying page vector: ${filename}, page ${pageNumber}`, error);
		return [];
	}
}

/**
 * Query all page vectors for a document
 */
export async function queryAllPageVectors(
	filename: string,
	queryEmbedding: number[],
	env: Env,
	options: RAGQueryOptions = {}
): Promise<VectorQueryResult[]> {
	try {
		const topK = options.topK || RAG_CONFIG.TOP_K_RESULTS;
		
		const results = await env.VECTOR_INDEX.query(queryEmbedding, {
			topK,
			filter: {
				filename,
				type: 'page'
			}
		});
		
		const mappedResults: VectorQueryResult[] = results.matches.map((match: any) => ({
			id: match.id,
			score: match.score,
			metadata: match.metadata as VectorMetadata,
			vector: match.values
		}));
		
		logger.info(`Queried all page vectors for ${filename}: ${mappedResults.length} results`);
		return mappedResults;
	} catch (error) {
		logger.error(`Error querying all page vectors: ${filename}`, error);
		return [];
	}
}

/**
 * Delete all vectors for a document from Vectorize
 */
export async function deleteDocumentVectors(
	filename: string,
	env: Env
): Promise<void> {
	try {
		// Delete full text vector
		await env.VECTOR_INDEX.deleteByIds([`${filename}:full`]);
		
		// Note: Vectorize doesn't have a direct way to delete by filter
		// We need to know the page numbers to delete specific vectors
		// For now, we'll try to delete common page numbers (1-100)
		const idsToDelete: string[] = [];
		for (let i = 1; i <= 100; i++) {
			idsToDelete.push(`${filename}:page:${i}`);
		}
		
		if (idsToDelete.length > 0) {
			await env.VECTOR_INDEX.deleteByIds(idsToDelete);
		}
		
		logger.info(`Deleted vectors for: ${filename}`);
	} catch (error) {
		logger.error(`Error deleting vectors: ${filename}`, error);
		// Don't throw - deletion might partially succeed
	}
}
