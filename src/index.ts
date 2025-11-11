interface Env {
    AI: Ai;
    pdf_tutor_storage: R2Bucket;
}

/**
 * Represents a chat message.
 */
export interface ChatMessage {
	role: "system" | "user" | "assistant";
	content: string;
}




/**
 * Handles chat API requests
 */
async function handleChatRequest(
	messages: ChatMessage[],
	env: Env,
): Promise<Response> {
	try {

		// Add system prompt if not present
		if (!messages.some((msg) => msg.role === "system")) {
			messages.unshift({ role: "system", content: SYSTEM_PROMPT });
		}

		const response = await env.AI.run(
			MODEL_ID,
			{
				messages,
				max_tokens: 1024,
			},
			{
				returnRawResponse: true,
				// Uncomment to use AI Gateway
				// gateway: {
				//   id: "YOUR_GATEWAY_ID", // Replace with your AI Gateway ID
				//   skipCache: false,      // Set to true to bypass cache
				//   cacheTtl: 3600,        // Cache time-to-live in seconds
				// },
			},
		);

		// Return streaming response
		return response;
	} catch (error) {
		console.error("Error processing chat request:", error);
		return new Response(
			JSON.stringify({ error: "Failed to process request" }),
			{
				status: 500,
				headers: { "content-type": "application/json" },
			},
		);
	}
}


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


// Keep in-memory storage for metadata, notes, and scores
// PDFs will be stored in R2
const fileMetadata = new Map<string, UploadedFile>();
const notes = new Map<string, Note[]>();
const scores = new Map<string, number>();



// R2 Storage Keys
const R2_KEYS = {
    PDF_PREFIX: 'pdfs/',
    METADATA_PREFIX: 'metadata/',
    LLM_TRANSCRIPT_PREFIX: 'llm_transcripts/',
    LLM_MCQ_PREFIX: 'llm_mcqs/'
} as const;

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

