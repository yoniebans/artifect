// src/ai/ai-assistant.service.spec.ts

import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import * as path from 'path';
import { AIAssistantService } from './ai-assistant.service';
import { AIProviderFactory } from './ai-provider.factory';
import { TemplateManagerService } from '../templates/template-manager.service';
import { AIProviderInterface } from './interfaces/ai-provider.interface';

// Mock dependencies
jest.mock('fs');
jest.mock('path');

describe('AIAssistantService', () => {
    let service: AIAssistantService;
    let aiProviderFactory: AIProviderFactory;
    let templateManager: TemplateManagerService;

    // Mock provider implementation
    const mockProvider: Partial<AIProviderInterface> = {
        generateResponse: jest.fn(),
        parseResponse: jest.fn(),
        generateStreamingResponse: jest.fn()
    };

    beforeEach(async () => {
        jest.clearAllMocks();

        // Mock path.resolve to return a consistent base directory
        (path.resolve as jest.Mock).mockReturnValue('/base/dir');

        // Mock path.join to concatenate paths
        (path.join as jest.Mock).mockImplementation((...args) => args.join('/'));

        // Mock fs.existsSync and fs.mkdirSync
        (fs.existsSync as jest.Mock).mockReturnValue(true);
        (fs.mkdirSync as jest.Mock).mockImplementation(() => undefined);
        (fs.writeFileSync as jest.Mock).mockImplementation(() => undefined);

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                AIAssistantService,
                {
                    provide: ConfigService,
                    useValue: {
                        get: jest.fn()
                    }
                },
                {
                    provide: AIProviderFactory,
                    useValue: {
                        getProvider: jest.fn().mockReturnValue(mockProvider),
                        getDefaultProvider: jest.fn().mockReturnValue(mockProvider)
                    }
                },
                {
                    provide: TemplateManagerService,
                    useValue: {
                        getArtifactInput: jest.fn().mockResolvedValue({
                            systemPrompt: 'System prompt',
                            template: 'Template content',
                            artifactFormat: {
                                startTag: '[TEST]',
                                endTag: '[/TEST]',
                                syntax: 'markdown'
                            }
                        })
                    }
                }
            ],
        }).compile();

        service = module.get<AIAssistantService>(AIAssistantService);
        aiProviderFactory = module.get<AIProviderFactory>(AIProviderFactory);
        templateManager = module.get<TemplateManagerService>(TemplateManagerService);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    describe('generateArtifact', () => {
        it('should generate an artifact using the default provider', async () => {
            // Set up mock responses
            (mockProvider.generateResponse as jest.Mock).mockResolvedValue('Response from AI');
            (mockProvider.parseResponse as jest.Mock).mockResolvedValue({
                rawResponse: 'Response from AI',
                artifactContent: 'Artifact content',
                commentary: 'Commentary'
            });

            const context = {
                project: { name: 'Test Project' },
                artifact: {
                    artifact_type_name: 'Vision Document',
                    id: 123
                }
            };

            const result = await service.generateArtifact(context, false);

            // Verify the correct methods were called
            expect(templateManager.getArtifactInput).toHaveBeenCalledWith(expect.objectContaining({
                is_update: false
            }));

            expect(aiProviderFactory.getDefaultProvider).toHaveBeenCalled();

            expect(mockProvider.generateResponse).toHaveBeenCalledWith(
                'System prompt',
                'Template content',
                expect.any(Object),
                false,
                undefined,
                undefined
            );

            expect(mockProvider.parseResponse).toHaveBeenCalledWith(
                'Response from AI',
                expect.any(Object),
                false
            );

            // Verify the log was written
            expect(fs.writeFileSync).toHaveBeenCalled();

            // Verify the result
            expect(result).toEqual({
                artifactContent: 'Artifact content',
                commentary: 'Commentary'
            });
        });

        it('should generate an artifact using a specified provider and model', async () => {
            // Set up mock responses
            (mockProvider.generateResponse as jest.Mock).mockResolvedValue('Response from AI');
            (mockProvider.parseResponse as jest.Mock).mockResolvedValue({
                rawResponse: 'Response from AI',
                artifactContent: 'Artifact content',
                commentary: 'Commentary'
            });

            const context = {
                project: { name: 'Test Project' },
                artifact: {
                    artifact_type_name: 'Vision Document',
                    id: 123
                }
            };

            const result = await service.generateArtifact(
                context,
                false,
                'User message',
                'openai',
                'gpt-4'
            );

            // Verify the correct provider was used
            expect(aiProviderFactory.getProvider).toHaveBeenCalledWith('openai');

            // Verify the model was passed
            expect(mockProvider.generateResponse).toHaveBeenCalledWith(
                expect.any(String),
                expect.any(String),
                expect.any(Object),
                false,
                undefined,
                'gpt-4'
            );
        });

        it('should handle user messages and update flag correctly', async () => {
            // Set up mock responses
            (mockProvider.generateResponse as jest.Mock).mockResolvedValue('Response from AI');
            (mockProvider.parseResponse as jest.Mock).mockResolvedValue({
                rawResponse: 'Response from AI',
                artifactContent: 'Updated content',
                commentary: 'Update commentary'
            });

            const context = {
                project: { name: 'Test Project' },
                artifact: {
                    artifact_type_name: 'Vision Document',
                    id: 123,
                    content: 'Original content'
                }
            };

            const result = await service.generateArtifact(
                context,
                true,
                'Update the artifact with this information'
            );

            // Verify the template manager was called with correct context
            expect(templateManager.getArtifactInput).toHaveBeenCalledWith(expect.objectContaining({
                is_update: true,
                user_message: 'Update the artifact with this information'
            }));

            // Verify the provider was called with isUpdate=true
            expect(mockProvider.generateResponse).toHaveBeenCalledWith(
                expect.any(String),
                expect.any(String),
                expect.any(Object),
                true,
                undefined,
                undefined
            );

            // Verify the result
            expect(result).toEqual({
                artifactContent: 'Updated content',
                commentary: 'Update commentary'
            });
        });

        it('should handle errors during generation', async () => {
            // Mock an error
            (mockProvider.generateResponse as jest.Mock).mockRejectedValue(new Error('API error'));

            const context = {
                project: { name: 'Test Project' },
                artifact: {
                    artifact_type_name: 'Vision Document',
                    id: 123
                }
            };

            await expect(service.generateArtifact(context, false))
                .rejects.toThrow('Failed to generate artifact: API error');
        });
    });

    describe('kickoffArtifactInteraction', () => {
        it('should call generateArtifact with correct parameters', async () => {
            // Mock the generateArtifact method
            const generateArtifactSpy = jest.spyOn(service, 'generateArtifact')
                .mockResolvedValue({
                    artifactContent: 'Artifact content',
                    commentary: 'Commentary'
                });

            const context = {
                project: { name: 'Test Project' },
                artifact: { artifact_type_name: 'Vision Document' }
            };

            await service.kickoffArtifactInteraction(context, 'openai', 'gpt-4');

            expect(generateArtifactSpy).toHaveBeenCalledWith(
                context,
                false,
                undefined,
                'openai',
                'gpt-4'
            );
        });
    });

    describe('updateArtifact', () => {
        it('should call generateArtifact with correct parameters', async () => {
            // Mock the generateArtifact method
            const generateArtifactSpy = jest.spyOn(service, 'generateArtifact')
                .mockResolvedValue({
                    artifactContent: 'Updated content',
                    commentary: 'Update commentary'
                });

            const context = {
                project: { name: 'Test Project' },
                artifact: {
                    artifact_type_name: 'Vision Document',
                    content: 'Original content'
                }
            };

            const previousInteractions = [
                { role: 'user', content: 'Previous message' },
                { role: 'assistant', content: 'Previous response' }
            ];

            await service.updateArtifact(
                context,
                'Update message',
                'openai',
                'gpt-4',
                previousInteractions
            );

            expect(generateArtifactSpy).toHaveBeenCalledWith(
                context,
                true,
                'Update message',
                'openai',
                'gpt-4',
                previousInteractions
            );
        });
    });

    describe('generateStreamingArtifact', () => {
        it('should call the generateStreamingResponse method of the provider', async () => {
            // Set up mock responses
            (mockProvider.generateStreamingResponse as jest.Mock).mockResolvedValue('Full response from AI');
            (mockProvider.parseResponse as jest.Mock).mockResolvedValue({
                rawResponse: 'Full response from AI',
                artifactContent: 'Artifact content',
                commentary: 'Commentary'
            });

            const context = {
                project: { name: 'Test Project' },
                artifact: { artifact_type_name: 'Vision Document' }
            };

            const onChunk = jest.fn();

            const result = await service.generateStreamingArtifact(
                context,
                false,
                'User message',
                onChunk,
                'openai',
                'gpt-4'
            );

            // Verify the correct methods were called
            expect(mockProvider.generateStreamingResponse).toHaveBeenCalledWith(
                'System prompt',
                'Template content',
                expect.any(Object),
                false,
                undefined,
                'gpt-4',
                onChunk
            );

            // Verify the result
            expect(result).toEqual({
                artifactContent: 'Artifact content',
                commentary: 'Commentary'
            });
        });

        it('should throw error if provider does not support streaming', async () => {
            // Remove the streaming method from the mock provider
            const mockProviderWithoutStreaming: Partial<AIProviderInterface> = {
                generateResponse: jest.fn(),
                parseResponse: jest.fn()
            };

            // Override the factory to return the provider without streaming
            (aiProviderFactory.getDefaultProvider as jest.Mock).mockReturnValue(mockProviderWithoutStreaming);

            const context = {
                project: { name: 'Test Project' },
                artifact: { artifact_type_name: 'Vision Document' }
            };

            await expect(service.generateStreamingArtifact(
                context,
                false,
                'User message',
                jest.fn()
            )).rejects.toThrow('The selected AI provider does not support streaming');
        });
    });
});