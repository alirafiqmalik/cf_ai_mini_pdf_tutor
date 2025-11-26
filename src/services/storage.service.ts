/**
 * Storage Service
 * Handles all R2 storage operations
 */

import { Env, UploadedFile, TranscriptData, McqData } from '../types';
import { buildPdfKey, buildMetadataKey, buildTranscriptKey, buildMcqKey, extractFilenameFromKey } from '../utils/storage.utils';
import { R2_KEYS } from '../config/constants';
import { createLogger } from '../utils/logger.utils';

const logger = createLogger('StorageService');

/**
 * Store PDF file in R2
 */
export async function storePdf(
	filename: string,
	fileBuffer: ArrayBuffer,
	env: Env
): Promise<void> {
	const key = buildPdfKey(filename);
	await env.pdf_tutor_storage.put(key, fileBuffer);
	logger.info(`Stored PDF: ${filename}`);
}

/**
 * Get PDF file from R2
 */
export async function getPdf(filename: string, env: Env): Promise<ArrayBuffer | null> {
	const key = buildPdfKey(filename);
	const object = await env.pdf_tutor_storage.get(key);
	
	if (!object) {
		logger.warn(`PDF not found: ${filename}`);
		return null;
	}
	
	return await object.arrayBuffer();
}

/**
 * Delete PDF file from R2
 */
export async function deletePdf(filename: string, env: Env): Promise<void> {
	const key = buildPdfKey(filename);
	await env.pdf_tutor_storage.delete(key);
	logger.info(`Deleted PDF: ${filename}`);
}

/**
 * Store file metadata in R2
 */
export async function storeMetadata(
	filename: string,
	metadata: UploadedFile,
	env: Env
): Promise<void> {
	const key = buildMetadataKey(filename);
	await env.pdf_tutor_storage.put(key, JSON.stringify(metadata));
	logger.info(`Stored metadata: ${filename}`);
}

/**
 * Get file metadata from R2
 */
export async function getMetadata(
	filename: string,
	env: Env
): Promise<UploadedFile | null> {
	const key = buildMetadataKey(filename);
	const object = await env.pdf_tutor_storage.get(key);
	
	if (!object) {
		return null;
	}
	
	const text = await object.text();
	return JSON.parse(text) as UploadedFile;
}

/**
 * Store LLM transcript data in R2
 */
export async function storeTranscript(
	filename: string,
	transcriptData: TranscriptData,
	env: Env
): Promise<void> {
	const key = buildTranscriptKey(filename);
	await env.pdf_tutor_storage.put(key, JSON.stringify(transcriptData));
	logger.info(`Stored transcript: ${filename}`);
}

/**
 * Get LLM transcript for a specific page
 */
export async function getTranscript(
	filename: string,
	pageNumber: number,
	env: Env
): Promise<string | null> {
	const key = buildTranscriptKey(filename);
	const object = await env.pdf_tutor_storage.get(key);
	
	if (!object) {
		logger.warn(`Transcript not found: ${filename}`);
		return null;
	}
	
	const text = await object.text();
	const transcriptData: TranscriptData = JSON.parse(text);
	return transcriptData[pageNumber] || null;
}

/**
 * Store LLM MCQ data in R2
 */
export async function storeMcqs(
	filename: string,
	mcqData: McqData,
	env: Env
): Promise<void> {
	const key = buildMcqKey(filename);
	await env.pdf_tutor_storage.put(key, JSON.stringify(mcqData));
	logger.info(`Stored MCQs: ${filename}`);
}

/**
 * Get LLM MCQs for a specific page
 */
export async function getMcqs(
	filename: string,
	pageNumber: number,
	env: Env
): Promise<any[] | null> {
	const key = buildMcqKey(filename);
	const object = await env.pdf_tutor_storage.get(key);
	
	if (!object) {
		logger.warn(`MCQs not found: ${filename}`);
		return null;
	}
	
	const text = await object.text();
	const mcqData: McqData = JSON.parse(text);
	return mcqData[pageNumber.toString()] || null;
}

/**
 * List all PDFs in storage
 */
export async function listPdfs(env: Env): Promise<UploadedFile[]> {
	const listed = await env.pdf_tutor_storage.list({ prefix: R2_KEYS.PDF_PREFIX });
	const files: UploadedFile[] = [];
	
	for (const object of listed.objects) {
		const filename = extractFilenameFromKey(object.key, R2_KEYS.PDF_PREFIX);
		const metadata = await getMetadata(filename, env);
		
		if (metadata) {
			files.push(metadata);
		}
	}
	
	logger.info(`Listed ${files.length} PDFs`);
	return files;
}

/**
 * Delete all data associated with a filename
 */
export async function deleteAllFileData(filename: string, env: Env): Promise<void> {
	// Delete from R2 storage
	await deletePdf(filename, env);
	await env.pdf_tutor_storage.delete(buildMetadataKey(filename));
	await env.pdf_tutor_storage.delete(buildTranscriptKey(filename));
	await env.pdf_tutor_storage.delete(buildMcqKey(filename));
	
	logger.info(`Deleted all data for: ${filename}`);
}
