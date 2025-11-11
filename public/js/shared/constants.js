/**
 * Application Constants
 * Centralized configuration for the frontend application
 */

// API Configuration
export const API_BASE_URL = '';

// File Upload Configuration
export const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
export const ALLOWED_FILE_TYPE = 'application/pdf';

// PDF Viewer Configuration
export const ZOOM_STEP = 0.25;
export const MIN_ZOOM = 0.5;
export const MAX_ZOOM = 3.0;
export const DEFAULT_ZOOM = 1.5;

// MCQ Configuration
export const POINTS_PER_CORRECT = 10;

// UI Messages
export const MESSAGES = {
	UPLOAD_SUCCESS: 'PDF uploaded successfully!',
	UPLOAD_ERROR: 'Failed to upload PDF. Please try again.',
	FILE_SIZE_ERROR: 'File size exceeds maximum allowed size.',
	FILE_TYPE_ERROR: 'Please select a PDF file.',
	NETWORK_ERROR: 'Network error. Please check your connection.',
	NOTE_SAVE_SUCCESS: 'Note saved successfully!',
	NOTE_SAVE_ERROR: 'Failed to save note.',
	SCORE_SAVE_SUCCESS: 'Score saved successfully!',
	SCORE_SAVE_ERROR: 'Failed to save score.',
};

// HTTP Status Codes
export const HTTP_STATUS = {
	OK: 200,
	BAD_REQUEST: 400,
	NOT_FOUND: 404,
	SERVER_ERROR: 500,
};
