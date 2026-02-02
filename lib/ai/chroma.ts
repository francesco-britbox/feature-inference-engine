/**
 * Chroma Vector Store Client
 * Connects to local Chroma instance for semantic search
 * Single Responsibility: Vector store operations
 */

import { ChromaClient, Collection } from 'chromadb';
import { logger } from '@/lib/utils/logger';

const log = logger.child({ module: 'chroma' });

/**
 * Chroma connection URL from environment
 */
const CHROMA_URL = process.env.CHROMA_URL || 'http://localhost:8000';

/**
 * Collection name for evidence embeddings
 */
const COLLECTION_NAME = 'evidence_embeddings';

/**
 * Embedding dimensions (OpenAI text-embedding-3-large)
 * Used for collection configuration
 */
export const EMBEDDING_DIMENSIONS = 3072;

/**
 * Chroma client instance
 */
let chromaClient: ChromaClient | null = null;

/**
 * Evidence embeddings collection
 */
let evidenceCollection: Collection | null = null;

/**
 * Initialize Chroma client
 */
export async function initializeChroma(): Promise<ChromaClient> {
  if (chromaClient) {
    return chromaClient;
  }

  try {
    chromaClient = new ChromaClient({
      path: CHROMA_URL,
    });

    // Test connection
    await chromaClient.heartbeat();

    log.info({ url: CHROMA_URL }, 'Connected to Chroma');

    return chromaClient;
  } catch (error) {
    log.error(
      {
        url: CHROMA_URL,
        error: error instanceof Error ? error.message : String(error),
      },
      'Failed to connect to Chroma'
    );
    throw new Error(
      `Failed to connect to Chroma at ${CHROMA_URL}: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Get or create evidence embeddings collection
 */
export async function getEvidenceCollection(): Promise<Collection> {
  if (evidenceCollection) {
    return evidenceCollection;
  }

  const client = await initializeChroma();

  try {
    // Try to get existing collection
    evidenceCollection = await client.getOrCreateCollection({
      name: COLLECTION_NAME,
      metadata: {
        'hnsw:space': 'cosine', // Cosine similarity
        description: 'Evidence embeddings for feature inference',
      },
    });

    log.info({ collection: COLLECTION_NAME }, 'Connected to collection');

    return evidenceCollection;
  } catch (error) {
    log.error(
      {
        collection: COLLECTION_NAME,
        error: error instanceof Error ? error.message : String(error),
      },
      'Failed to get/create collection'
    );
    throw new Error(
      `Failed to get collection ${COLLECTION_NAME}: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Test Chroma connection
 */
export async function testChromaConnection(): Promise<boolean> {
  try {
    const client = await initializeChroma();
    await client.heartbeat();
    return true;
  } catch {
    return false;
  }
}

/**
 * Reset collection (for testing)
 */
export async function resetEvidenceCollection(): Promise<void> {
  try {
    const client = await initializeChroma();
    await client.deleteCollection({ name: COLLECTION_NAME });
    evidenceCollection = null;
    log.info({ collection: COLLECTION_NAME }, 'Collection reset');
  } catch (err) {
    log.error(
      {
        collection: COLLECTION_NAME,
        error: err instanceof Error ? err.message : String(err),
      },
      'Failed to reset collection'
    );
  }
}
