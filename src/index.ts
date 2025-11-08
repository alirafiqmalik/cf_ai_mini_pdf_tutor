
interface MCQQuestion {
    id: number;
    question: string;
    options: string[];
    correct: number;
}


interface UploadedFile {
	filename: string;
	timestamp: number;
	size: number;
	originalName: string;
}


interface Note {
	filename: string;
	page: number;
	note: string;
	timestamp: number;
}


const CONFIG = {
	MAX_FILE_SIZE: 50 * 1024 * 1024, // 50MB
	ALLOWED_ORIGINS: ['*'], // Configure for production
	MAX_NOTE_LENGTH: 10000,
	RATE_LIMIT: 100, // requests per minute
} as const;

// In-memory storage (for demo purposes)
// TODO: In production, migrate to Cloudflare R2, KV, or D1
const uploadedFiles = new Map<string, ArrayBuffer>();
const fileMetadata = new Map<string, UploadedFile>();
const notes = new Map<string, Note[]>();
const scores = new Map<string, number>();

export default {
	async fetch(request, env, ctx): Promise<Response> {
		const url = new URL(request.url);
		
		// CORS headers configuration
		const corsHeaders = getCorsHeaders();

		// Handle CORS preflight requests
		if (request.method === 'OPTIONS') {
			return new Response(null, { 
				status: 204,
				headers: corsHeaders 
			});
		}

		try {
			// Request logging for debugging
			console.log(`[${request.method}] ${url.pathname}`);

			// Route handling with proper HTTP methods
			const route = getRoute(url.pathname, request.method);
			
			if (route) {
				return await route.handler(request, env, ctx, corsHeaders);
			}

			// 404 - Route not found
			return createJsonResponse(
				{ error: 'Route not found' },
				404,
				corsHeaders
			);

		} catch (error) {
			// Global error handler
			console.error('Unhandled error:', error);
			return createJsonResponse(
				{ error: 'Internal server error' },
				500,
				corsHeaders
			);
		}
	},
} satisfies ExportedHandler<Env>;


function getCorsHeaders(): Record<string, string> {
	return {
		'Access-Control-Allow-Origin': CONFIG.ALLOWED_ORIGINS[0],
		'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
		'Access-Control-Allow-Headers': 'Content-Type',
		'Access-Control-Max-Age': '86400',
	};
}


interface Route {
	pattern: RegExp;
	method: string;
	handler: (request: Request, env: Env, ctx: ExecutionContext, corsHeaders: Record<string, string>) => Promise<Response>;
}

const routes: Route[] = [
	{
		pattern: /^\/upload-pdf$/,
		method: 'POST',
		handler: handlePdfUpload
	},
		{
		pattern: /^\/get-pdf\/.+$/,
		method: 'GET',
		handler: handleFileServe
	},
	// {
	// 	pattern: /^\/temp\/.+$/,
	// 	method: 'GET',
	// 	handler: handleFileServe
	// },
	{
		pattern: /^\/save-note$/,
		method: 'POST',
		handler: handleSaveNote
	},
	{
		pattern: /^\/get-notes$/,
		method: 'GET',
		handler: handleGetNotes
	},
	{
		pattern: /^\/get-score$/,
		method: 'GET',
		handler: handleGetScore
	},
	{
		pattern: /^\/save-score$/,
		method: 'POST',
		handler: handleSaveScore
	},
	{
		pattern: /^\/render-mcqs$/,
		method: 'GET',
		handler: handleRenderMcqs
	},
];


function getRoute(pathname: string, method: string): Route | null {
	return routes.find(route => 
		route.pattern.test(pathname) && route.method === method
	) || null;
}


function createJsonResponse(
	data: any,
	status: number = 200,
	corsHeaders: Record<string, string> = {}
): Response {
	return new Response(JSON.stringify(data), {
		status,
		headers: {
			...corsHeaders,
			'Content-Type': 'application/json',
		}
	});
}



