/**
 * MCQ Service
 * Handles MCQ-related API calls
 */

import api from '../shared/api.js';

/**
 * Get MCQ questions for a specific page
 * @param {string} docId - Document ID
 * @param {number} pageNumber - Page number
 * @returns {Promise<Object>} MCQ data
 */
export async function getMcqs(docId, pageNumber) {
	return api.get(`/render-mcqs?doc=${encodeURIComponent(docId)}&page=${pageNumber}`);
}
