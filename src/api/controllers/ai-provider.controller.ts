// src/api/controllers/ai-provider.controller.ts

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
     * This is currently using stubbed data similar to the original Python implementation
     * @returns Array of AI providers
     */
    @Get()
    @ApiListAIProviders()
    async listAIProviders(): Promise<AIProviderDto[]> {
        const providers: AIProviderDto[] = [
            {
                id: "anthropic",
                name: "Anthropic",
                models: [
                    "claude-3-5-sonnet-20241022",
                    "claude-3-5-haiku-20241022",
                    "claude-3-opus-20240229",
                    "claude-3-sonnet-20240229",
                    "claude-3-haiku-20240307"
                ]
            },
            {
                id: "openai",
                name: "OpenAI",
                models: [
                    "o1-preview",
                    "o1-mini",
                    "gpt-4o-mini",
                    "gpt-4o",
                    "gpt-4-turbo-preview",
                    "gpt-4",
                    "gpt-3.5-turbo"
                ]
            }
        ];

        return providers;
    }
}