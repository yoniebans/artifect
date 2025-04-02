// src/templates/template-manager.service.spec.ts

import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { CacheService } from '../services/cache/cache.service';
import { TemplateManagerService } from './template-manager.service';
import * as fs from 'fs';
import * as path from 'path';

// Mock the fs.promises APIs
jest.mock('fs', () => ({
    promises: {
        readdir: jest.fn(),
        readFile: jest.fn(),
    },
    existsSync: jest.fn().mockReturnValue(false) // Add existsSync method
}));

describe('TemplateManagerService', () => {
    let service: TemplateManagerService;
    let cacheService: CacheService;

    const mockConfigService = {
        get: jest.fn(),
    };

    const mockCacheService = {
        getArtifactTypeInfo: jest.fn(),
        getArtifactFormat: jest.fn(),
    };

    beforeEach(async () => {
        jest.clearAllMocks();

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                TemplateManagerService,
                {
                    provide: ConfigService,
                    useValue: mockConfigService,
                },
                {
                    provide: CacheService,
                    useValue: mockCacheService,
                },
            ],
        }).compile();

        service = module.get<TemplateManagerService>(TemplateManagerService);
        cacheService = module.get<CacheService>(CacheService);

        // Mock the template/system prompt directories
        jest.spyOn(path, 'resolve').mockImplementation(() => '/mock/base/dir');

        // Mock the fs.readdir to return some template files
        (fs.promises.readdir as jest.Mock).mockImplementation((dir: string) => {
            if (dir.includes('artifacts')) {
                return Promise.resolve(['artifact_new.hbs', 'artifact_update.hbs']);
            } else if (dir.includes('system-prompts')) {
                return Promise.resolve(['requirements_agent.hbs', 'design_agent.hbs', 'data_agent.hbs']);
            }
            return Promise.resolve([]);
        });

        // Mock the fs.readFile to return template content
        (fs.promises.readFile as jest.Mock).mockImplementation((filePath: string) => {
            if (filePath.includes('artifact_new.hbs')) {
                return Promise.resolve('Kick off dialogue regarding a new {{artifact.artifact_type_name}} for the project.');
            } else if (filePath.includes('artifact_update.hbs')) {
                return Promise.resolve('# Current Content\n```\n{{artifact.content}}\n```\n\n# User Request\n{{user_message}}');
            } else if (filePath.includes('requirements_agent.hbs')) {
                return Promise.resolve('You are an AI model specializing as a business analyst focused on requirement engineering.');
            } else if (filePath.includes('design_agent.hbs')) {
                return Promise.resolve('You are an AI model specializing as a software architect.');
            } else if (filePath.includes('data_agent.hbs')) {
                return Promise.resolve('You are an AI model specialized in Data Architecture.');
            }
            return Promise.resolve('');
        });

        // Initialize the service manually since we're not calling onModuleInit
        await service.onModuleInit();
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    describe('renderTemplate', () => {
        it('should render a template with context', async () => {
            const context = {
                artifact: {
                    artifact_type_name: 'Vision Document',
                },
            };

            const result = await service.renderTemplate('artifact_new', context);

            expect(result).toBe('Kick off dialogue regarding a new Vision Document for the project.');
        });

        it('should throw error for non-existent template', async () => {
            (fs.promises.readFile as jest.Mock).mockRejectedValueOnce(new Error('File not found'));

            await expect(service.renderTemplate('non_existent', {})).rejects.toThrow('Template not found');
        });
    });

    describe('getSystemPrompt', () => {
        it('should get and render the appropriate system prompt', async () => {
            const context = {
                artifact: {
                    artifact_phase: 'requirements',
                },
                project: {
                    name: 'Test Project',
                },
            };

            const result = await service.getSystemPrompt(context);

            expect(result).toBe('You are an AI model specializing as a business analyst focused on requirement engineering.');
        });

        it('should default to requirements phase if not specified', async () => {
            const context = {
                project: {
                    name: 'Test Project',
                },
            };

            const result = await service.getSystemPrompt(context);

            expect(result).toBe('You are an AI model specializing as a business analyst focused on requirement engineering.');
        });

        it('should throw error for invalid phase', async () => {
            const context = {
                artifact: {
                    artifact_phase: 'invalid_phase',
                },
            };

            (fs.promises.readFile as jest.Mock).mockRejectedValueOnce(new Error('File not found'));

            await expect(service.getSystemPrompt(context)).rejects.toThrow('Failed to load or render system prompt template');
        });
    });

    describe('getUserMessageTemplate', () => {
        it('should return artifact_new for new artifacts', () => {
            const result = service.getUserMessageTemplate(false);

            expect(result).toBe('artifact_new');
        });

        it('should return artifact_update for updates', () => {
            const result = service.getUserMessageTemplate(true);

            expect(result).toBe('artifact_update');
        });
    });

    describe('getArtifactInput', () => {
        it('should return the complete input for generating an artifact', async () => {
            const context = {
                artifact: {
                    artifact_type_name: 'Vision Document',
                    artifact_phase: 'requirements',
                },
                project: {
                    name: 'Test Project',
                },
                is_update: false,
            };

            mockCacheService.getArtifactTypeInfo.mockResolvedValue({
                typeId: 1,
                slug: 'vision',
            });

            mockCacheService.getArtifactFormat.mockResolvedValue({
                startTag: '[VISION]',
                endTag: '[/VISION]',
                syntax: 'markdown',
                commentaryStartTag: '[COMMENTARY]',
                commentaryEndTag: '[/COMMENTARY]',
            });

            const result = await service.getArtifactInput(context);

            expect(result).toEqual({
                systemPrompt: 'You are an AI model specializing as a business analyst focused on requirement engineering.',
                template: 'Kick off dialogue regarding a new Vision Document for the project.',
                artifactFormat: {
                    startTag: '[VISION]',
                    endTag: '[/VISION]',
                    syntax: 'markdown',
                    commentaryStartTag: '[COMMENTARY]',
                    commentaryEndTag: '[/COMMENTARY]',
                },
            });

            expect(mockCacheService.getArtifactTypeInfo).toHaveBeenCalledWith('Vision Document');
            expect(mockCacheService.getArtifactFormat).toHaveBeenCalledWith('vision');
        });

        it('should throw error for invalid artifact type', async () => {
            const context = {
                artifact: {
                    artifact_type_name: 'Invalid Type',
                },
            };

            mockCacheService.getArtifactTypeInfo.mockResolvedValue(null);

            await expect(service.getArtifactInput(context)).rejects.toThrow('Artifact type not found');
        });
    });

    describe('readSystemPrompt', () => {
        it('should read the content of a system prompt file', async () => {
            const result = await service.readSystemPrompt('requirements_agent');

            expect(result).toBe('You are an AI model specializing as a business analyst focused on requirement engineering.');
        });

        it('should throw error for non-existent prompt', async () => {
            (fs.promises.readFile as jest.Mock).mockRejectedValueOnce(new Error('File not found'));

            await expect(service.readSystemPrompt('non_existent')).rejects.toThrow('System prompt file not found');
        });
    });
});