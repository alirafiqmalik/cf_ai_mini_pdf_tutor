/**
 * Upload Page
 * Handles PDF file upload with drag-and-drop support
 */

import { uploadPdf } from './services/pdf.service.js';
import { MAX_FILE_SIZE, ALLOWED_FILE_TYPE, MESSAGES } from './shared/constants.js';
import { formatFileSize } from './shared/utils.js';
import * as dom from './shared/dom.js';

// DOM Elements
let uploadForm, dropZone, fileInput, browseBtn, submitBtn, removeFileBtn;
let fileInfo, fileName, fileSize, uploadProgress, progressFill, progressText;
let uploadError, errorMessage;

// State
let selectedFile = null;

/**
 * Initialize the upload page
 */
function init() {
	// Get DOM elements
	uploadForm = dom.getElementById('uploadForm');
	dropZone = dom.getElementById('dropZone');
	fileInput = dom.getElementById('fileInput');
	browseBtn = dom.getElementById('browseBtn');
	submitBtn = dom.getElementById('submitBtn');
	removeFileBtn = dom.getElementById('removeFileBtn');
	fileInfo = dom.getElementById('fileInfo');
	fileName = dom.getElementById('fileName');
	fileSize = dom.getElementById('fileSize');
	uploadProgress = dom.getElementById('uploadProgress');
	progressFill = dom.getElementById('progressFill');
	progressText = dom.getElementById('progressText');
	uploadError = dom.getElementById('uploadError');
	errorMessage = dom.getElementById('errorMessage');

	setupEventListeners();
}

/**
 * Setup event listeners
 */
function setupEventListeners() {
	// Drop zone events
	dropZone.addEventListener('click', handleDropZoneClick);
	dropZone.addEventListener('dragover', handleDragOver);
	dropZone.addEventListener('dragleave', handleDragLeave);
	dropZone.addEventListener('drop', handleDrop);
	
	// Keyboard support for drop zone
	dropZone.addEventListener('keydown', (e) => {
		if (e.key === 'Enter' || e.key === ' ') {
			e.preventDefault();
			handleDropZoneClick();
		}
	});
	
	// File input change
	fileInput.addEventListener('change', handleFileSelect);
	
	// Browse button
	browseBtn.addEventListener('click', (e) => {
		e.stopPropagation();
		fileInput.click();
	});
	
	// Remove file button
	removeFileBtn.addEventListener('click', handleRemoveFile);
	
	// Form submit
	uploadForm.addEventListener('submit', handleSubmit);
}

/**
 * Handle drop zone click
 */
function handleDropZoneClick() {
	fileInput.click();
}

/**
 * Handle drag over
 */
function handleDragOver(e) {
	e.preventDefault();
	dom.addClass(dropZone, 'drop-zone--drag-over');
}

/**
 * Handle drag leave
 */
function handleDragLeave() {
	dom.removeClass(dropZone, 'drop-zone--drag-over');
}

/**
 * Handle file drop
 */
function handleDrop(e) {
	e.preventDefault();
	dom.removeClass(dropZone, 'drop-zone--drag-over');
	
	const files = e.dataTransfer?.files;
	if (files && files.length > 0) {
		validateAndSetFile(files[0]);
	}
}

/**
 * Handle file select from input
 */
function handleFileSelect(e) {
	const files = e.target.files;
	if (files && files.length > 0) {
		validateAndSetFile(files[0]);
	}
}

/**
 * Validate and set the selected file
 */
function validateAndSetFile(file) {
	hideError();
	
	// Validate file type
	if (file.type !== ALLOWED_FILE_TYPE) {
		showError(MESSAGES.FILE_TYPE_ERROR);
		return;
	}
	
	// Validate file size
	if (file.size > MAX_FILE_SIZE) {
		showError(`${MESSAGES.FILE_SIZE_ERROR} Maximum: ${formatFileSize(MAX_FILE_SIZE)}`);
		return;
	}
	
	// Set the file
	selectedFile = file;
	displayFileInfo(file);
	dom.enable(submitBtn);
}

/**
 * Display file information
 */
function displayFileInfo(file) {
	dom.setText(fileName, file.name);
	dom.setText(fileSize, formatFileSize(file.size));
	dom.show(fileInfo);
	dropZone.style.display = 'none';
}

/**
 * Handle remove file
 */
function handleRemoveFile() {
	selectedFile = null;
	fileInput.value = '';
	dom.hide(fileInfo);
	dropZone.style.display = 'block';
	dom.disable(submitBtn);
	hideError();
}

/**
 * Handle form submit
 */
async function handleSubmit(e) {
	e.preventDefault();
	
	if (!selectedFile) {
		showError('Please select a file to upload.');
		return;
	}
	
	try {
		hideError();
		setUploadState(true);
		
		// Upload the file
		const result = await uploadPdf(selectedFile, updateProgress);
		
		// Redirect to viewer
		window.location.href = `viewer.html?doc=${encodeURIComponent(result.filename)}`;
		
	} catch (error) {
		console.error('Upload error:', error);
		showError(error.message || MESSAGES.UPLOAD_ERROR);
		setUploadState(false);
	}
}

/**
 * Update upload progress
 */
function updateProgress(percent) {
	progressFill.style.width = `${percent}%`;
	dom.setText(progressText, `Uploading... ${Math.round(percent)}%`);
}

/**
 * Set upload state
 */
function setUploadState(uploading) {
	if (uploading) {
		dom.disable(submitBtn);
		dom.disable(removeFileBtn);
		dom.show(uploadProgress);
		dom.hide(fileInfo);
		updateProgress(0);
	} else {
		dom.enable(submitBtn);
		dom.enable(removeFileBtn);
		dom.hide(uploadProgress);
		dom.show(fileInfo);
	}
}

/**
 * Show error message
 */
function showError(message) {
	dom.setText(errorMessage, message);
	dom.show(uploadError);
	uploadError.setAttribute('role', 'alert');
}

/**
 * Hide error message
 */
function hideError() {
	dom.hide(uploadError);
	uploadError.removeAttribute('role');
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
	document.addEventListener('DOMContentLoaded', init);
} else {
	init();
}
