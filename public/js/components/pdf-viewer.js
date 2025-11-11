/**
 * PDF Viewer Component
 * Handles PDF rendering and display logic
 */

import { getPdfUrl } from '../services/pdf.service.js';
import { DEFAULT_ZOOM } from '../shared/constants.js';
import * as dom from '../shared/dom.js';

// Configure PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

// Component State
let pdfDoc = null;
let currentPage = 1;
let scale = DEFAULT_ZOOM;
let pdfCanvas = null;
let onPageChangeCallback = null;

/**
 * Initialize the PDF viewer component
 * @param {HTMLCanvasElement} canvas - Canvas element for rendering
 * @param {string} docId - Document ID to load
 * @param {Function} onPageChange - Callback when page changes
 * @returns {Promise<Object>} PDF document info
 */
export async function initPdfViewer(canvas, docId, onPageChange = null) {
	pdfCanvas = canvas;
	onPageChangeCallback = onPageChange;
	
	try {
		const pdfUrl = getPdfUrl(docId);
		const loadingTask = pdfjsLib.getDocument(pdfUrl);
		pdfDoc = await loadingTask.promise;
		
		console.log(`PDF loaded: ${pdfDoc.numPages} pages`);
		
		// Render first page
		await renderPage(1);
		
		return {
			numPages: pdfDoc.numPages,
			currentPage: 1
		};
	} catch (error) {
		console.error('PDF loading error:', error);
		throw new Error('Failed to load PDF');
	}
}

/**
 * Render a specific page
 * @param {number} pageNum - Page number to render
 */
export async function renderPage(pageNum) {
	if (!pdfDoc || !pdfCanvas) {
		throw new Error('PDF viewer not initialized');
	}
	
	try {
		const page = await pdfDoc.getPage(pageNum);
		const viewport = page.getViewport({ scale });
		const context = pdfCanvas.getContext('2d');
		
		// Set canvas dimensions
		pdfCanvas.height = viewport.height;
		pdfCanvas.width = viewport.width;
		
		// Render page
		const renderContext = {
			canvasContext: context,
			viewport: viewport
		};
		
		await page.render(renderContext).promise;
		currentPage = pageNum;
		
		// Notify page change
		if (onPageChangeCallback) {
			onPageChangeCallback(currentPage, pdfDoc.numPages);
		}
		
		console.log(`Rendered page ${pageNum}`);
	} catch (error) {
		console.error('Page rendering error:', error);
		throw new Error('Failed to render page');
	}
}

/**
 * Navigate to previous page
 * @returns {Promise<boolean>} Success status
 */
export async function goToPreviousPage() {
	if (currentPage <= 1) return false;
	
	await renderPage(currentPage - 1);
	return true;
}

/**
 * Navigate to next page
 * @returns {Promise<boolean>} Success status
 */
export async function goToNextPage() {
	if (!pdfDoc || currentPage >= pdfDoc.numPages) return false;
	
	await renderPage(currentPage + 1);
	return true;
}

/**
 * Navigate to specific page
 * @param {number} pageNum - Page number
 * @returns {Promise<boolean>} Success status
 */
export async function goToPage(pageNum) {
	if (!pdfDoc || pageNum < 1 || pageNum > pdfDoc.numPages) return false;
	
	await renderPage(pageNum);
	return true;
}

/**
 * Zoom in
 * @param {number} step - Zoom step (default from constants)
 * @param {number} maxZoom - Maximum zoom level
 */
export async function zoomIn(step = 0.25, maxZoom = 3.0) {
	scale = Math.min(scale + step, maxZoom);
	await renderPage(currentPage);
	return scale;
}

/**
 * Zoom out
 * @param {number} step - Zoom step (default from constants)
 * @param {number} minZoom - Minimum zoom level
 */
export async function zoomOut(step = 0.25, minZoom = 0.5) {
	scale = Math.max(scale - step, minZoom);
	await renderPage(currentPage);
	return scale;
}

/**
 * Set zoom level
 * @param {number} newScale - New zoom scale
 */
export async function setZoom(newScale) {
	scale = newScale;
	await renderPage(currentPage);
	return scale;
}

/**
 * Get current state
 * @returns {Object} Current viewer state
 */
export function getViewerState() {
	return {
		currentPage,
		numPages: pdfDoc?.numPages || 0,
		scale,
		isLoaded: pdfDoc !== null
	};
}

/**
 * Get current page number
 * @returns {number} Current page
 */
export function getCurrentPage() {
	return currentPage;
}

/**
 * Get total pages
 * @returns {number} Total pages
 */
export function getTotalPages() {
	return pdfDoc?.numPages || 0;
}

/**
 * Get current zoom scale
 * @returns {number} Current scale
 */
export function getCurrentZoom() {
	return scale;
}

/**
 * Check if viewer is initialized
 * @returns {boolean} Initialization status
 */
export function isInitialized() {
	return pdfDoc !== null && pdfCanvas !== null;
}
