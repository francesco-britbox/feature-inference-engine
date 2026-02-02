/**
 * LLM Client abstraction
 * Follows Dependency Inversion Principle - depend on abstractions, not concretions
 */

/**
 * LLM Chat Message
 */
export interface LLMMessage {
  role: 'system' | 'user' | 'assistant';
  content: string | LLMMessageContent[];
}

/**
 * LLM Message Content (for multimodal)
 */
export type LLMMessageContent =
  | { type: 'text'; text: string }
  | { type: 'image_url'; image_url: { url: string; detail?: 'low' | 'high' | 'auto' } };

/**
 * LLM Chat Completion Options
 */
export interface LLMChatOptions {
  model: string;
  messages: LLMMessage[];
  temperature?: number;
  maxTokens?: number;
  responseFormat?: { type: 'text' | 'json_object' };
}

/**
 * LLM Chat Response
 */
export interface LLMChatResponse {
  content: string | null;
  finishReason: string | null;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

/**
 * LLM Embedding Options
 */
export interface LLMEmbeddingOptions {
  model: string;
  input: string | string[];
}

/**
 * LLM Embedding Response
 */
export interface LLMEmbeddingResponse {
  embeddings: number[][];
  usage?: {
    promptTokens: number;
    totalTokens: number;
  };
}

/**
 * Abstract LLM Client interface
 * Implementations: OpenAI, Anthropic, local models, etc.
 */
export interface LLMClient {
  /**
   * Generate chat completion
   * @param options Chat completion options
   * @returns Chat response
   */
  chat(options: LLMChatOptions): Promise<LLMChatResponse>;

  /**
   * Generate embeddings
   * @param options Embedding options
   * @returns Embedding response
   */
  embed(options: LLMEmbeddingOptions): Promise<LLMEmbeddingResponse>;

  /**
   * Generate chat completion with vision (images)
   * @param options Chat completion options with image content
   * @returns Chat response
   */
  vision(options: LLMChatOptions): Promise<LLMChatResponse>;
}