async function handleRenderMcqs(
    request: Request,
    env: Env,
    ctx: ExecutionContext,
    corsHeaders: Record<string, string>
): Promise<Response> {
    try {
        // Parse request body to get filename if provided
        let filename: string | null = null;
        
        if (request.body) {
            try {
                const data = await request.json() as { filename?: string };
                filename = data.filename || null;
            } catch {
                // Empty body or invalid JSON, continue without filename
            }
        }

        // If no filename provided, get the most recent uploaded file
        if (!filename && fileMetadata.size > 0) {
            const files = Array.from(fileMetadata.values());
            files.sort((a, b) => b.timestamp - a.timestamp);
            filename = files[0].filename;
        }

        // Read sample MCQs from JSON file
        const sampleMcqPath = './src/sample_mcq.json';
        let questions: MCQQuestion[] = [];

        try {
            // In Cloudflare Workers, we need to import the JSON file
            // For now, we'll use a dynamic import
            const mcqModule = await import('./sample_mcq.json');
            questions = mcqModule.default || mcqModule;
        } catch (error) {
            console.error('Error loading sample_mcq.json:', error);
            return createJsonResponse(
                { error: 'Failed to load sample questions' },
                500,
                corsHeaders
            );
        }

        console.log(`Loaded ${questions.length} MCQs from sample_mcq.json`);

        return createJsonResponse({
            success: true,
            filename: filename || 'sample',
            count: questions.length,
            questions: questions
        }, 200, corsHeaders);

    } catch (error) {
        console.error('Render MCQs error:', error);
        return createJsonResponse(
            { error: 'Failed to generate MCQs' },
            500,
            corsHeaders
        );
    }
}






async function handlePdfUpload(
	request: Request,
	env: Env,
	ctx: ExecutionContext,
	corsHeaders: Record<string, string>
): Promise<Response> {
	try {
		const formData = await request.formData();
		const file = formData.get('pdf') as File;
		
		// Validation: Check if file exists
		if (!file) {
			return createJsonResponse(
				{ error: 'No file uploaded' },
				400,
				corsHeaders
			);
		}

		// Validation: Check file type
		if (!file.type.includes('pdf')) {
			return createJsonResponse(
				{ error: 'File must be a PDF' },
				400,
				corsHeaders
			);
		}

		// Validation: Check file size
		if (file.size > CONFIG.MAX_FILE_SIZE) {
			return createJsonResponse(
				{ error: `File size exceeds maximum of ${CONFIG.MAX_FILE_SIZE} bytes` },
				400,
				corsHeaders
			);
		}

		// Generate unique filename with sanitization
		const timestamp = Date.now();
		const originalName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
		const filename = `${timestamp}_${originalName}`;

		// Store file in memory
		const arrayBuffer = await file.arrayBuffer();
		uploadedFiles.set(filename, arrayBuffer);
		
		// Store metadata
		fileMetadata.set(filename, {
			filename,
			timestamp,
			size: file.size,
			originalName: file.name
		});

		console.log(`File uploaded successfully: ${filename}`);

		return createJsonResponse({
			success: true,
			filename: filename,
			originalName: file.name,
			size: file.size
		}, 200, corsHeaders);

	} catch (error) {
		console.error('Upload error:', error);
		return createJsonResponse(
			{ error: 'Upload failed' },
			500,
			corsHeaders
		);
	}
}


async function handleFileServe(
	request: Request,
	env: Env,
	ctx: ExecutionContext,
	corsHeaders: Record<string, string>
): Promise<Response> {
	const url = new URL(request.url);
	const pathname = url.pathname;
	
	// Extract filename from path
	const filename = pathname.replace('/get-pdf/', '');
	
	// Security: Prevent directory traversal
	if (filename.includes('..') || filename.includes('/')) {
		return createJsonResponse(
			{ error: 'Invalid filename' },
			400,
			corsHeaders
		);
	}
	
	// Check if file exists in memory
	if (uploadedFiles.has(filename)) {
		const file = uploadedFiles.get(filename)!;
		const contentType = filename.endsWith('.pdf') 
			? 'application/pdf' 
			: filename.endsWith('.json')
			? 'application/json'
			: 'application/octet-stream';
		
		return new Response(file, {
			headers: {
				...corsHeaders,
				'Content-Type': contentType,
				'Cache-Control': 'public, max-age=3600'
			}
		});
	}

	// File not found
	return createJsonResponse(
		{ error: 'File not found' },
		404,
		corsHeaders
	);
}


