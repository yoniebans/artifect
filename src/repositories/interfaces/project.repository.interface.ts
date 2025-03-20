// src/repositories/interfaces/project.repository.interface.ts

import { Project } from '@prisma/client';
import { BaseRepositoryInterface } from './base.repository.interface';

export interface ProjectRepositoryInterface extends BaseRepositoryInterface<
    Project,
    number,
    { name: string, userId: number },
    { name: string }
> {
    findByIdAndUserId(id: number, userId: number): Promise<Project | null>;

    findByUserId(userId: number): Promise<Project[]>;

    getProjectMetadata(projectId: number, userId?: number): Promise<{
        id: number;
        name: string;
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
}