/**
 * API Client
 * Centralized API communication layer
 */

import { API_BASE_URL, HTTP_STATUS } from './constants.js';

/**
 * Base fetch wrapper with error handling
 * @param {string} url - API endpoint
 * @param {Object} options - Fetch options
 * @returns {Promise<any>} Response data
 */
async function apiFetch(url, options = {}) {
	try {
		const response = await fetch(`${API_BASE_URL}${url}`, {
			...options,
			headers: {
				'Content-Type': 'application/json',
				...options.headers,
			},
		});

		// Check if response is ok
		if (!response.ok) {
			const errorData = await response.json().catch(() => ({}));
			throw new Error(errorData.error || errorData.message || `HTTP ${response.status}`);
		}

		// Return JSON response
		return await response.json();
	} catch (error) {
		console.error('API Error:', error);
		throw error;
	}
}

/**
 * GET request
 * @param {string} url - API endpoint
 * @returns {Promise<any>} Response data
 */
export async function get(url) {
	return apiFetch(url, { method: 'GET' });
}

/**
 * POST request
 * @param {string} url - API endpoint
 * @param {Object} data - Request body
 * @returns {Promise<any>} Response data
 */
export async function post(url, data) {
	return apiFetch(url, {
		method: 'POST',
		body: JSON.stringify(data),
	});
}

/**
 * POST request with FormData
 * @param {string} url - API endpoint
 * @param {FormData} formData - Form data
 * @returns {Promise<any>} Response data
 */
export async function postFormData(url, formData) {
	try {
		const response = await fetch(`${API_BASE_URL}${url}`, {
			method: 'POST',
			body: formData,
			// Don't set Content-Type for FormData, browser will set it with boundary
		});

		if (!response.ok) {
			const errorData = await response.json().catch(() => ({}));
			throw new Error(errorData.error || errorData.message || `HTTP ${response.status}`);
		}

		return await response.json();
	} catch (error) {
		console.error('API Error:', error);
		throw error;
	}
}

/**
 * DELETE request
 * @param {string} url - API endpoint
 * @returns {Promise<any>} Response data
 */
export async function del(url) {
	return apiFetch(url, { method: 'DELETE' });
}

/**
 * Upload file with progress tracking
 * @param {string} url - API endpoint
 * @param {FormData} formData - Form data with file
 * @param {Function} onProgress - Progress callback
 * @returns {Promise<any>} Response data
 */
export function uploadWithProgress(url, formData, onProgress) {
	return new Promise((resolve, reject) => {
		const xhr = new XMLHttpRequest();

		// Upload progress
		xhr.upload.addEventListener('progress', (e) => {
			if (e.lengthComputable && onProgress) {
				const percentComplete = (e.loaded / e.total) * 100;
				onProgress(percentComplete);
			}
		});

		// Upload complete
		xhr.addEventListener('load', () => {
			if (xhr.status === HTTP_STATUS.OK) {
				try {
					const result = JSON.parse(xhr.responseText);
					resolve(result);
				} catch (error) {
					reject(new Error('Invalid server response'));
				}
			} else {
				try {
					const error = JSON.parse(xhr.responseText);
					reject(new Error(error.error || error.message || 'Upload failed'));
				} catch {
					reject(new Error(`Upload failed with status ${xhr.status}`));
				}
			}
		});

		// Upload error
		xhr.addEventListener('error', () => {
			reject(new Error('Network error. Please check your connection.'));
		});

		// Send request
		xhr.open('POST', `${API_BASE_URL}${url}`);
		xhr.send(formData);
	});
}

/**
 * API client object with all methods
 */
export const api = {
	get,
	post,
	postFormData,
	delete: del,
	uploadWithProgress,
};

export default api;
