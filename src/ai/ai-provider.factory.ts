// src/ai/ai-provider.factory.ts

import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AIProviderInterface } from './interfaces/ai-provider.interface';
import { OpenAIProvider } from './openai/openai.provider';
import { AnthropicProvider } from './anthropic/anthropic.provider';
import { OpenAIFunctionCallingProvider } from './openai/openai-function-calling.provider';
import { AnthropicFunctionCallingProvider } from './anthropic/anthropic-function-calling.provider';

/**
 * Factory for creating AI providers
 */
@Injectable()
export class AIProviderFactory {
    private providers: Map<string, AIProviderInterface>;

    constructor(
        private configService: ConfigService,
        private openaiProvider: OpenAIProvider,
        private anthropicProvider: AnthropicProvider,
        private openAIFunctionCallingProvider: OpenAIFunctionCallingProvider,
        private anthropicFunctionCallingProvider: AnthropicFunctionCallingProvider,
    ) {
        // Initialize the providers map
        this.providers = new Map<string, AIProviderInterface>();

        // Use try-catch to avoid failures in test environments
        try {
            this.providers.set('openai', this.openaiProvider);
            this.providers.set('openai-function-calling', this.openAIFunctionCallingProvider);
        } catch (error) {
            console.warn('OpenAI provider not available:', error instanceof Error ? error.message : String(error));
        }

        try {
            this.providers.set('anthropic', this.anthropicProvider);
            this.providers.set('anthropic-function-calling', this.anthropicFunctionCallingProvider);
        } catch (error) {
            console.warn('Anthropic provider not available:', error instanceof Error ? error.message : String(error));
        }
    }

    /**
     * Get an AI provider by name
     * 
     * @param providerName - Name of the provider (e.g., 'openai', 'anthropic')
     * @returns The requested AI provider
     * @throws Error if provider is not found
     */
    getProvider(providerName: string): AIProviderInterface {
        // Look up the provider exactly as requested without any automatic selection
        const provider = this.providers.get(providerName.toLowerCase());

        if (!provider) {
            throw new Error(`AI provider '${providerName}' not found. Available providers: ${this.getProviderNames().join(', ')}`);
        }

        return provider;
    }

    /**
     * Get the default AI provider based on configuration
     * 
     * @returns The default AI provider
     */
    getDefaultProvider(): AIProviderInterface {
        const defaultProviderName = this.configService.get<string>('DEFAULT_AI_PROVIDER') || 'anthropic';
        return this.getProvider(defaultProviderName);
    }

    /**
     * Register a new AI provider
     * 
     * @param name - Name to register the provider under
     * @param provider - The provider instance to register
     */
    registerProvider(name: string, provider: AIProviderInterface): void {
        this.providers.set(name.toLowerCase(), provider);
    }

    /**
     * Get all registered provider names
     * 
     * @returns Array of provider names
     */
    getProviderNames(): string[] {
        return Array.from(this.providers.keys());
    }
}