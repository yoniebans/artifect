import configuration from './configuration';

describe('Configuration', () => {
    let originalEnv: NodeJS.ProcessEnv;

    beforeAll(() => {
        // Save original environment variables
        originalEnv = { ...process.env };
    });

    afterEach(() => {
        // Restore environment variables after each test
        process.env = { ...originalEnv };
    });

    it('should load default values when environment variables are not set', () => {
        // Clear any existing PORT or NODE_ENV values
        delete process.env.PORT;
        delete process.env.NODE_ENV;
        delete process.env.DATABASE_URL;

        const config = configuration();

        expect(config.port).toBe(3000);
        expect(config.nodeEnv).toBe('development');
    });

    it('should use environment variables when provided', () => {
        process.env.PORT = '4000';
        process.env.NODE_ENV = 'production';
        process.env.DATABASE_URL = 'postgresql://user:password@localhost:5432/testdb';

        const config = configuration();

        expect(config.port).toBe(4000);
        expect(config.nodeEnv).toBe('production');
        expect(config.database.url).toBe('postgresql://user:password@localhost:5432/testdb');
    });

    it('should handle parsing PORT as an integer', () => {
        process.env.PORT = '5000';

        const config = configuration();

        expect(config.port).toBe(5000);
        expect(typeof config.port).toBe('number');
    });
});