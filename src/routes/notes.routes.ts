/**
 * Notes Routes
 * Routes for note operations
 */

import { Route } from './pdf.routes';
import * as notesController from '../controllers/notes.controller';

export const notesRoutes: Route[] = [
	{
		pattern: /^\/save-note$/,
		method: 'POST',
		handler: notesController.handleSaveNote
	},
	{
		pattern: /^\/get-notes$/,
		method: 'GET',
		handler: notesController.handleGetNotes
	}
];
