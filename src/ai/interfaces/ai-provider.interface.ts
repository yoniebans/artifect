// src/ai/interfaces/ai-provider.interface.ts

import { ArtifactFormat } from '../../templates/interfaces/template-manager.interface';

export interface AIRequestResponse {
    // What was actually sent to the LLM (after formatting)
    formattedSystemPrompt?: string;
    formattedUserPrompt: string;

    // What was received from the LLM
    rawResponse: string;

    // Additional metadata
    metadata?: Record<string, any>;
}

/**
 * Response from an AI model
 */
export interface AIModelResponse {
    /**
     * Raw response from the AI model
     */
    rawResponse: string;

    /**
     * Extracted artifact content (if available)
     */
    artifactContent?: string;

    /**
     * Extracted commentary (if available)
     */
    commentary?: string;
}

/**
 * Message for AI conversation
 */
export interface AIMessage {
    /**
     * Role of the message sender (e.g., 'system', 'user', 'assistant')
     */
    role: string;

    /**
     * Content of the message
     */
    content: string;
}

/**
 * Common interface for all AI providers
 */
export interface AIProviderInterface {
    /**
     * Generate a response from the AI model
     * 
     * @param systemPrompt - Instructions for the AI model
     * @param userPrompt - User message or request
     * @param artifactFormat - Format specifications for the artifact
     * @param isUpdate - Whether this is an update to an existing artifact
     * @param conversationHistory - Previous messages in the conversation
     * @param model - Model name/identifier to use
     * @returns The AI model's response
     */
    generateResponse(
        systemPrompt: string,
        userPrompt: string,
        artifactFormat: ArtifactFormat,
        isUpdate: boolean,
        conversationHistory?: AIMessage[],
        model?: string
    ): Promise<AIRequestResponse>;

    /**
     * Parse the raw response from the AI model into structured components
     * 
     * @param response - Raw response from the AI model
     * @param artifactFormat - Format specifications for the artifact
     * @param isUpdate - Whether this is an update to an existing artifact
     * @returns Structured response with artifact content and commentary
     */
    parseResponse(
        response: string,
        artifactFormat: ArtifactFormat,
        isUpdate: boolean
    ): Promise<AIModelResponse>;

    /**
     * Generate a streaming response from the AI model
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
    generateStreamingResponse?(
        systemPrompt: string,
        userPrompt: string,
        artifactFormat: ArtifactFormat,
        isUpdate: boolean,
        conversationHistory?: AIMessage[],
        model?: string,
        onChunk?: (chunk: string) => void
    ): Promise<AIRequestResponse>;
}