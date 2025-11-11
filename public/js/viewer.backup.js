/**
 * PDF Viewer Page
 * Handles PDF rendering, navigation, and interactions
 */

import { getPdfUrl } from './services/pdf.service.js';
import { getTranscript } from './services/transcript.service.js';
import { getMcqs } from './services/mcq.service.js';
import { getNotes, saveNote } from './services/notes.service.js';
import { getScore, saveScore } from './services/score.service.js';
import { DEFAULT_ZOOM, ZOOM_STEP, MIN_ZOOM, MAX_ZOOM, POINTS_PER_CORRECT } from './shared/constants.js';
import { escapeHtml, formatDate } from './shared/utils.js';
import * as dom from './shared/dom.js';

// Configure PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

// DOM Elements
let documentTitle, newPdfBtn, pdfCanvas, pageInfo, zoomInfo;
let prevPageBtn, nextPageBtn, zoomInBtn, zoomOutBtn;
let transcriptionList, noteInput, saveNoteBtn, notesList;
let questionsList, scoreValue;

// State
let pdfDoc = null;
let currentPage = 1;
let scale = DEFAULT_ZOOM;
let currentDocId = null;
let notes = [];
let userScore = 0;
let answeredQuestions = new Set();

/**
 * Initialize the viewer
 */
async function init() {
	// Get DOM elements
	documentTitle = dom.getElementById('documentTitle');
	newPdfBtn = dom.getElementById('newPdfBtn');
	pdfCanvas = dom.getElementById('pdfCanvas');
	pageInfo = dom.getElementById('pageInfo');
	zoomInfo = dom.getElementById('zoomInfo');
	prevPageBtn = dom.getElementById('prevPageBtn');
	nextPageBtn = dom.getElementById('nextPageBtn');
	zoomInBtn = dom.getElementById('zoomInBtn');
	zoomOutBtn = dom.getElementById('zoomOutBtn');
	transcriptionList = dom.getElementById('transcriptionList');
	noteInput = dom.getElementById('noteInput');
	saveNoteBtn = dom.getElementById('saveNoteBtn');
	notesList = dom.getElementById('notesList');
	questionsList = dom.getElementById('questionsList');
	scoreValue = dom.getElementById('scoreValue');

	setupEventListeners();
	
	// Get document ID from URL
	const urlParams = new URLSearchParams(window.location.search);
	currentDocId = urlParams.get('doc');
	
	if (!currentDocId) {
		showError('No document specified');
		return;
	}
	
	try {
		await loadPdf();
		await loadTranscription();
		await loadQuestions();
		await loadNotes();
		await loadScore();
	} catch (error) {
		console.error('Initialization error:', error);
		showError('Failed to load document');
	}
}

/**
 * Setup event listeners
 */
function setupEventListeners() {
	// Navigation
	newPdfBtn.addEventListener('click', () => window.location.href = 'index.html');
	prevPageBtn.addEventListener('click', handlePrevPage);
	nextPageBtn.addEventListener('click', handleNextPage);
	zoomInBtn.addEventListener('click', handleZoomIn);
	zoomOutBtn.addEventListener('click', handleZoomOut);
	
	// Keyboard navigation
	document.addEventListener('keydown', handleKeyboard);
	
	// Tab switching
	document.querySelectorAll('.tab-btn').forEach(btn => {
		btn.addEventListener('click', () => handleTabSwitch(btn.dataset.tab));
	});
	
	// Notes
	saveNoteBtn.addEventListener('click', handleSaveNote);
}

/**
 * Load PDF document
 */
async function loadPdf() {
	try {
		dom.setText(documentTitle, 'Loading...');
		
		const loadingTask = pdfjsLib.getDocument(getPdfUrl(currentDocId));
		pdfDoc = await loadingTask.promise;
		
		dom.setText(documentTitle, currentDocId.replace(/^\d+_/, '').replace('.pdf', ''));
		
		await renderPage(currentPage);
		updatePageInfo();
		updateZoomInfo();
	} catch (error) {
		console.error('Error loading PDF:', error);
		throw new Error('Failed to load PDF document');
	}
}

/**
 * Render PDF page
 */
