// src/ai/openai-function-calling.provider.ts

import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AIProviderInterface, AIMessage, AIModelResponse, AIRequestResponse } from './interfaces/ai-provider.interface';
import { ArtifactFormat } from '../templates/interfaces/template-manager.interface';

/**
 * Configuration options for the OpenAI Function Calling provider
 */
interface OpenAIFunctionCallingConfig {
  apiKey: string;
  defaultModel: string;
  baseUrl?: string;
  organizationId?: string;
}

/**
 * Implementation of the AIProvider interface for OpenAI with function calling
 */
@Injectable()
export class OpenAIFunctionCallingProvider implements AIProviderInterface {
  private readonly config: OpenAIFunctionCallingConfig;
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
   * Creates artifact content and commentary functions for OpenAI function calling
   * 
   * @param artifactFormat - Format specifications for the artifact
   * @param isUpdate - Whether this is an update to an existing artifact
   * @returns Array of OpenAI tools with functions
   */
  private createArtifactFunctions(artifactFormat: ArtifactFormat, isUpdate: boolean): any[] {
    // Create a function for generating artifact content
    const artifactContentFunction = {
      name: 'generate_artifact_content',
      description: isUpdate
        ? `Generate the updated artifact content in ${artifactFormat.syntax} format`
        : `Generate the artifact content in ${artifactFormat.syntax} format`,
      parameters: {
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

    // Create a function for providing commentary
    const commentaryFunction = {
      name: 'provide_commentary',
      description: 'Provide commentary, questions, or additional information about the artifact',
      parameters: {
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

    // Return these as OpenAI tools
    return [
      { type: 'function', function: artifactContentFunction },
      { type: 'function', function: commentaryFunction }
    ];
  }

  /**
 * Parse function call responses to extract artifact content and commentary
 * 
 * @param message - OpenAI message with function calls
 * @returns Parsed content and commentary
 */
  private parseFunctionCalls(message: any): AIModelResponse {
    const result: AIModelResponse = {
      rawResponse: JSON.stringify(message),
      artifactContent: '',
      commentary: ''
    };

    // Handle modern tool_calls format (GPT-4 and newer)
    if (message.tool_calls && message.tool_calls.length > 0) {
      for (const toolCall of message.tool_calls) {
        if (toolCall.function) {
          // First check if we already have parsed arguments (from streaming)
          if (toolCall.function.parsedArguments) {
            if (toolCall.function.name === 'generate_artifact_content' && toolCall.function.parsedArguments.content) {
              result.artifactContent = toolCall.function.parsedArguments.content;
            } else if (toolCall.function.name === 'provide_commentary' && toolCall.function.parsedArguments.commentary) {
              result.commentary = toolCall.function.parsedArguments.commentary;
            }
          }
          // Otherwise try to parse the arguments
          else if (toolCall.function.arguments) {
            try {
              const args = JSON.parse(toolCall.function.arguments);

              if (toolCall.function.name === 'generate_artifact_content' && args.content) {
                result.artifactContent = args.content;
              } else if (toolCall.function.name === 'provide_commentary' && args.commentary) {
                result.commentary = args.commentary;
              }
            } catch (error) {
              console.error('Error parsing function arguments:', error);
            }
          }
        }
      }
    }
    // Handle legacy function_call format (older models)
    else if (message.function_call) {
      try {
        const args = JSON.parse(message.function_call.arguments);

        if (message.function_call.name === 'generate_artifact_content' && args.content) {
          result.artifactContent = args.content;
        } else if (message.function_call.name === 'provide_commentary' && args.commentary) {
          result.commentary = args.commentary;
        }
      } catch (error) {
        console.error('Error parsing function arguments:', error);
      }
    }
    // Handle regular content if no function calls
    else if (message.content) {
      // If no function calls were made, treat the entire content as commentary
      result.commentary = message.content;
    }

    return result;
  }

  /**
   * Generate a response from the OpenAI model using function calling
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

    // Create the artifact functions
    const tools = this.createArtifactFunctions(artifactFormat, isUpdate);

    // Prepare messages for API request
    const messages: any[] = [
      { role: 'system', content: systemPrompt }
    ];

    // Add conversation history if available
    if (conversationHistory && conversationHistory.length > 0) {
      messages.push(...conversationHistory.map(msg => ({
        role: msg.role,
        content: msg.content
      })));
    }

    // Add the user prompt
    messages.push({ role: 'user', content: userPrompt });

    // Define the tool_choice based on whether this is an update or not
    let toolChoice: any;

    if (isUpdate) {
      // For updates, use the artifact content function by default
      toolChoice = {
        type: 'function',
        function: { name: 'generate_artifact_content' }
      };
    } else {
      // For new artifacts, let the model decide which function to call first
      toolChoice = 'auto';
    }

    // Prepare the request
    const requestBody = {
      model: modelToUse,
      messages,
      tools,
      tool_choice: toolChoice,
      temperature: 0.7
    };

    try {
      const response = await fetch(`${this.config.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: this.baseHeaders,
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`OpenAI API error: ${errorData.error?.message || response.statusText}`);
      }

      const data = await response.json();
      const message = data.choices[0]?.message;

      if (!message) {
        throw new Error('No message in response');
      }

      // Parse the function calls to get artifact content and commentary
      const parsedOutput = this.parseFunctionCalls(message);

      return {
        formattedUserPrompt: userPrompt,
        formattedSystemPrompt: systemPrompt,
        rawResponse: parsedOutput.rawResponse,
        parsedResponse: parsedOutput,
        metadata: {
          model: modelToUse,
          tokenUsage: data.usage
        }
      };
    } catch (error) {
      throw new Error(`Failed to generate response: ${error.message}`);
    }
  }

  /**
   * Parse the raw response from the OpenAI model into structured components
   * This method is mostly a pass-through since our generateResponse already
   * parses the content, but we implement it to satisfy the interface
   * 
   * @param response - Raw response from the OpenAI model (JSON string)
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
      // If we have a parsedResponse from generateResponse, use that
      const parsedMessage = JSON.parse(response);
      return this.parseFunctionCalls(parsedMessage);
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
  ): Promise<AIRequestResponse> {
    const modelToUse = model || this.config.defaultModel;

    // Create the artifact functions
    const tools = this.createArtifactFunctions(artifactFormat, isUpdate);

    // Prepare messages for API request
    const messages: any[] = [
      { role: 'system', content: systemPrompt }
    ];

    // Add conversation history if available
    if (conversationHistory && conversationHistory.length > 0) {
      messages.push(...conversationHistory.map(msg => ({
        role: msg.role,
        content: msg.content
      })));
    }

    // Add the user prompt
    messages.push({ role: 'user', content: userPrompt });

    // Prepare the request
    const requestBody = {
      model: modelToUse,
      messages,
      tools,
      tool_choice: 'auto',
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
      let fullMessage: any = { role: 'assistant', content: null };
      let currentChunk = '';

      // For streaming, we'll collect all pieces of the message
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        // Decode the chunk
        const chunk = decoder.decode(value);

        // OpenAI streams data as SSE events
        const lines = chunk.split('\n').filter(line => line.trim() !== '');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.substring(6);

            if (data === '[DONE]') continue;

            try {
              const parsedData = JSON.parse(data);

              // Handle different parts of the streamed response
              const delta = parsedData.choices[0]?.delta;

              if (delta) {
                // Handle content delta
                if (delta.content) {
                  if (fullMessage.content === null) {
                    fullMessage.content = '';
                  }
                  fullMessage.content += delta.content;
                  currentChunk += delta.content;
                  if (onChunk) onChunk(delta.content);
                }

                // Handle function call delta
                if (delta.tool_calls) {
                  if (!fullMessage.tool_calls) {
                    fullMessage.tool_calls = [];
                  }

                  for (const toolCallDelta of delta.tool_calls) {
                    const toolCallIndex = toolCallDelta.index;

                    // Create the tool call if it doesn't exist
                    if (!fullMessage.tool_calls[toolCallIndex]) {
                      fullMessage.tool_calls[toolCallIndex] = {
                        id: toolCallDelta.id || '',
                        type: 'function',
                        function: {
                          name: '',
                          arguments: ''
                        }
                      };
                    }

                    // Update the function name
                    if (toolCallDelta.function?.name) {
                      fullMessage.tool_calls[toolCallIndex].function.name = toolCallDelta.function.name;
                    }

                    // Update the function arguments - this is streamed as fragments of a string
                    if (toolCallDelta.function?.arguments) {
                      fullMessage.tool_calls[toolCallIndex].function.arguments += toolCallDelta.function.arguments;
                    }
                  }
                }
              }
            } catch (e) {
              console.error('Error parsing SSE data:', e);
            }
          }
        }
      }

      // Now parse the function calls AFTER all streaming is complete and function arguments
      // have been fully assembled - don't try to parse JSON fragments

      // Only try to parse the arguments now that we have the complete strings
      if (fullMessage.tool_calls) {
        for (const toolCall of fullMessage.tool_calls) {
          if (toolCall.function && toolCall.function.arguments) {
            try {
              // Parse the arguments now that they're complete
              const args = JSON.parse(toolCall.function.arguments);
              toolCall.function.parsedArguments = args;
            } catch (error) {
              console.error('Error parsing complete function arguments:', error);
            }
          }
        }
      }

      // Parse the function calls to get artifact content and commentary
      const parsedOutput = this.parseFunctionCalls(fullMessage);

      return {
        formattedUserPrompt: userPrompt,
        formattedSystemPrompt: systemPrompt,
        rawResponse: parsedOutput.rawResponse,
        parsedResponse: parsedOutput,
        metadata: {
          model: modelToUse,
          tokenUsage: 0, // Not available in streaming
          originalMessage: fullMessage
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