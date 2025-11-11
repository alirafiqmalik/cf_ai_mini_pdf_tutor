/**
 * Storage-related Types
 */

/**
 * R2 storage key prefixes
 */
export interface StorageKeys {
	PDF_PREFIX: string;
	METADATA_PREFIX: string;
	LLM_TRANSCRIPT_PREFIX: string;
	LLM_MCQ_PREFIX: string;
}

/**
 * Transcript data structure stored in R2
 */
export type TranscriptData = Record<number, string>;

/**
 * MCQ data structure stored in R2
 */
export type McqData = Record<string, any[]>;
