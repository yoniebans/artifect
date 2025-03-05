// src/ai/openai.provider.spec.ts

import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { OpenAIProvider } from './openai.provider';
import { ArtifactFormat } from '../templates/interfaces/template-manager.interface';

// Mock global fetch
global.fetch = jest.fn();

describe('OpenAIProvider', () => {
    let provider: OpenAIProvider;
    let configService: ConfigService;

    // Test data
    const mockArtifactFormat: ArtifactFormat = {
        startTag: '[TEST]',
        endTag: '[/TEST]',
        syntax: 'markdown',
        commentaryStartTag: '[COMMENTARY]',
        commentaryEndTag: '[/COMMENTARY]'
    };

    // Create the configService mock with API key
    const mockConfigService = {
        get: jest.fn((key: string) => {
            if (key === 'OPENAI_API_KEY') return 'test-api-key';
            if (key === 'OPENAI_DEFAULT_MODEL') return 'gpt-4';
            if (key === 'OPENAI_BASE_URL') return 'https://api.openai.com/v1';
            return undefined;
        })
    };

    beforeEach(async () => {
        jest.clearAllMocks();

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                {
                    provide: ConfigService,
                    useValue: mockConfigService
                },
                OpenAIProvider
            ],
        }).compile();

        provider = module.get<OpenAIProvider>(OpenAIProvider);
        configService = module.get<ConfigService>(ConfigService);
    });

    it('should be defined', () => {
        expect(provider).toBeDefined();
    });

    it('should throw error if API key is not provided', () => {
        // Create a config service with no API key
        const emptyConfigService = {
            get: jest.fn().mockReturnValue(undefined)
        };

        // Should throw
        expect(() => new OpenAIProvider(emptyConfigService as unknown as ConfigService))
            .toThrow('OpenAI API key is required');
    });

    describe('generateResponse', () => {
        it('should generate a response from OpenAI API', async () => {
            // Mock fetch implementation
            (global.fetch as jest.Mock).mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve({
                    choices: [
                        {
                            message: {
                                role: 'assistant',
                                content: 'Test response from OpenAI'
                            }
                        }
                    ]
                })
            });

            const result = await provider.generateResponse(
                'System prompt',
                'User prompt',
                mockArtifactFormat,
                false
            );

            expect(result).toBe('Test response from OpenAI');

            // Verify the fetch call
            expect(global.fetch).toHaveBeenCalledWith(
                'https://api.openai.com/v1/chat/completions',
                expect.objectContaining({
                    method: 'POST',
                    headers: expect.objectContaining({
                        'Authorization': 'Bearer test-api-key'
                    }),
                    body: expect.stringContaining('"model":"gpt-4"')
                })
            );
        });

        it('should handle API errors', async () => {
            // Mock fetch implementation with error
            (global.fetch as jest.Mock).mockResolvedValueOnce({
                ok: false,
                statusText: 'Bad Request',
                json: () => Promise.resolve({
                    error: {
                        message: 'Invalid request'
                    }
                })
            });

            await expect(provider.generateResponse(
                'System prompt',
                'User prompt',
                mockArtifactFormat,
                false
            )).rejects.toThrow('OpenAI API error: Invalid request');
        });

        it('should include conversation history when provided', async () => {
            // Mock fetch implementation
            (global.fetch as jest.Mock).mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve({
                    choices: [
                        {
                            message: {
                                role: 'assistant',
                                content: 'Test response with history'
                            }
                        }
                    ]
                })
            });

            const conversationHistory = [
                { role: 'user', content: 'Previous user message' },
                { role: 'assistant', content: 'Previous assistant response' }
            ];

            await provider.generateResponse(
                'System prompt',
                'User prompt',
                mockArtifactFormat,
                false,
                conversationHistory
            );

            // Check that the conversation history was included in the request
            expect(global.fetch).toHaveBeenCalledWith(
                expect.any(String),
                expect.objectContaining({
                    body: expect.stringContaining('Previous user message')
                })
            );
        });
    });

    describe('parseResponse', () => {
        it('should parse a response with artifact content and commentary', async () => {
            const response = '[COMMENTARY]This is a comment[/COMMENTARY]\n[TEST]This is the artifact[/TEST]';

            const result = await provider.parseResponse(response, mockArtifactFormat, false);

            expect(result.artifactContent).toBe('This is the artifact');
            expect(result.commentary).toBe('This is a comment');
        });

        it('should handle responses with no artifact content for new artifacts', async () => {
            const response = 'This is just commentary with no artifact content';

            const result = await provider.parseResponse(response, mockArtifactFormat, false);

            expect(result.artifactContent).toBe('');
            expect(result.commentary).toBe('This is just commentary with no artifact content');
        });

        it('should throw error for update responses with no artifact content', async () => {
            const response = 'This is just commentary with no artifact content';

            await expect(provider.parseResponse(response, mockArtifactFormat, true))
                .rejects.toThrow('Update response must contain artifact content');
        });
    });

    // This is a simplified test for the streaming functionality
    // A more complete test would involve mocking ReadableStream
    describe('generateStreamingResponse', () => {
        it('should be defined', () => {
            expect(provider.generateStreamingResponse).toBeDefined();
        });
    });
});