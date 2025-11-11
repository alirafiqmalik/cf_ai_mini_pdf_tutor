/**
 * Notes Component
 * Handles note display, creation, and management
 */

import { getNotes, saveNote } from '../services/notes.service.js';
import { escapeHtml, formatDate } from '../shared/utils.js';
import * as dom from '../shared/dom.js';

// Component State
let noteInput = null;
let saveNoteBtn = null;
let notesList = null;
let currentDocId = null;
let currentPage = 1;
let notes = [];

/**
 * Initialize notes component
 * @param {Object} elements - DOM elements
 * @param {string} docId - Document ID
 */
export function initNotes(elements, docId) {
	noteInput = elements.noteInput;
	saveNoteBtn = elements.saveNoteBtn;
	notesList = elements.notesList;
	currentDocId = docId;
	
	// Setup event listeners
	if (saveNoteBtn) {
		saveNoteBtn.addEventListener('click', handleSaveNote);
	}
	
	// Enable save on Enter (Ctrl+Enter)
	if (noteInput) {
		noteInput.addEventListener('keydown', (e) => {
			if (e.key === 'Enter' && e.ctrlKey) {
				e.preventDefault();
				handleSaveNote();
			}
		});
	}
}

/**
 * Set current page
 * @param {number} pageNum - Current page number
 */
export function setCurrentPage(pageNum) {
	currentPage = pageNum;
}

/**
 * Load notes from server
 */
export async function loadNotes() {
	if (!currentDocId || !notesList) {
		console.error('Notes component not initialized');
		return;
	}
	
	try {
		const data = await getNotes(currentDocId);
		notes = data.notes || [];
		renderNotes();
	} catch (error) {
		console.error('Error loading notes:', error);
		dom.setHtml(notesList, '<div class="empty-state">Failed to load notes</div>');
	}
}

/**
 * Render notes list
 */
function renderNotes() {
	if (!notesList) return;
	
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
	if (!noteInput || !currentDocId) return;
	
	const note = noteInput.value.trim();
	
	if (!note) {
		alert('Please enter a note');
		return;
	}
	
	try {
		// Disable button while saving
		if (saveNoteBtn) {
			saveNoteBtn.disabled = true;
			dom.setText(saveNoteBtn, 'Saving...');
		}
		
		await saveNote(currentDocId, currentPage, note);
		
		// Add note to local list
		notes.push({
			filename: currentDocId,
			page: currentPage,
			note: note,
			timestamp: Date.now()
		});
		
		// Clear input and re-render
		noteInput.value = '';
		renderNotes();
		
		console.log('Note saved successfully');
	} catch (error) {
		console.error('Error saving note:', error);
		alert('Failed to save note. Please try again.');
	} finally {
		// Re-enable button
		if (saveNoteBtn) {
			saveNoteBtn.disabled = false;
			dom.setText(saveNoteBtn, 'Save Note');
		}
	}
}

/**
 * Clear notes display
 */
export function clearNotes() {
	notes = [];
	if (notesList) {
		dom.setHtml(notesList, '<div class="empty-state">No notes yet</div>');
	}
	if (noteInput) {
		noteInput.value = '';
	}
}

/**
 * Get all notes
 * @returns {Array} Notes array
 */
export function getAllNotes() {
	return notes;
}

/**
 * Get notes for specific page
 * @param {number} pageNum - Page number
 * @returns {Array} Notes for the page
 */
export function getNotesForPage(pageNum) {
	return notes.filter(note => note.page === pageNum);
}
