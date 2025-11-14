/**
 * Upload Page
 * Handles PDF file upload with drag-and-drop support and PDF management
 */

import { uploadPdf, listPdfs, deletePdf, getPdfUrl } from './services/pdf.service.js';
import { MAX_FILE_SIZE, ALLOWED_FILE_TYPE, MESSAGES } from './shared/constants.js';
import { formatFileSize } from './shared/utils.js';
import * as dom from './shared/dom.js';

// DOM Elements
let uploadForm, dropZone, fileInput, browseBtn, submitBtn, removeFileBtn;
let fileInfo, fileName, fileSize, uploadProgress, progressFill, progressText;
let uploadError, errorMessage;
let uploadBtn, deleteBtn, uploadModal, closeModalBtn, modalOverlay;
let pdfListContainer;

// State
let selectedFile = null;
let pdfList = [];
let selectedPdfs = new Set();

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
	
	// PDF Manager elements
	uploadBtn = dom.getElementById('uploadBtn');
	deleteBtn = dom.getElementById('deleteBtn');
	uploadModal = dom.getElementById('uploadModal');
	closeModalBtn = dom.getElementById('closeModalBtn');
	modalOverlay = uploadModal?.querySelector('.modal-overlay');
	pdfListContainer = dom.getElementById('pdfListContainer');

	setupEventListeners();
	loadPdfList();
}

/**
 * Setup event listeners
 */
function setupEventListeners() {
	// Modal controls
	if (uploadBtn) {
		uploadBtn.addEventListener('click', openUploadModal);
	}
	
	if (closeModalBtn) {
		closeModalBtn.addEventListener('click', closeUploadModal);
	}
	
	if (modalOverlay) {
		modalOverlay.addEventListener('click', closeUploadModal);
	}
	
	if (deleteBtn) {
		deleteBtn.addEventListener('click', handleDelete);
	}
	
	// Drop zone events
	if (dropZone) {
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
	}
	
	// File input change
	if (fileInput) {
		fileInput.addEventListener('change', handleFileSelect);
	}
	
	// Browse button
	if (browseBtn) {
		browseBtn.addEventListener('click', (e) => {
			e.stopPropagation();
			fileInput.click();
		});
	}
	
	// Remove file button
	if (removeFileBtn) {
		removeFileBtn.addEventListener('click', handleRemoveFile);
	}
	
	// Form submit
	if (uploadForm) {
		uploadForm.addEventListener('submit', handleSubmit);
	}
	
	// ESC key to close modal
	document.addEventListener('keydown', (e) => {
		if (e.key === 'Escape' && uploadModal && !uploadModal.classList.contains('hidden')) {
			closeUploadModal();
		}
	});
}

/**
 * Load PDF list from server
 */
async function loadPdfList() {
	try {
		if (!pdfListContainer) return;
		
		// Show loading state
		pdfListContainer.innerHTML = `
			<div class="loading-spinner">
				<div class="spinner"></div>
				<p>Loading PDFs...</p>
			</div>
		`;
		
		// Fetch PDF list
		const response = await listPdfs();
		pdfList = response.files || [];
		
		// Render PDF list
		renderPdfList();
	} catch (error) {
		console.error('Error loading PDF list:', error);
		showPdfListError('Failed to load PDFs. Please refresh the page.');
	}
}

/**
 * Render PDF list
 */
function renderPdfList() {
	if (!pdfListContainer) return;
	
	// Clear selected PDFs
	selectedPdfs.clear();
	updateDeleteButton();
	
	// Show empty state if no PDFs
	if (pdfList.length === 0) {
		pdfListContainer.innerHTML = `
			<div class="empty-state">
				<svg class="empty-state-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
					<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
					<polyline points="14 2 14 8 20 8"></polyline>
				</svg>
				<h3 class="empty-state-title">No PDFs yet</h3>
				<p class="empty-state-text">Upload your first PDF to get started</p>
			</div>
		`;
		return;
	}
	
	// Create PDF grid
	const grid = document.createElement('div');
	grid.className = 'pdf-grid';
	
	pdfList.forEach(pdf => {
		const card = createPdfCard(pdf);
		grid.appendChild(card);
	});
	
	pdfListContainer.innerHTML = '';
	pdfListContainer.appendChild(grid);
}

