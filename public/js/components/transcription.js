/**
 * Transcription Component
 * Handles transcription display and management
 */

import { getTranscript } from '../services/transcript.service.js';
import { escapeHtml } from '../shared/utils.js';
import * as dom from '../shared/dom.js';

// Component State
let transcriptionList = null;
let currentDocId = null;

/**
 * Initialize transcription component
 * @param {HTMLElement} listElement - Container element for transcriptions
 * @param {string} docId - Document ID
 */
export function initTranscription(listElement, docId) {
	transcriptionList = listElement;
	currentDocId = docId;
}

/**
 * Load and display transcription for a page
 * @param {number} pageNumber - Page number to load
 */
export async function loadTranscription(pageNumber) {
	if (!transcriptionList || !currentDocId) {
		console.error('Transcription component not initialized');
		return;
	}
	
	try {
		console.log('Loading transcript from server...');
		dom.setHtml(transcriptionList, '<div class="loading-state">Loading transcription...</div>');
		
		const data = await getTranscript(currentDocId, pageNumber);
		const transcript = data.transcript || '';
		
		if (transcript) {
			renderTranscription(transcript);
		} else {
			dom.setHtml(transcriptionList, `<div class="loading-state">No transcription available for page ${pageNumber}</div>`);
		}
	} catch (error) {
		console.error('Error loading transcription:', error);
		
		if (error.message.includes('404') || error.message.includes('not found')) {
			dom.setHtml(transcriptionList, '<div class="loading-state">⏳ Transcript is being processed. Please wait...</div>');
		} else {
			dom.setHtml(transcriptionList, '<div class="loading-state">❌ Failed to load transcription</div>');
		}
	}
}

/**
 * Render transcription text
 * @param {string} transcript - Transcript text to display
 */
function renderTranscription(transcript) {
	if (!transcript || !transcriptionList) {
		dom.setHtml(transcriptionList, '<div class="loading-state">No transcription available</div>');
		return;
	}
	
	const transcriptionHtml = `
		<div class="transcription-item">
			<div class="transcription-text">${escapeHtml(transcript)}</div>
		</div>
	`;
	
	dom.setHtml(transcriptionList, transcriptionHtml);
}

/**
 * Clear transcription display
 */
export function clearTranscription() {
	if (transcriptionList) {
		dom.setHtml(transcriptionList, '<div class="loading-state">Select a page to view transcription</div>');
	}
}

/**
 * Show loading state
 */
export function showTranscriptionLoading() {
	if (transcriptionList) {
		dom.setHtml(transcriptionList, '<div class="loading-state">Loading transcription...</div>');
	}
}

/**
 * Show error state
 * @param {string} message - Error message
 */
export function showTranscriptionError(message = 'Failed to load transcription') {
	if (transcriptionList) {
		dom.setHtml(transcriptionList, `<div class="loading-state">❌ ${escapeHtml(message)}</div>`);
	}
}
