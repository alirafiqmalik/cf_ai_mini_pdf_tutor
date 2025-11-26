/**
 * LLM Service
 * Handles all LLM interactions (transcript and MCQ generation)
 */

import { Env, ChatMessage, McqQuestion } from '../types';
import { MODEL_ID, LLM_CONFIG } from '../config/constants';
import { createLogger } from '../utils/logger.utils';




/**
 * LLM service for AI interactions
 */

import { validateChatRequest } from "../middleware/validation.middleware";
// import { generateChatCompletion } from "../services/llm.service";



const logger = createLogger('LLMService');



/**
 * Generate transcript (detailed explanation) for page text using LLM
 */
export async function generateTranscript(
	pageText: string,
	pageNumber: number,
	env: Env
): Promise<string> {
	try {
		const promptA = `Summarize this educational text in a few sentences:\n\n${pageText}`;

		const messages: ChatMessage[] = [
			{ role: "system", content: "You are a helpful educator." },
			{ role: "user", content: promptA }
		];

		logger.info(`Sent response`);

		const response = await generateChatCompletion(messages, env);
		logger.info(`Got response`);
		const result = await response.json() as { response?: string };

		// Workers AI returns JSON with a 'response' field
		const transcript = result.response;
		
		if (typeof transcript === 'string' && transcript.trim().length > 0) {
			logger.info(`Generated transcript for page ${pageNumber}`);
			return transcript;
		}
		
		logger.warn(`Empty transcript received for page ${pageNumber}`);
		return `Error generating transcript for page ${pageNumber}: No response from LLM`;
	} catch (error) {
		logger.error(`Error generating transcript for page ${pageNumber}`, error);
		return `Error generating transcript for page ${pageNumber}: ${error instanceof Error ? error.message : 'Unknown error'}`;
	}
}

/**
 * Generate MCQ questions for page text using LLM
 */
export async function generateMcqs(
	pageText: string,
	pageNumber: number,
	env: Env
): Promise<McqQuestion[]> {
	try {
		const promptB = `Create 5 MCQs as JSON:\n[{"question":"Q?","options":["A","B","C","D"],"correct":0,"explanation":"Why"}]\n\nText: ${pageText}`;

		const messages: ChatMessage[] = [
			{ role: "system", content: "You respond with JSON only." },
			{ role: "user", content: promptB }
		];

		const response = await generateChatCompletion(messages, env);
		const result = await response.json() as { response?: any }; // Change from string to any

		// Workers AI may return JSON array directly or as a string
		const responseData = result.response;


		// console.info(`Response structure:`, JSON.stringify(result, null, 2));
		// console.info(`Response type: ${typeof responseData}, Is Array: ${Array.isArray(responseData)}`);
		// Try to parse JSON from the response
		try {
			let questions: any[];
			
			// Check if response is already an array
			if (Array.isArray(responseData)) {
				questions = responseData;
			} else if (typeof responseData === 'string') {
				// Extract JSON array from string response (may be wrapped in markdown or text)
				const jsonMatch = responseData.match(/\[[\s\S]*\]/);
				if (jsonMatch) {
					questions = JSON.parse(jsonMatch[0]);
				} else {
					throw new Error('No JSON array found in string response');
				}
			} else {
				throw new Error(`Unexpected response type: ${typeof responseData}`);
			}
			
			if (Array.isArray(questions) && questions.length > 0) {
				// Add page number to each question
				const mcqs = questions.map((q, index) => ({
					...q,
					page: pageNumber,
					id: index,
				}));
				logger.info(`Generated ${mcqs.length} MCQs for page ${pageNumber}`);
				return mcqs;
			}
			
			logger.warn(`No valid JSON array found in MCQ response for page ${pageNumber}`);
		} catch (parseError) {
			logger.warn(`Failed to parse MCQ JSON for page ${pageNumber}`, parseError);
			return [{
				page: pageNumber,
				question: `Error parsing MCQ response for page ${pageNumber}`,
				options: ["Error", "Error", "Error", "Error"],
				correct: 0,
				explanation: `Failed to parse JSON: ${parseError instanceof Error ? parseError.message : 'Unknown error'}`
			}];
		}

		// Return error if no valid response
		return [{
			page: pageNumber,
			question: `Error generating MCQs for page ${pageNumber}`,
			options: ["Error", "Error", "Error", "Error"],
			correct: 0,
			explanation: "No valid MCQ data received from LLM"
		}];
	} catch (error) {
		logger.error(`Error generating MCQs for page ${pageNumber}`, error);
		return [{
			page: pageNumber,
			question: `Error generating MCQs for page ${pageNumber}`,
			options: ["Error", "Error", "Error", "Error"],
			correct: 0,
			explanation: `${error instanceof Error ? error.message : 'Unknown error'}`
		}];
	}
}

