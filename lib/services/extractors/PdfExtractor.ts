/**
 * PdfExtractor
 * Extracts requirements from PDF and Markdown documents
 * Single Responsibility: Document text extraction and analysis
 * Follows DIP: Depends on LLMClient abstraction, not concrete implementation
 */

import fs from 'fs/promises';
import pdfParse from 'pdf-parse';
import { chatRateLimiter } from '@/lib/ai/openai';
import { OpenAIClient } from '@/lib/ai/OpenAIClient';
import { buildPdfExtractionPrompt } from '@/lib/prompts/extraction';
import type { Evidence, Extractor, ExtractedEvidence } from '@/lib/types/evidence';
import type { LLMClient } from '@/lib/types/llm';
import { logger } from '@/lib/utils/logger';

/**
 * Maximum tokens per chunk (approximation)
 */
const MAX_TOKENS_PER_CHUNK = 500;

/**
 * Rough token estimation: 1 token ≈ 4 characters
 */
const CHARS_PER_TOKEN = 4;

export class PdfExtractor implements Extractor {
  private readonly log = logger.child({ extractor: 'PdfExtractor' });
  private readonly llmClient: LLMClient;

  constructor(llmClient?: LLMClient) {
    // Dependency Injection: Accept abstraction, default to OpenAI
    this.llmClient = llmClient || new OpenAIClient();
  }

  /**
   * Extract evidence from PDF or Markdown file
   * @param filePath Path to document file
   * @param documentId Document UUID
   * @returns Array of evidence (requirements, constraints, acceptance criteria)
   */
  async extract(filePath: string, documentId: string): Promise<Evidence[]> {
    try {
      // Extract text based on file type
      const extension = filePath.split('.').pop()?.toLowerCase();
      let text: string;

      if (extension === 'pdf') {
        text = await this.extractTextFromPdf(filePath);
      } else if (extension === 'md') {
        text = await this.extractTextFromMarkdown(filePath);
      } else {
        this.log.error({ filePath, extension }, 'Unsupported document format');
        return [];
      }

      // Chunk text
      const chunks = this.chunkText(text, MAX_TOKENS_PER_CHUNK);

      // Extract evidence from each chunk
      const allEvidence: Evidence[] = [];

      for (const chunk of chunks) {
        const chunkEvidence = await this.extractFromChunk(chunk, documentId);
        allEvidence.push(...chunkEvidence);
      }

      return allEvidence;
    } catch (error) {
      this.log.error(
        {
          documentId,
          filePath,
          error: error instanceof Error ? error.message : String(error),
        },
        'PDF/Markdown extraction failed'
      );
      return [];
    }
  }

  /**
   * Extract text from PDF file
   */
  private async extractTextFromPdf(filePath: string): Promise<string> {
    const dataBuffer = await fs.readFile(filePath);
    const pdf = await pdfParse(dataBuffer);
    return pdf.text;
  }

  /**
   * Extract text from Markdown file
   */
  private async extractTextFromMarkdown(filePath: string): Promise<string> {
    return fs.readFile(filePath, 'utf-8');
  }

  /**
   * Chunk text into smaller pieces for LLM processing
   */
  private chunkText(text: string, maxTokens: number): string[] {
    const chunks: string[] = [];
    const paragraphs = text.split(/\n\n+/);

    let currentChunk = '';
    let currentTokens = 0;

    for (const paragraph of paragraphs) {
      const paragraphTokens = this.estimateTokens(paragraph);

      if (currentTokens + paragraphTokens > maxTokens) {
        if (currentChunk) {
          chunks.push(currentChunk.trim());
        }
        currentChunk = paragraph;
        currentTokens = paragraphTokens;
      } else {
        currentChunk += (currentChunk ? '\n\n' : '') + paragraph;
        currentTokens += paragraphTokens;
      }
    }

    if (currentChunk) {
      chunks.push(currentChunk.trim());
    }

    return chunks.length > 0 ? chunks : [text]; // Return full text if chunking failed
  }

  /**
   * Estimate token count for text
   * Rough estimate: 1 token ≈ 4 characters
   */
  private estimateTokens(text: string): number {
    return Math.ceil(text.length / CHARS_PER_TOKEN);
  }

  /**
   * Extract evidence from text chunk using LLM
   */
  private async extractFromChunk(
    chunk: string,
    documentId: string
  ): Promise<Evidence[]> {
    try {
      const prompt = buildPdfExtractionPrompt(chunk);

      // Call LLM with rate limiting (uses abstraction, not concrete OpenAI)
      const response = await chatRateLimiter.schedule(() =>
        this.llmClient.chat({
          model: 'gpt-4o',
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.2,
          responseFormat: { type: 'json_object' },
        })
      );

      const content = response.content;
      if (!content) {
        return [];
      }

      // Parse JSON response
      const parsed = JSON.parse(content);
      const extracted: ExtractedEvidence[] = Array.isArray(parsed)
        ? parsed
        : parsed.evidence || [];

      // Convert to Evidence format
      return extracted
        .filter((item) => item && typeof item === 'object' && 'type' in item && 'content' in item)
        .map((item) => ({
          documentId,
          type: item.type,
          content: item.content,
          rawData: item.metadata || {},
        }));
    } catch (error) {
      this.log.error(
        {
          documentId,
          error: error instanceof Error ? error.message : String(error),
        },
        'LLM extraction failed for chunk'
      );
      return [];
    }
  }
}

/**
 * Singleton instance
 */
export const pdfExtractor = new PdfExtractor();
