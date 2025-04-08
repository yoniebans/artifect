import { Injectable, Logger } from '@nestjs/common';
import { ArtifactRepository } from '../repositories/artifact.repository';
import { CacheService } from '../services/cache/cache.service';
import { ContextData, ContextManagerInterface } from './interfaces/context-manager.interface';
import { ArtifactWithRelations } from './types/artifact-with-relations';
import { DependencyResolver } from './dependency-resolver';

/**
 * Service for managing context data for artifact generation and updates
 */
@Injectable()
export class ContextManagerService implements ContextManagerInterface {
    private readonly logger = new Logger(ContextManagerService.name);
    private dependencyResolver: DependencyResolver;

    constructor(
        private artifactRepository: ArtifactRepository,
        private cacheService: CacheService,
    ) {
        this.dependencyResolver = new DependencyResolver(artifactRepository, cacheService);
    }

    /**
     * Get context for artifact generation or update
     * @param artifact The artifact object with relations
     * @param isUpdate Whether this is an update operation
     * @param userMessage Optional user message
     * @returns Context data for template rendering and AI generation
     */
    async getContext(
        artifact: ArtifactWithRelations,
        isUpdate: boolean,
        userMessage?: string | null
    ): Promise<ContextData> {
        // Basic context for all artifacts
        const context: ContextData = {
            project: {
                name: artifact.project?.name || 'Unknown Project',
                project_type_id: artifact.project?.projectTypeId,
                project_type_name: artifact.project?.projectType?.name,
            },
            artifact: {
                artifact_id: artifact.id,
                artifact_type_id: artifact.artifact_type?.id || artifact.artifactTypeId,
                artifact_type_name: artifact.artifact_type?.name || 'Unknown Type',
                artifact_phase: artifact.artifact_type?.lifecyclePhase?.name || 'Unknown Phase',
            },
            is_update: isUpdate,
            user_message: userMessage || null,
        };

        // Add current artifact details if update
        if (isUpdate) {
            context.artifact = {
                ...context.artifact,
                name: artifact.name,
                content: artifact.currentVersion?.content || null
            };
        }

        try {
            // Resolve dependencies dynamically based on project type and artifact type
            const dependencies = await this.dependencyResolver.resolveDependencies(artifact);

            // Add all resolved dependencies to the context
            for (const [key, value] of dependencies.entries()) {
                context[key] = value;
            }

            return context;
        } catch (error) {
            this.logger.error(`Error building context: ${error.message}`);
            throw error;
        }
    }
}