// /**
//  * Handle chat requests with LLM
//  */
// export async function handleChatRequest(
// 	messages: ChatMessage[],
// 	env: Env
// ): Promise<Response> {
// 	try {
// 		// Add system prompt if not present
// 		if (!messages.some((msg) => msg.role === "system")) {
// 			messages.unshift({ role: "system", content: LLM_CONFIG.SYSTEM_PROMPT });
// 		}

// 		// Check if we need to use mock responses (local dev or AI unavailable)
// 		let result: any;
// 		logger.info(`here X`);
		
// 		try {
// 			logger.info(`Sent AI request`);
// 			// Try to use real Workers AI
// 			result = await env.AI.run(
// 				LLM_CONFIG.MODEL_ID,
// 				{
// 					messages,
// 					max_tokens: LLM_CONFIG.MAX_TOKENS_CHAT,
// 				}
// 			);

// 			logger.info(`got result `);
// 		} catch (aiError) {
// 			// If AI service fails (local dev or network issue), use mock response
// 			logger.warn('AI service unavailable, using mock response', aiError);
			
// 			// Determine if this is an MCQ request
// 			const isMcqRequest = messages.some(m => 
// 				m.content.toLowerCase().includes('mcq') || 
// 				m.content.toLowerCase().includes('json')
// 			);
			
// 			const mockResponse = isMcqRequest
// 				? `[{"question":"Sample MCQ question based on the content?","options":["Option A - First answer","Option B - Second answer","Option C - Third answer","Option D - Fourth answer"],"correct":0,"explanation":"This is a mock MCQ generated for local development. Deploy to production for real AI-generated questions."}]`
// 				: `This is a mock summary generated for local development. The content provides an overview of the main topics discussed in the text. Deploy to production for real AI-generated summaries.`;
			
// 			result = { response: mockResponse };
// 		}

// 		// Wrap the JSON result in a proper Response object
// 		return new Response(JSON.stringify(result), {
// 			status: 200,
// 			headers: { 'content-type': 'application/json' },
// 		});
// 	} catch (error) {
// 		logger.error('Error processing chat request', error);
// 		return new Response(
// 			JSON.stringify({ error: 'Failed to process request' }),
// 			{
// 				status: 500,
// 				headers: { 'content-type': 'application/json' },
// 			}
// 		);
// 	}
// }


/**
 * Generates a chat completion using the LLM
 */
export async function generateChatCompletion(
	messages: ChatMessage[],
	env: Env,
): Promise<Response> {
	logger.info("Generating chat completion", { messageCount: messages.length });

	const response = await env.AI.run(
		MODEL_ID,
		{
			messages,
			max_tokens: LLM_CONFIG.MAX_TOKENS_CHAT,
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

	logger.info("Chat completion generated successfully");
	return response;
}



/**
 * Handles chat request
 */
export async function handleChatRequest(
	request: Request,
	env: Env,
): Promise<Response> {
	// Parse and validate request body
	const body = await request.json();
	const chatRequest = validateChatRequest(body);

	logger.info("Processing chat request", {
		messageCount: chatRequest.messages.length,
	});

	// Add system prompt if not present
	if (!chatRequest.messages.some((msg) => msg.role === "system")) {
		chatRequest.messages.unshift({ role: "system", content: LLM_CONFIG.SYSTEM_PROMPT });
	}

	// Generate chat completion
	const response = await generateChatCompletion(chatRequest.messages, env);

	return response;
}
