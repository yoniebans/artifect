import { Artifact, ArtifactVersion, ProjectType } from '@prisma/client';

/**
 * Internal extended Artifact type that includes relations with Prisma naming conventions
 */
export interface ArtifactWithRelationsInternal extends Artifact {
    project?: {
        id: number;
        name: string;
        projectTypeId: number;
        projectType?: ProjectType;
        [key: string]: any;
    };
    artifact_type?: {
        id: number;
        name: string;
        slug: string;
        syntax: string;
        lifecyclePhaseId: number;
        lifecyclePhase?: {
            id: number;
            name: string;
        };
        dependencies?: any[];
        [key: string]: any;
    };
    state?: {
        id: number;
        name: string;
        [key: string]: any;
    };
    currentVersion?: ArtifactVersion;
}