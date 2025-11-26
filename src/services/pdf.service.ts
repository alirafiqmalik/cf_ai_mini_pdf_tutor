/**
 * PDF Service
 * Handles PDF text extraction and processing using unpdf
 */

import { extractText } from 'unpdf';
import { PdfExtractionResult } from '../types';
import { createLogger } from '../utils/logger.utils';

const logger = createLogger('PDFService');

/**
 * Extract text from PDF buffer using unpdf
 */
export async function extractPdfText(pdfBuffer: ArrayBuffer): Promise<PdfExtractionResult> {
    try {
        // Convert ArrayBuffer to Uint8Array for unpdf
        const uint8Array = new Uint8Array(pdfBuffer);
        
        // Extract text with page information
        const pages = await extractText(uint8Array, {
            mergePages: false // Keep pages separate
        });
        
        // logger.info(`PDF parsed successfully: ${pages.totalPages} pages, ${pages.text.length} characters`);
        
		const trimmedPages = pages.text.slice(0, 1);
        const totalPages = trimmedPages.length;
         // Trim to first 2 pages
         
        //  const totalPages = pages.totalPages;

        logger.info(`PDF parsed successfully: ${totalPages} pages, ${trimmedPages[0].length} characters`);
         
        return {
            numPages: totalPages,
            pages: pages.text // Add parsed pages
        };
    } catch (error) {
        logger.error('Error extracting PDF text with unpdf', error);
        
        // Fallback to basic extraction
        return {
            numPages: -1,
            pages: ['Unable to parse PDF content.']
        };
    }
}

/**
 * Split PDF text into pages
 * Now returns the pre-parsed pages from unpdf
 */
// export function splitTextIntoPages(text: string, numPages: number, pages?: string[]): string[] {
//     // If we have pre-parsed pages, return them
//     if (pages && pages.length > 0) {
//         return pages;
//     }
    
//     // Fallback to word-based splitting
//     const wordsPerPage = Math.ceil(text.split(/\s+/).length / numPages);
//     const words = text.split(/\s+/);
//     const splitPages: string[] = [];
    
//     for (let i = 0; i < numPages; i++) {
//         const start = i * wordsPerPage;
//         const end = start + wordsPerPage;
//         splitPages.push(words.slice(start, end).join(' '));
//     }
    
//     return splitPages;
// }