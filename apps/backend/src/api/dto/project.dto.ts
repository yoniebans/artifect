// src/api/dto/project.dto.ts

import { IsString, IsNotEmpty, IsOptional, IsDate, IsArray } from 'class-validator';
import { Type } from 'class-transformer';
import { ArtifactDetailDto, ArtifactPhaseDto } from './artifact.dto';

/**
 * DTO for creating a new project
 */
export class ProjectCreateDto {
    @IsString()
    @IsNotEmpty()
    name: string;
}

/**
 * Base DTO for project data
 */
export class ProjectBaseDto {
    @IsString()
    project_id: string;

    @IsString()
    @IsNotEmpty()
    name: string;

    @IsOptional()
    created_at?: Date | null;

    @IsOptional()
    updated_at?: Date | null;
}

/**
 * DTO for project summary (used in list endpoints)
 */
export class ProjectSummaryDto extends ProjectBaseDto {
    // No additional fields - used for list endpoints that don't need full artifact details
}

/**
 * DTO for full project details including artifact phases
 */
export class ProjectDto extends ProjectBaseDto {
    @IsArray()
    @Type(() => ArtifactPhaseDto)
    phases: ArtifactPhaseDto[] = [];
}