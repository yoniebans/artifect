// src/ai/anthropic.provider.spec.ts

import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { AnthropicProvider } from './anthropic.provider';
import { ArtifactFormat } from '../../templates/interfaces/template-manager.interface';

// Mock global fetch
global.fetch = jest.fn();

describe('AnthropicProvider', () => {
    let provider: AnthropicProvider;
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
            if (key === 'ANTHROPIC_API_KEY') return 'test-api-key';
            if (key === 'ANTHROPIC_DEFAULT_MODEL') return 'claude-3-opus-20240229';
            if (key === 'ANTHROPIC_BASE_URL') return 'https://api.anthropic.com';
            if (key === 'ANTHROPIC_API_VERSION') return '2023-06-01';
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
                AnthropicProvider
            ],
        }).compile();

        provider = module.get<AnthropicProvider>(AnthropicProvider);
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
        expect(() => new AnthropicProvider(emptyConfigService as unknown as ConfigService))
            .toThrow('Anthropic API key is required');
    });

    describe('generateResponse', () => {
        it('should generate a response from Anthropic API', async () => {
            // Mock fetch implementation with Anthropic response format
            (global.fetch as jest.Mock).mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve({
                    id: 'msg_123',
                    type: 'message',
                    role: 'assistant',
                    content: [
                        {
                            type: 'text',
                            text: 'Test response from Anthropic'
                        }
                    ],
                    model: 'claude-3-opus-20240229',
                    stop_reason: 'end_turn',
                    usage: {
                        input_tokens: 50,
                        output_tokens: 10
                    }
                })
            });

            const result = await provider.generateResponse(
                'System prompt',
                'User prompt',
                mockArtifactFormat,
                false
            );

            expect(result.rawResponse).toBe('Test response from Anthropic');

            // Verify the fetch call
            expect(global.fetch).toHaveBeenCalledWith(
                'https://api.anthropic.com/v1/messages',
                expect.objectContaining({
                    method: 'POST',
                    headers: expect.objectContaining({
                        'x-api-key': 'test-api-key',
                        'anthropic-version': '2023-06-01'
                    }),
                    body: expect.stringContaining('"model":"claude-3-opus-20240229"')
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
            )).rejects.toThrow('Anthropic API error: Invalid request');
        });

        it('should include conversation history when provided', async () => {
            // Mock fetch implementation
            (global.fetch as jest.Mock).mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve({
                    content: [
                        {
                            type: 'text',
                            text: 'Test response with history'
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

        it('should convert system role to assistant in messages', async () => {
            // Mock fetch implementation
            (global.fetch as jest.Mock).mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve({
                    content: [{ type: 'text', text: 'Response' }]
                })
            });

            const conversationHistory = [
                { role: 'system', content: 'System message' },
                { role: 'user', content: 'User message' }
            ];

            await provider.generateResponse(
                'System prompt',
                'User prompt',
                mockArtifactFormat,
                false,
                conversationHistory
            );

            // Check that system role was converted to assistant
            const requestBody = JSON.parse((global.fetch as jest.Mock).mock.calls[0][1].body);
            expect(requestBody.messages[0].role).toBe('assistant');
            expect(requestBody.messages[0].content).toBe('System message');
            expect(requestBody.system).toBe('System prompt');
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

        it('should throw error for update responses with no artifact content or commentary', async () => {
            const response = '';

            await expect(provider.parseResponse(response, mockArtifactFormat, true))
                .rejects.toThrow('Update response must contain either artifact content or commentary');
        });
    });

    describe('generateStreamingResponse', () => {
        it('should be defined', () => {
            expect(provider.generateStreamingResponse).toBeDefined();
        });

        it('should handle streaming responses', async () => {
            // Mock a readable stream
            const mockReader = {
                read: jest.fn()
                    .mockResolvedValueOnce({
                        done: false,
                        value: new TextEncoder().encode('data: {"type":"content_block_start","index":0,"content_block":{"type":"text"}}\n\n')
                    })
                    .mockResolvedValueOnce({
                        done: false,
                        value: new TextEncoder().encode('data: {"type":"content_block_delta","index":0,"delta":{"type":"text","text":"Test"}}\n\n')
                    })
                    .mockResolvedValueOnce({
                        done: false,
                        value: new TextEncoder().encode('data: {"type":"content_block_delta","index":0,"delta":{"type":"text","text":" streaming"}}\n\n')
                    })
                    .mockResolvedValueOnce({
                        done: true,
                        value: undefined
                    }),
                releaseLock: jest.fn()
            };

            const mockBody = {
                getReader: () => mockReader,
                cancel: jest.fn()
            };

            // Mock fetch implementation
            (global.fetch as jest.Mock).mockResolvedValueOnce({
                ok: true,
                body: mockBody
            });

            const onChunk = jest.fn();

            const result = await provider.generateStreamingResponse(
                'System prompt',
                'User prompt',
                mockArtifactFormat,
                false,
                [],
                undefined,
                onChunk
            );

            expect(result.rawResponse).toBe('Test streaming');
            expect(onChunk).toHaveBeenCalledWith('Test');
            expect(onChunk).toHaveBeenCalledWith(' streaming');
            expect(mockReader.releaseLock).toHaveBeenCalled();
            expect(mockBody.cancel).toHaveBeenCalled();
        });
    });
});