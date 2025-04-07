// src/repositories/interfaces/project.repository.interface.ts

import { Project } from '@prisma/client';
import { BaseRepositoryInterface } from './base.repository.interface';

export interface ProjectCreateDTO {
    name: string;
    userId: number;
    projectTypeId?: number; // Optional - will use default if not provided
}

export interface ProjectUpdateDTO {
    name?: string;
    projectTypeId?: number; // Allow changing project type
}

export interface ProjectRepositoryInterface extends BaseRepositoryInterface<
    Project,
    number,
    ProjectCreateDTO,
    ProjectUpdateDTO
> {
    findByIdAndUserId(id: number, userId: number): Promise<Project | null>;

    findByUserId(userId: number): Promise<Project[]>;

    getProjectMetadata(projectId: number, userId?: number): Promise<{
        id: number;
        name: string;
        projectTypeId: number | null;
        projectTypeName: string | null;
        currentPhaseId: number | null;
        currentPhaseName: string | null;
        lastUpdate: Date | null;
    } | null>;

    getPhaseArtifacts(projectId: number, phaseId: number, userId?: number): Promise<{
        id: number;
        type: string;
        content: string | null;
    }[]>;

    isProjectOwner(projectId: number, userId: number): Promise<boolean>;

    // Simplified project type methods
    findByProjectType(projectTypeId: number): Promise<Project[]>;

    findByUserIdAndProjectType(userId: number, projectTypeId: number): Promise<Project[]>;
}