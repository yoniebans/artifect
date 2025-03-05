// src/templates/templates.module.spec.ts

import { Test, TestingModule } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { CacheService } from '../services/cache/cache.service';
import { TemplatesModule } from './templates.module';
import { TemplateManagerService } from './template-manager.service';
import configuration from '../config/configuration';

describe('TemplatesModule', () => {
    let module: TestingModule;
    let templateManagerService: TemplateManagerService;

    beforeEach(async () => {
        const mockCacheService = {
            getArtifactTypeInfo: jest.fn().mockResolvedValue({ typeId: 1, slug: 'vision' }),
            getArtifactFormat: jest.fn().mockResolvedValue({
                startTag: '[TEST]',
                endTag: '[/TEST]',
                syntax: 'markdown'
            }),
            initialize: jest.fn(),
        };

        module = await Test.createTestingModule({
            imports: [
                ConfigModule.forRoot({
                    load: [configuration],
                }),
                TemplatesModule,
            ],
        })
            .overrideProvider(CacheService)
            .useValue(mockCacheService)
            .compile();

        templateManagerService = module.get<TemplateManagerService>(TemplateManagerService);

        // Mock methods to avoid file system interactions
        jest.spyOn(templateManagerService, 'loadTemplates').mockResolvedValue();
        jest.spyOn(templateManagerService, 'loadSystemPrompts').mockResolvedValue();

        // Initialize template manager
        await templateManagerService.onModuleInit();
    });

    afterEach(async () => {
        await module.close();
        jest.clearAllMocks();
    });

    it('should be defined', () => {
        expect(module).toBeDefined();
    });

    it('should provide TemplateManagerService', () => {
        expect(templateManagerService).toBeDefined();
    });

    describe('Template Manager functionality', () => {
        it('should have required methods', () => {
            expect(typeof templateManagerService.renderTemplate).toBe('function');
            expect(typeof templateManagerService.getSystemPrompt).toBe('function');
            expect(typeof templateManagerService.getUserMessageTemplate).toBe('function');
            expect(typeof templateManagerService.getArtifactInput).toBe('function');
            expect(typeof templateManagerService.readSystemPrompt).toBe('function');
        });

        it('should return expected template names based on update status', () => {
            expect(templateManagerService.getUserMessageTemplate(false)).toBe('artifact_new');
            expect(templateManagerService.getUserMessageTemplate(true)).toBe('artifact_update');
        });
    });
});