/**
 * Create PDF card element
 */
function createPdfCard(pdf) {
	const card = document.createElement('div');
	card.className = 'pdf-card';
	const filename = pdf.filename || pdf.key;
	card.dataset.filename = filename;
	
	// Format date if available
	const timestamp = pdf.timestamp || pdf.uploaded;
	const dateStr = timestamp ? new Date(timestamp).toLocaleDateString() : '';
	const displayName = pdf.originalName || filename;
	
	card.innerHTML = `
		<input type="checkbox" class="pdf-card-checkbox" data-filename="${filename}" aria-label="Select ${displayName}">
		<svg class="pdf-card-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
			<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
			<polyline points="14 2 14 8 20 8"></polyline>
		</svg>
		<div class="pdf-card-info">
			<p class="pdf-card-name" title="${displayName}">${displayName}</p>
			<p class="pdf-card-size">${formatFileSize(pdf.size || 0)}</p>
			${dateStr ? `<p class="pdf-card-date">${dateStr}</p>` : ''}
		</div>
	`;
	
	// Checkbox event
	const checkbox = card.querySelector('.pdf-card-checkbox');
	checkbox.addEventListener('change', (e) => {
		e.stopPropagation();
		handleCheckboxChange(filename, checkbox.checked);
	});
	
	// Card click event (open viewer)
	card.addEventListener('click', (e) => {
		// Don't open if clicking checkbox
		if (e.target === checkbox) return;
		window.location.href = `viewer.html?doc=${encodeURIComponent(filename)}`;
	});
	
	return card;
}

/**
 * Handle checkbox change
 */
function handleCheckboxChange(filename, checked) {
	const card = document.querySelector(`.pdf-card[data-filename="${filename}"]`);
	
	if (checked) {
		selectedPdfs.add(filename);
		card?.classList.add('selected');
	} else {
		selectedPdfs.delete(filename);
		card?.classList.remove('selected');
	}
	
	updateDeleteButton();
}

/**
 * Update delete button state
 */
function updateDeleteButton() {
	if (!deleteBtn) return;
	
	if (selectedPdfs.size > 0) {
		deleteBtn.disabled = false;
		deleteBtn.classList.add('active');
	} else {
		deleteBtn.disabled = true;
		deleteBtn.classList.remove('active');
	}
}

/**
 * Handle delete action
 */
function handleDelete() {
	if (selectedPdfs.size === 0) return;
	
	const count = selectedPdfs.size;
	const message = count === 1 
		? 'Are you sure you want to delete this PDF?' 
		: `Are you sure you want to delete ${count} PDFs?`;
	
	// Show delete confirmation modal
	showDeleteConfirmation(message);
}

/**
 * Show delete confirmation modal
 */
