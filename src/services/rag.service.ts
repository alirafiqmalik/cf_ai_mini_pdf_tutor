/**
 * RAG Service
 * Handles text chunking, embedding generation, and RAG operations
 */

import { Env, TextChunk, ChunkedDocument, EmbeddingResult, AugmentedPromptData } from '../types';
import { RAG_CONFIG, LLM_CONFIG } from '../config/constants';
import { createLogger } from '../utils/logger.utils';

const logger = createLogger('RAGService');

/**
 * Split text into overlapping chunks
 */
export function chunkText(text: string, pageNumber: number): string[] {
	const chunks: string[] = [];
	const { CHUNK_SIZE, CHUNK_OVERLAP } = RAG_CONFIG;
	
	// Handle empty or short text
	if (!text || text.length <= CHUNK_SIZE) {
		return [text];
	}
	
	let startIndex = 0;
	let chunkIndex = 0;
	
	while (startIndex < text.length) {
		const endIndex = Math.min(startIndex + CHUNK_SIZE, text.length);
		const chunk = text.substring(startIndex, endIndex).trim();
		
		if (chunk.length > 0) {
			chunks.push(chunk);
			chunkIndex++;
		}
		
		// Move forward by (CHUNK_SIZE - CHUNK_OVERLAP) to create overlap
		startIndex += CHUNK_SIZE - CHUNK_OVERLAP;
		
		// Prevent infinite loop
		if (startIndex >= text.length) break;
	}
	
	logger.info(`Created ${chunks.length} chunks for page ${pageNumber}`);
	return chunks;
}

/**
 * Process full PDF text into chunked document
 */
export function processDocument(
	filename: string,
	pages: string[]
): ChunkedDocument {
	const fullText = pages.join('\n\n');
	const pageChunks: Record<number, string[]> = {};
	let totalChunks = 0;
	
	// Chunk each page separately
	pages.forEach((pageText, index) => {
		const pageNum = index + 1;
		const chunks = chunkText(pageText, pageNum);
		pageChunks[pageNum] = chunks;
		totalChunks += chunks.length;
	});
	
	logger.info(`Processed document ${filename}: ${pages.length} pages, ${totalChunks} chunks`);
	
	return {
		filename,
		fullText,
		pageChunks,
		totalPages: pages.length,
		totalChunks
	};
}

/**
 * Generate embedding for a single text using Cloudflare AI with retry logic
 */
export async function generateEmbedding(
	text: string,
	env: Env,
	retryCount: number = 0
): Promise<EmbeddingResult> {
	const MAX_RETRIES = 1;
	const RETRY_DELAY = 1000; // 1 second
	
	try {
		// Truncate text if too long (embedding models have limits)
		// const truncatedText = text.substring(0, 1024).trim();
		
		// if (!truncatedText || truncatedText.length < 10) {
		// 	throw new Error('Text too short or empty for embedding generation');
		// }
		

		logger.info(`text output here \n ${text} \n `);

		logger.info(`Generating embedding for text of length ${text.length}`);
		
		// Cloudflare AI embedding models expect text as a string or array
		const response = await env.AI.run(
			LLM_CONFIG.EMBEDDING_MODEL_ID,
			{
				text: text  // Pass as string instead of array
			}
		);
		
		logger.info('Received embedding response');
		
		// Extract embedding from response
		let embedding: number[];
		
		if (response && typeof response === 'object') {
			// Handle different response formats from Cloudflare AI
			if ('data' in response && Array.isArray(response.data)) {
				// Response format: { data: [[...embeddings...]] }
				if (Array.isArray(response.data[0])) {
					embedding = response.data[0];
				} else {
					// Response format: { data: [...embeddings...] }
					embedding = response.data;
				}
			} else if ('embedding' in response) {
				embedding = (response as any).embedding;
			} else if (Array.isArray(response)) {
				// Direct array response
				embedding = response;
			} else {
				logger.error('Unexpected embedding response format:', response);
				throw new Error(`Unexpected embedding response format: ${JSON.stringify(response)}`);
			}
		} else {
			throw new Error('Invalid embedding response');
		}
		
		if (!embedding || !Array.isArray(embedding) || embedding.length === 0) {
			throw new Error('Embedding is empty or invalid');
		}
		
		logger.info(`Generated embedding with ${embedding.length} dimensions`);
		return {
			embedding,
			dimensions: embedding.length
		};
	} catch (error: any) {
		logger.error(`Error generating embedding (attempt ${retryCount + 1}/${MAX_RETRIES + 1})`, error);
		
		// Check if it's a retryable error (upstream or internal errors)
		const isRetryable = error.name === 'InferenceUpstreamError' || 
		                    error.message?.includes('internal error') ||
		                    error.message?.includes('upstream');
		
		if (isRetryable && retryCount < MAX_RETRIES) {
			logger.info(`Retrying embedding generation after ${RETRY_DELAY}ms delay...`);
			await new Promise(resolve => setTimeout(resolve, RETRY_DELAY * (retryCount + 1)));
			return generateEmbedding(text, env, retryCount + 1);
		}
		
		throw error;
	}
}

