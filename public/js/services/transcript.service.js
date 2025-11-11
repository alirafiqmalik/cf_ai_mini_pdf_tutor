/**
 * Transcript Service
 * Handles transcript-related API calls
 */

import api from '../shared/api.js';

/**
 * Get transcript for a specific page
 * @param {string} docId - Document ID
 * @param {number} pageNumber - Page number
 * @returns {Promise<Object>} Transcript data
 */
export async function getTranscript(docId, pageNumber) {
	return api.get(`/get-transcript?doc=${encodeURIComponent(docId)}&page=${pageNumber}`);
}
