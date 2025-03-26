// src/api/dto/streaming.dto.ts

import { IsString, IsOptional, IsBoolean } from 'class-validator';

/**
 * DTO for streaming chunk response
 */
export class StreamingChunkDto {
    @IsString()
    chunk: string;

    @IsBoolean()
    @IsOptional()
    done?: boolean;

    @IsString()
    @IsOptional()
    artifact_content?: string;

    @IsString()
    @IsOptional()
    commentary?: string;
}