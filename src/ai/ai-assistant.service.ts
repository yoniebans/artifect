// src/ai/ai-assistant.service.ts

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import * as path from 'path';
import { AIProviderFactory } from './ai-provider.factory';
import { AIMessage } from './interfaces/ai-provider.interface';
import { TemplateManagerService } from '../templates/template-manager.service';

/**
 * Interface for artifact generation result
 */
export interface ArtifactGenerationResult {
    artifactContent: string;
    commentary: string;
}

/**
 * Service for managing AI interactions
 */
@Injectable()
export class AIAssistantService {
    private readonly logger = new Logger(AIAssistantService.name);
    private readonly logDir: string;

    constructor(
        private configService: ConfigService,
        private aiProviderFactory: AIProviderFactory,
        private templateManager: TemplateManagerService
    ) {
        // Set up logging directory
        const baseDir = path.resolve(__dirname, '../..');
        this.logDir = path.join(baseDir, '_ai_logs');

        // Create directory if it doesn't exist
        try {
            if (!fs.existsSync(this.logDir)) {
                fs.mkdirSync(this.logDir, { recursive: true });
            }
        } catch (error) {
            this.logger.error(`Failed to create log directory: ${error.message}`);
        }
    }

    /**
     * Generate or update an artifact using AI
     * 
     * @param context - Context data for the artifact
     * @param isUpdate - Whether this is an update operation
     * @param userMessage - Optional user message for updates
     * @param providerId - ID of the AI provider to use
     * @param model - Model name to use with the provider
     * @param previousInteractions - Optional list of previous interactions
     * @returns Object containing the artifact content and commentary
     */
    async generateArtifact(
        context: Record<string, any>,
        isUpdate: boolean,
        userMessage?: string,
        providerId?: string,
        model?: string,
        previousInteractions?: AIMessage[]
    ): Promise<ArtifactGenerationResult> {
        try {
            // Add the user message to the context if provided
            if (userMessage) {
                context.user_message = userMessage;
            }

            // Set the update flag in the context
            context.is_update = isUpdate;

            // Get the template input for the artifact
            const templateInput = await this.templateManager.getArtifactInput(context);

            // Get the AI provider
            const provider = providerId
                ? this.aiProviderFactory.getProvider(providerId)
                : this.aiProviderFactory.getDefaultProvider();

            // Generate the response
            const aiOutput = await provider.generateResponse(
                templateInput.systemPrompt,
                templateInput.template,
                templateInput.artifactFormat,
                isUpdate,
                previousInteractions,
                model
            );

            // Parse the response
            const parsedOutput = await provider.parseResponse(
                aiOutput,
                templateInput.artifactFormat,
                isUpdate
            );

            // Log the interaction
            this.writeLog(
                context,
                templateInput,
                aiOutput,
                parsedOutput,
                providerId || 'default',
                model || 'default'
            );

            return {
                artifactContent: parsedOutput.artifactContent || '',
                commentary: parsedOutput.commentary || ''
            };
        } catch (error) {
            this.logger.error(`Error generating artifact: ${error.message}`);
            throw new Error(`Failed to generate artifact: ${error.message}`);
        }
    }

