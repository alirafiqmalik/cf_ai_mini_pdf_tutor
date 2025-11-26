/**
 * Request validation middleware
 */

import { ChatRequest, ChatMessage } from "../types";
import { AppError } from "./error.middleware";

/**
 * Validates a chat message
 */
function isValidChatMessage(msg: unknown): msg is ChatMessage {
	if (typeof msg !== "object" || msg === null) return false;
	const message = msg as ChatMessage;
	return (
		["system", "user", "assistant"].includes(message.role) &&
		typeof message.content === "string"
	);
}

/**
 * Validates a chat request body
 */
export function validateChatRequest(body: unknown): ChatRequest {
	if (typeof body !== "object" || body === null) {
		throw new AppError("Invalid request body", 400);
	}

	const request = body as Partial<ChatRequest>;

	if (!Array.isArray(request.messages)) {
		throw new AppError("Messages must be an array", 400);
	}

	if (request.messages.length === 0) {
		throw new AppError("Messages array cannot be empty", 400);
	}

	if (!request.messages.every(isValidChatMessage)) {
		throw new AppError("Invalid message format", 400);
	}

	return request as ChatRequest;
}

