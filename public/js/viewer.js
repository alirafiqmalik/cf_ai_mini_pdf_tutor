/**
 * PDF Viewer JavaScript
 * Handles PDF rendering, navigation, and interactions
 */

// Configure PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

// DOM Elements
const documentTitle = document.getElementById('documentTitle');
const newPdfBtn = document.getElementById('newPdfBtn');
const pdfCanvas = document.getElementById('pdfCanvas');
const pdfContainer = document.getElementById('pdfContainer');
const pageInfo = document.getElementById('pageInfo');
const zoomInfo = document.getElementById('zoomInfo');
const prevPageBtn = document.getElementById('prevPageBtn');
const nextPageBtn = document.getElementById('nextPageBtn');
const zoomInBtn = document.getElementById('zoomInBtn');
const zoomOutBtn = document.getElementById('zoomOutBtn');
const tabBtns = document.querySelectorAll('.tab-btn');
const transcriptionList = document.getElementById('transcriptionList');
const noteInput = document.getElementById('noteInput');
const saveNoteBtn = document.getElementById('saveNoteBtn');
const notesList = document.getElementById('notesList');
const questionsList = document.getElementById('questionsList');
const scoreValue = document.getElementById('scoreValue');
const scoreDetails = document.getElementById('scoreDetails');

// Configuration
const API_BASE_URL = '';
const ZOOM_STEP = 0.25;
const MIN_ZOOM = 0.5;
const MAX_ZOOM = 3.0;
const DEFAULT_ZOOM = 1.5;
const POINTS_PER_CORRECT = 10;

// State
let pdfDoc = null;
let currentPage = 1;
let scale = DEFAULT_ZOOM;
let currentDocId = null;
let transcriptionData = null;
let notes = [];
let questions = [];
let userScore = 0;
let correctAnswers = 0;
let attemptedQuestions = 0;
let answeredQuestions = new Set(); // Track which questions have been answered

/**
 * Initialize the viewer
 */
