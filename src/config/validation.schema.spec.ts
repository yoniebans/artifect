import { validationSchema } from './validation.schema';

describe('Validation Schema', () => {
    it('should validate correct configuration', () => {
        const validConfig = {
            NODE_ENV: 'development',
            PORT: 3000,
            DATABASE_URL: 'postgresql://user:password@localhost:5432/dbname',
            // Add required API keys
            ANTHROPIC_API_KEY: 'test-api-key',
            DEFAULT_AI_PROVIDER: 'anthropic'
        };

        const { error } = validationSchema.validate(validConfig);
        expect(error).toBeUndefined();
    });

    it('should use default values when optional fields are missing', () => {
        const minimalConfig = {
            DATABASE_URL: 'postgresql://user:password@localhost:5432/dbname',
            // Add required API key for anthropic since it's the default provider
            ANTHROPIC_API_KEY: 'test-api-key'
        };

        const { error, value } = validationSchema.validate(minimalConfig);
        expect(error).toBeUndefined();
        expect(value.NODE_ENV).toBe('development');
        expect(value.PORT).toBe(3000);
    });

    it('should require DATABASE_URL', () => {
        const invalidConfig = {
            NODE_ENV: 'development',
            PORT: 3000,
        };

        const { error } = validationSchema.validate(invalidConfig);
        expect(error).toBeDefined();
        if (error) {
            expect(error.message).toContain('DATABASE_URL');
        }
    });

    it('should validate NODE_ENV is one of the allowed values', () => {
        const invalidConfig = {
            NODE_ENV: 'invalid',
            PORT: 3000,
            DATABASE_URL: 'postgresql://user:password@localhost:5432/testdb',
        };

        const { error } = validationSchema.validate(invalidConfig);
        expect(error).toBeDefined();
        if (error) {
            expect(error.message).toContain('NODE_ENV');
        }
    });

    it('should validate PORT is a number', () => {
        const invalidConfig = {
            NODE_ENV: 'development',
            PORT: 'not-a-number',
            DATABASE_URL: 'postgresql://user:password@localhost:5432/testdb',
        };

        const { error } = validationSchema.validate(invalidConfig);
        expect(error).toBeDefined();
        if (error) {
            expect(error.message).toContain('PORT');
        }
    });
});