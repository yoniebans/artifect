// apps/backend/src/api/dto/ai-provider.dto.ts
import { IsString, IsArray } from 'class-validator';
import { IAIProvider } from '@artifect/shared';

export class AIProviderDto implements IAIProvider {
    @IsString()
    id: string;

    @IsString()
    name: string;

    @IsArray()
    models: string[];
}