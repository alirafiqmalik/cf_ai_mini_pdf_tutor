/**
 * LLM Service
 * Handles all LLM interactions (transcript and MCQ generation)
 */

import { ChatMessage, McqQuestion, Env } from '../types';
import { LLM_CONFIG, RAG_CONFIG } from '../config/constants';
import { createLogger } from '../utils/logger.utils';
import * as ragService from './rag.service';
import * as vectorService from './vector.service';

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
		// Limit the input text to avoid API errors
		const truncatedText = pageText.substring(0, 100).trim();

		// // Skip if text is too short
		// if (truncatedText.length < LLM_CONFIG.MIN_TEXT_LENGTH) {
		// 	logger.warn(`Text too short for page ${pageNumber}, using fallback`);
		// 	return `Summary for page ${pageNumber}: Content not available for analysis.`;
		// }
		
		const promptA = `Summarize this educational text in 2 sentences:\n\n${truncatedText}`;

		const messages: ChatMessage[] = [
			{ role: "system", content: "You are a helpful educator." },
			{ role: "user", content: promptA }
		];

		// const response = await env.AI.run(LLM_CONFIG.MODEL_ID, {
		// 	messages: messages as any[],
		// 	max_tokens: LLM_CONFIG.MAX_TOKENS_TRANSCRIPT,
		// });
		const response = await handleChatRequest(messages,env);

		// Extract the response text
		if (response && typeof response === 'object' && 'response' in response) {
			const transcript = (response as any).response;
			logger.info(`Generated transcript for page ${pageNumber}`);
			return transcript;
		}
		
		return `Summary for page ${pageNumber}: Educational content about the topics discussed in this section.`;
	} catch (error) {
		logger.error(`Error generating transcript for page ${pageNumber}`, error);
		return `Summary for page ${pageNumber}: Content analysis in progress. Please refresh to see updates.`;
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
		// Limit the input text to avoid API errors
		const truncatedText = pageText.substring(0, LLM_CONFIG.MAX_INPUT_TEXT_LENGTH).trim();
		
		// Skip if text is too short
		if (truncatedText.length < LLM_CONFIG.MIN_TEXT_LENGTH) {
			logger.warn(`Text too short for page ${pageNumber}, using fallback MCQs`);
			return createFallbackMcqs(pageNumber);
		}
		
		const promptB = `Create 2 MCQs as JSON:\n[{"question":"Q?","options":["A","B","C","D"],"correct":0,"explanation":"Why"}]\n\nText: ${truncatedText}`;

		const messages: ChatMessage[] = [
			{ role: "system", content: "You respond with JSON only." },
			{ role: "user", content: promptB }
		];

		// const response = await env.AI.run(LLM_CONFIG.MODEL_ID, {
		// 	messages: messages as any[],
		// 	max_tokens: LLM_CONFIG.MAX_TOKENS_MCQ,
		// });

		const response = await handleChatRequest(messages,env);

		// Extract and parse the response
		let responseText = "";
		if (response && typeof response === 'object' && 'response' in response) {
			responseText = (response as any).response;
		}

		// Try to parse JSON from the response
		try {
			// Extract JSON array from response (may be wrapped in markdown or text)
			const jsonMatch = responseText.match(/\[[\s\S]*\]/);
			if (jsonMatch) {
				const questions = JSON.parse(jsonMatch[0]);
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
			}
		} catch (parseError) {
			logger.warn(`Failed to parse MCQ JSON for page ${pageNumber}`, parseError);
		}

		// Return fallback MCQs
		return createFallbackMcqs(pageNumber);
	} catch (error) {
		logger.error(`Error generating MCQs for page ${pageNumber}`, error);
		return createFallbackMcqs(pageNumber);
	}
}

/**
 * Create fallback MCQs when LLM generation fails
 */
function createFallbackMcqs(pageNumber: number): McqQuestion[] {
	return [
		{
			page: pageNumber,
			question: `What is the main topic discussed on page ${pageNumber}?`,
			options: [
				"Educational content",
				"Technical concepts",
				"Research findings",
				"All of the above"
			],
			correct: 3,
			explanation: "This page covers various educational and technical topics."
		},
		{
			page: pageNumber,
			question: `Which statement best describes the content on page ${pageNumber}?`,
			options: [
				"It provides theoretical knowledge",
				"It contains practical examples",
				"It discusses research methodologies",
				"Content requires detailed analysis"
			],
			correct: 3,
			explanation: "The content requires proper PDF parsing for accurate assessment."
		}
	];
}

/**
 * Generate transcript with RAG enhancement
 */
