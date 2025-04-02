// apps/backend/src/api/dto/project.dto.ts
import { IsString, IsNotEmpty, IsOptional, IsArray } from 'class-validator';
import { Type } from 'class-transformer';
import { IProject, IProjectCreate } from '@artifect/shared';
import { ArtifactPhaseDto } from './artifact.dto';

export class ProjectCreateDto implements IProjectCreate {
    @IsString()
    @IsNotEmpty()
    name: string;
}

export class ProjectSummaryDto implements IProject {
    @IsString()
    project_id: string;

    @IsString()
    @IsNotEmpty()
    name: string;

    @IsString()
    created_at: string;

    @IsOptional()
    @IsString()
    updated_at?: string | null;

    @IsArray()
    @Type(() => ArtifactPhaseDto)
    phases: ArtifactPhaseDto[] = [];
}

export class ProjectDto extends ProjectSummaryDto {
    @IsArray()
    @Type(() => ArtifactPhaseDto)
    phases: ArtifactPhaseDto[] = [];
}