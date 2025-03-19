// src/ai/anthropic-function-calling.provider.spec.ts

import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { AnthropicFunctionCallingProvider } from './anthropic-function-calling.provider';
import { ArtifactFormat } from '../templates/interfaces/template-manager.interface';

// Mock global fetch
global.fetch = jest.fn();

describe('AnthropicFunctionCallingProvider', () => {
    let provider: AnthropicFunctionCallingProvider;
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
                AnthropicFunctionCallingProvider
            ],
        }).compile();

        provider = module.get<AnthropicFunctionCallingProvider>(AnthropicFunctionCallingProvider);
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
        expect(() => new AnthropicFunctionCallingProvider(emptyConfigService as unknown as ConfigService))
            .toThrow('Anthropic API key is required');
    });

    describe('generateResponse', () => {
        it('should generate a response using tool use', async () => {
            // Create a mock Anthropic response with tool use
            const mockResponse = {
                id: 'msg_01AbC123',
                type: 'message',
                role: 'assistant',
                model: 'claude-3-opus-20240229',
                content: [
                    {
                        type: 'tool_use',
                        id: 'tu_01AbC123',
                        name: 'generate_artifact_content',
                        input: {
                            content: 'This is the artifact content'
                        }
                    },
                    {
                        type: 'tool_use',
                        id: 'tu_02XyZ456',
                        name: 'provide_commentary',
                        input: {
                            commentary: 'This is the commentary about the artifact'
                        }
                    }
                ],
                usage: {
                    input_tokens: 100,
                    output_tokens: 50
                }
            };

            // Mock fetch implementation
            (global.fetch as jest.Mock).mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve(mockResponse)
            });

            const result = await provider.generateResponse(
                'System prompt',
                'User prompt',
                mockArtifactFormat,
                false
            );

            // Verify the parsedResponse is included and contains the correct data
            expect(result.parsedResponse).toBeDefined();
            expect(result.parsedResponse?.artifactContent).toBe('This is the artifact content');
            expect(result.parsedResponse?.commentary).toBe('This is the commentary about the artifact');

            // Verify the rawResponse contains the original response as JSON
            expect(result.rawResponse).toBe(JSON.stringify(mockResponse));

            // Verify the fetch call includes tools in the correct format
            expect(global.fetch).toHaveBeenCalledWith(
                'https://api.anthropic.com/v1/messages',
                expect.objectContaining({
                    method: 'POST',
                    headers: expect.objectContaining({
                        'x-api-key': 'test-api-key',
                        'anthropic-version': '2023-06-01'
                    }),
                    body: expect.stringContaining('"tools"')
                })
            );

            // Verify tool definitions in the request
            const requestBody = JSON.parse((global.fetch as jest.Mock).mock.calls[0][1].body);
            expect(requestBody.tools).toHaveLength(2);
            expect(requestBody.tools[0].name).toBe('generate_artifact_content');
            expect(requestBody.tools[0].input_schema).toBeDefined();
            expect(requestBody.tools[1].name).toBe('provide_commentary');
        });

        it('should handle regular text content when no tool uses are made', async () => {
            // Create a mock Anthropic response with only text content
            const mockResponse = {
                id: 'msg_01AbC123',
                type: 'message',
                role: 'assistant',
                model: 'claude-3-opus-20240229',
                content: [
                    {
                        type: 'text',
                        text: 'This is regular content with no tool uses'
                    }
                ],
                usage: {
                    input_tokens: 50,
                    output_tokens: 30
                }
            };

            // Mock fetch implementation
            (global.fetch as jest.Mock).mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve(mockResponse)
            });

            const result = await provider.generateResponse(
                'System prompt',
                'User prompt',
                mockArtifactFormat,
                false
            );

            // Verify the parsedResponse is included and content is treated as commentary
            expect(result.parsedResponse).toBeDefined();
            expect(result.parsedResponse?.artifactContent).toBe('');
            expect(result.parsedResponse?.commentary).toBe('This is regular content with no tool uses');
        });

        it('should use tool_choice for updates', async () => {
            // Mock fetch implementation with a basic response
            (global.fetch as jest.Mock).mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve({
                    content: [
                        {
                            type: 'tool_use',
                            id: 'tu_01AbC123',
                            name: 'generate_artifact_content',
                            input: {
                                content: 'Updated content'
                            }
                        }
                    ]
                })
            });

            await provider.generateResponse(
                'System prompt',
                'User prompt',
                mockArtifactFormat,
                true  // isUpdate = true
            );

            // Verify tool_choice is set correctly for updates
            const requestBody = JSON.parse((global.fetch as jest.Mock).mock.calls[0][1].body);
            expect(requestBody.tool_choice).toEqual({
                type: 'tool_use',
                name: 'generate_artifact_content'
            });
        });

        it('should include conversation history when provided', async () => {
            // Mock fetch implementation with a basic response
            (global.fetch as jest.Mock).mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve({
                    content: []
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
            // Mock fetch implementation with a basic response
            (global.fetch as jest.Mock).mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve({
                    content: []
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
    });

    describe('parseResponse', () => {
        it('should parse a JSON string containing tool uses', async () => {
            const response = {
                content: [
                    {
                        type: 'tool_use',
                        id: 'tu_01ABC',
                        name: 'generate_artifact_content',
                        input: {
                            content: 'Parsed content from JSON string'
                        }
                    },
                    {
                        type: 'tool_use',
                        id: 'tu_02XYZ',
                        name: 'provide_commentary',
                        input: {
                            commentary: 'Parsed commentary from JSON string'
                        }
                    }
                ]
            };

            const rawResponse = JSON.stringify(response);

            const result = await provider.parseResponse(rawResponse, mockArtifactFormat, false);

            expect(result.artifactContent).toBe('Parsed content from JSON string');
            expect(result.commentary).toBe('Parsed commentary from JSON string');
        });

        it('should parse a JSON string with mixed text and tool uses', async () => {
            const response = {
                content: [
                    {
                        type: 'text',
                        text: 'Some initial thoughts'
                    },
                    {
                        type: 'tool_use',
                        id: 'tu_01ABC',
                        name: 'generate_artifact_content',
                        input: {
                            content: 'Artifact content'
                        }
                    },
                    {
                        type: 'text',
                        text: 'Additional commentary'
                    }
                ]
            };

            const rawResponse = JSON.stringify(response);

            const result = await provider.parseResponse(rawResponse, mockArtifactFormat, false);

            expect(result.artifactContent).toBe('Artifact content');
            // Text blocks combined as commentary
            expect(result.commentary).toBe('Some initial thoughts\nAdditional commentary');
        });

        it('should handle invalid JSON input', async () => {
            const invalidJson = 'This is not valid JSON';

            const result = await provider.parseResponse(invalidJson, mockArtifactFormat, false);

            expect(result.rawResponse).toBe(invalidJson);
            expect(result.artifactContent).toBe('');
            expect(result.commentary).toBe(invalidJson);  // Treated as commentary for new artifacts
        });

        it('should handle invalid JSON for update requests', async () => {
            const invalidJson = 'This is not valid JSON';

            const result = await provider.parseResponse(invalidJson, mockArtifactFormat, true);

            expect(result.rawResponse).toBe(invalidJson);
            expect(result.artifactContent).toBe('');
            expect(result.commentary).toBe('');  // Empty for updates
        });
    });

    describe('generateStreamingResponse', () => {
        it('should handle streaming responses with tool uses', async () => {
            // Mock a readable stream simulating Anthropic streaming format
            const mockReader = {
                read: jest.fn()
                    // Message start
                    .mockResolvedValueOnce({
                        done: false,
                        value: new TextEncoder().encode('event: message_start\ndata: {"type":"message_start","message":{"id":"msg_01ABC","model":"claude-3-opus-20240229","role":"assistant"}}\n\n')
                    })
                    // First block start (tool_use)
                    .mockResolvedValueOnce({
                        done: false,
                        value: new TextEncoder().encode('event: content_block_start\ndata: {"type":"content_block_start","index":0,"content_block":{"type":"tool_use","id":"tu_01ABC","name":"generate_artifact_content","input":{}}}\n\n')
                    })
                    // First block delta (tool_use input)
                    .mockResolvedValueOnce({
                        done: false,
                        value: new TextEncoder().encode('event: content_block_delta\ndata: {"type":"content_block_delta","index":0,"delta":{"type":"tool_use_delta","tool_use":{"input":{"content":"This is streamed content"}}}}\n\n')
                    })
                    // First block stop
                    .mockResolvedValueOnce({
                        done: false,
                        value: new TextEncoder().encode('event: content_block_stop\ndata: {"type":"content_block_stop","index":0}\n\n')
                    })
                    // Second block start (tool_use)
                    .mockResolvedValueOnce({
                        done: false,
                        value: new TextEncoder().encode('event: content_block_start\ndata: {"type":"content_block_start","index":1,"content_block":{"type":"tool_use","id":"tu_02XYZ","name":"provide_commentary","input":{}}}\n\n')
                    })
                    // Second block delta (tool_use input)
                    .mockResolvedValueOnce({
                        done: false,
                        value: new TextEncoder().encode('event: content_block_delta\ndata: {"type":"content_block_delta","index":1,"delta":{"type":"tool_use_delta","tool_use":{"input":{"commentary":"This is streamed commentary"}}}}\n\n')
                    })
                    // Second block stop
                    .mockResolvedValueOnce({
                        done: false,
                        value: new TextEncoder().encode('event: content_block_stop\ndata: {"type":"content_block_stop","index":1}\n\n')
                    })
                    // Message stop with usage
                    .mockResolvedValueOnce({
                        done: false,
                        value: new TextEncoder().encode('event: message_delta\ndata: {"type":"message_delta","delta":{"usage":{"input_tokens":100,"output_tokens":50}}}\n\n')
                    })
                    .mockResolvedValueOnce({
                        done: false,
                        value: new TextEncoder().encode('event: message_stop\ndata: {"type":"message_stop"}\n\n')
                    })
                    // End stream
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

            // Verify the parsed response
            expect(result.parsedResponse).toBeDefined();
            expect(result.parsedResponse?.artifactContent).toBe('This is streamed content');
            expect(result.parsedResponse?.commentary).toBe('This is streamed commentary');

            // Verify resources were cleaned up
            expect(mockReader.releaseLock).toHaveBeenCalled();
            expect(mockBody.cancel).toHaveBeenCalled();
        });

        it('should handle streaming with text content', async () => {
            // Mock a readable stream simulating text content
            const mockReader = {
                read: jest.fn()
                    // Message start
                    .mockResolvedValueOnce({
                        done: false,
                        value: new TextEncoder().encode('event: message_start\ndata: {"type":"message_start","message":{"id":"msg_01ABC","model":"claude-3-opus-20240229","role":"assistant"}}\n\n')
                    })
                    // Text block start
                    .mockResolvedValueOnce({
                        done: false,
                        value: new TextEncoder().encode('event: content_block_start\ndata: {"type":"content_block_start","index":0,"content_block":{"type":"text"}}\n\n')
                    })
                    // Text deltas
                    .mockResolvedValueOnce({
                        done: false,
                        value: new TextEncoder().encode('event: content_block_delta\ndata: {"type":"content_block_delta","index":0,"delta":{"type":"text_delta","text":"This is "}}\n\n')
                    })
                    .mockResolvedValueOnce({
                        done: false,
                        value: new TextEncoder().encode('event: content_block_delta\ndata: {"type":"content_block_delta","index":0,"delta":{"type":"text_delta","text":"streamed "}}\n\n')
                    })
                    .mockResolvedValueOnce({
                        done: false,
                        value: new TextEncoder().encode('event: content_block_delta\ndata: {"type":"content_block_delta","index":0,"delta":{"type":"text_delta","text":"text content"}}\n\n')
                    })
                    // Content block stop
                    .mockResolvedValueOnce({
                        done: false,
                        value: new TextEncoder().encode('event: content_block_stop\ndata: {"type":"content_block_stop","index":0}\n\n')
                    })
                    // Message stop
                    .mockResolvedValueOnce({
                        done: false,
                        value: new TextEncoder().encode('event: message_stop\ndata: {"type":"message_stop"}\n\n')
                    })
                    // End stream
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

            // Verify the text is treated as commentary
            expect(result.parsedResponse).toBeDefined();
            expect(result.parsedResponse?.artifactContent).toBe('');
            expect(result.parsedResponse?.commentary).toBe('This is streamed text content');

            // Check that onChunk was called for each piece
            expect(onChunk).toHaveBeenCalledTimes(3);
            expect(onChunk).toHaveBeenCalledWith('This is ');
            expect(onChunk).toHaveBeenCalledWith('streamed ');
            expect(onChunk).toHaveBeenCalledWith('text content');
        });

        it('should handle API errors during streaming', async () => {
            // Mock fetch implementation with error
            (global.fetch as jest.Mock).mockResolvedValueOnce({
                ok: false,
                statusText: 'Bad Request',
                json: () => Promise.resolve({
                    error: {
                        message: 'Streaming error'
                    }
                })
            });

            await expect(provider.generateStreamingResponse(
                'System prompt',
                'User prompt',
                mockArtifactFormat,
                false,
                [],
                undefined,
                jest.fn()
            )).rejects.toThrow('Anthropic API error: Streaming error');
        });
    });
});