async function renderPage(pageNum) {
	try {
		const page = await pdfDoc.getPage(pageNum);
		const viewport = page.getViewport({ scale });
		
		const canvas = pdfCanvas;
		const context = canvas.getContext('2d');
		canvas.height = viewport.height;
		canvas.width = viewport.width;
		
		const renderContext = {
			canvasContext: context,
			viewport: viewport
		};
		
		await page.render(renderContext).promise;
	} catch (error) {
		console.error('Error rendering page:', error);
		throw error;
	}
}

/**
 * Handle previous page
 */
async function handlePrevPage() {
	if (currentPage <= 1) return;
	currentPage--;
	await renderPage(currentPage);
	updatePageInfo();
	await loadQuestions();
	await loadTranscription();
}

/**
 * Handle next page
 */
async function handleNextPage() {
	if (!pdfDoc || currentPage >= pdfDoc.numPages) return;
	currentPage++;
	await renderPage(currentPage);
	updatePageInfo();
	await loadQuestions();
	await loadTranscription();
}

/**
 * Handle zoom in
 */
async function handleZoomIn() {
	scale = Math.min(scale + ZOOM_STEP, MAX_ZOOM);
	await renderPage(currentPage);
	updateZoomInfo();
}

/**
 * Handle zoom out
 */
async function handleZoomOut() {
	scale = Math.max(scale - ZOOM_STEP, MIN_ZOOM);
	await renderPage(currentPage);
	updateZoomInfo();
}

/**
 * Handle keyboard navigation
 */
function handleKeyboard(e) {
	// Don't handle if user is typing
	if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
	
	switch (e.key) {
		case 'ArrowLeft':
		case 'PageUp':
			e.preventDefault();
			handlePrevPage();
			break;
		case 'ArrowRight':
		case 'PageDown':
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
	}
}

/**
 * Update page info display
 */
function updatePageInfo() {
	if (pdfDoc) {
		dom.setText(pageInfo, `Page ${currentPage} of ${pdfDoc.numPages}`);
		prevPageBtn.disabled = currentPage <= 1;
		nextPageBtn.disabled = currentPage >= pdfDoc.numPages;
	}
}

/**
 * Update zoom info display
 */
function updateZoomInfo() {
	dom.setText(zoomInfo, `${Math.round(scale * 100)}%`);
}

/**
 * Handle tab switch
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
	const panel = dom.getElementById(panelId);
	if (panel) {
		panel.classList.add('active');
	}
}

/**
 * Load transcription data
 */
