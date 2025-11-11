/**
 * MCQ Component
 * Handles Multiple Choice Questions display, interaction, and scoring
 */

import { getMcqs } from '../services/mcq.service.js';
import { getScore, saveScore } from '../services/score.service.js';
import { POINTS_PER_CORRECT } from '../shared/constants.js';
import * as dom from '../shared/dom.js';

// Component State
let questionsList = null;
let scoreValue = null;
let currentDocId = null;
let userScore = 0;
let answeredQuestions = new Set();

/**
 * Initialize MCQ component
 * @param {Object} elements - DOM elements
 * @param {string} docId - Document ID
 */
export function initMcq(elements, docId) {
	questionsList = elements.questionsList;
	scoreValue = elements.scoreValue;
	currentDocId = docId;
}

/**
 * Load MCQ questions for a specific page
 * @param {number} pageNumber - Page number to load questions for
 */
export async function loadQuestions(pageNumber) {
	if (!questionsList || !currentDocId) {
		console.error('MCQ component not initialized');
		return;
	}
	
	try {
		console.log('Loading MCQ questions from server...');
		dom.setHtml(questionsList, '<div class="loading-state">Loading questions...</div>');
		
		const data = await getMcqs(currentDocId, pageNumber);
		const questions = data.questions || [];
		
		if (questions.length > 0) {
			renderQuestions(questions);
		} else {
			dom.setHtml(questionsList, `<div class="loading-state">No questions available for page ${pageNumber}</div>`);
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
 * @param {Array} questions - Array of question objects
 */
function renderQuestions(questions) {
	if (!questions || questions.length === 0) {
		dom.setHtml(questionsList, '<div class="loading-state">No questions available</div>');
		return;
	}
	
	dom.clearContent(questionsList);
	
	questions.forEach((mcq, index) => {
		const mcqId = mcq.id || index;
		const correctOption = mcq.correct !== undefined ? mcq.correct : 
			(mcq.correctAnswer !== undefined ? mcq.correctAnswer : mcq.correct_option);
		
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
 * Handle option selection
 * @param {HTMLElement} mcqContainer - Question container element
 * @param {number} optIndex - Selected option index
 */
function handleOptionSelect(mcqContainer, optIndex) {
	if (mcqContainer.dataset.submitted === 'true') return;
	
	// Check if options are disabled (safety check)
	const options = mcqContainer.querySelectorAll('.question-option');
	if (options[0]?.classList.contains('disabled')) return;
	
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
 * Handle answer submission
 * @param {HTMLElement} mcqContainer - Question container element
 * @param {Object} mcq - Question object
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
	if (scoreValue) {
		dom.setText(scoreValue, userScore);
	}
}

/**
 * Save score to server
 */
async function saveScoreToServer() {
	if (!currentDocId) return;
	
	try {
		await saveScore(currentDocId, userScore);
		console.log('Score saved:', userScore);
	} catch (error) {
		console.error('Error saving score:', error);
	}
}

/**
 * Load score from server
 */
export async function loadScore() {
	if (!currentDocId) {
		console.error('MCQ component not initialized');
		return;
	}
	
	try {
		const data = await getScore(currentDocId);
		
		if (data && data.score !== undefined) {
			userScore = data.score;
			updateScoreDisplay();
			console.log('Score loaded:', userScore);
		}
	} catch (error) {
		console.error('Error loading score:', error);
		// Don't show error to user, just start from 0
		userScore = 0;
		updateScoreDisplay();
	}
}

/**
 * Clear all questions
 */
export function clearQuestions() {
	if (questionsList) {
		dom.setHtml(questionsList, '<div class="loading-state">Select a page to view questions</div>');
	}
	answeredQuestions.clear();
}

/**
 * Reset score
 */
export function resetScore() {
	userScore = 0;
	answeredQuestions.clear();
	updateScoreDisplay();
	saveScoreToServer();
}

/**
 * Get current score
 * @returns {number} Current score
 */
export function getCurrentScore() {
	return userScore;
}

/**
 * Get answered questions count
 * @returns {number} Number of answered questions
 */
export function getAnsweredQuestionsCount() {
	return answeredQuestions.size;
}
