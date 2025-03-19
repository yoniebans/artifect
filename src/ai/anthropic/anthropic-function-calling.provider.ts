// src/ai/anthropic-function-calling.provider.ts

import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AIProviderInterface, AIMessage, AIModelResponse, AIRequestResponse } from '../interfaces/ai-provider.interface';
import { ArtifactFormat } from '../../templates/interfaces/template-manager.interface';

/**
 * Configuration options for the Anthropic Function Calling provider
 */
interface AnthropicFunctionCallingConfig {
    apiKey: string;
    defaultModel: string;
    baseUrl?: string;
    version?: string;
}

/**
 * Implementation of the AIProvider interface for Anthropic with function calling
 */
@Injectable()
export class AnthropicFunctionCallingProvider implements AIProviderInterface {
    private readonly config: AnthropicFunctionCallingConfig;
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
     * Creates artifact content and commentary tools for Anthropic tool use
     * 
     * @param artifactFormat - Format specifications for the artifact
     * @param isUpdate - Whether this is an update to an existing artifact
     * @returns Array of Anthropic tools
     */
    private createArtifactTools(artifactFormat: ArtifactFormat, isUpdate: boolean): any[] {
        // Create a tool for generating artifact content
        const artifactContentTool = {
            name: 'generate_artifact_content',
            description: isUpdate
                ? `Generate the updated artifact content in ${artifactFormat.syntax} format`
                : `Generate the artifact content in ${artifactFormat.syntax} format`,
            input_schema: {
                type: 'object',
                properties: {
                    content: {
                        type: 'string',
                        description: `The ${artifactFormat.syntax} content for the artifact`
                    }
                },
                required: ['content']
            }
        };

        // Create a tool for providing commentary
        const commentaryTool = {
            name: 'provide_commentary',
            description: 'Provide commentary, questions, or additional information about the artifact',
            input_schema: {
                type: 'object',
                properties: {
                    commentary: {
                        type: 'string',
                        description: 'Commentary, questions, or additional information to share with the user'
                    }
                },
                required: ['commentary']
            }
        };

        // Return these as Anthropic tools
        return [artifactContentTool, commentaryTool];
    }

    /**
     * Parse tool use responses to extract artifact content and commentary
     * 
     * @param response - Anthropic message with tool uses
     * @returns Parsed content and commentary
     */
    private parseToolUses(response: any): AIModelResponse {
        const result: AIModelResponse = {
            rawResponse: JSON.stringify(response),
            artifactContent: '',
            commentary: ''
        };

        // Handle regular response without content
        if (!response.content) {
            return result;
        }

        // Process each content block
        for (const block of response.content) {
            // Handle text blocks (non-tool-use content)
            if (block.type === 'text') {
                // If there's regular text content, treat it as commentary
                if (!result.commentary) {
                    result.commentary = block.text;
                } else {
                    result.commentary += '\n' + block.text;
                }
            }
            // Handle tool_use blocks
            else if (block.type === 'tool_use') {
                if (block.name === 'generate_artifact_content' && block.input && block.input.content) {
                    result.artifactContent = block.input.content;
                } else if (block.name === 'provide_commentary' && block.input && block.input.commentary) {
                    result.commentary = block.input.commentary;
                }
            }
        }

        return result;
    }

