/**
 * Route Registry
 * Central registry for all routes
 */

import { Route } from './pdf.routes';
import { pdfRoutes } from './pdf.routes';
import { transcriptRoutes } from './transcript.routes';
import { mcqRoutes } from './mcq.routes';
import { notesRoutes } from './notes.routes';
import { scoreRoutes } from './score.routes';

/**
 * All application routes
 */
export const routes: Route[] = [
	...pdfRoutes,
	...transcriptRoutes,
	...mcqRoutes,
	...notesRoutes,
	...scoreRoutes
];

/**
 * Find matching route for pathname and method
 */
export function findRoute(pathname: string, method: string): Route | null {
	return routes.find(route => 
		route.pattern.test(pathname) && route.method === method
	) || null;
}
