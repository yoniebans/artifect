// src/auth/auth.config.ts

import * as Joi from 'joi';

/**
 * Validation schema for auth configuration
 */
export const authConfigValidationSchema = Joi.object({
    CLERK_API_KEY: Joi.string().required(),
    CLERK_JWKS_URL: Joi.string().default('https://api.clerk.dev/v1/jwks'),
    CLERK_API_BASE_URL: Joi.string().default('https://api.clerk.com/v1'),
    CLERK_JWT_AUDIENCE: Joi.string().optional(),
});

/**
 * Default configuration values
 */
export const authConfigDefaults = {
    CLERK_JWKS_URL: 'https://api.clerk.dev/v1/jwks',
    CLERK_API_BASE_URL: 'https://api.clerk.com/v1',
};

/**
 * Register auth configuration
 */
export default () => ({
    auth: {
        clerk: {
            apiKey: process.env.CLERK_API_KEY,
            jwksUrl: process.env.CLERK_JWKS_URL || authConfigDefaults.CLERK_JWKS_URL,
            apiBaseUrl: process.env.CLERK_API_BASE_URL || authConfigDefaults.CLERK_API_BASE_URL,
            jwtAudience: process.env.CLERK_JWT_AUDIENCE,
        },
    },
});