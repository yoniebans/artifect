// packages/shared/src/interfaces/project.interface.ts
import { IArtifact } from './artifact.interface';

export interface IProject {
    project_id: string;
    name: string;
    created_at: string;
    updated_at?: string | null;
    phases: IPhase[];
}

export interface IPhase {
    name: string;
    phase_id: string;
    order: string;
    artifacts: IArtifact[];
}

export interface IProjectCreate {
    name: string;
}
