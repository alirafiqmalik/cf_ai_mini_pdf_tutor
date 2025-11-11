/**
 * PDF Viewer Page - Refactored with Components
 * Main entry point that orchestrates all components
 */

import * as PdfViewer from './components/pdf-viewer.js';
import * as Navigation from './components/navigation.js';
import * as Transcription from './components/transcription.js';
import * as Notes from './components/notes.js';
import * as Mcq from './components/mcq.js';
import { DEFAULT_ZOOM, ZOOM_STEP, MIN_ZOOM, MAX_ZOOM } from './shared/constants.js';
import * as dom from './shared/dom.js';

// Global State
let currentDocId = null;

/**
 * Initialize the viewer application
 */
async function init() {
	// Get document ID from URL
	const urlParams = new URLSearchParams(window.location.search);
	currentDocId = urlParams.get('doc');
	
	if (!currentDocId) {
		showError('No document specified');
		return;
	}
	
	try {
		// Initialize all components
		await initializeComponents();
		
		// Set document title
		const documentTitle = dom.getElementById('documentTitle');
		dom.setText(documentTitle, currentDocId);
		
		// Setup global event listeners
		setupGlobalEventListeners();
		
		console.log('Viewer initialized successfully');
	} catch (error) {
		console.error('Initialization error:', error);
		showError('Failed to load document');
	}
}

/**
 * Initialize all components
 */
async function initializeComponents() {
	// Initialize PDF Viewer
	const pdfCanvas = dom.getElementById('pdfCanvas');
	const pdfInfo = await PdfViewer.initPdfViewer(pdfCanvas, currentDocId, handlePageChange);
	
	// Initialize Navigation
	Navigation.initNavigation(
		{
			prevPageBtn: dom.getElementById('prevPageBtn'),
			nextPageBtn: dom.getElementById('nextPageBtn'),
			pageInfo: dom.getElementById('pageInfo'),
			zoomInBtn: dom.getElementById('zoomInBtn'),
			zoomOutBtn: dom.getElementById('zoomOutBtn'),
			zoomInfo: dom.getElementById('zoomInfo')
		},
		{
			onPrevPage: handlePrevPage,
			onNextPage: handleNextPage,
			onZoomIn: handleZoomIn,
			onZoomOut: handleZoomOut,
			onGoToFirstPage: () => PdfViewer.goToPage(1),
			onGoToLastPage: () => PdfViewer.goToPage(pdfInfo.numPages)
		}
	);
	
	// Initialize Transcription
	Transcription.initTranscription(
		dom.getElementById('transcriptionList'),
		currentDocId
	);
	
	// Initialize Notes
	Notes.initNotes(
		{
			noteInput: dom.getElementById('noteInput'),
			saveNoteBtn: dom.getElementById('saveNoteBtn'),
			notesList: dom.getElementById('notesList')
		},
		currentDocId
	);
	
	// Initialize MCQ
	Mcq.initMcq(
		{
			questionsList: dom.getElementById('questionsList'),
			scoreValue: dom.getElementById('scoreValue')
		},
		currentDocId
	);
	
	// Update initial navigation state
	Navigation.updatePageInfo(pdfInfo.currentPage, pdfInfo.numPages);
	Navigation.updateZoomInfo(DEFAULT_ZOOM);
	
	// Load initial content
	await loadPageContent(1);
	await Notes.loadNotes();
	await Mcq.loadScore();
}

/**
 * Setup global event listeners
 */
function setupGlobalEventListeners() {
	// New PDF button
	const newPdfBtn = dom.getElementById('newPdfBtn');
	if (newPdfBtn) {
		newPdfBtn.addEventListener('click', () => {
			window.location.href = 'index.html';
		});
	}
	
	// Tab switching
	document.querySelectorAll('.tab-btn').forEach(btn => {
		btn.addEventListener('click', () => handleTabSwitch(btn.dataset.tab));
	});
}

/**
 * Handle page change callback from PDF viewer
 * @param {number} currentPage - Current page number
 * @param {number} totalPages - Total pages
 */
function handlePageChange(currentPage, totalPages) {
	Navigation.updatePageInfo(currentPage, totalPages);
	loadPageContent(currentPage);
}

/**
 * Load content for a specific page
 * @param {number} pageNumber - Page number
 */
async function loadPageContent(pageNumber) {
	// Update notes component with current page
	Notes.setCurrentPage(pageNumber);
	
	// Load transcription and questions in parallel
	await Promise.all([
		Transcription.loadTranscription(pageNumber),
		Mcq.loadQuestions(pageNumber)
	]);
}

/**
 * Handle previous page navigation
 */
async function handlePrevPage() {
	await PdfViewer.goToPreviousPage();
}

/**
 * Handle next page navigation
 */
async function handleNextPage() {
	await PdfViewer.goToNextPage();
}

/**
 * Handle zoom in
 */
async function handleZoomIn() {
	const newZoom = await PdfViewer.zoomIn(ZOOM_STEP, MAX_ZOOM);
	Navigation.updateZoomInfo(newZoom);
}

/**
 * Handle zoom out
 */
async function handleZoomOut() {
	const newZoom = await PdfViewer.zoomOut(ZOOM_STEP, MIN_ZOOM);
	Navigation.updateZoomInfo(newZoom);
}

/**
 * Handle tab switching
 * @param {string} tabName - Tab name to switch to
 */
function handleTabSwitch(tabName) {
	// Update tab buttons
	document.querySelectorAll('.tab-btn').forEach(btn => {
		btn.classList.toggle('active', btn.dataset.tab === tabName);
	});
	
	// Update panels
	document.querySelectorAll('.tab-panel').forEach(panel => {
		panel.classList.remove('active');
	});
	
	const panelId = `${tabName}Panel`;
	const panel = document.getElementById(panelId);
	if (panel) {
		panel.classList.add('active');
	}
}

/**
 * Show error message
 * @param {string} message - Error message
 */
function showError(message) {
	const documentTitle = dom.getElementById('documentTitle');
	const pdfContainer = dom.getElementById('pdfContainer');
	
	dom.setText(documentTitle, 'Error');
	dom.setHtml(pdfContainer, `
		<div class="empty-state">
			<svg class="empty-icon" xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
				<circle cx="12" cy="12" r="10"></circle>
				<line x1="12" y1="8" x2="12" y2="12"></line>
				<line x1="12" y1="16" x2="12.01" y2="16"></line>
			</svg>
			<p class="empty-message">${message}</p>
		</div>
	`);
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
	document.addEventListener('DOMContentLoaded', init);
} else {
	init();
}

// Export for testing
export { init };
