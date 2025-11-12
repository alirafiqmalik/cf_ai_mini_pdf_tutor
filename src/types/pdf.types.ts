/**
 * PDF-related Types
 */

/**
 * Result of PDF text extraction
 */
export interface PdfExtractionResult {
    numPages: number;
    pages?: string[]; // Add optional pages array
}

/**
 * MCQ Question structure
 */
export interface McqQuestion {
	id?: number;
	page?: number;
	question: string;
	options: string[];
	correct: number;
	explanation?: string;
}

/**
 * Uploaded file metadata
 */
export interface UploadedFile {
	filename: string;
	timestamp: number;
	size: number;
	originalName: string;
}

/**
 * User note on a PDF page
 */
export interface Note {
	filename: string;
	page: number;
	note: string;
	timestamp: number;
}
