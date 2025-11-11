/**
 * Navigation Component
 * Handles page navigation controls and keyboard shortcuts
 */

import * as dom from '../shared/dom.js';

// Component State
let prevPageBtn = null;
let nextPageBtn = null;
let pageInfo = null;
let zoomInBtn = null;
let zoomOutBtn = null;
let zoomInfo = null;
let onPrevCallback = null;
let onNextCallback = null;
let onZoomInCallback = null;
let onZoomOutCallback = null;

/**
 * Initialize navigation component
 * @param {Object} elements - DOM elements
 * @param {Object} callbacks - Event callbacks
 */
export function initNavigation(elements, callbacks) {
	// Store element references
	prevPageBtn = elements.prevPageBtn;
	nextPageBtn = elements.nextPageBtn;
	pageInfo = elements.pageInfo;
	zoomInBtn = elements.zoomInBtn;
	zoomOutBtn = elements.zoomOutBtn;
	zoomInfo = elements.zoomInfo;
	
	// Store callbacks
	onPrevCallback = callbacks.onPrevPage;
	onNextCallback = callbacks.onNextPage;
	onZoomInCallback = callbacks.onZoomIn;
	onZoomOutCallback = callbacks.onZoomOut;
	
	// Setup event listeners
	setupEventListeners();
	
	// Setup keyboard navigation
	setupKeyboardNavigation(callbacks);
}

/**
 * Setup button event listeners
 */
function setupEventListeners() {
	if (prevPageBtn) {
		prevPageBtn.addEventListener('click', handlePrevPage);
	}
	
	if (nextPageBtn) {
		nextPageBtn.addEventListener('click', handleNextPage);
	}
	
	if (zoomInBtn) {
		zoomInBtn.addEventListener('click', handleZoomIn);
	}
	
	if (zoomOutBtn) {
		zoomOutBtn.addEventListener('click', handleZoomOut);
	}
}

/**
 * Setup keyboard navigation
 * @param {Object} callbacks - Additional callbacks
 */
function setupKeyboardNavigation(callbacks) {
	document.addEventListener('keydown', (e) => {
		// Don't handle if user is typing
		if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
			return;
		}
		
		switch (e.key) {
			case 'ArrowLeft':
			case 'PageUp':
				e.preventDefault();
				handlePrevPage();
				break;
				
			case 'ArrowRight':
			case 'PageDown':
			case ' ':
				e.preventDefault();
				handleNextPage();
				break;
				
			case '+':
			case '=':
				e.preventDefault();
				handleZoomIn();
				break;
				
			case '-':
			case '_':
				e.preventDefault();
				handleZoomOut();
				break;
				
			case 'Home':
				if (callbacks.onGoToFirstPage) {
					e.preventDefault();
					callbacks.onGoToFirstPage();
				}
				break;
				
			case 'End':
				if (callbacks.onGoToLastPage) {
					e.preventDefault();
					callbacks.onGoToLastPage();
				}
				break;
		}
	});
}

/**
 * Handle previous page click
 */
async function handlePrevPage() {
	if (onPrevCallback) {
		await onPrevCallback();
	}
}

/**
 * Handle next page click
 */
async function handleNextPage() {
	if (onNextCallback) {
		await onNextCallback();
	}
}

/**
 * Handle zoom in click
 */
async function handleZoomIn() {
	if (onZoomInCallback) {
		await onZoomInCallback();
	}
}

/**
 * Handle zoom out click
 */
async function handleZoomOut() {
	if (onZoomOutCallback) {
		await onZoomOutCallback();
	}
}

/**
 * Update page info display
 * @param {number} current - Current page number
 * @param {number} total - Total pages
 */
export function updatePageInfo(current, total) {
	if (pageInfo) {
		dom.setText(pageInfo, `Page ${current} of ${total}`);
	}
	
	// Update button states
	if (prevPageBtn) {
		prevPageBtn.disabled = current <= 1;
	}
	
	if (nextPageBtn) {
		nextPageBtn.disabled = current >= total;
	}
}

/**
 * Update zoom info display
 * @param {number} scale - Current zoom scale
 */
export function updateZoomInfo(scale) {
	if (zoomInfo) {
		dom.setText(zoomInfo, `${Math.round(scale * 100)}%`);
	}
}

/**
 * Enable/disable navigation controls
 * @param {boolean} enabled - Enable state
 */
export function setNavigationEnabled(enabled) {
	if (prevPageBtn) prevPageBtn.disabled = !enabled;
	if (nextPageBtn) nextPageBtn.disabled = !enabled;
	if (zoomInBtn) zoomInBtn.disabled = !enabled;
	if (zoomOutBtn) zoomOutBtn.disabled = !enabled;
}
