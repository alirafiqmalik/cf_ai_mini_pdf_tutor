/**
 * Validation Service
 * Handles input validation and sanitization
 */

import { CONFIG } from '../config/constants';
import { createLogger } from '../utils/logger.utils';

const logger = createLogger('ValidationService');

/**
 * Validation result
 */
export interface ValidationResult {
	valid: boolean;
	error?: string;
}

/**
 * Validate PDF file
 */
export function validatePdfFile(file: File): ValidationResult {
	// Check file type
	if (file.type !== CONFIG.ALLOWED_FILE_TYPE) {
		return {
			valid: false,
			error: 'Invalid file type. Only PDF files are allowed.'
		};
	}
	
	// Check file size
	if (file.size > CONFIG.MAX_FILE_SIZE) {
		return {
			valid: false,
			error: `File size exceeds maximum allowed size of ${CONFIG.MAX_FILE_SIZE / 1024 / 1024}MB.`
		};
	}
	
	// Check if file is empty
	if (file.size === 0) {
		return {
			valid: false,
			error: 'File is empty.'
		};
	}
	
	return { valid: true };
}

/**
 * Validate note content
 */
export function validateNote(note: string): ValidationResult {
	if (!note || note.trim().length === 0) {
		return {
			valid: false,
			error: 'Note cannot be empty.'
		};
	}
	
	if (note.length > CONFIG.MAX_NOTE_LENGTH) {
		return {
			valid: false,
			error: `Note exceeds maximum length of ${CONFIG.MAX_NOTE_LENGTH} characters.`
		};
	}
	
	return { valid: true };
}

/**
 * Validate page number
 */
export function validatePageNumber(page: number, maxPages?: number): ValidationResult {
	if (!Number.isInteger(page) || page < 1) {
		return {
			valid: false,
			error: 'Invalid page number. Must be a positive integer.'
		};
	}
	
	if (maxPages && page > maxPages) {
		return {
			valid: false,
			error: `Page number exceeds maximum pages (${maxPages}).`
		};
	}
	
	return { valid: true };
}

/**
 * Validate filename
 */
export function validateFilename(filename: string): ValidationResult {
	if (!filename || filename.trim().length === 0) {
		return {
			valid: false,
			error: 'Filename cannot be empty.'
		};
	}
	
	// Security check: prevent directory traversal
	if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
		return {
			valid: false,
			error: 'Invalid filename. Contains illegal characters.'
		};
	}
	
	return { valid: true };
}

/**
 * Validate score
 */
export function validateScore(score: number): ValidationResult {
	if (typeof score !== 'number' || isNaN(score)) {
		return {
			valid: false,
			error: 'Score must be a valid number.'
		};
	}
	
	if (score < 0) {
		return {
			valid: false,
			error: 'Score cannot be negative.'
		};
	}
	
	return { valid: true };
}

/**
 * Sanitize string input
 */
export function sanitizeString(input: string): string {
	return input.trim().replace(/[<>]/g, '');
}
