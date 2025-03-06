import { Injectable, Logger } from '@nestjs/common';
import { Artifact } from '@prisma/client';
import { ArtifactRepository } from '../repositories/artifact.repository';
import { CacheService } from '../services/cache/cache.service';
import { ContextData, ContextManagerInterface } from './interfaces/context-manager.interface';
import { ArtifactWithRelations } from './types/artifact-with-relations';

/**
 * Service for managing context data for artifact generation and updates
 */
@Injectable()
export class ContextManagerService implements ContextManagerInterface {
    private readonly logger = new Logger(ContextManagerService.name);

    constructor(
        private artifactRepository: ArtifactRepository,
        private cacheService: CacheService,
    ) { }

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
            },
            artifact: {
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

        // Get all relevant type IDs
        const frInfo = await this.cacheService.getArtifactTypeInfo('Functional Requirements');
        const nfrInfo = await this.cacheService.getArtifactTypeInfo('Non-Functional Requirements');
        const useCasesInfo = await this.cacheService.getArtifactTypeInfo('Use Cases');
        const c4ContextInfo = await this.cacheService.getArtifactTypeInfo('C4 Context');
        const c4ContainerInfo = await this.cacheService.getArtifactTypeInfo('C4 Container');
        const c4ComponentInfo = await this.cacheService.getArtifactTypeInfo('C4 Component');

        // For FR and later: Need Vision
        const artifactTypeId = artifact.artifact_type?.id || artifact.artifactTypeId;

        if (artifactTypeId && frInfo && artifactTypeId >= frInfo.typeId) {
            const visions = await this.artifactRepository.getArtifactsByType(artifact, 'Vision Document');

            if (!visions?.length || !this.hasValidVersion(visions[0])) {
                throw new Error('Vision document missing; a vision is requirement for context');
            }

            context.vision = this.getVersionContent(visions[0]);
        }

        // For NFR and later: Need FR
        if (artifactTypeId && nfrInfo && artifactTypeId >= nfrInfo.typeId) {
            const fr = await this.artifactRepository.getArtifactsByType(artifact, 'Functional Requirements');

            if (!fr?.length || !this.hasValidVersion(fr[0])) {
                throw new Error('Functional requirements missing; functional requirements are required context');
            }

            context.functional_requirements = this.getVersionContent(fr[0]);
        }

        // For Use Cases and later: Need NFR
        if (artifactTypeId && useCasesInfo && artifactTypeId >= useCasesInfo.typeId) {
            const nfr = await this.artifactRepository.getArtifactsByType(artifact, 'Non-Functional Requirements');

            if (!nfr?.length || !this.hasValidVersion(nfr[0])) {
                throw new Error('Non-Functional requirements missing; non-functional requirements are required context');
            }

            context.non_functional_requirements = this.getVersionContent(nfr[0]);

            // Include existing use cases if we're creating a use case (optional)
            if (artifactTypeId === useCasesInfo.typeId) {
                const useCases = await this.artifactRepository.getArtifactsByType(artifact, 'Use Cases');

                if (useCases?.length) {
                    context.use_cases = useCases
                        .filter(uc => this.hasValidVersion(uc))
                        .map(uc => this.getVersionContent(uc));
                }
            }
        }

        // For C4 Context and later: Need Use Cases
        if (artifactTypeId && c4ContextInfo && artifactTypeId >= c4ContextInfo.typeId) {
            const useCases = await this.artifactRepository.getArtifactsByType(artifact, 'Use Cases');

            if (!useCases?.length) {
                throw new Error('Use Cases missing; Use cases are required context');
            }

            const useCaseContents = useCases
                .filter(uc => this.hasValidVersion(uc))
                .map(uc => this.getVersionContent(uc));

            if (!useCaseContents.length) {
                throw new Error('No Use Cases with content found; Use cases are required context');
            }

            context.use_cases = useCaseContents;
        }

        // For C4 Container and later: Need C4 Context
        if (artifactTypeId && c4ContainerInfo && artifactTypeId >= c4ContainerInfo.typeId) {
            const c4Context = await this.artifactRepository.getArtifactsByType(artifact, 'C4 Context');

            if (!c4Context?.length || !this.hasValidVersion(c4Context[0])) {
                throw new Error('C4 Context missing; C4 Context is required context');
            }

            context.c4_context = this.getVersionContent(c4Context[0]);
        }

        // For C4 Component: Need C4 Container, include existing components
        if (artifactTypeId && c4ComponentInfo && artifactTypeId >= c4ComponentInfo.typeId) {
            const c4Container = await this.artifactRepository.getArtifactsByType(artifact, 'C4 Container');

            if (!c4Container?.length || !this.hasValidVersion(c4Container[0])) {
                throw new Error('C4 Container missing; C4 Container is required context');
            }

            context.c4_container = this.getVersionContent(c4Container[0]);

            // Include existing components if we're creating a component (optional)
            if (artifactTypeId === c4ComponentInfo.typeId) {
                const components = await this.artifactRepository.getArtifactsByType(artifact, 'C4 Component');

                if (components?.length) {
                    context.c4_components = components
                        .filter(comp => this.hasValidVersion(comp))
                        .map(comp => this.getVersionContent(comp));
                }
            }
        }

        return context;
    }

    /**
     * Check if an artifact has a valid version (either currentVersion or currentVersionId)
     */
    private hasValidVersion(artifact: ArtifactWithRelations): boolean {
        return (
            !!artifact.currentVersion ||
            !!artifact.currentVersionId
        );
    }

    /**
     * Get content from artifact version
     */
    private getVersionContent(artifact: ArtifactWithRelations): string {
        if (artifact.currentVersion?.content) {
            return artifact.currentVersion.content;
        }

        // Fallback for when the version is not loaded but we know there is one
        this.logger.warn(`Version not preloaded for artifact ${artifact.id}, returning placeholder`);
        return '[Content not loaded]';
    }
}