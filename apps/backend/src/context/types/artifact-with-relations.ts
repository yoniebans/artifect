import { Artifact, ArtifactVersion } from '@prisma/client';

/**
 * Extended Artifact type that includes relations
 */
export interface ArtifactWithRelations extends Artifact {
    project?: {
        id: number;
        name: string;
        [key: string]: any;
    };
    artifact_type?: {
        id: number;
        name: string;
        lifecyclePhase?: {
            id: number;
            name: string;
        };
        [key: string]: any;
    };
    currentVersion?: ArtifactVersion;
}