// apps/backend/src/api/controllers/ai-provider.controller.ts

import { Controller, Get } from '@nestjs/common';
import { AIProviderDto } from '../dto';
import { ApiListAIProviders } from '../decorators/swagger.decorator';

/**
 * Controller for AI provider-related endpoints
 */
@Controller('ai-providers')
export class AIProviderController {
    /**
     * List available AI providers and their models
     * Exposes both standard and function calling implementations
     * @returns Array of AI providers
     */
    @Get()
    @ApiListAIProviders()
    async listAIProviders(): Promise<AIProviderDto[]> {
        const providersData = [
            // Anthropic standard
            {
                id: "anthropic",
                name: "Anthropic (Standard)",
                models: [
                    "claude-3-5-sonnet-20241022",
                    "claude-3-5-haiku-20241022",
                    "claude-3-opus-20240229",
                    "claude-3-sonnet-20240229",
                    "claude-3-haiku-20240307"
                ]
            },
            // Anthropic with function calling/tool use
            {
                id: "anthropic-function-calling",
                name: "Anthropic (Tool Use)",
                models: [
                    "claude-3-5-sonnet-20241022",
                    "claude-3-5-haiku-20241022",
                    "claude-3-opus-20240229",
                    "claude-3-sonnet-20240229",
                    "claude-3-haiku-20240307"
                ]
            },
            // OpenAI standard
            {
                id: "openai",
                name: "OpenAI (Standard)",
                models: [
                    "o1-preview",
                    "o1-mini",
                    "gpt-4o",
                    "gpt-4o-mini",
                    "gpt-4-turbo-preview",
                    "gpt-4",
                    "gpt-3.5-turbo"
                ]
            },
            // OpenAI with function calling
            {
                id: "openai-function-calling",
                name: "OpenAI (Function Calling)",
                models: [
                    "o1-preview",
                    "o1-mini",
                    "gpt-4o",
                    "gpt-4o-mini",
                    "gpt-4-turbo-preview",
                    "gpt-4",
                    "gpt-3.5-turbo"
                ]
            }
        ];

        // Convert plain objects to validated DTOs
        const providers = providersData.map(providerData => {
            const providerDto = new AIProviderDto();
            providerDto.id = providerData.id;
            providerDto.name = providerData.name;
            providerDto.models = providerData.models;
            return providerDto;
        });

        return providers;
    }
}