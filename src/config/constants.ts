/**
 * Application Configuration and Constants
 */

import { StorageKeys } from '../types';

/**
 * Application configuration
 */
export const CONFIG = {
	MAX_FILE_SIZE: 50 * 1024 * 1024, // 50MB
	ALLOWED_ORIGINS: ['*'], // Configure for production
	MAX_NOTE_LENGTH: 10000,
	RATE_LIMIT: 100, // requests per minute
	ALLOWED_FILE_TYPE: 'application/pdf',
} as const;

/**
 * LLM Configuration
 */
export const LLM_CONFIG = {
	MODEL_ID: '@cf/meta/llama-3.1-70b-instruct',
	EMBEDDING_MODEL_ID: '@cf/nomic-ai/nomic-embed-text-v1.5',
	SYSTEM_PROMPT: 'You are a helpful AI assistant.',
	MAX_TOKENS_TRANSCRIPT: 256,
	MAX_TOKENS_MCQ: 512,
	MAX_TOKENS_CHAT: 1024,
	MAX_INPUT_TEXT_LENGTH: 1000,
	MIN_TEXT_LENGTH: 20,
} as const;

/**
 * RAG Configuration
 */
export const RAG_CONFIG = {
	CHUNK_SIZE: 400, // Characters per chunk (keep smaller for embedding models)
	CHUNK_OVERLAP: 50, // Overlap between chunks
	EMBEDDING_DIMENSIONS: 768, // BGE base model dimensions
	TOP_K_RESULTS: 3, // Number of top results to retrieve
	SCORE_THRESHOLD: 0.5, // Minimum similarity score
	MAX_CONTEXT_LENGTH: 1500, // Max characters for augmented context
	MAX_EMBEDDING_TEXT_LENGTH: 2048, // Maximum text length for embeddings
} as const;

/**
 * R2 Storage key prefixes
 */
export const R2_KEYS: StorageKeys = {
	PDF_PREFIX: 'pdfs/',
	METADATA_PREFIX: 'metadata/',
	LLM_TRANSCRIPT_PREFIX: 'llm_transcripts/',
	LLM_MCQ_PREFIX: 'llm_mcqs/',
} as const;

/**
 * MCQ Configuration
 */
export const MCQ_CONFIG = {
	POINTS_PER_CORRECT: 10,
	DEFAULT_QUESTIONS_PER_PAGE: 2,
} as const;

/**
 * PDF Processing Configuration
 */
export const PDF_CONFIG = {
	DEFAULT_PAGE_NUMBER: 1,
	TEXT_ENCODING: 'utf-8',
} as const;