    /**
     * Generate a response from the Anthropic model using tool use
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
    ): Promise<AIRequestResponse> {
        const modelToUse = model || this.config.defaultModel;

        // Create the artifact tools
        const tools = this.createArtifactTools(artifactFormat, isUpdate);

        // Prepare messages for API request
        const messages: any[] = [];

        // Add conversation history if available
        if (conversationHistory && conversationHistory.length > 0) {
            messages.push(...conversationHistory.map(msg => ({
                role: msg.role === 'system' ? 'assistant' : msg.role, // Anthropic doesn't support system role in messages
                content: msg.content
            })));
        }

        // Add the user prompt
        messages.push({ role: 'user', content: userPrompt });

        // Define tool choice based on whether this is an update or not
        let toolChoice: any = null;

        if (isUpdate) {
            // For updates, require the artifact content tool
            toolChoice = {
                type: "tool_use",
                name: "generate_artifact_content"
            };
        }

        // Prepare the request
        const requestBody: any = {
            model: modelToUse,
            messages,
            system: systemPrompt,
            tools,
            temperature: 0.7,
            max_tokens: 4000
        };

        // Add tool_choice if specified
        if (toolChoice) {
            requestBody.tool_choice = toolChoice;
        }

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

            const data = await response.json();

            // Parse the tool uses to get artifact content and commentary
            const parsedOutput = this.parseToolUses(data);

            return {
                formattedUserPrompt: userPrompt,
                formattedSystemPrompt: systemPrompt,
                rawResponse: JSON.stringify(data),
                parsedResponse: parsedOutput,
                metadata: {
                    model: modelToUse,
                    tokenUsage: data.usage,
                    originalResponse: data
                }
            };
        } catch (error) {
            throw new Error(`Failed to generate response: ${error.message}`);
        }
    }

    /**
     * Parse the raw response from the Anthropic model into structured components
     * This method is mostly a pass-through since our generateResponse already
     * parses the content, but we implement it to satisfy the interface
     * 
     * @param response - Raw response from the Anthropic model (JSON string)
     * @param artifactFormat - Format specifications for the artifact
     * @param isUpdate - Whether this is an update to an existing artifact
     * @returns Structured response with artifact content and commentary
     */
    async parseResponse(
        response: string,
        artifactFormat: ArtifactFormat,
        isUpdate: boolean
    ): Promise<AIModelResponse> {
        try {
            // If we have a JSON string, parse it and extract content
            const parsedData = JSON.parse(response);
            return this.parseToolUses(parsedData);
        } catch (e) {
            // If it's not a valid JSON string (shouldn't happen), return a default structure
            return {
                rawResponse: response,
                artifactContent: '',
                commentary: isUpdate ? '' : response
            };
        }
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
    ): Promise<AIRequestResponse> {
        const modelToUse = model || this.config.defaultModel;

        // Create the artifact tools
        const tools = this.createArtifactTools(artifactFormat, isUpdate);

        // Prepare messages for API request
        const messages: any[] = [];

        // Add conversation history if available
        if (conversationHistory && conversationHistory.length > 0) {
            messages.push(...conversationHistory.map(msg => ({
                role: msg.role === 'system' ? 'assistant' : msg.role,
                content: msg.content
            })));
        }

        // Add the user prompt
        messages.push({ role: 'user', content: userPrompt });

        // Prepare the request
        const requestBody: any = {
            model: modelToUse,
            messages,
            system: systemPrompt,
            tools,
            temperature: 0.7,
            max_tokens: 4000,
            stream: true
        };

        // For update requests, specify tool_choice
        if (isUpdate) {
            requestBody.tool_choice = {
                type: "tool_use",
                name: "generate_artifact_content"
            };
        }

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

            // For Anthropic, we need to reconstruct the full response
            let fullResponse: any = {
                content: []
            };

            let currentTextBlock: any = null;
            let currentToolUseBlock: any = null;
            let visibleText = '';

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                // Decode the chunk
                const chunk = decoder.decode(value);

                // Anthropic streams data as event stream
                const lines = chunk.split('\n').filter(line => line.trim() !== '');

                for (const line of lines) {
                    try {
                        // Skip event type lines
                        if (line.startsWith('event:')) continue;

                        // Handle data lines
                        if (line.startsWith('data:')) {
                            const data = line.substring(5).trim();

                            if (data === '[DONE]') continue;

                            const parsedEvent = JSON.parse(data);

                            // Handle content delta events
                            if (parsedEvent.type === 'content_block_start') {
                                const block = parsedEvent.content_block;

                                if (block.type === 'text') {
                                    // Start a new text block
                                    currentTextBlock = {
                                        type: 'text',
                                        text: ''
                                    };
                                } else if (block.type === 'tool_use') {
                                    // Start a new tool use block
                                    currentToolUseBlock = {
                                        type: 'tool_use',
                                        id: block.id || '',
                                        name: block.name || '',
                                        input: block.input || {}
                                    };
                                }
                            }
                            else if (parsedEvent.type === 'content_block_delta') {
                                if (parsedEvent.delta.type === 'text_delta') {
                                    // Add text to the current text block
                                    if (currentTextBlock) {
                                        currentTextBlock.text += parsedEvent.delta.text || '';

                                        // Also update visible text and call the onChunk callback
                                        visibleText += parsedEvent.delta.text || '';
                                        if (onChunk) {
                                            onChunk(parsedEvent.delta.text || '');
                                        }
                                    }
                                }
                                else if (parsedEvent.delta.type === 'tool_use_delta') {
                                    // Update the tool use block
                                    if (currentToolUseBlock && parsedEvent.delta.tool_use) {
                                        if (parsedEvent.delta.tool_use.name) {
                                            currentToolUseBlock.name = parsedEvent.delta.tool_use.name;
                                        }

                                        if (parsedEvent.delta.tool_use.input) {
                                            // Merge the input delta with the existing input
                                            currentToolUseBlock.input = {
                                                ...currentToolUseBlock.input,
                                                ...parsedEvent.delta.tool_use.input
                                            };
                                        }
                                    }
                                }
                            }
                            else if (parsedEvent.type === 'content_block_stop') {
                                // Add the completed block to the full response
                                if (currentTextBlock) {
                                    fullResponse.content.push(currentTextBlock);
                                    currentTextBlock = null;
                                } else if (currentToolUseBlock) {
                                    fullResponse.content.push(currentToolUseBlock);
                                    currentToolUseBlock = null;
                                }
                            }
                            else if (parsedEvent.type === 'message_stop') {
                                // Nothing more to do, the message is complete
                            }
                            else if (parsedEvent.type === 'message_start') {
                                // Initialize metadata
                                fullResponse.id = parsedEvent.message.id;
                                fullResponse.model = parsedEvent.message.model;
                                fullResponse.role = parsedEvent.message.role;
                            }
                            else if (parsedEvent.type === 'message_delta') {
                                // Update metadata
                                if (parsedEvent.delta.usage) {
                                    fullResponse.usage = parsedEvent.delta.usage;
                                }
                            }
                        }
                    } catch (e) {
                        console.error('Error parsing Anthropic stream data:', e);
                    }
                }
            }

            // Parse the tool uses to get artifact content and commentary
            const parsedOutput = this.parseToolUses(fullResponse);

            return {
                formattedUserPrompt: userPrompt,
                formattedSystemPrompt: systemPrompt,
                rawResponse: JSON.stringify(fullResponse),
                parsedResponse: parsedOutput,
                metadata: {
                    model: modelToUse,
                    tokenUsage: fullResponse.usage || 0,
                    originalResponse: fullResponse
                }
            };
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