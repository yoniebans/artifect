// src/ai/ai.config.ts

import * as Joi from 'joi';

/**
 * Validation schema for AI provider configuration
 */
export const aiConfigValidationSchema = Joi.object({
    // Default provider
    DEFAULT_AI_PROVIDER: Joi.string().valid('openai', 'anthropic').default('anthropic'),

    // OpenAI configuration
    OPENAI_API_KEY: Joi.string().when('DEFAULT_AI_PROVIDER', {
        is: 'openai',
        then: Joi.required(),
        otherwise: Joi.optional()
    }),
    OPENAI_DEFAULT_MODEL: Joi.string().default('gpt-4'),
    OPENAI_BASE_URL: Joi.string().default('https://api.openai.com/v1'),
    OPENAI_ORGANIZATION_ID: Joi.string().optional(),

    // Anthropic configuration
    ANTHROPIC_API_KEY: Joi.when('DEFAULT_AI_PROVIDER', {
        is: 'anthropic',
        then: Joi.required(),
        otherwise: Joi.optional()
    }),
    ANTHROPIC_DEFAULT_MODEL: Joi.string().default('claude-3-opus-20240229'),
    ANTHROPIC_BASE_URL: Joi.string().default('https://api.anthropic.com'),
    ANTHROPIC_API_VERSION: Joi.string().default('2023-06-01')
});

/**
 * Configuration defaults for AI providers
 */
export const aiConfigDefaults = {
    DEFAULT_AI_PROVIDER: 'anthropic',

    // OpenAI defaults
    OPENAI_DEFAULT_MODEL: 'gpt-4',
    OPENAI_BASE_URL: 'https://api.openai.com/v1',

    // Anthropic defaults
    ANTHROPIC_DEFAULT_MODEL: 'claude-3-opus-20240229',
    ANTHROPIC_BASE_URL: 'https://api.anthropic.com',
    ANTHROPIC_API_VERSION: '2023-06-01'
};

/**
 * Register AI environment variables configuration
 */
export default () => ({
    ai: {
        defaultProvider: process.env.DEFAULT_AI_PROVIDER || aiConfigDefaults.DEFAULT_AI_PROVIDER,

        // OpenAI configuration
        openai: {
            apiKey: process.env.OPENAI_API_KEY,
            defaultModel: process.env.OPENAI_DEFAULT_MODEL || aiConfigDefaults.OPENAI_DEFAULT_MODEL,
            baseUrl: process.env.OPENAI_BASE_URL || aiConfigDefaults.OPENAI_BASE_URL,
            organizationId: process.env.OPENAI_ORGANIZATION_ID
        },

        // Anthropic configuration
        anthropic: {
            apiKey: process.env.ANTHROPIC_API_KEY,
            defaultModel: process.env.ANTHROPIC_DEFAULT_MODEL || aiConfigDefaults.ANTHROPIC_DEFAULT_MODEL,
            baseUrl: process.env.ANTHROPIC_BASE_URL || aiConfigDefaults.ANTHROPIC_BASE_URL,
            apiVersion: process.env.ANTHROPIC_API_VERSION || aiConfigDefaults.ANTHROPIC_API_VERSION
        }
    }
});