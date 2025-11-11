/**
 * Upload Page JavaScript
 * Handles PDF file upload with drag-and-drop support
 */

// DOM Elements
const uploadForm = document.getElementById('uploadForm');
const dropZone = document.getElementById('dropZone');
const fileInput = document.getElementById('fileInput');
const browseBtn = document.getElementById('browseBtn');
const submitBtn = document.getElementById('submitBtn');
const removeFileBtn = document.getElementById('removeFileBtn');
const fileInfo = document.getElementById('fileInfo');
const fileName = document.getElementById('fileName');
const fileSize = document.getElementById('fileSize');
const uploadProgress = document.getElementById('uploadProgress');
const progressFill = document.getElementById('progressFill');
const progressText = document.getElementById('progressText');
const uploadError = document.getElementById('uploadError');
const errorMessage = document.getElementById('errorMessage');

// Configuration
const API_BASE_URL = '';
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
const ALLOWED_TYPE = 'application/pdf';

// State
let selectedFile = null;

/**
 * Initialize the upload page
 */
function init() {
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
 * @param {DragEvent} e - Drag event
 */
function handleDragOver(e) {
	e.preventDefault();
	dropZone.classList.add('drop-zone--drag-over');
}

/**
 * Handle drag leave
 */
function handleDragLeave() {
	dropZone.classList.remove('drop-zone--drag-over');
}

/**
 * Handle file drop
 * @param {DragEvent} e - Drop event
 */
function handleDrop(e) {
	e.preventDefault();
	dropZone.classList.remove('drop-zone--drag-over');
	
	const files = e.dataTransfer?.files;
	if (files && files.length > 0) {
		validateAndSetFile(files[0]);
	}
}

/**
 * Handle file select from input
 * @param {Event} e - Change event
 */
function handleFileSelect(e) {
	const files = e.target.files;
	if (files && files.length > 0) {
		validateAndSetFile(files[0]);
	}
}

/**
 * Validate and set the selected file
 * @param {File} file - File to validate
 */
function validateAndSetFile(file) {
	hideError();
	
	// Validate file type
	if (file.type !== ALLOWED_TYPE) {
		showError('Please select a PDF file.');
		return;
	}
	
	// Validate file size
	if (file.size > MAX_FILE_SIZE) {
		showError(`File size exceeds ${formatFileSize(MAX_FILE_SIZE)}. Please select a smaller file.`);
		return;
	}
	
	// Set the file
	selectedFile = file;
	displayFileInfo(file);
	submitBtn.disabled = false;
}

/**
 * Display file information
 * @param {File} file - Selected file
 */
function displayFileInfo(file) {
	fileName.textContent = file.name;
	fileSize.textContent = formatFileSize(file.size);
	fileInfo.classList.remove('hidden');
	dropZone.style.display = 'none';
}

/**
 * Handle remove file
 */
function handleRemoveFile() {
	selectedFile = null;
	fileInput.value = '';
	fileInfo.classList.add('hidden');
	dropZone.style.display = 'block';
	submitBtn.disabled = true;
	hideError();
}

/**
 * Handle form submit
 * @param {Event} e - Submit event
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
		const result = await uploadFile(selectedFile);
		
		// Redirect to viewer
		window.location.href = `viewer.html?doc=${encodeURIComponent(result.filename)}`;
		
	} catch (error) {
		console.error('Upload error:', error);
		showError(error.message || 'Failed to upload file. Please try again.');
		setUploadState(false);
	}
}

/**
 * Upload file to server
 * @param {File} file - File to upload
 * @returns {Promise<Object>} Upload result
 */
async function uploadFile(file) {
	const formData = new FormData();
	formData.append('pdf', file);
	
	return new Promise((resolve, reject) => {
		const xhr = new XMLHttpRequest();
		
		// Upload progress
		xhr.upload.addEventListener('progress', (e) => {
			if (e.lengthComputable) {
				const percentComplete = (e.loaded / e.total) * 100;
				updateProgress(percentComplete);
			}
		});
		
		// Upload complete
		xhr.addEventListener('load', () => {
			if (xhr.status === 200) {
				try {
					const result = JSON.parse(xhr.responseText);
					if (result.success && result.filename) {
						resolve(result);
					} else {
						reject(new Error('Invalid server response'));
					}
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
		xhr.open('POST', `${API_BASE_URL}/upload-pdf`);
		xhr.send(formData);
	});
}

/**
 * Update upload progress
 * @param {number} percent - Progress percentage
 */
function updateProgress(percent) {
	progressFill.style.width = `${percent}%`;
	progressText.textContent = `Uploading... ${Math.round(percent)}%`;
}

/**
 * Set upload state
 * @param {boolean} uploading - Whether uploading
 */
function setUploadState(uploading) {
	submitBtn.disabled = uploading;
	removeFileBtn.disabled = uploading;
	
	if (uploading) {
		uploadProgress.classList.remove('hidden');
		fileInfo.classList.add('hidden');
		updateProgress(0);
	} else {
		uploadProgress.classList.add('hidden');
		fileInfo.classList.remove('hidden');
	}
}

/**
 * Show error message
 * @param {string} message - Error message
 */
function showError(message) {
	errorMessage.textContent = message;
	uploadError.classList.remove('hidden');
	uploadError.setAttribute('role', 'alert');
}

/**
 * Hide error message
 */
function hideError() {
	uploadError.classList.add('hidden');
	uploadError.removeAttribute('role');
}

/**
 * Format file size
 * @param {number} bytes - File size in bytes
 * @returns {string} Formatted file size
 */
function formatFileSize(bytes) {
	if (bytes === 0) return '0 Bytes';
	const k = 1024;
	const sizes = ['Bytes', 'KB', 'MB', 'GB'];
	const i = Math.floor(Math.log(bytes) / Math.log(k));
	return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
	document.addEventListener('DOMContentLoaded', init);
} else {
	init();
}

// Export for testing
export { init, validateAndSetFile, uploadFile, formatFileSize };
