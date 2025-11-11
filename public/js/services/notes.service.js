/**
 * Notes Service
 * Handles notes-related API calls
 */

import api from '../shared/api.js';

/**
 * Save a note
 * @param {string} docId - Document ID
 * @param {number} page - Page number
 * @param {string} note - Note content
 * @returns {Promise<Object>} Save result
 */
export async function saveNote(docId, page, note) {
	return api.post('/save-note', {
		doc: docId,
		page,
		note
	});
}

/**
 * Get notes for a PDF
 * @param {string} docId - Document ID
 * @returns {Promise<Object>} Notes data
 */
export async function getNotes(docId) {
	return api.get(`/get-notes?doc=${encodeURIComponent(docId)}`);
}
