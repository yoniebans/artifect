// src/api/controllers/ai-provider.controller.spec.ts

import { Test, TestingModule } from '@nestjs/testing';
import { AIProviderController } from './ai-provider.controller';
import { AIProviderDto } from '../dto';

describe('AIProviderController', () => {
    let controller: AIProviderController;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            controllers: [AIProviderController],
        }).compile();

        controller = module.get<AIProviderController>(AIProviderController);
    });

    it('should be defined', () => {
        expect(controller).toBeDefined();
    });

    describe('listAIProviders', () => {
        it('should return a list of AI providers', async () => {
            const result = await controller.listAIProviders();

            // Check the result structure
            expect(Array.isArray(result)).toBe(true);
            expect(result.length).toBeGreaterThan(0);

            // Check that each provider has the expected structure
            result.forEach((provider: AIProviderDto) => {
                expect(provider).toHaveProperty('id');
                expect(provider).toHaveProperty('name');
                expect(provider).toHaveProperty('models');
                expect(Array.isArray(provider.models)).toBe(true);
            });

            // Verify specific providers exist
            const anthropicProvider = result.find(p => p.id === 'anthropic');
            const openaiProvider = result.find(p => p.id === 'openai');

            expect(anthropicProvider).toBeDefined();
            expect(openaiProvider).toBeDefined();

            expect(anthropicProvider?.models).toContain('claude-3-opus-20240229');
            expect(openaiProvider?.models).toContain('gpt-4');
        });
    });
});