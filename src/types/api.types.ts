/**
 * API Request and Response Types
 */

import { McqQuestion, Note } from './pdf.types';

/**
 * Represents a chat message for LLM interactions
 */
export interface ChatMessage {
	role: "system" | "user" | "assistant";
	content: string;
}

/**
 * Upload API response
 */
export interface UploadResponse {
	success: boolean;
	filename: string;
	timestamp: number;
	size: number;
	message: string;
}

/**
 * Generic API response
 */
export interface ApiResponse<T = any> {
	success: boolean;
	data?: T;
	error?: string;
	message?: string;
}

/**
 * Transcript response
 */
export interface TranscriptResponse {
	success: boolean;
	filename: string;
	page: number;
	transcript: string;
	source: string;
}

/**
 * MCQ response
 */
export interface McqResponse {
	success: boolean;
	filename: string;
	page: number;
	count: number;
	questions: McqQuestion[];
	source: string;
}

/**
 * Notes response
 */
export interface NotesResponse {
	success: boolean;
	filename: string;
	count: number;
	notes: Note[];
}

/**
 * Score response
 */
export interface ScoreResponse {
	success: boolean;
	filename: string;
	score: number;
}
