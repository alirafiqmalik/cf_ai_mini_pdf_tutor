/**
 * MCQ Routes
 * Routes for MCQ retrieval
 */

import { Route } from './pdf.routes';
import * as mcqController from '../controllers/mcq.controller';

export const mcqRoutes: Route[] = [
	{
		pattern: /^\/render-mcqs$/,
		method: 'GET',
		handler: mcqController.handleGetMcqs
	}
];
