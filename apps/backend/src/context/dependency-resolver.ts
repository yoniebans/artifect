import { Injectable, Logger } from '@nestjs/common';
import { ArtifactRepository } from '../repositories/artifact.repository';
import { CacheService } from '../services/cache/cache.service';
import { ArtifactWithRelations } from './types/artifact-with-relations';

/**
 * Type definition for artifact type dependency information
 */
export interface ArtifactTypeDependency {
    typeId: number;
    name: string;
    slug: string;
    isRequired: boolean;
    isMultiple: boolean;
}

/**
 * Service for resolving artifact dependencies based on project type and artifact type
 */
@Injectable()
export class DependencyResolver {
    private readonly logger = new Logger(DependencyResolver.name);

    constructor(
        private artifactRepository: ArtifactRepository,
        private cacheService: CacheService,
    ) { }

    /**
     * Resolves all dependencies for an artifact
     * @param artifact The artifact with relations
     * @returns A map of dependency keys to their content values
     */
    async resolveDependencies(
        artifact: ArtifactWithRelations,
    ): Promise<Map<string, any>> {
        const dependencies = new Map<string, any>();

        // Get project type and artifact type information
        const projectTypeId = artifact.project?.projectTypeId;
        const artifactTypeId = artifact.artifactTypeId || artifact.artifact_type?.id;
        const artifactTypeName = artifact.artifact_type?.name || 'Unknown Type';

        if (!projectTypeId || !artifactTypeId) {
            this.logger.warn(`Missing project type or artifact type for artifact ${artifact.id}`);
            return dependencies;
        }

        try {
            // Get the artifact type dependencies based on the artifact type
            const dependencyTypes = await this.getDependencyTypes(artifactTypeName, projectTypeId);

            // Resolve each dependency
            for (const depType of dependencyTypes) {
                await this.resolveDependency(artifact, depType, dependencies);
            }

            return dependencies;
        } catch (error) {
            this.logger.error(`Error resolving dependencies: ${error.message}`);
            throw error;
        }
    }

    /**
     * Get dependency types for an artifact type
     * @param artifactType The artifact type name
     * @param projectTypeId The project type ID
     * @returns Array of dependency information
     */
    private async getDependencyTypes(
        artifactType: string,
        projectTypeId: number,
    ): Promise<ArtifactTypeDependency[]> {
        // Get the dependencies from the repository
        const dependencyArtifactTypes = await this.artifactRepository.getArtifactTypeDependencies(artifactType);

        // Map to our internal dependency type structure with additional metadata
        return Promise.all(
            dependencyArtifactTypes.map(async (depType) => {
                const typeInfo = await this.cacheService.getArtifactTypeInfo(depType.name);

                return {
                    typeId: depType.id,
                    name: depType.name,
                    slug: typeInfo?.slug || this.slugify(depType.name),
                    // For now, we consider all dependencies required
                    // In the future, this could be configurable per project type
                    isRequired: true,
                    // Use cases and C4 Components can have multiple instances
                    isMultiple: ['Use Cases', 'C4 Component'].includes(depType.name),
                };
            }),
        );
    }

    /**
     * Resolve a single dependency
     * @param artifact The artifact
     * @param depType The dependency type information
     * @param dependencies The map to store resolved dependencies
     */
    private async resolveDependency(
        artifact: ArtifactWithRelations,
        depType: ArtifactTypeDependency,
        dependencies: Map<string, any>,
    ): Promise<void> {
        // Get artifacts of the dependency type
        const dependencyArtifacts = await this.artifactRepository.getArtifactsByType(
            artifact,
            depType.name,
        );

        // Check if required dependency is missing
        if (depType.isRequired && (!dependencyArtifacts || dependencyArtifacts.length === 0)) {
            throw new Error(`${depType.name} missing; ${depType.name} is required context`);
        }

        // Handle multiple vs single artifacts
        if (depType.isMultiple) {
            // For types that can have multiple instances (Use Cases, C4 Components)
            const contents = dependencyArtifacts
                .filter(dep => this.hasValidVersion(dep))
                .map(dep => this.getVersionContent(dep));

            if (contents.length > 0) {
                dependencies.set(depType.slug, contents);
            }
        } else if (dependencyArtifacts.length > 0 && this.hasValidVersion(dependencyArtifacts[0])) {
            // For types that should have a single instance
            dependencies.set(depType.slug, this.getVersionContent(dependencyArtifacts[0]));
        }
    }

    /**
     * Checks if an artifact has a valid version
     */
    private hasValidVersion(artifact: ArtifactWithRelations): boolean {
        return !!artifact.currentVersion || !!artifact.currentVersionId;
    }

    /**
     * Gets content from an artifact version
     */
    private getVersionContent(artifact: ArtifactWithRelations): string {
        if (artifact.currentVersion?.content) {
            return artifact.currentVersion.content;
        }
        this.logger.warn(`Version not preloaded for artifact ${artifact.id}, returning placeholder`);
        return '[Content not loaded]';
    }

    /**
     * Converts a string to a slug format
     */
    private slugify(text: string): string {
        return text
            .toLowerCase()
            .replace(/\s+/g, '_')
            .replace(/[^\w-]+/g, '');
    }
}