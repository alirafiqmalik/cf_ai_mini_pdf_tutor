/**
 * Score Service
 * Handles score-related API calls
 */

import api from '../shared/api.js';

/**
 * Get score for a PDF
 * @param {string} docId - Document ID
 * @returns {Promise<Object>} Score data
 */
export async function getScore(docId) {
	return api.get(`/get-score?doc=${encodeURIComponent(docId)}`);
}

/**
 * Save score for a PDF
 * @param {string} docId - Document ID
 * @param {number} score - Score value
 * @returns {Promise<Object>} Save result
 */
export async function saveScore(docId, score) {
	return api.post('/save-score', {
		doc: docId,
		score
	});
}