function showDeleteConfirmation(message) {
	const deleteModal = document.getElementById('deleteModal');
	const deleteMessage = document.getElementById('deleteMessage');
	const confirmDeleteBtn = document.getElementById('confirmDeleteBtn');
	const cancelDeleteBtn = document.getElementById('cancelDeleteBtn');
	const closeDeleteModalBtn = document.getElementById('closeDeleteModalBtn');
	const deleteModalOverlay = deleteModal?.querySelector('.modal-overlay');
	
	if (!deleteModal) return;
	
	// Set message
	deleteMessage.textContent = message;
	
	// Show modal
	deleteModal.classList.remove('hidden');
	document.body.style.overflow = 'hidden';
	
	// Setup event listeners
	const closeModal = () => {
		deleteModal.classList.add('hidden');
		document.body.style.overflow = '';
	};
	
	const handleConfirm = async () => {
		await executeDelete();
		closeModal();
	};
	
	// Remove old listeners and add new ones
	const newConfirmBtn = confirmDeleteBtn.cloneNode(true);
	confirmDeleteBtn.parentNode.replaceChild(newConfirmBtn, confirmDeleteBtn);
	newConfirmBtn.addEventListener('click', handleConfirm);
	
	const newCancelBtn = cancelDeleteBtn.cloneNode(true);
	cancelDeleteBtn.parentNode.replaceChild(newCancelBtn, cancelDeleteBtn);
	newCancelBtn.addEventListener('click', closeModal);
	
	if (closeDeleteModalBtn) {
		const newCloseBtn = closeDeleteModalBtn.cloneNode(true);
		closeDeleteModalBtn.parentNode.replaceChild(newCloseBtn, closeDeleteModalBtn);
		newCloseBtn.addEventListener('click', closeModal);
	}
	
	if (deleteModalOverlay) {
		const newOverlay = deleteModalOverlay.cloneNode(true);
		deleteModalOverlay.parentNode.replaceChild(newOverlay, deleteModalOverlay);
		newOverlay.addEventListener('click', closeModal);
	}
}

/**
 * Execute delete operation
 */
async function executeDelete() {
	if (selectedPdfs.size === 0) return;
	
	const count = selectedPdfs.size;
	const deleteProgress = document.getElementById('deleteProgress');
	const confirmDeleteBtn = document.getElementById('confirmDeleteBtn');
	const cancelDeleteBtn = document.getElementById('cancelDeleteBtn');
	
	try {
		// Show progress
		if (deleteProgress) deleteProgress.classList.remove('hidden');
		if (confirmDeleteBtn) confirmDeleteBtn.disabled = true;
		if (cancelDeleteBtn) cancelDeleteBtn.disabled = true;
		
		// Delete each selected PDF
		const deletePromises = Array.from(selectedPdfs).map(filename => 
			deletePdf(filename).catch(err => {
				console.error(`Failed to delete ${filename}:`, err);
				return { error: err, filename };
			})
		);
		
		const results = await Promise.all(deletePromises);
		
		// Check for errors
		const errors = results.filter(r => r && r.error);
		
		if (errors.length > 0) {
			console.warn(`${errors.length} file(s) failed to delete`);
		}
		
		// Reload PDF list regardless of individual failures
		await loadPdfList();
		
		console.log(`Successfully processed delete for ${count} PDF(s)`);
		
	} catch (error) {
		console.error('Error during delete operation:', error);
		// Still reload to reflect actual state
		await loadPdfList();
	} finally {
		// Hide progress
		if (deleteProgress) deleteProgress.classList.add('hidden');
		if (confirmDeleteBtn) confirmDeleteBtn.disabled = false;
		if (cancelDeleteBtn) cancelDeleteBtn.disabled = false;
	}
}

/**
 * Show PDF list error
 */
function showPdfListError(message) {
	if (!pdfListContainer) return;
	
	pdfListContainer.innerHTML = `
		<div class="empty-state">
			<svg class="empty-state-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
				<circle cx="12" cy="12" r="10"></circle>
				<line x1="12" y1="8" x2="12" y2="12"></line>
				<line x1="12" y1="16" x2="12.01" y2="16"></line>
			</svg>
			<h3 class="empty-state-title">Error</h3>
			<p class="empty-state-text">${message}</p>
		</div>
	`;
}

/**
 * Open upload modal
 */
function openUploadModal() {
	if (!uploadModal) return;
	uploadModal.classList.remove('hidden');
	document.body.style.overflow = 'hidden';
}

/**
 * Close upload modal
 */
function closeUploadModal() {
	if (!uploadModal) return;
	uploadModal.classList.add('hidden');
	document.body.style.overflow = '';
	
	// Reset form
	handleRemoveFile();
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
		
		// Close modal and reload PDF list
		closeUploadModal();
		await loadPdfList();
		
		// Optionally redirect to viewer
		// window.location.href = `viewer.html?doc=${encodeURIComponent(result.filename)}`;
		
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
