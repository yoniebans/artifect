// apps/backend/src/api/dto/streaming.dto.ts
import { IsString, IsOptional, IsBoolean } from 'class-validator';
import { IStreamingChunk } from '@artifect/shared';

export class StreamingChunkDto implements IStreamingChunk {
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