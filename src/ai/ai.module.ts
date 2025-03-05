// src/ai/ai.module.ts

import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TemplatesModule } from '../templates/templates.module';
import { OpenAIProvider } from './openai.provider';
import { AnthropicProvider } from './anthropic.provider';
import { AIProviderFactory } from './ai-provider.factory';
import { AIAssistantService } from './ai-assistant.service';

@Module({
    imports: [
        ConfigModule,
        TemplatesModule,
    ],
    providers: [
        OpenAIProvider,
        AnthropicProvider,
        AIProviderFactory,
        AIAssistantService,
    ],
    exports: [
        AIAssistantService,
        AIProviderFactory,
    ],
})
export class AIModule { }