// Add new routes
const routes: Route[] = [
    {
        pattern: /^\/upload-pdf$/,
        method: 'POST',
        handler: handlePdfUpload
    },
    {
        pattern: /^\/get-pdf\/.+$/,
        method: 'GET',
        handler: handleGetPdf
    },
    {
        pattern: /^\/list-pdfs$/,
        method: 'GET',
        handler: handleListPdfs
    },
    {
        pattern: /^\/delete-pdf\/.+$/,
        method: 'DELETE',
        handler: handleDeletePdf
    },
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
    {
        pattern: /^\/get-transcript$/,
        method: 'GET',
        handler: handleGetTranscript
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
        const url = new URL(request.url);
        
        // Get page number from query parameter
        const pageParam = url.searchParams.get('page');
        const pageNumber = pageParam ? parseInt(pageParam, 10) : 1;

        // Validate page number
        if (isNaN(pageNumber) || pageNumber < 1) {
            return createJsonResponse(
                { error: 'Invalid page number' },
                400,
                corsHeaders
            );
        }

        // Get filename if provided
        let filename: string | null = null;
        if (fileMetadata.size > 0) {
            const files = Array.from(fileMetadata.values());
            files.sort((a, b) => b.timestamp - a.timestamp);
            filename = files[0].filename;
        }

        // Get MCQs from R2
        if (!filename) {
            return createJsonResponse({
                error: 'No PDF uploaded',
                message: 'Please upload a PDF file first to generate MCQ questions'
            }, 404, corsHeaders);
        }

        const questions = await getLLMMCQsFromR2(filename, pageNumber, env);
        
        if (!questions || questions.length === 0) {
            console.log(`No LLM-generated MCQs found for ${filename}, page ${pageNumber}`);
            return createJsonResponse({
                error: 'No LLM-generated MCQ generated',
                message: 'MCQ questions are still being processed or not available for this page'
            }, 404, corsHeaders);
        }

        return createJsonResponse({
            success: true,
            filename: filename,
            page: pageNumber,
            count: questions.length,
            questions: questions,
            source: 'r2'
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


async function handleGetTranscript(
    request: Request,
    env: Env,
    ctx: ExecutionContext,
    corsHeaders: Record<string, string>
): Promise<Response> {
    try {
        const url = new URL(request.url);
        
        // Get page number from query parameter
        const pageParam = url.searchParams.get('page');
        const pageNumber = pageParam ? parseInt(pageParam, 10) : 1;

        // Validate page number
        if (isNaN(pageNumber) || pageNumber < 1) {
            return createJsonResponse(
                { error: 'Invalid page number' },
                400,
                corsHeaders
            );
        }

        // Get filename if provided
        let filename: string | null = null;
        if (fileMetadata.size > 0) {
            const files = Array.from(fileMetadata.values());
            files.sort((a, b) => b.timestamp - a.timestamp);
            filename = files[0].filename;
        }

        // Get transcript from R2
        if (!filename) {
            return createJsonResponse({
                error: 'No PDF uploaded',
                message: 'Please upload a PDF file first to generate transcripts'
            }, 404, corsHeaders);
        }

        const transcript = await getLLMTranscriptFromR2(filename, pageNumber, env);
        
        if (!transcript) {
            console.log(`No LLM-generated transcript found for ${filename}, page ${pageNumber}`);
            return createJsonResponse({
                error: 'No LLM-generated transcript generated',
                message: 'Transcript is still being processed or not available for this page'
            }, 404, corsHeaders);
        }

        return createJsonResponse({
            success: true,
            filename: filename,
            page: pageNumber,
            transcript: transcript,
            source: 'r2'
        }, 200, corsHeaders);

    } catch (error) {
        console.error('Render transcript error:', error);
        return createJsonResponse(
            { error: 'Failed to generate transcript' },
            500,
            corsHeaders
        );
    }
}






/**
 * Trigger function that executes after a PDF file is successfully uploaded
 * This can be extended to perform additional operations like:
 * - PDF processing
 * - OCR extraction
 * - Metadata extraction
 * - Notification sending
 * - Analytics tracking
 */
async function onPdfUploadTrigger(
	filename: string,
	fileBuffer: ArrayBuffer,
	metadata: UploadedFile,
	env: Env,
	ctx: ExecutionContext
): Promise<void> {
	try {
		// console.log('='.repeat(50));
		// console.log('Trigger for file upload executed');
		// console.log('='.repeat(50));
		// console.log(`Filename: ${filename}`);
		// console.log(`Original Name: ${metadata.originalName}`);
		// console.log(`File Size: ${metadata.size} bytes`);
		// console.log(`Timestamp: ${new Date(metadata.timestamp).toISOString()}`);
		// console.log('='.repeat(50));
		
		
		// TODO: Add custom post-upload processing logic here
		
		
	} catch (error) {
		console.error('Error in upload trigger:', error);
		// Don't throw - we don't want to fail the upload if trigger fails
	}
}


async function handlePdfUpload(
    request: Request,
    env: Env,
    ctx: ExecutionContext,
    corsHeaders: Record<string, string>
): Promise<Response> {


	 // Debug: Check R2 binding
    console.log('=== R2 DEBUG ===');
    console.log('R2 binding available?', !!env.pdf_tutor_storage);
    console.log('R2 binding type:', typeof env.pdf_tutor_storage);
    console.log('Environment keys:', Object.keys(env));
    console.log('================');
    try {
        const formData = await request.formData();
        const file = formData.get('pdf') as File;
        
        if (!file) {
            return createJsonResponse(
                { error: 'No file uploaded' },
                400,
                corsHeaders
            );
        }

        if (!file.type.includes('pdf')) {
            return createJsonResponse(
                { error: 'File must be a PDF' },
                400,
                corsHeaders
            );
        }

        if (file.size > CONFIG.MAX_FILE_SIZE) {
            return createJsonResponse(
                { error: `File size exceeds maximum of ${CONFIG.MAX_FILE_SIZE} bytes` },
                400,
                corsHeaders
            );
        }

        const timestamp = Date.now();
        const originalName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
        const filename = `${originalName}`;
        const r2Key = `${R2_KEYS.PDF_PREFIX}${filename}`;

        const arrayBuffer = await file.arrayBuffer();
        await env.pdf_tutor_storage.put(r2Key, arrayBuffer, {
            httpMetadata: {
                contentType: 'application/pdf',
            },
            customMetadata: {
                originalName: file.name,
                uploadTimestamp: timestamp.toString(),
                size: file.size.toString(),
            }
        });

        const metadata: UploadedFile = {
            filename,
            timestamp,
            size: file.size,
            originalName: file.name
        };
        fileMetadata.set(filename, metadata);

        console.log(`✓ PDF uploaded to R2: ${r2Key}`);

        ctx.waitUntil(
            onPdfUploadTrigger(filename, arrayBuffer, metadata, env, ctx)
        );

        return createJsonResponse({
            success: true,
            filename: filename,
            originalName: file.name,
            size: file.size,
            r2Key: r2Key
        }, 200, corsHeaders);

    } catch (error) {
        console.error('Upload error:', error);
        return createJsonResponse(
            { error: 'Upload failed', details: error instanceof Error ? error.message : 'Unknown error' },
            500,
            corsHeaders
        );
    }
}

// Replace handleGetPdf
async function handleGetPdf(
    request: Request,
    env: Env,
    ctx: ExecutionContext,
    corsHeaders: Record<string, string>
): Promise<Response> {
    const url = new URL(request.url);
    const pathname = url.pathname;
    
    const filename = pathname.replace('/get-pdf/', '');
    
    if (filename.includes('..') || filename.includes('/') || !filename) {
        return createJsonResponse(
            { error: 'Invalid filename' },
            400,
            corsHeaders
        );
    }

    try {
        const r2Key = `${R2_KEYS.PDF_PREFIX}${filename}`;
        const object = await env.pdf_tutor_storage.get(r2Key);

        if (!object) {
            console.log(`✗ PDF not found in R2: ${r2Key}`);
            return createJsonResponse(
                { error: 'File not found' },
                404,
                corsHeaders
            );
        }

        const metadata = object.customMetadata;
        
        console.log(`✓ PDF retrieved from R2: ${r2Key}`);

        return new Response(object.body, {
            headers: {
                ...corsHeaders,
                'Content-Type': 'application/pdf',
                'Content-Length': object.size.toString(),
                'Cache-Control': 'public, max-age=3600',
                'X-Original-Name': metadata?.originalName || filename,
                'X-Upload-Timestamp': metadata?.uploadTimestamp || '',
            }
        });

    } catch (error) {
        console.error('Get PDF error:', error);
        return createJsonResponse(
            { error: 'Failed to retrieve PDF', details: error instanceof Error ? error.message : 'Unknown error' },
            500,
            corsHeaders
        );
    }
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





// Add new handler - List PDFs
async function handleListPdfs(
    request: Request,
    env: Env,
    ctx: ExecutionContext,
    corsHeaders: Record<string, string>
): Promise<Response> {
    try {
        const url = new URL(request.url);
        const cursor = url.searchParams.get('cursor') || undefined;
        const limit = parseInt(url.searchParams.get('limit') || '100', 10);

        const listed = await env.pdf_tutor_storage.list({
            prefix: R2_KEYS.PDF_PREFIX,
            cursor: cursor,
            limit: Math.min(limit, 1000)
        });

        const files = listed.objects.map(obj => ({
            filename: obj.key.replace(R2_KEYS.PDF_PREFIX, ''),
            size: obj.size,
            uploaded: obj.uploaded,
            metadata: obj.customMetadata
        }));

        console.log(`✓ Listed ${files.length} PDFs from R2`);

        return createJsonResponse({
            success: true,
            files: files,
            truncated: listed.truncated,
            cursor: listed.cursor
        }, 200, corsHeaders);

    } catch (error) {
        console.error('List PDFs error:', error);
        return createJsonResponse(
            { error: 'Failed to list PDFs', details: error instanceof Error ? error.message : 'Unknown error' },
            500,
            corsHeaders
        );
    }
}

// Add new handler - Delete PDF
async function handleDeletePdf(
    request: Request,
    env: Env,
    ctx: ExecutionContext,
    corsHeaders: Record<string, string>
): Promise<Response> {
    const url = new URL(request.url);
    const pathname = url.pathname;
    
    const filename = pathname.replace('/delete-pdf/', '');
    
    if (filename.includes('..') || filename.includes('/') || !filename) {
        return createJsonResponse(
            { error: 'Invalid filename' },
            400,
            corsHeaders
        );
    }

    try {
        const r2Key = `${R2_KEYS.PDF_PREFIX}${filename}`;
        
        await env.pdf_tutor_storage.delete(r2Key);

        const transcriptKey = `${R2_KEYS.LLM_TRANSCRIPT_PREFIX}${filename}.json`;
        const mcqKey = `${R2_KEYS.LLM_MCQ_PREFIX}${filename}.json`;
        
        await env.pdf_tutor_storage.delete(transcriptKey);
        await env.pdf_tutor_storage.delete(mcqKey);

        fileMetadata.delete(filename);
        notes.delete(filename);
        scores.delete(filename);

        console.log(`✓ PDF deleted from R2: ${r2Key}`);

        return createJsonResponse({
            success: true,
            message: 'File deleted successfully',
            filename: filename
        }, 200, corsHeaders);

    } catch (error) {
        console.error('Delete PDF error:', error);
        return createJsonResponse(
            { error: 'Failed to delete PDF', details: error instanceof Error ? error.message : 'Unknown error' },
            500,
            corsHeaders
        );
    }
}

// Add helper functions for R2 storage
async function storeLLMTranscriptInR2(
    filename: string,
    transcriptData: Record<string, string>,
    env: Env
): Promise<void> {
    try {
        const r2Key = `${R2_KEYS.LLM_TRANSCRIPT_PREFIX}${filename}.json`;
        const jsonData = JSON.stringify([transcriptData], null, 2);

        await env.pdf_tutor_storage.put(r2Key, jsonData, {
            httpMetadata: {
                contentType: 'application/json',
            },
            customMetadata: {
                type: 'llm_transcript',
                generatedAt: Date.now().toString(),
                pdfFilename: filename
            }
        });

        console.log(`✓ Transcript stored in R2: ${r2Key}`);
    } catch (error) {
        console.error('Error storing transcript in R2:', error);
        throw error;
    }
}

async function storeLLMMCQsInR2(
    filename: string,
    mcqData: Record<string, any[]>,
    env: Env
): Promise<void> {
    try {
        const r2Key = `${R2_KEYS.LLM_MCQ_PREFIX}${filename}.json`;
        const jsonData = JSON.stringify([mcqData], null, 2);

        await env.pdf_tutor_storage.put(r2Key, jsonData, {
            httpMetadata: {
                contentType: 'application/json',
            },
            customMetadata: {
                type: 'llm_mcqs',
                generatedAt: Date.now().toString(),
                pdfFilename: filename
            }
        });

        console.log(`✓ MCQs stored in R2: ${r2Key}`);
    } catch (error) {
        console.error('Error storing MCQs in R2:', error);
        throw error;
    }
}

async function getLLMTranscriptFromR2(
    filename: string,
    pageNumber: number,
    env: Env
): Promise<string | null> {
    try {
        const r2Key = `${R2_KEYS.LLM_TRANSCRIPT_PREFIX}${filename}.json`;
        const object = await env.pdf_tutor_storage.get(r2Key);

        if (!object) {
            console.log(`✗ Transcript not found in R2: ${r2Key}`);
            return null;
        }

        const jsonText = await object.text();
        const transcriptData = JSON.parse(jsonText);

        if (Array.isArray(transcriptData) && transcriptData.length > 0) {
            const pageKey = pageNumber.toString();
            return transcriptData[0][pageKey] || null;
        }

        return null;
    } catch (error) {
        console.error('Error retrieving transcript from R2:', error);
        return null;
    }
}

async function getLLMMCQsFromR2(
    filename: string,
    pageNumber: number,
    env: Env
): Promise<any[] | null> {
    try {
        const r2Key = `${R2_KEYS.LLM_MCQ_PREFIX}${filename}.json`;
        const object = await env.pdf_tutor_storage.get(r2Key);

        if (!object) {
            console.log(`✗ MCQs not found in R2: ${r2Key}`);
            return null;
        }

        const jsonText = await object.text();
        const mcqData = JSON.parse(jsonText);

        if (Array.isArray(mcqData) && mcqData.length > 0) {
            const pageKey = pageNumber.toString();
            return mcqData[0][pageKey] || null;
        }

        return null;
    } catch (error) {
        console.error('Error retrieving MCQs from R2:', error);
        return null;
    }
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