async function init() {
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
	tabBtns.forEach(btn => {
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
		documentTitle.textContent = 'Loading...';
		
		const loadingTask = pdfjsLib.getDocument(`${API_BASE_URL}/get-pdf/${currentDocId}`);
		pdfDoc = await loadingTask.promise;
		
		documentTitle.textContent = currentDocId.replace(/^\d+_/, '').replace('.pdf', '');
		
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
 * @param {number} pageNum - Page number to render
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
		
		highlightCurrentPageTranscriptions();
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
}

/**
 * Handle next page
 */
async function handleNextPage() {
	if (!pdfDoc || currentPage >= pdfDoc.numPages) return;
	currentPage++;
	await renderPage(currentPage);
	updatePageInfo();
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
 * @param {KeyboardEvent} e - Keyboard event
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
		pageInfo.textContent = `Page ${currentPage} of ${pdfDoc.numPages}`;
		prevPageBtn.disabled = currentPage <= 1;
		nextPageBtn.disabled = currentPage >= pdfDoc.numPages;
	}
}

/**
 * Update zoom info display
 */
function updateZoomInfo() {
	zoomInfo.textContent = `${Math.round(scale * 100)}%`;
}

/**
 * Handle tab switch
 * @param {string} tabName - Tab name to switch to
 */
function handleTabSwitch(tabName) {
	// Update tab buttons
	tabBtns.forEach(btn => {
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
 * Load transcription data
 */
async function loadTranscription() {
		
transcriptionList.innerHTML = '<div class="loading-state">No transcription data available</div>';
// TODO: Replace placeholder code 	
// try {
		// const jsonFilename = currentDocId.replace('.pdf', '.json');

	// 	const response = await fetch(`${API_BASE_URL}/temp/${jsonFilename}`);
		
	// 	if (response.ok) {
	// 		transcriptionData = await response.json();
	// 		renderTranscriptions();
	// 	} else {
	// 		transcriptionList.innerHTML = '<div class="loading-state">No transcription data available</div>';
	// 	}
	// } catch (error) {
	// 	console.error('Error loading transcription:', error);
	// 	transcriptionList.innerHTML = '<div class="loading-state">No transcription data available</div>';
	// }
}

/**
 * Render transcriptions
 */
function renderTranscriptions() {
	if (!transcriptionData || !transcriptionData.transcriptions) {
		transcriptionList.innerHTML = '<div class="loading-state">No transcriptions found</div>';
		return;
	}
	
	transcriptionList.innerHTML = transcriptionData.transcriptions.map(item => `
		<div class="transcription-item" data-page="${item.page}" onclick="goToPage(${item.page})">
			<span class="transcription-page">Page ${item.page}</span>
			<div class="transcription-text">${escapeHtml(item.text)}</div>
		</div>
	`).join('');
}

/**
 * Highlight transcriptions for current page
 */
function highlightCurrentPageTranscriptions() {
	document.querySelectorAll('.transcription-item').forEach(item => {
		const page = parseInt(item.dataset.page);
		if (page === currentPage) {
			item.classList.add('active');
			item.style.opacity = '1';
		} else {
			item.classList.remove('active');
			item.style.opacity = '0.6';
		}
	});
}

/**
 * Go to specific page
 * @param {number} pageNum - Page number
 */
async function goToPage(pageNum) {
	if (pageNum < 1 || pageNum > pdfDoc.numPages) return;
	currentPage = pageNum;
	await renderPage(currentPage);
	updatePageInfo();
}

/**
 * Load notes
 */
async function loadNotes() {
	try {
		const response = await fetch(`${API_BASE_URL}/get-notes?filename=${encodeURIComponent(currentDocId)}`);
		
		if (response.ok) {
			const data = await response.json();
			notes = data.notes || [];
			renderNotes();
		}
	} catch (error) {
		console.error('Error loading notes:', error);
	}
}

/**
 * Render notes
 */
function renderNotes() {
	if (notes.length === 0) {
		notesList.innerHTML = '<div class="empty-state">No notes yet</div>';
		return;
	}
	
	notesList.innerHTML = notes.map(note => `
		<div class="note-item">
			<div class="note-header">
				<span class="note-page">Page ${note.page}</span>
				<span class="note-date">${formatDate(note.timestamp)}</span>
			</div>
			<div class="note-content">${escapeHtml(note.note)}</div>
		</div>
	`).join('');
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
		saveNoteBtn.disabled = true;
		saveNoteBtn.textContent = 'Saving...';
		
		const response = await fetch(`${API_BASE_URL}/save-note`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({
				filename: currentDocId,
				page: currentPage,
				note: note
			})
		});
		
		if (response.ok) {
			alert('Note saved successfully!');
			noteInput.value = '';
			await loadNotes();
		} else {
			alert('Failed to save note');
		}
	} catch (error) {
		console.error('Error saving note:', error);
		alert('Failed to save note');
	} finally {
		saveNoteBtn.disabled = false;
		saveNoteBtn.textContent = 'Save Note';
	}
}

// =============================================================================
// MCQ (Multiple Choice Questions) Logic
// =============================================================================
// Flow: loadQuestions() -> renderQuestions() -> selectOption() -> submitAnswer()
// - loadQuestions: Fetches MCQs from /render-mcqs endpoint
// - renderQuestions: Dynamically creates DOM elements for each question
// - selectOption: Handles user selection of an answer option
// - submitAnswer: Validates answer, updates score, shows feedback
// API Endpoints:
// - GET /render-mcqs: Fetch questions from sample_mcq.json
// - GET /get-score?filename=xxx: Load saved score
// - POST /save-score: Save current score with {score, filename}
// =============================================================================

/**
 * Load questions from server
 */
async function loadQuestions() {
	try {
		console.log('Loading MCQ questions from server...');
		const response = await fetch(`${API_BASE_URL}/render-mcqs`);
		
		if (response.ok) {
			const data = await response.json();
			questions = data.questions || data || [];
			console.log(`Loaded ${questions.length} questions successfully`);
			
			if (questions.length > 0) {
				renderQuestions();
			} else {
				questionsList.innerHTML = '<div class="loading-state">No questions available</div>';
			}
		} else {
			console.error('Failed to load questions:', response.status, response.statusText);
			questionsList.innerHTML = '<div class="loading-state">No questions available</div>';
		}
	} catch (error) {
		console.error('Error loading questions:', error);
		questionsList.innerHTML = '<div class="loading-state">Error loading questions. Please try again.</div>';
	}
}

/**
 * Render MCQ questions
 */
function renderQuestions() {
    if (!questions || questions.length === 0) {
        questionsList.innerHTML = '<div class="loading-state">No questions available</div>';
        return;
    }
    
    // Clear existing content
    questionsList.innerHTML = '';
    
    questions.forEach((mcq, index) => {
        const mcqId = mcq.id || index;
        const correctOption = mcq.correct !== undefined ? mcq.correct : (mcq.correctAnswer !== undefined ? mcq.correctAnswer : mcq.correct_option);
        
        // Create container
        const mcqContainer = document.createElement('div');
        mcqContainer.className = 'question-item mcq-container';
        mcqContainer.dataset.mcqId = mcqId;
        mcqContainer.dataset.correct = correctOption;
        mcqContainer.dataset.submitted = 'false';
        mcqContainer.dataset.index = index;
        
        // Question text
        const questionDiv = document.createElement('div');
        questionDiv.className = 'question-text mcq-question';
        questionDiv.textContent = `${index + 1}. ${mcq.question}`;
        mcqContainer.appendChild(questionDiv);
        
        // Options list
        const optionsList = document.createElement('ul');
        optionsList.className = 'question-options mcq-options';
        
        mcq.options.forEach((option, optionIndex) => {
            const optionItem = document.createElement('li');
            optionItem.className = 'question-option mcq-option';
            optionItem.dataset.optionIndex = optionIndex;
            optionItem.textContent = `${String.fromCharCode(65 + optionIndex)}. ${option}`;
            
            // Add click handler
            optionItem.addEventListener('click', () => {
                selectOption(mcqId, optionIndex);
            });
            
            optionsList.appendChild(optionItem);
        });
        
        mcqContainer.appendChild(optionsList);
        
        // Submit button
        const submitBtn = document.createElement('button');
        submitBtn.className = 'btn btn-primary mcq-submit';
        submitBtn.textContent = 'Submit Answer';
        submitBtn.disabled = true;
        submitBtn.dataset.mcqId = mcqId;
        submitBtn.addEventListener('click', () => {
            submitAnswer(mcqId);
        });
        mcqContainer.appendChild(submitBtn);
        
        // Result div
        const resultDiv = document.createElement('div');
        resultDiv.className = 'mcq-result';
        resultDiv.dataset.mcqId = mcqId;
        mcqContainer.appendChild(resultDiv);
        
        // Explanation div
        const explanationDiv = document.createElement('div');
        explanationDiv.className = 'mcq-explanation';
        explanationDiv.style.display = 'none';
        
        const explanationTitle = document.createElement('div');
        explanationTitle.className = 'mcq-explanation-title';
        explanationTitle.textContent = 'Explanation:';
        explanationDiv.appendChild(explanationTitle);
        
        const explanationText = document.createElement('div');
        explanationText.className = 'mcq-explanation-text';
        explanationText.textContent = mcq.explanation || 'No explanation available';
        explanationDiv.appendChild(explanationText);
        
        mcqContainer.appendChild(explanationDiv);
        
        // Add to questions list
        questionsList.appendChild(mcqContainer);
    });
    
    console.log(`Rendered ${questions.length} MCQ questions`);
}

/**
 * Select answer option
 * @param {number} mcqId - Question ID
 * @param {number} optionIndex - Option index
 */
function selectOption(mcqId, optionIndex) {
    const container = document.querySelector(`[data-mcq-id="${mcqId}"]`);
    if (!container) {
        console.error('Container not found for mcqId:', mcqId);
        return;
    }
    
    const options = container.querySelectorAll('.mcq-option');
    const submitBtn = container.querySelector('.mcq-submit');
    
    // Check if already submitted (avoid interaction with submitted questions)
    if (container.dataset.submitted === 'true') {
        console.log('Question already submitted, ignoring selection');
        return;
    }
    
    // Check if options are disabled (safety check)
    if (options[0].classList.contains('disabled')) {
        return;
    }
    
    // Remove previous selection
    options.forEach(opt => opt.classList.remove('selected'));
    
    // Select current option
    const selectedOption = options[optionIndex];
    if (selectedOption) {
        selectedOption.classList.add('selected');
        console.log(`Selected option ${optionIndex} for question ${mcqId}`);
    }
    
    // Enable submit button
    if (submitBtn) {
        submitBtn.disabled = false;
    }
    
    // Store selected option
    container.dataset.selectedOption = optionIndex;
}

/**
 * Submit answer
 * @param {number} mcqId - Question ID
 */
function submitAnswer(mcqId) {
    const container = document.querySelector(`[data-mcq-id="${mcqId}"]`);
    if (!container) {
        console.error('Container not found for mcqId:', mcqId);
        return;
    }
    
    const options = container.querySelectorAll('.mcq-option');
    const submitBtn = container.querySelector('.mcq-submit');
    const resultDiv = container.querySelector('.mcq-result');
    const explanationDiv = container.querySelector('.mcq-explanation');
    const selectedOption = parseInt(container.dataset.selectedOption);
    const correctOption = parseInt(container.dataset.correct);
    
    console.log('Submit Answer Debug:', {
        mcqId,
        selectedOption,
        correctOption,
        hasContainer: !!container,
        optionsCount: options.length,
        alreadySubmitted: container.dataset.submitted
    });
    
    // Validation: Check if no option selected
    if (isNaN(selectedOption)) {
        alert('Please select an answer');
        return;
    }
    
    // Check if already submitted (to avoid double counting)
    if (container.dataset.submitted === 'true') {
        console.log('Question already submitted, ignoring');
        return;
    }
    
    // Mark as submitted
    container.dataset.submitted = 'true';
    answeredQuestions.add(mcqId);
    
    // Disable further interaction
    options.forEach(opt => {
        opt.classList.add('disabled');
        opt.style.pointerEvents = 'none';
        opt.style.cursor = 'default';
    });
    
    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.style.opacity = '0.5';
    }
    
    // Mark correct and incorrect options with visual styling
    options.forEach((opt, idx) => {
        if (idx === correctOption) {
            opt.classList.add('correct');
            opt.style.backgroundColor = '#d4edda';
            opt.style.borderColor = '#28a745';
            opt.style.color = '#155724';
            opt.style.fontWeight = 'bold';
        } else if (idx === selectedOption && idx !== correctOption) {
            opt.classList.add('incorrect');
            opt.style.backgroundColor = '#f8d7da';
            opt.style.borderColor = '#dc3545';
            opt.style.color = '#721c24';
            opt.style.fontWeight = 'bold';
        }
    });
    
    // Update score tracking
    attemptedQuestions++;
    const isCorrect = selectedOption === correctOption;
    
    if (isCorrect) {
        correctAnswers++;
        userScore += POINTS_PER_CORRECT;
    }
    
    console.log('Score Update:', {
        isCorrect,
        correctAnswers,
        attemptedQuestions,
        userScore,
        pointsEarned: isCorrect ? POINTS_PER_CORRECT : 0
    });
    
    // Update display and save to server
    updateScore();
    saveScore();
    
    // Show result message
    if (isCorrect) {
        resultDiv.textContent = `✓ Correct! +${POINTS_PER_CORRECT} points`;
        resultDiv.className = 'mcq-result show correct-result';
        resultDiv.style.display = 'block';
        resultDiv.style.color = '#28a745';
        resultDiv.style.fontWeight = 'bold';
        resultDiv.style.marginTop = '10px';
        resultDiv.style.padding = '10px';
        resultDiv.style.backgroundColor = '#d4edda';
        resultDiv.style.border = '1px solid #c3e6cb';
        resultDiv.style.borderRadius = '4px';
    } else {
        resultDiv.textContent = '✗ Incorrect. The correct answer is highlighted in green.';
        resultDiv.className = 'mcq-result show incorrect-result';
        resultDiv.style.display = 'block';
        resultDiv.style.color = '#721c24';
        resultDiv.style.fontWeight = 'bold';
        resultDiv.style.marginTop = '10px';
        resultDiv.style.padding = '10px';
        resultDiv.style.backgroundColor = '#f8d7da';
        resultDiv.style.border = '1px solid #f5c6cb';
        resultDiv.style.borderRadius = '4px';
    }
    
    // Show explanation
    if (explanationDiv) {
        explanationDiv.classList.add('show');
        explanationDiv.style.display = 'block';
        explanationDiv.style.marginTop = '15px';
        explanationDiv.style.padding = '12px';
        explanationDiv.style.backgroundColor = '#f8f9fa';
        explanationDiv.style.borderLeft = '4px solid #007bff';
        explanationDiv.style.borderRadius = '4px';
    }
}

/**
 * Update score display
 */
function updateScore() {
	if (scoreValue) {
		scoreValue.textContent = userScore;
	}
	if (scoreDetails) {
		const percentage = attemptedQuestions > 0 ? Math.round((correctAnswers / attemptedQuestions) * 100) : 0;
		scoreDetails.textContent = `${correctAnswers} correct / ${attemptedQuestions} attempted (${percentage}%)`;
	}
	
	console.log('Score display updated:', {
		score: userScore,
		correct: correctAnswers,
		attempted: attemptedQuestions
	});
}

/**
 * Load score from server
 */
async function loadScore() {
	try {
		const response = await fetch(`${API_BASE_URL}/get-score?filename=${encodeURIComponent(currentDocId)}`);
		
		if (response.ok) {
			const data = await response.json();
			userScore = data.score || 0;
			console.log('Score loaded from server:', {
				filename: data.filename,
				score: userScore
			});
			updateScore();
		} else {
			console.warn('Failed to load score, starting fresh');
			userScore = 0;
			updateScore();
		}
	} catch (error) {
		console.error('Error loading score:', error);
		userScore = 0;
		updateScore();
	}
}

/**
 * Save score to server
 */
async function saveScore() {
	try {
		const response = await fetch(`${API_BASE_URL}/save-score`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({
				score: userScore,
				filename: currentDocId
			})
		});
		
		if (response.ok) {
			console.log('Score saved:', userScore);
		} else {
			console.error('Failed to save score');
		}
	} catch (error) {
		console.error('Error saving score:', error);
	}
}