async function handleSaveNote(
	request: Request,
	env: Env,
	ctx: ExecutionContext,
	corsHeaders: Record<string, string>
): Promise<Response> {
	try {
		const data = await request.json() as Partial<Note>;
		
		// Validation: Check required fields
		if (!data.filename || !data.note) {
			return createJsonResponse(
				{ error: 'Missing required fields: filename and note' },
				400,
				corsHeaders
			);
		}

		// Validation: Check note length
		if (data.note.length > CONFIG.MAX_NOTE_LENGTH) {
			return createJsonResponse(
				{ error: `Note exceeds maximum length of ${CONFIG.MAX_NOTE_LENGTH} characters` },
				400,
				corsHeaders
			);
		}

		// Store note
		const noteEntry: Note = {
			filename: data.filename,
			page: data.page || 1,
			note: data.note,
			timestamp: Date.now()
		};

		if (!notes.has(data.filename)) {
			notes.set(data.filename, []);
		}
		notes.get(data.filename)!.push(noteEntry);

		console.log(`Note saved for ${data.filename}, page ${noteEntry.page}`);

		return createJsonResponse({
			success: true,
			message: 'Note saved successfully',
			note: noteEntry
		}, 200, corsHeaders);

	} catch (error) {
		console.error('Save note error:', error);
		return createJsonResponse(
			{ error: 'Failed to save note' },
			500,
			corsHeaders
		);
	}
}


async function handleGetNotes(
	request: Request,
	env: Env,
	ctx: ExecutionContext,
	corsHeaders: Record<string, string>
): Promise<Response> {
	const url = new URL(request.url);
	const filename = url.searchParams.get('filename');
	
	// Validation: Check filename parameter
	if (!filename) {
		return createJsonResponse(
			{ error: 'Filename parameter is required' },
			400,
			corsHeaders
		);
	}

	// Get notes for the file
	const fileNotes = notes.get(filename) || [];
	
	return createJsonResponse({
		success: true,
		filename,
		count: fileNotes.length,
		notes: fileNotes
	}, 200, corsHeaders);
}





async function handleGetScore(
    request: Request,
    env: Env,
    ctx: ExecutionContext,
    corsHeaders: Record<string, string>
): Promise<Response> {
    try {
        // GET request - use query parameters instead of body
        const url = new URL(request.url);
        let filename = url.searchParams.get('filename');

        // If no filename provided, get the most recent uploaded file
        if (!filename && fileMetadata.size > 0) {
            const files = Array.from(fileMetadata.values());
            files.sort((a, b) => b.timestamp - a.timestamp);
            filename = files[0].filename;
        }

        // Use a default key if still no filename
        const scoreKey = filename || 'default';

        // Load score from storage
        const score = scores.get(scoreKey) || 0;

        console.log(`Score loaded for ${scoreKey}: ${score}`);

        return createJsonResponse({
            success: true,
            filename: scoreKey,
            score: score
        }, 200, corsHeaders);

    } catch (error) {
        console.error('Get score error:', error);
        return createJsonResponse(
            { error: 'Failed to get score' },
            500,
            corsHeaders
        );
    }
}



async function handleSaveScore(
    request: Request,
    env: Env,
    ctx: ExecutionContext,
    corsHeaders: Record<string, string>
): Promise<Response> {
    try {
        const data = await request.json() as { score: number; filename?: string };
        
        // Validation: Check score type and range
        if (typeof data.score !== 'number' || data.score < 0) {
            return createJsonResponse(
                { error: 'Invalid score: must be a non-negative number' },
                400,
                corsHeaders
            );
        }

        // If no filename provided, get the most recent uploaded file
        let filename = data.filename;
        if (!filename && fileMetadata.size > 0) {
            const files = Array.from(fileMetadata.values());
            files.sort((a, b) => b.timestamp - a.timestamp);
            filename = files[0].filename;
        }

        // Use a default key if still no filename
        const scoreKey = filename || 'default';

        // Save score to storage
        scores.set(scoreKey, data.score);
        
        console.log(`Score saved for ${scoreKey}: ${data.score}`);

        return createJsonResponse({
            success: true,
            message: 'Score saved successfully',
            filename: scoreKey,
            score: data.score
        }, 200, corsHeaders);

    } catch (error) {
        console.error('Save score error:', error);
        return createJsonResponse(
            { error: 'Failed to save score' },
            500,
            corsHeaders
        );
    }
}
