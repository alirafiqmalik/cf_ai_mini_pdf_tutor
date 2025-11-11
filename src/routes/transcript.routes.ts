/**
 * Transcript Routes
 * Routes for transcript retrieval
 */

import { Route } from './pdf.routes';
import * as transcriptController from '../controllers/transcript.controller';

export const transcriptRoutes: Route[] = [
	{
		pattern: /^\/get-transcript$/,
		method: 'GET',
		handler: transcriptController.handleGetTranscript
	}
];
