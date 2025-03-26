// src/ai/openai-function-calling.provider.spec.ts

import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { OpenAIFunctionCallingProvider } from './openai-function-calling.provider';
import { ArtifactFormat } from '../../templates/interfaces/template-manager.interface';

// Mock global fetch
global.fetch = jest.fn();

describe('OpenAIFunctionCallingProvider', () => {
    let provider: OpenAIFunctionCallingProvider;
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
                OpenAIFunctionCallingProvider
            ],
        }).compile();

        provider = module.get<OpenAIFunctionCallingProvider>(OpenAIFunctionCallingProvider);
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
        expect(() => new OpenAIFunctionCallingProvider(emptyConfigService as unknown as ConfigService))
            .toThrow('OpenAI API key is required');
    });

    describe('generateResponse', () => {
        it('should generate a response using tool_calls and include parsed response', async () => {
            // Create a mock OpenAI response with tool_calls
            const mockResponse = {
                choices: [
                    {
                        message: {
                            role: 'assistant',
                            content: null,
                            tool_calls: [
                                {
                                    id: 'call_abc123',
                                    type: 'function',
                                    function: {
                                        name: 'generate_artifact_content',
                                        arguments: '{"content":"This is the artifact content"}'
                                    }
                                },
                                {
                                    id: 'call_def456',
                                    type: 'function',
                                    function: {
                                        name: 'provide_commentary',
                                        arguments: '{"commentary":"This is the commentary about the artifact"}'
                                    }
                                }
                            ]
                        },
                        finish_reason: 'tool_calls'
                    }
                ],
                usage: {
                    prompt_tokens: 100,
                    completion_tokens: 50,
                    total_tokens: 150
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

            // Verify the rawResponse contains the original message as JSON
            expect(result.rawResponse).toBe(JSON.stringify(mockResponse.choices[0].message));

            // Verify the fetch call includes tools
            expect(global.fetch).toHaveBeenCalledWith(
                'https://api.openai.com/v1/chat/completions',
                expect.objectContaining({
                    method: 'POST',
                    headers: expect.objectContaining({
                        'Authorization': 'Bearer test-api-key'
                    }),
                    body: expect.stringContaining('"tools"')
                })
            );

            // Verify tool definitions in the request
            const requestBody = JSON.parse((global.fetch as jest.Mock).mock.calls[0][1].body);
            expect(requestBody.tools.length).toBe(2);
            expect(requestBody.tools[0].function.name).toBe('generate_artifact_content');
            expect(requestBody.tools[1].function.name).toBe('provide_commentary');
        });

        it('should handle legacy function_call format', async () => {
            // Create a mock OpenAI response with legacy function_call
            const mockResponse = {
                choices: [
                    {
                        message: {
                            role: 'assistant',
                            content: null,
                            function_call: {
                                name: 'generate_artifact_content',
                                arguments: '{"content":"This is legacy function call content"}'
                            }
                        },
                        finish_reason: 'function_call'
                    }
                ],
                usage: {
                    prompt_tokens: 80,
                    completion_tokens: 40,
                    total_tokens: 120
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
                true
            );

            // Verify the parsedResponse is included and contains the correct data
            expect(result.parsedResponse).toBeDefined();
            expect(result.parsedResponse?.artifactContent).toBe('This is legacy function call content');
            expect(result.parsedResponse?.commentary).toBe('');

            // Verify the rawResponse contains the original message as JSON
            expect(result.rawResponse).toBe(JSON.stringify(mockResponse.choices[0].message));
        });

        it('should handle regular content when no function calls are made', async () => {
            // Create a mock OpenAI response with regular content
            const mockResponse = {
                choices: [
                    {
                        message: {
                            role: 'assistant',
                            content: 'This is regular content with no function calls'
                        },
                        finish_reason: 'stop'
                    }
                ],
                usage: {
                    prompt_tokens: 50,
                    completion_tokens: 30,
                    total_tokens: 80
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
            expect(result.parsedResponse?.commentary).toBe('This is regular content with no function calls');
        });

        it('should force tool_choice for updates', async () => {
            // Mock fetch implementation with a basic response
            (global.fetch as jest.Mock).mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve({
                    choices: [
                        {
                            message: {
                                role: 'assistant',
                                content: null,
                                tool_calls: [
                                    {
                                        id: 'call_abc123',
                                        type: 'function',
                                        function: {
                                            name: 'generate_artifact_content',
                                            arguments: '{"content":"Updated content"}'
                                        }
                                    }
                                ]
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

            // Verify tool_choice is set to generate_artifact_content for updates
            const requestBody = JSON.parse((global.fetch as jest.Mock).mock.calls[0][1].body);
            expect(requestBody.tool_choice).toEqual({
                type: 'function',
                function: { name: 'generate_artifact_content' }
            });
        });

        it('should set tool_choice to auto for new artifacts', async () => {
            // Mock fetch implementation with a basic response
            (global.fetch as jest.Mock).mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve({
                    choices: [
                        {
                            message: {
                                role: 'assistant',
                                content: null,
                                tool_calls: [
                                    {
                                        id: 'call_abc123',
                                        type: 'function',
                                        function: {
                                            name: 'provide_commentary',
                                            arguments: '{"commentary":"Initial commentary"}'
                                        }
                                    }
                                ]
                            }
                        }
                    ]
                })
            });

            await provider.generateResponse(
                'System prompt',
                'User prompt',
                mockArtifactFormat,
                false  // isUpdate = false
            );

            // Verify tool_choice is set to auto for new artifacts
            const requestBody = JSON.parse((global.fetch as jest.Mock).mock.calls[0][1].body);
            expect(requestBody.tool_choice).toBe('auto');
        });

        it('should include conversation history when provided', async () => {
            // Mock fetch implementation with a basic response
            (global.fetch as jest.Mock).mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve({
                    choices: [
                        {
                            message: {
                                role: 'assistant',
                                content: null,
                                tool_calls: []
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

        it('should handle malformed function call arguments', async () => {
            // Create a mock OpenAI response with malformed JSON in arguments
            const mockResponse = {
                choices: [
                    {
                        message: {
                            role: 'assistant',
                            content: null,
                            tool_calls: [
                                {
                                    id: 'call_abc123',
                                    type: 'function',
                                    function: {
                                        name: 'generate_artifact_content',
                                        arguments: '{content:"This is invalid JSON}'  // Malformed JSON
                                    }
                                }
                            ]
                        }
                    }
                ]
            };

            // Spy on console.error to verify it's called
            const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

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

            // Should handle the error gracefully
            expect(result.parsedResponse).toBeDefined();
            expect(result.parsedResponse?.artifactContent).toBe('');
            expect(consoleErrorSpy).toHaveBeenCalled();

            // Restore console.error
            consoleErrorSpy.mockRestore();
        });
    });

    describe('parseResponse', () => {
        it('should parse a JSON string containing tool_calls', async () => {
            const message = {
                role: 'assistant',
                content: null,
                tool_calls: [
                    {
                        id: 'call_abc123',
                        type: 'function',
                        function: {
                            name: 'generate_artifact_content',
                            arguments: '{"content":"Parsed content from JSON string"}'
                        }
                    },
                    {
                        id: 'call_def456',
                        type: 'function',
                        function: {
                            name: 'provide_commentary',
                            arguments: '{"commentary":"Parsed commentary from JSON string"}'
                        }
                    }
                ]
            };

            const rawResponse = JSON.stringify(message);

            const result = await provider.parseResponse(rawResponse, mockArtifactFormat, false);

            expect(result.artifactContent).toBe('Parsed content from JSON string');
            expect(result.commentary).toBe('Parsed commentary from JSON string');
        });

        it('should parse a JSON string containing function_call', async () => {
            const message = {
                role: 'assistant',
                content: null,
                function_call: {
                    name: 'generate_artifact_content',
                    arguments: '{"content":"Legacy function call content"}'
                }
            };

            const rawResponse = JSON.stringify(message);

            const result = await provider.parseResponse(rawResponse, mockArtifactFormat, false);

            expect(result.artifactContent).toBe('Legacy function call content');
            expect(result.commentary).toBe('');
        });

        it('should parse a JSON string containing regular content', async () => {
            const message = {
                role: 'assistant',
                content: 'Regular content with no function calls'
            };

            const rawResponse = JSON.stringify(message);

            const result = await provider.parseResponse(rawResponse, mockArtifactFormat, false);

            expect(result.artifactContent).toBe('');
            expect(result.commentary).toBe('Regular content with no function calls');
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
        it('should handle streaming responses with tool_calls', async () => {
            // In the real OpenAI API, the tool_calls and function arguments are streamed
            // in chunks, but the JSON parsing only happens at the end when all chunks
            // are assembled. Our mock needs to reflect this behavior properly.

            // Mock a readable stream simulating tool_call streaming
            const mockReader = {
                read: jest.fn()
                    // First chunk with partial tool call (no arguments yet)
                    .mockResolvedValueOnce({
                        done: false,
                        value: new TextEncoder().encode('data: {"choices":[{"delta":{"tool_calls":[{"index":0,"id":"call_123","type":"function","function":{"name":"generate_artifact_content"}}]},"index":0}]}\n\n')
                    })
                    // Second chunk starts the arguments field
                    .mockResolvedValueOnce({
                        done: false,
                        value: new TextEncoder().encode('data: {"choices":[{"delta":{"tool_calls":[{"index":0,"function":{"arguments":"{"}}]},"index":0}]}\n\n')
                    })
                    // Content key
                    .mockResolvedValueOnce({
                        done: false,
                        value: new TextEncoder().encode('data: {"choices":[{"delta":{"tool_calls":[{"index":0,"function":{"arguments":"\\"content\\""}}]},"index":0}]}\n\n')
                    })
                    // Colon and start of value
                    .mockResolvedValueOnce({
                        done: false,
                        value: new TextEncoder().encode('data: {"choices":[{"delta":{"tool_calls":[{"index":0,"function":{"arguments":":\\"This is "}}]},"index":0}]}\n\n')
                    })
                    // More of the value
                    .mockResolvedValueOnce({
                        done: false,
                        value: new TextEncoder().encode('data: {"choices":[{"delta":{"tool_calls":[{"index":0,"function":{"arguments":"streamed "}}]},"index":0}]}\n\n')
                    })
                    // End of the value and object
                    .mockResolvedValueOnce({
                        done: false,
                        value: new TextEncoder().encode('data: {"choices":[{"delta":{"tool_calls":[{"index":0,"function":{"arguments":"content\\""}}]},"index":0}]}\n\n')
                    })
                    // Close the JSON object
                    .mockResolvedValueOnce({
                        done: false,
                        value: new TextEncoder().encode('data: {"choices":[{"delta":{"tool_calls":[{"index":0,"function":{"arguments":"}"}}]},"index":0}]}\n\n')
                    })
                    // Start second tool call
                    .mockResolvedValueOnce({
                        done: false,
                        value: new TextEncoder().encode('data: {"choices":[{"delta":{"tool_calls":[{"index":1,"id":"call_456","type":"function","function":{"name":"provide_commentary"}}]},"index":0}]}\n\n')
                    })
                    // Start arguments for second call
                    .mockResolvedValueOnce({
                        done: false,
                        value: new TextEncoder().encode('data: {"choices":[{"delta":{"tool_calls":[{"index":1,"function":{"arguments":"{"}}]},"index":0}]}\n\n')
                    })
                    // Commentary key
                    .mockResolvedValueOnce({
                        done: false,
                        value: new TextEncoder().encode('data: {"choices":[{"delta":{"tool_calls":[{"index":1,"function":{"arguments":"\\"commentary\\""}}]},"index":0}]}\n\n')
                    })
                    // Colon and value
                    .mockResolvedValueOnce({
                        done: false,
                        value: new TextEncoder().encode('data: {"choices":[{"delta":{"tool_calls":[{"index":1,"function":{"arguments":":\\"This is "}}]},"index":0}]}\n\n')
                    })
                    // More of the value
                    .mockResolvedValueOnce({
                        done: false,
                        value: new TextEncoder().encode('data: {"choices":[{"delta":{"tool_calls":[{"index":1,"function":{"arguments":"streamed "}}]},"index":0}]}\n\n')
                    })
                    // End of the value
                    .mockResolvedValueOnce({
                        done: false,
                        value: new TextEncoder().encode('data: {"choices":[{"delta":{"tool_calls":[{"index":1,"function":{"arguments":"commentary\\""}}]},"index":0}]}\n\n')
                    })
                    // Close the JSON object
                    .mockResolvedValueOnce({
                        done: false,
                        value: new TextEncoder().encode('data: {"choices":[{"delta":{"tool_calls":[{"index":1,"function":{"arguments":"}"}}]},"index":0}]}\n\n')
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

        it('should handle regular content in streaming response', async () => {
            // Mock a readable stream simulating content instead of tool calls
            const mockReader = {
                read: jest.fn()
                    .mockResolvedValueOnce({
                        done: false,
                        value: new TextEncoder().encode('data: {"choices":[{"delta":{"content":"This is "},"index":0}]}\n\n')
                    })
                    .mockResolvedValueOnce({
                        done: false,
                        value: new TextEncoder().encode('data: {"choices":[{"delta":{"content":"streamed "},"index":0}]}\n\n')
                    })
                    .mockResolvedValueOnce({
                        done: false,
                        value: new TextEncoder().encode('data: {"choices":[{"delta":{"content":"content"},"index":0}]}\n\n')
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

            // Verify the content was treated as commentary
            expect(result.parsedResponse).toBeDefined();
            expect(result.parsedResponse?.artifactContent).toBe('');
            expect(result.parsedResponse?.commentary).toBe('This is streamed content');

            // Check that onChunk was called for each piece
            expect(onChunk).toHaveBeenCalledTimes(3);
            expect(onChunk).toHaveBeenCalledWith('This is ');
            expect(onChunk).toHaveBeenCalledWith('streamed ');
            expect(onChunk).toHaveBeenCalledWith('content');
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
            )).rejects.toThrow('OpenAI API error: Streaming error');
        });
    });
});