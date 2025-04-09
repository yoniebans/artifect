// packages/shared/src/interfaces/project.interface.ts
import { IArtifact } from './artifact.interface';

export interface IProject {
    project_id: string;
    name: string;
    created_at: string;
    updated_at?: string | null;
    project_type_id?: string;  // Added project type ID
    project_type_name?: string; // Added project type name
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
    project_type_id?: number; // Added optional project type ID
}

export interface IProjectType {
    id: string;
    name: string;
    description?: string;
}