/**
 * Generate embeddings for all page chunks
 */
export async function generatePageEmbeddings(
	pageChunks: Record<number, string[]>,
	env: Env
): Promise<Record<number, number[]>> {
	const pageEmbeddings: Record<number, number[]> = {};
	const DELAY_BETWEEN_REQUESTS = 500; // 500ms delay between requests
	
	for (const [pageNumStr, chunks] of Object.entries(pageChunks)) {
		const pageNum = parseInt(pageNumStr);
		
		// Combine all chunks for the page (limit total length)
		const pageText = chunks.join(' ').substring(0, 1024);
		
		try {
			const result = await generateEmbedding(pageText, env);
			pageEmbeddings[pageNum] = result.embedding;
			logger.info(`Generated embedding for page ${pageNum}`);
			
			// Add delay between requests to avoid rate limiting
			await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_REQUESTS));
		} catch (error) {
			logger.error(`Failed to generate embedding for page ${pageNum}`, error);
			// Continue with other pages even if one fails
		}
	}
	
	return pageEmbeddings;
}

/**
 * Generate embedding for full document text
 */
export async function generateFullTextEmbedding(
	fullText: string,
	env: Env
): Promise<number[]> {
	try {
		// For very long documents, take a representative sample
		// Keep it short to avoid API errors (max 2048 chars enforced in generateEmbedding)
		let textToEmbed = fullText;
		if (fullText.length > 2000) {
			// Take first 1000, middle 500, and last 500 characters
			const start = fullText.substring(0, 1000);
			const middle = fullText.substring(
				Math.floor(fullText.length / 2) - 250,
				Math.floor(fullText.length / 2) + 250
			);
			const end = fullText.substring(fullText.length - 500);
			textToEmbed = `${start}...${middle}...${end}`;
		}
		
		const result = await generateEmbedding(textToEmbed, env);
		logger.info('Generated full text embedding');
		return result.embedding;
	} catch (error) {
		logger.error('Error generating full text embedding', error);
		throw error;
	}
}

/**
 * Create augmented prompt with relevant context
 */
export function createAugmentedPrompt(
	originalPrompt: string,
	relevantTexts: Array<{ text: string; pageNumber?: number; score: number }>
): AugmentedPromptData {
	// Combine relevant texts up to max context length
	let relevantText = '';
	const sources: Array<{ pageNumber?: number; score: number }> = [];
	
	for (const item of relevantTexts) {
		if (relevantText.length + item.text.length > RAG_CONFIG.MAX_CONTEXT_LENGTH) {
			break;
		}
		relevantText += item.text + '\n\n';
		sources.push({
			pageNumber: item.pageNumber,
			score: item.score
		});
	}
	
	// Create augmented prompt
	const augmentedPrompt = `Context information from the document:
${relevantText.trim()}

Based on the context above, ${originalPrompt}`;
	
	return {
		originalPrompt,
		relevantText: relevantText.trim(),
		augmentedPrompt,
		sources
	};
}
