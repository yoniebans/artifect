type Environment = 'development' | 'production' | 'test';
type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE';

interface RequestOptions extends RequestInit {
    headers?: Record<string, string>;
}

export class Config {
    private static instance: Config;
    private readonly backendUrl: string;
    private readonly environment: Environment;

    private constructor() {
        const backendUrl = process.env.BACKEND_URL;
        const nodeEnv = process.env.NODE_ENV as Environment;

        if (!backendUrl) {
            throw new Error('BACKEND_URL environment variable is not set');
        }

        this.backendUrl = backendUrl;
        this.environment = nodeEnv || 'development';
    }

    public static getInstance(): Config {
        if (!Config.instance) {
            Config.instance = new Config();
        }
        return Config.instance;
    }

    public getBackendUrl(path: string): string {
        return `${this.backendUrl}${path}`;
    }

    public isDevelopment(): boolean {
        return this.environment === 'development';
    }

    public isProduction(): boolean {
        return this.environment === 'production';
    }

    // Common request options
    public getDefaultRequestOptions(): RequestOptions {
        return {
            next: { revalidate: 0 },
            headers: {
                'Content-Type': 'application/json',
            },
        };
    }

    // Helper for building URLs with query parameters
    public buildUrl(path: string, params?: Record<string, string>): string {
        const url = this.getBackendUrl(path);
        if (!params) return url;

        const searchParams = new URLSearchParams();
        Object.entries(params).forEach(([key, value]) => {
            searchParams.append(key, value);
        });

        return `${url}?${searchParams.toString()}`;
    }

    // Generic request options builder
    public getRequestOptions(
        method: HttpMethod,
        body?: unknown,
        additionalHeaders?: Record<string, string>
    ): RequestOptions {
        const options: RequestOptions = {
            ...this.getDefaultRequestOptions(),
            method,
            headers: {
                ...this.getDefaultRequestOptions().headers,
                ...additionalHeaders,
            },
        };

        if (body) {
            options.body = JSON.stringify(body);
        }

        return options;
    }

    // Convenience methods for common HTTP methods
    public getGetRequestOptions(additionalHeaders?: Record<string, string>): RequestOptions {
        return this.getRequestOptions('GET', undefined, additionalHeaders);
    }

    public getPostRequestOptions(body: unknown, additionalHeaders?: Record<string, string>): RequestOptions {
        return this.getRequestOptions('POST', body, additionalHeaders);
    }

    public getPutRequestOptions(body: unknown, additionalHeaders?: Record<string, string>): RequestOptions {
        return this.getRequestOptions('PUT', body, additionalHeaders);
    }

    public getDeleteRequestOptions(additionalHeaders?: Record<string, string>): RequestOptions {
        return this.getRequestOptions('DELETE', undefined, additionalHeaders);
    }
}

export const config = Config.getInstance();