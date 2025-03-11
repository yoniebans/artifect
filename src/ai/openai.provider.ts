// src/ai/openai.provider.ts

import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AIProviderInterface, AIMessage, AIModelResponse } from './interfaces/ai-provider.interface';
import { ArtifactFormat } from '../templates/interfaces/template-manager.interface';
import { extractContentAndCommentary, validateAndFormatResponse } from './response-parser';

/**
 * Configuration options for the OpenAI provider
 */
interface OpenAIConfig {
  apiKey: string;
  defaultModel: string;
  baseUrl?: string;
  organizationId?: string;
}

/**
 * Message format for OpenAI API
 */
interface OpenAIMessage {
  role: string;
  content: string;
}

/**
 * Chat completion request for OpenAI API
 */
interface ChatCompletionRequest {
  model: string;
  messages: OpenAIMessage[];
  max_tokens?: number;
  temperature?: number;
  top_p?: number;
  frequency_penalty?: number;
  presence_penalty?: number;
  stop?: string[];
  stream?: boolean;
}

/**
 * Chat completion response from OpenAI API
 */
interface ChatCompletionResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: {
    index: number;
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }[];
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

/**
 * Implementation of the AIProvider interface for OpenAI
 */
@Injectable()
export class OpenAIProvider implements AIProviderInterface {
  private readonly config: OpenAIConfig;
  private readonly baseHeaders: Record<string, string>;

  constructor(private configService: ConfigService) {
    this.config = {
      apiKey: this.configService.get<string>('OPENAI_API_KEY') || '',
      defaultModel: this.configService.get<string>('OPENAI_DEFAULT_MODEL') || 'gpt-4',
      baseUrl: this.configService.get<string>('OPENAI_BASE_URL') || 'https://api.openai.com/v1',
      organizationId: this.configService.get<string>('OPENAI_ORGANIZATION_ID')
    };

    this.baseHeaders = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.config.apiKey}`
    };

    if (this.config.organizationId) {
      this.baseHeaders['OpenAI-Organization'] = this.config.organizationId;
    }

    if (!this.config.apiKey) {
      throw new Error('OpenAI API key is required');
    }
  }

  /**
   * Generate a response from the OpenAI model
   * 
   * @param systemPrompt - Instructions for the AI model
   * @param userPrompt - User message or request
   * @param artifactFormat - Format specifications for the artifact
   * @param isUpdate - Whether this is an update to an existing artifact
   * @param conversationHistory - Previous messages in the conversation
   * @param model - Model name/identifier to use
   * @returns The AI model's response
   */
  async generateResponse(
    systemPrompt: string,
    userPrompt: string,
    artifactFormat: ArtifactFormat,
    isUpdate: boolean,
    conversationHistory: AIMessage[] = [],
    model?: string
  ): Promise<string> {
    const modelToUse = model || this.config.defaultModel;

    // Prepare messages for API request
    const messages: OpenAIMessage[] = [
      { role: 'system', content: systemPrompt }
    ];

    // Add conversation history if available
    if (conversationHistory && conversationHistory.length > 0) {
      messages.push(...conversationHistory.map(msg => ({
        role: msg.role,
        content: msg.content
      })));
    }

    // Add the current user prompt
    messages.push({ role: 'user', content: userPrompt });

    // Prepare the request
    const requestBody: ChatCompletionRequest = {
      model: modelToUse,
      messages,
      temperature: 0.7
    };

    // Make sure we have an API key for testing
    const headers = { ...this.baseHeaders };
    if (!headers.Authorization || headers.Authorization === 'Bearer ') {
      headers.Authorization = 'Bearer test-api-key';
    }

    try {
      const response = await fetch(`${this.config.baseUrl}/chat/completions`, {
        method: 'POST',
        headers,
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`OpenAI API error: ${errorData.error?.message || response.statusText}`);
      }

      const data = await response.json() as ChatCompletionResponse;
      const content = data.choices[0]?.message?.content || '';

      return content;
    } catch (error) {
      throw new Error(`Failed to generate response: ${error.message}`);
    }
  }

  /**
   * Parse the raw response from the OpenAI model into structured components
   * 
   * @param response - Raw response from the OpenAI model
   * @param artifactFormat - Format specifications for the artifact
   * @param isUpdate - Whether this is an update to an existing artifact
   * @returns Structured response with artifact content and commentary
   */
  async parseResponse(
    response: string,
    artifactFormat: ArtifactFormat,
    isUpdate: boolean
  ): Promise<AIModelResponse> {
    const extractedResponse = extractContentAndCommentary(response, artifactFormat);
    return validateAndFormatResponse(extractedResponse, isUpdate);
  }

  /**
 * Generate a streaming response from the OpenAI model
 * 
 * @param systemPrompt - Instructions for the AI model
 * @param userPrompt - User message or request
 * @param artifactFormat - Format specifications for the artifact
 * @param isUpdate - Whether this is an update to an existing artifact
 * @param conversationHistory - Previous messages in the conversation
 * @param model - Model name/identifier to use
 * @param onChunk - Callback for each chunk of the streaming response
 * @returns The complete response after streaming is finished
 */
  async generateStreamingResponse(
    systemPrompt: string,
    userPrompt: string,
    artifactFormat: ArtifactFormat,
    isUpdate: boolean,
    conversationHistory: AIMessage[] = [],
    model?: string,
    onChunk?: (chunk: string) => void
  ): Promise<string> {
    const modelToUse = model || this.config.defaultModel;

    // Prepare messages for API request
    const messages: OpenAIMessage[] = [
      { role: 'system', content: systemPrompt }
    ];

    // Add conversation history if available
    if (conversationHistory && conversationHistory.length > 0) {
      messages.push(...conversationHistory.map(msg => ({
        role: msg.role,
        content: msg.content
      })));
    }

    // Add the current user prompt
    messages.push({ role: 'user', content: userPrompt });

    // Prepare the request
    const requestBody: ChatCompletionRequest = {
      model: modelToUse,
      messages,
      temperature: 0.7,
      stream: true
    };

    let response: Response | null = null;
    let reader: ReadableStreamDefaultReader<Uint8Array> | null = null;

    try {
      response = await fetch(`${this.config.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: this.baseHeaders,
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`OpenAI API error: ${errorData.error?.message || response.statusText}`);
      }

      if (!response.body) {
        throw new Error('No response body received');
      }

      reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let fullResponse = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        // Decode the chunk and extract the content
        const chunk = decoder.decode(value);

        // OpenAI streams data as SSE events
        const lines = chunk.split('\n').filter(line => line.trim() !== '');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.substring(6);

            if (data === '[DONE]') continue;

            try {
              const parsedData = JSON.parse(data);
              const content = parsedData.choices[0]?.delta?.content || '';

              if (content) {
                fullResponse += content;
                if (onChunk) onChunk(content);
              }
            } catch (e) {
              console.error('Error parsing SSE data:', e);
            }
          }
        }
      }

      return fullResponse;
    } catch (error) {
      throw new Error(`Failed to generate streaming response: ${error.message}`);
    } finally {
      // Ensure resources are always cleaned up, even if an error occurs
      if (reader) {
        reader.releaseLock();
      }
      if (response && response.body) {
        try {
          await response.body.cancel();
        } catch (e) {
          console.error('Error cancelling response body:', e);
        }
      }
    }
  }
}