export async function generateTranscriptWithRAG(
	pageText: string,
	pageNumber: number,
	filename: string,
	env: Env
): Promise<string> {
	try {
		// Generate embedding for the current page query
		const queryPrompt = `Summarize this educational text in 2 sentences:\n\n${pageText.substring(0, 1000)}`;
		const queryEmbedding = await ragService.generateEmbedding(queryPrompt, env);
		
		// Query relevant context from both full text and specific page
		// const fullTextResults = await vectorService.queryFullTextVector(
		// 	filename,
		// 	queryEmbedding.embedding,
		// 	env,
		// 	{ topK: 1 }
		// );
		
		const pageResults = await vectorService.queryPageTextVector(
			filename,
			pageNumber,
			queryEmbedding.embedding,
			env,
			{ topK: 2 }
		);
		
		// Get the stored document for context
		const document = await vectorService.getDocument(filename, env);
		
		// Build relevant context from results
		const relevantTexts: Array<{ text: string; pageNumber?: number; score: number }> = [];
		
		if (document) {
			// Add page-specific chunks
			if (document.pageChunks[pageNumber]) {
				relevantTexts.push({
					text: document.pageChunks[pageNumber].join(' '),
					pageNumber: pageNumber,
					score: 1.0
				});
			}
		}
		
		// Create augmented prompt
		const augmentedData = ragService.createAugmentedPrompt(
			`Summarize this educational text in 2 sentences`,
			relevantTexts
		);
		
		const messages: ChatMessage[] = [
			{ role: "system", content: "You are a helpful educator." },
			{ role: "user", content: augmentedData.augmentedPrompt }
		];
		
		const response = await handleChatRequest(messages, env);
		
		// Extract the response text
		if (response && typeof response === 'object' && 'response' in response) {
			const transcript = (response as any).response;
			logger.info(`Generated RAG-enhanced transcript for page ${pageNumber}`);
			return transcript;
		}
		
		// Fallback to non-RAG version
		return generateTranscript(pageText, pageNumber, env);
	} catch (error) {
		logger.error(`Error generating RAG transcript for page ${pageNumber}`, error);
		// Fallback to non-RAG version
		return generateTranscript(pageText, pageNumber, env);
	}
}

/**
 * Generate MCQs with RAG enhancement
 */
export async function generateMcqsWithRAG(
	pageText: string,
	pageNumber: number,
	filename: string,
	env: Env
): Promise<McqQuestion[]> {
	try {
		// Generate embedding for the current page query
		const queryPrompt = `Create quiz questions about:\n\n${pageText.substring(0, 1000)}`;
		const queryEmbedding = await ragService.generateEmbedding(queryPrompt, env);
		
		// Query relevant context
		const pageResults = await vectorService.queryPageTextVector(
			filename,
			pageNumber,
			queryEmbedding.embedding,
			env,
			{ topK: 2 }
		);
		
		// Get the stored document for context
		const document = await vectorService.getDocument(filename, env);
		
		// Build relevant context from results
		const relevantTexts: Array<{ text: string; pageNumber?: number; score: number }> = [];
		
		if (document && document.pageChunks[pageNumber]) {
			relevantTexts.push({
				text: document.pageChunks[pageNumber].join(' '),
				pageNumber: pageNumber,
				score: 1.0
			});
		}
		
		// Create augmented prompt
		const augmentedData = ragService.createAugmentedPrompt(
			`Create 2 MCQs as JSON:\n[{"question":"Q?","options":["A","B","C","D"],"correct":0,"explanation":"Why"}]`,
			relevantTexts
		);
		
		const messages: ChatMessage[] = [
			{ role: "system", content: "You respond with JSON only." },
			{ role: "user", content: augmentedData.augmentedPrompt }
		];
		
		const response = await handleChatRequest(messages, env);
		
		// Extract and parse the response
		let responseText = "";
		if (response && typeof response === 'object' && 'response' in response) {
			responseText = (response as any).response;
		}
		
		// Try to parse JSON from the response
		try {
			const jsonMatch = responseText.match(/\[[\s\S]*\]/);
			if (jsonMatch) {
				const questions = JSON.parse(jsonMatch[0]);
				if (Array.isArray(questions) && questions.length > 0) {
					const mcqs = questions.map((q, index) => ({
						...q,
						page: pageNumber,
						id: index,
					}));
					logger.info(`Generated ${mcqs.length} RAG-enhanced MCQs for page ${pageNumber}`);
					return mcqs;
				}
			}
		} catch (parseError) {
			logger.warn(`Failed to parse RAG MCQ JSON for page ${pageNumber}`, parseError);
		}
		
		// Fallback to non-RAG version
		return generateMcqs(pageText, pageNumber, env);
	} catch (error) {
		logger.error(`Error generating RAG MCQs for page ${pageNumber}`, error);
		// Fallback to non-RAG version
		return generateMcqs(pageText, pageNumber, env);
	}
}

/**
 * Handle chat requests with LLM
 */
export async function handleChatRequest(
	messages: ChatMessage[],
	env: Env
): Promise<Response> {
	try {
		// Add system prompt if not present
		if (!messages.some((msg) => msg.role === "system")) {
			messages.unshift({ role: "system", content: LLM_CONFIG.SYSTEM_PROMPT });
		}

		const response = await env.AI.run(
			LLM_CONFIG.MODEL_ID,
			{
				messages,
				max_tokens: LLM_CONFIG.MAX_TOKENS_CHAT,
			},
			{
				returnRawResponse: true,
			}
		);

		// Return streaming response
		return response;
	} catch (error) {
		logger.error('Error processing chat request', error);
		return new Response(
			JSON.stringify({ error: 'Failed to process request' }),
			{
				status: 500,
				headers: { 'content-type': 'application/json' },
			}
		);
	}
}
