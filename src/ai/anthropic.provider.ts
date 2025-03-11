// src/ai/anthropic.provider.ts

import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AIProviderInterface, AIMessage, AIModelResponse } from './interfaces/ai-provider.interface';
import { ArtifactFormat } from '../templates/interfaces/template-manager.interface';
import { extractContentAndCommentary, validateAndFormatResponse } from './response-parser';

/**
 * Configuration options for the Anthropic provider
 */
interface AnthropicConfig {
    apiKey: string;
    defaultModel: string;
    baseUrl?: string;
    version?: string;
}

/**
 * Message format for Anthropic API
 */
interface AnthropicMessage {
    role: string;
    content: string;
}

/**
 * Chat completion request for Anthropic API
 */
interface AnthropicChatRequest {
    model: string;
    messages: AnthropicMessage[];
    system?: string;
    max_tokens?: number;
    temperature?: number;
    top_p?: number;
    stream?: boolean;
}

/**
 * Chat completion response from Anthropic API
 */
interface AnthropicChatResponse {
    id: string;
    type: string;
    role: string;
    content: {
        type: string;
        text: string;
    }[];
    model: string;
    stop_reason: string;
    usage: {
        input_tokens: number;
        output_tokens: number;
    };
}

/**
 * Implementation of the AIProvider interface for Anthropic
 */
@Injectable()
export class AnthropicProvider implements AIProviderInterface {
    private readonly config: AnthropicConfig;
    private readonly baseHeaders: Record<string, string>;

    constructor(private configService: ConfigService) {
        this.config = {
            apiKey: this.configService.get<string>('ANTHROPIC_API_KEY') || '',
            defaultModel: this.configService.get<string>('ANTHROPIC_DEFAULT_MODEL') || 'claude-3-opus-20240229',
            baseUrl: this.configService.get<string>('ANTHROPIC_BASE_URL') || 'https://api.anthropic.com',
            version: this.configService.get<string>('ANTHROPIC_API_VERSION') || '2023-06-01'
        };

        this.baseHeaders = {
            'Content-Type': 'application/json',
            'x-api-key': this.config.apiKey,
            'anthropic-version': this.config.version || '2023-06-01'
        };

        if (!this.config.apiKey) {
            throw new Error('Anthropic API key is required');
        }
    }

    /**
     * Generate a response from the Anthropic model
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
        const messages: AnthropicMessage[] = [];

        // Add conversation history if available
        if (conversationHistory && conversationHistory.length > 0) {
            messages.push(...conversationHistory.map(msg => ({
                role: msg.role === 'system' ? 'assistant' : msg.role, // Anthropic doesn't support system role in messages
                content: msg.content
            })));
        }

        // Add the current user prompt
        messages.push({ role: 'user', content: userPrompt });

        // Prepare the request
        const requestBody: AnthropicChatRequest = {
            model: modelToUse,
            messages,
            system: systemPrompt,
            temperature: 0.7,
            max_tokens: 4000
        };

        try {
            const response = await fetch(`${this.config.baseUrl}/v1/messages`, {
                method: 'POST',
                headers: this.baseHeaders,
                body: JSON.stringify(requestBody)
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(`Anthropic API error: ${errorData.error?.message || response.statusText}`);
            }

            const data = await response.json() as AnthropicChatResponse;

            // Anthropic returns content as an array of blocks, combine them
            let content = '';
            for (const block of data.content) {
                if (block.type === 'text') {
                    content += block.text;
                }
            }

            return content;
        } catch (error) {
            throw new Error(`Failed to generate response: ${error.message}`);
        }
    }

    /**
     * Parse the raw response from the Anthropic model into structured components
     * 
     * @param response - Raw response from the Anthropic model
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
 * Generate a streaming response from the Anthropic model
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
        const messages: AnthropicMessage[] = [];

        // Add conversation history if available
        if (conversationHistory && conversationHistory.length > 0) {
            messages.push(...conversationHistory.map(msg => ({
                role: msg.role === 'system' ? 'assistant' : msg.role,
                content: msg.content
            })));
        }

        // Add the current user prompt
        messages.push({ role: 'user', content: userPrompt });

        // Prepare the request
        const requestBody: AnthropicChatRequest = {
            model: modelToUse,
            messages,
            system: systemPrompt,
            temperature: 0.7,
            max_tokens: 4000,
            stream: true
        };

        let response: Response | null = null;
        let reader: ReadableStreamDefaultReader<Uint8Array> | null = null;

        try {
            response = await fetch(`${this.config.baseUrl}/v1/messages`, {
                method: 'POST',
                headers: this.baseHeaders,
                body: JSON.stringify(requestBody)
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(`Anthropic API error: ${errorData.error?.message || response.statusText}`);
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

                // Decode the chunk
                const chunk = decoder.decode(value);

                // Anthropic streams data as JSON chunks separated by newlines
                const lines = chunk.split('\n').filter(line => line.trim() !== '');

                for (const line of lines) {
                    try {
                        // Skip event type lines
                        if (line.startsWith('event:')) continue;

                        // Parse data lines
                        if (line.startsWith('data:')) {
                            const data = line.substring(5).trim();

                            if (data === '[DONE]') continue;

                            const parsedData = JSON.parse(data);

                            // Handle content delta
                            if (parsedData.type === 'content_block_delta') {
                                const delta = parsedData.delta?.text || '';
                                if (delta) {
                                    fullResponse += delta;
                                    if (onChunk) onChunk(delta);
                                }
                            }
                        }
                    } catch (e) {
                        console.error('Error parsing SSE data:', e);
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