/**
 * Show error message
 * @param {string} message - Error message
 */
function showError(message) {
	documentTitle.textContent = 'Error';
	pdfContainer.innerHTML = `
		<div class="empty-state">
			<svg class="empty-icon" xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
				<circle cx="12" cy="12" r="10"></circle>
				<line x1="12" y1="8" x2="12" y2="12"></line>
				<line x1="12" y1="16" x2="12.01" y2="16"></line>
			</svg>
			<p class="empty-message">${escapeHtml(message)}</p>
		</div>
	`;
}

/**
 * Escape HTML to prevent XSS
 * @param {string} text - Text to escape
 * @returns {string} Escaped text
 */
function escapeHtml(text) {
	const div = document.createElement('div');
	div.textContent = text;
	return div.innerHTML;
}

/**
 * Format date
 * @param {string|number|Date} date - Date to format
 * @returns {string} Formatted date
 */
function formatDate(date) {
	const d = new Date(date);
	return d.toLocaleDateString('en-US', {
		year: 'numeric',
		month: 'short',
		day: 'numeric',
		hour: '2-digit',
		minute: '2-digit'
	});
}

// Make functions globally accessible for onclick handlers
window.goToPage = goToPage;
window.selectOption = selectOption;
window.submitAnswer = submitAnswer;

// Initialize when DOM is ready
if (document.readyState === 'loading') {
	document.addEventListener('DOMContentLoaded', init);
} else {
	init();
}

// Export for testing
export { init, loadPdf, renderPage, goToPage };
