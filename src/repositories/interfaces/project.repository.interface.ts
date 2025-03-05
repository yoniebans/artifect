import { Project } from '@prisma/client';
import { BaseRepositoryInterface } from './base.repository.interface';

export interface ProjectRepositoryInterface extends BaseRepositoryInterface<
    Project,
    number,
    { name: string },
    { name: string }
> {
    getProjectMetadata(projectId: number): Promise<{
        id: number;
        name: string;
        currentPhaseId: number | null;
        currentPhaseName: string | null;
        lastUpdate: Date | null;
    } | null>;

    getPhaseArtifacts(projectId: number, phaseId: number): Promise<{
        id: number;
        type: string;
        content: string | null;
    }[]>;
}