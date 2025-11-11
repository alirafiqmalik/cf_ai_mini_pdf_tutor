/**
 * PDF Service
 * Handles all PDF-related API calls
 */

import api from '../shared/api.js';

/**
 * Upload a PDF file
 * @param {File} file - PDF file to upload
 * @param {Function} onProgress - Progress callback
 * @returns {Promise<Object>} Upload result
 */
export async function uploadPdf(file, onProgress) {
	const formData = new FormData();
	formData.append('pdf', file);
	return api.uploadWithProgress('/upload-pdf', formData, onProgress);
}

/**
 * Get PDF URL
 * @param {string} filename - PDF filename
 * @returns {string} PDF URL
 */
export function getPdfUrl(filename) {
	return `/get-pdf/${encodeURIComponent(filename)}`;
}

/**
 * List all PDFs
 * @returns {Promise<Object>} List of PDFs
 */
export async function listPdfs() {
	return api.get('/list-pdfs');
}

/**
 * Delete a PDF
 * @param {string} filename - PDF filename
 * @returns {Promise<Object>} Delete result
 */
export async function deletePdf(filename) {
	return api.delete(`/delete-pdf/${encodeURIComponent(filename)}`);
}
