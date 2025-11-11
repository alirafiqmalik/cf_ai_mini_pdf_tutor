/**
 * Score Routes
 * Routes for score management
 */

import { Route } from './pdf.routes';
import * as scoreController from '../controllers/score.controller';

export const scoreRoutes: Route[] = [
	{
		pattern: /^\/get-score$/,
		method: 'GET',
		handler: scoreController.handleGetScore
	},
	{
		pattern: /^\/save-score$/,
		method: 'POST',
		handler: scoreController.handleSaveScore
	}
];
