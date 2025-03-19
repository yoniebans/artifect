import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TemplatesModule } from '../templates/templates.module';
import { OpenAIProvider } from './openai/openai.provider';
import { AnthropicProvider } from './anthropic/anthropic.provider';
import { OpenAIFunctionCallingProvider } from './openai/openai-function-calling.provider';
import { AnthropicFunctionCallingProvider } from './anthropic/anthropic-function-calling.provider';
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
        OpenAIFunctionCallingProvider,
        AnthropicFunctionCallingProvider,
        AIProviderFactory,
        AIAssistantService,
    ],
    exports: [
        AIAssistantService,
        AIProviderFactory,
    ],
})
export class AIModule { }