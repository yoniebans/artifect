// apps/backend/src/api/dto/project.dto.ts
import { IsString, IsNotEmpty, IsOptional, IsArray, IsNumber } from 'class-validator';
import { Type } from 'class-transformer';
import { IProject, IProjectCreate } from '@artifect/shared';
import { ArtifactPhaseDto } from './artifact.dto';

export class ProjectCreateDto implements IProjectCreate {
    @IsString()
    @IsNotEmpty()
    name: string;

    @IsOptional()
    @IsNumber()
    project_type_id?: number;
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

    @IsOptional()
    @IsString()
    project_type_id?: string;

    @IsOptional()
    @IsString()
    project_type_name?: string;

    @IsArray()
    @Type(() => ArtifactPhaseDto)
    phases: ArtifactPhaseDto[] = [];
}

export class ProjectDto extends ProjectSummaryDto {
    @IsArray()
    @Type(() => ArtifactPhaseDto)
    phases: ArtifactPhaseDto[] = [];
}