async function loadTranscription() {
	try {
		console.log('Loading transcript from server...');
		const data = await getTranscript(currentDocId, currentPage);
		const transcript = data.transcript || '';
		
		if (transcript) {
			renderTranscription(transcript);
		} else {
			dom.setHtml(transcriptionList, `<div class="loading-state">No transcription available for page ${currentPage}</div>`);
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
 * Render transcription
 */
function renderTranscription(transcript) {
	if (!transcript) {
		dom.setHtml(transcriptionList, '<div class="loading-state">No transcription found</div>');
		return;
	}
	
	dom.setHtml(transcriptionList, `
		<div class="transcription-item">
			<div class="transcription-text">${escapeHtml(transcript)}</div>
		</div>
	`);
}

/**
 * Load questions from server
 */
async function loadQuestions() {
	try {
		console.log('Loading MCQ questions from server...');
		const data = await getMcqs(currentDocId, currentPage);
		const questions = data.questions || [];
		
		if (questions.length > 0) {
			renderQuestions(questions);
		} else {
			dom.setHtml(questionsList, `<div class="loading-state">No questions available for page ${currentPage}</div>`);
		}
	} catch (error) {
		console.error('Error loading questions:', error);
		if (error.message.includes('404') || error.message.includes('not found')) {
			dom.setHtml(questionsList, '<div class="loading-state">⏳ MCQ questions are being processed. Please wait...</div>');
		} else {
			dom.setHtml(questionsList, '<div class="loading-state">❌ Failed to load questions</div>');
		}
	}
}

/**
 * Render MCQ questions
 */
function renderQuestions(questions) {
	if (!questions || questions.length === 0) {
		dom.setHtml(questionsList, '<div class="loading-state">No questions available</div>');
		return;
	}
	
	dom.clearContent(questionsList);
	
	questions.forEach((mcq, index) => {
		const mcqId = mcq.id || index;
		const correctOption = mcq.correct !== undefined ? mcq.correct : (mcq.correctAnswer !== undefined ? mcq.correctAnswer : mcq.correct_option);
		
		// Create container
		const mcqContainer = dom.createElement('div', {
			className: 'question-item mcq-container'
		});
		mcqContainer.dataset.mcqId = mcqId;
		mcqContainer.dataset.correct = correctOption;
		mcqContainer.dataset.submitted = 'false';
		mcqContainer.dataset.index = index;
		
		// Question text with number
		const questionText = dom.createElement('div', { className: 'question-text mcq-question' });
		questionText.textContent = `${index + 1}. ${mcq.question}`;
		dom.appendChild(mcqContainer, questionText);
		
		// Options list
		const optionsList = dom.createElement('ul', { className: 'question-options mcq-options' });
		mcq.options.forEach((option, optIndex) => {
			const optionItem = dom.createElement('li', { className: 'question-option mcq-option' });
			optionItem.dataset.optionIndex = optIndex;
			optionItem.textContent = `${String.fromCharCode(65 + optIndex)}. ${option}`;
			optionItem.addEventListener('click', () => handleOptionSelect(mcqContainer, optIndex));
			dom.appendChild(optionsList, optionItem);
		});
		dom.appendChild(mcqContainer, optionsList);
		
		// Submit button
		const submitBtn = dom.createElement('button', { className: 'btn btn-primary mcq-submit' }, 'Submit Answer');
		submitBtn.disabled = true;
		submitBtn.dataset.mcqId = mcqId;
		submitBtn.addEventListener('click', () => handleSubmitAnswer(mcqContainer, mcq));
		dom.appendChild(mcqContainer, submitBtn);
		
		// Result div
		const resultDiv = dom.createElement('div', { className: 'mcq-result' });
		resultDiv.dataset.mcqId = mcqId;
		dom.appendChild(mcqContainer, resultDiv);
		
		// Explanation div
		const explanationDiv = dom.createElement('div', { className: 'mcq-explanation' });
		explanationDiv.style.display = 'none';
		
		const explanationTitle = dom.createElement('div', { className: 'mcq-explanation-title' }, 'Explanation:');
		dom.appendChild(explanationDiv, explanationTitle);
		
		const explanationText = dom.createElement('div', { className: 'mcq-explanation-text' });
		explanationText.textContent = mcq.explanation || 'No explanation available';
		dom.appendChild(explanationDiv, explanationText);
		
		dom.appendChild(mcqContainer, explanationDiv);
		
		dom.appendChild(questionsList, mcqContainer);
	});
}

/**
 * Handle option select
 */
function handleOptionSelect(mcqContainer, optIndex) {
	if (mcqContainer.dataset.submitted === 'true') return;
	
	// Check if options are disabled (safety check)
	const options = mcqContainer.querySelectorAll('.question-option');
	if (options[0].classList.contains('disabled')) return;
	
	// Clear previous selection
	options.forEach(opt => {
		opt.classList.remove('selected');
	});
	
	// Select new option
	const selectedOption = options[optIndex];
	if (selectedOption) {
		selectedOption.classList.add('selected');
	}
	
	// Enable submit button
	const submitBtn = mcqContainer.querySelector('.mcq-submit');
	if (submitBtn) {
		submitBtn.disabled = false;
	}
	
	// Store selected answer
	mcqContainer.dataset.selectedAnswer = optIndex;
}

/**
 * Handle submit answer
 */
function handleSubmitAnswer(mcqContainer, mcq) {
	const selectedAnswer = parseInt(mcqContainer.dataset.selectedAnswer);
	const correctAnswer = parseInt(mcqContainer.dataset.correct);
	const mcqId = mcqContainer.dataset.mcqId;
	
	console.log('Submit Answer Debug:', {
		mcqId,
		selectedAnswer,
		correctAnswer,
		hasContainer: !!mcqContainer,
		alreadySubmitted: mcqContainer.dataset.submitted
	});
	
	// Validation: Check if no option selected
	if (isNaN(selectedAnswer)) {
		console.warn('No option selected');
		return;
	}
	
	// Check if already submitted (to avoid double counting)
	if (mcqContainer.dataset.submitted === 'true') {
		console.warn('Question already submitted');
		return;
	}
	
	// Mark as submitted
	mcqContainer.dataset.submitted = 'true';
	answeredQuestions.add(mcqId);
	
	// Get DOM elements
	const options = mcqContainer.querySelectorAll('.question-option');
	const submitBtn = mcqContainer.querySelector('.mcq-submit');
	const resultDiv = mcqContainer.querySelector('.mcq-result');
	const explanationDiv = mcqContainer.querySelector('.mcq-explanation');
	
	// Disable further interaction
	options.forEach(opt => {
		opt.classList.add('disabled');
		opt.style.cursor = 'not-allowed';
	});
	
	if (submitBtn) {
		submitBtn.disabled = true;
		submitBtn.classList.add('disabled');
	}
	
	// Mark correct and incorrect options with visual styling
	options.forEach((opt, idx) => {
		if (idx === correctAnswer) {
			opt.classList.add('correct');
		}
		if (idx === selectedAnswer && selectedAnswer !== correctAnswer) {
			opt.classList.add('incorrect');
		}
	});
	
	// Check if correct
	const isCorrect = selectedAnswer === correctAnswer;
	
	// Update score
	if (isCorrect) {
		userScore += POINTS_PER_CORRECT;
		console.log('Score Update:', {
			isCorrect,
			userScore,
			pointsEarned: POINTS_PER_CORRECT
		});
	}
	
	// Update display and save to server
	updateScoreDisplay();
	saveScoreToServer();
	
	// Show result message
	if (resultDiv) {
		if (isCorrect) {
			resultDiv.innerHTML = `
				<div class="result-message result-correct">
					<strong>✓ Correct!</strong> You earned ${POINTS_PER_CORRECT} points.
				</div>
			`;
		} else {
			resultDiv.innerHTML = `
				<div class="result-message result-incorrect">
					<strong>✗ Incorrect</strong> The correct answer is option ${String.fromCharCode(65 + correctAnswer)}.
				</div>
			`;
		}
	}
	
	// Show explanation
	if (explanationDiv) {
		explanationDiv.style.display = 'block';
		const explanationText = explanationDiv.querySelector('.mcq-explanation-text');
		if (explanationText) {
			explanationText.textContent = mcq.explanation || 'No explanation available';
		}
	}
}

/**
 * Update score display
 */
function updateScoreDisplay() {
	dom.setText(scoreValue, userScore);
}

/**
 * Save score to server
 */
async function saveScoreToServer() {
	try {
		await saveScore(currentDocId, userScore);
	} catch (error) {
		console.error('Error saving score:', error);
	}
}

/**
 * Load notes
 */
async function loadNotes() {
	try {
		const data = await getNotes(currentDocId);
		notes = data.notes || [];
		renderNotes();
	} catch (error) {
		console.error('Error loading notes:', error);
	}
}

/**
 * Render notes
 */
function renderNotes() {
	if (notes.length === 0) {
		dom.setHtml(notesList, '<div class="empty-state">No notes yet</div>');
		return;
	}
	
	const notesHtml = notes.map(note => `
		<div class="note-item">
			<div class="note-header">
				<span class="note-page">Page ${note.page}</span>
				<span class="note-date">${formatDate(note.timestamp)}</span>
			</div>
			<div class="note-content">${escapeHtml(note.note)}</div>
		</div>
	`).join('');
	
	dom.setHtml(notesList, notesHtml);
}

/**
 * Handle save note
 */
async function handleSaveNote() {
	const note = noteInput.value.trim();
	
	if (!note) {
		alert('Please enter a note');
		return;
	}
	
	try {
		dom.disable(saveNoteBtn);
		dom.setText(saveNoteBtn, 'Saving...');
		
		await saveNote(currentDocId, currentPage, note);
		
		alert('Note saved successfully!');
		noteInput.value = '';
		await loadNotes();
	} catch (error) {
		console.error('Error saving note:', error);
		alert('Failed to save note');
	} finally {
		dom.enable(saveNoteBtn);
		dom.setText(saveNoteBtn, 'Save Note');
	}
}

/**
 * Load score
 */
async function loadScore() {
	try {
		const data = await getScore(currentDocId);
		userScore = data.score || 0;
		updateScoreDisplay();
	} catch (error) {
		console.error('Error loading score:', error);
	}
}

/**
 * Show error
 */
function showError(message) {
	alert(message);
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
	document.addEventListener('DOMContentLoaded', init);
} else {
	init();
}