    /**
     * Generate a streaming response from the AI
     * 
     * @param context - Context data for the artifact
     * @param isUpdate - Whether this is an update operation
     * @param userMessage - Optional user message for updates
     * @param onChunk - Callback for each chunk of the streaming response
     * @param providerId - ID of the AI provider to use
     * @param model - Model name to use with the provider
     * @param previousInteractions - Optional list of previous interactions
     * @returns Object containing the artifact content and commentary
     */
    async generateStreamingArtifact(
        context: Record<string, any>,
        isUpdate: boolean,
        userMessage: string | undefined,
        onChunk: (chunk: string) => void,
        providerId?: string,
        model?: string,
        previousInteractions?: AIMessage[]
    ): Promise<ArtifactGenerationResult> {
        try {
            // Add the user message to the context if provided
            if (userMessage) {
                context.user_message = userMessage;
            }

            // Set the update flag in the context
            context.is_update = isUpdate;

            // Get the template input for the artifact
            const templateInput = await this.templateManager.getArtifactInput(context);

            // Get the AI provider
            const provider = providerId
                ? this.aiProviderFactory.getProvider(providerId)
                : this.aiProviderFactory.getDefaultProvider();

            // Check if the provider supports streaming
            if (!provider.generateStreamingResponse) {
                throw new Error('The selected AI provider does not support streaming');
            }

            // Generate the streaming response
            const aiOutput = await provider.generateStreamingResponse(
                templateInput.systemPrompt,
                templateInput.template,
                templateInput.artifactFormat,
                isUpdate,
                previousInteractions,
                model,
                onChunk
            );

            // Parse the complete response
            const parsedOutput = await provider.parseResponse(
                aiOutput,
                templateInput.artifactFormat,
                isUpdate
            );

            // Log the interaction
            this.writeLog(
                context,
                templateInput,
                aiOutput,
                parsedOutput,
                providerId || 'default',
                model || 'default'
            );

            return {
                artifactContent: parsedOutput.artifactContent || '',
                commentary: parsedOutput.commentary || ''
            };
        } catch (error) {
            this.logger.error(`Error generating streaming artifact: ${error.message}`);
            throw new Error(`Failed to generate streaming artifact: ${error.message}`);
        }
    }

    /**
     * Start a new artifact interaction
     * 
     * @param context - Context data for the artifact
     * @param providerId - ID of the AI provider to use
     * @param model - Model name to use with the provider
     * @returns Object containing the artifact content and commentary
     */
    async kickoffArtifactInteraction(
        context: Record<string, any>,
        providerId?: string,
        model?: string
    ): Promise<ArtifactGenerationResult> {
        return this.generateArtifact(
            context,
            false,  // Not an update
            undefined,  // No user message
            providerId,
            model
        );
    }

    /**
     * Update an existing artifact
     * 
     * @param context - Context data for the artifact
     * @param userMessage - User message requesting the update
     * @param providerId - ID of the AI provider to use
     * @param model - Model name to use with the provider
     * @param previousInteractions - List of previous interactions
     * @returns Object containing the updated artifact content and commentary
     */
    async updateArtifact(
        context: Record<string, any>,
        userMessage: string,
        providerId?: string,
        model?: string,
        previousInteractions?: AIMessage[]
    ): Promise<ArtifactGenerationResult> {
        return this.generateArtifact(
            context,
            true,  // Is an update
            userMessage,
            providerId,
            model,
            previousInteractions
        );
    }

    /**
     * Write AI interaction logs to disk
     * 
     * @param context - The context data used for generation
     * @param templateInput - The template input used
     * @param aiOutput - The raw AI output
     * @param parsedOutput - The parsed AI output
     * @param providerId - The ID of the AI provider used
     * @param model - The model name used
     */
    private writeLog(
        context: Record<string, any>,
        templateInput: any,
        aiOutput: string,
        parsedOutput: any,
        providerId: string,
        model: string
    ): void {
        try {
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const artifactType = context.artifact?.artifact_type_name?.toLowerCase().replace(/\s+/g, '_') || 'unknown';
            const artifactId = context.artifact?.id || 'new';

            const filename = `${timestamp}_${artifactType}_${artifactId}.json`;

            const logData = {
                timestamp: new Date().toISOString(),
                artifact_info: {
                    id: artifactId,
                    name: context.artifact?.name || 'New Artifact',
                    type: context.artifact?.artifact_type_name || 'Unknown',
                    project: context.project?.name || 'Unknown'
                },
                ai_config: {
                    provider: providerId,
                    model: model
                },
                ai_input: {
                    system_prompt: templateInput.systemPrompt,
                    user_template: templateInput.template,
                    artifact_format: templateInput.artifactFormat
                },
                ai_output: {
                    raw_response: aiOutput,
                    parsed_response: parsedOutput
                }
            };

            const logPath = path.join(this.logDir, filename);
            fs.writeFileSync(logPath, JSON.stringify(logData, null, 2), 'utf8');
        } catch (error) {
            this.logger.error(`Failed to write log: ${error.message}`);
        }
    }
}