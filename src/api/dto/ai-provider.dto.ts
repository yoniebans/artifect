// src/api/dto/ai-provider.dto.ts

import { IsString, IsArray } from 'class-validator';

/**
 * DTO for AI provider information
 */
export class AIProviderDto {
    @IsString()
    id: string;

    @IsString()
    name: string;

    @IsArray()
    models: string[];
}