/**
 * Storage Utility Functions
 * Helpers for R2 storage key generation and operations
 */

import { R2_KEYS } from '../config/constants';

/**
 * Build R2 key for PDF storage
 */
export function buildPdfKey(filename: string): string {
	return `${R2_KEYS.PDF_PREFIX}${filename}`;
}

/**
 * Build R2 key for metadata storage
 */
export function buildMetadataKey(filename: string): string {
	return `${R2_KEYS.METADATA_PREFIX}${filename}.json`;
}

/**
 * Build R2 key for LLM transcript storage
 */
export function buildTranscriptKey(filename: string): string {
	return `${R2_KEYS.LLM_TRANSCRIPT_PREFIX}${filename}.json`;
}

/**
 * Build R2 key for LLM MCQ storage
 */
export function buildMcqKey(filename: string): string {
	return `${R2_KEYS.LLM_MCQ_PREFIX}${filename}.json`;
}

/**
 * Extract filename from R2 key
 */
export function extractFilenameFromKey(key: string, prefix: string): string {
	return key.replace(prefix, '').replace('.json', '');
}

/**
 * Validate filename for security
 * Prevents directory traversal attacks
 */
export function validateFilename(filename: string): boolean {
	if (!filename) return false;
	if (filename.includes('..')) return false;
	if (filename.includes('/')) return false;
	if (filename.includes('\\')) return false;
	return true;
}
