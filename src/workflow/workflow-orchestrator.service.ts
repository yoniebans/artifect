import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Artifact } from '@prisma/client';
import { AIAssistantService } from '../ai/ai-assistant.service';
import { AIMessage } from '../ai/interfaces/ai-provider.interface';
import { ProjectRepository } from '../repositories/project.repository';
import { ArtifactRepository } from '../repositories/artifact.repository';
import { ReasoningRepository } from '../repositories/reasoning.repository';
import { TemplateManagerService } from '../templates/template-manager.service';
import { ContextManagerService } from '../context/context-manager.service';
import {
    WorkflowOrchestratorInterface,
    ProjectMetadata,
    ProjectDetails,
    ArtifactDetails,
    ArtifactItem,
    StateTransition
} from './interfaces/workflow-orchestrator.interface';

/**
 * Main service for orchestrating the workflow of the application
 */
@Injectable()
export class WorkflowOrchestratorService implements WorkflowOrchestratorInterface {
    private readonly logger = new Logger(WorkflowOrchestratorService.name);

    constructor(
        private projectRepository: ProjectRepository,
        private artifactRepository: ArtifactRepository,
        private reasoningRepository: ReasoningRepository,
        private templateManager: TemplateManagerService,
        private contextManager: ContextManagerService,
        private aiAssistant: AIAssistantService,
        private configService: ConfigService,
    ) { }

    /**
     * Create a new project
     * 
     * @param projectName Name of the project
     * @returns Project metadata
     */
    async createProject(projectName: string): Promise<ProjectMetadata> {
        const newProject = await this.projectRepository.create({ name: projectName });

        return {
            project_id: String(newProject.id),
            name: newProject.name,
            created_at: newProject.createdAt,
            updated_at: newProject.updatedAt,
        };
    }

    /**
     * List all projects
     * 
     * @returns Array of project metadata
     */
    async listProjects(): Promise<ProjectMetadata[]> {
        const projects = await this.projectRepository.findAll();

        return projects.map(project => ({
            project_id: String(project.id),
            name: project.name,
            created_at: project.createdAt,
            updated_at: project.updatedAt,
        }));
    }

    /**
     * Get detailed view of a project with artifacts
     * 
     * @param projectId Project ID
     * @returns Project details with artifacts
     * @throws NotFoundException if project not found
     */
    async viewProject(projectId: number): Promise<ProjectDetails> {
        const project = await this.projectRepository.findById(projectId);
        if (!project) {
            throw new NotFoundException(`Project with id ${projectId} not found`);
        }

        const phases = ['Requirements', 'Design'];
        const projectArtifacts: { [phase: string]: ArtifactItem[] } = {};

        // Get "To Do" state once for reuse
        const todoState = await this.artifactRepository.getArtifactStateByName('To Do');

        for (const phase of phases) {
            const artifactTypes = await this.artifactRepository.getArtifactTypesByPhase(phase);
            const processedArtifacts: ArtifactItem[] = [];

            for (const artifactType of artifactTypes) {
                // Find all artifacts of this type in the project, ordered by id
                const artifactsByPhase = await this.artifactRepository.getArtifactsByProjectIdAndPhase(
                    projectId,
                    phase
                );

                const matchingArtifacts = artifactsByPhase
                    .filter(a => a.artifactTypeId === artifactType.id)
                    .sort((a, b) => a.id - b.id);

                if (matchingArtifacts.length > 0) {
                    // Add all matching artifacts for this type
                    for (const artifact of matchingArtifacts) {
                        const availableTransitions = await this.artifactRepository.getAvailableTransitions(artifact);

                        processedArtifacts.push({
                            id: String(artifact.id),
                            name: artifact.name,
                            type: artifactType.name,
                            type_id: String(artifactType.id),
                            content: artifact.currentVersion?.content || null,
                            version_number: artifact.currentVersionId ?
                                String(artifact.currentVersion?.versionNumber) : null,
                            state_id: String(artifact.stateId),
                            state_name: artifact.state?.name || null,
                            available_transitions: availableTransitions.map(t => ({
                                state_id: String(t.id),
                                state_name: t.name,
                            })),
                            dependent_type_id: artifactType.dependencies?.length ?
                                String(artifactType.dependencies[0].id) : null,
                        });
                    }
                } else {
                    // Only show "New" entry if no artifacts exist for this type
                    processedArtifacts.push({
                        id: null,
                        name: `New ${artifactType.name}`,
                        type: artifactType.name,
                        type_id: String(artifactType.id),
                        content: null,
                        version_number: null,
                        state_id: todoState ? String(todoState.id) : null,
                        state_name: todoState?.name || null,
                        available_transitions: todoState ?
                            (await this.artifactRepository.getAvailableTransitions({ stateId: todoState.id } as any))
                                .map(t => ({
                                    state_id: String(t.id),
                                    state_name: t.name,
                                })) : [],
                        dependent_type_id: artifactType.dependencies?.length ?
                            String(artifactType.dependencies[0].id) : null,
                    });
                }
            }

            projectArtifacts[phase] = processedArtifacts;
        }

        return {
            project_id: String(project.id),
            name: project.name,
            created_at: project.createdAt,
            updated_at: project.updatedAt,
            artifacts: projectArtifacts,
        };
    }

    /**
     * Get detailed view of an artifact with chat history
     * 
     * @param artifactId Artifact ID
     * @returns Artifact details with chat history
     * @throws NotFoundException if artifact not found
     */
    async getArtifactDetails(artifactId: number): Promise<ArtifactDetails> {
        const artifact = await this.artifactRepository.findById(artifactId);
        if (!artifact) {
            throw new NotFoundException(`Artifact with id ${artifactId} not found`);
        }

        const availableTransitions = await this.artifactRepository.getAvailableTransitions(artifact);

        const [previousInteractions] = await this.artifactRepository.getLastInteractions(artifactId, 10);

        const messages: AIMessage[] = [];
        if (previousInteractions && previousInteractions.length > 0) {
            // Note: getLastInteractions returns in descending order, so we need to reverse
            for (const interaction of [...previousInteractions].reverse()) {
                messages.push({
                    role: interaction.role,
                    content: interaction.content,
                });
            }
        }

        return {
            artifact: {
                artifact_id: String(artifact.id),
                artifact_type_id: String(artifact.artifactTypeId),
                artifact_type_name: artifact.artifactType?.name || 'Unknown',
                artifact_version_number: artifact.currentVersion ?
                    String(artifact.currentVersion.versionNumber) : null,
                artifact_version_content: artifact.currentVersion?.content || null,
                name: artifact.name,
                state_id: String(artifact.stateId),
                state_name: artifact.state?.name || 'Unknown',
                available_transitions: availableTransitions.map(t => ({
                    state_id: String(t.id),
                    state_name: t.name,
                })),
                dependent_type_id: artifact.artifactType?.dependencies?.length ?
                    String(artifact.artifactType.dependencies[0].id) : null,
            },
            chat_completion: {
                messages,
            },
        };
    }

    /**
     * Create a new artifact
     * 
     * @param projectId Project ID
     * @param artifactTypeName Type of artifact to create
     * @param providerId Optional AI provider ID
     * @param model Optional AI model name
     * @returns Artifact details with initial AI message
     * @throws NotFoundException if project not found
     * @throws Error if artifact type invalid or already exists
     */
    async createArtifact(
        projectId: number,
        artifactTypeName: string,
        providerId?: string,
        model?: string
    ): Promise<ArtifactDetails> {
        const project = await this.projectRepository.findById(projectId);
        if (!project) {
            throw new NotFoundException(`Project with id ${projectId} not found`);
        }

        const artifactType = await this.artifactRepository.getArtifactTypeByName(artifactTypeName);
        if (!artifactType) {
            throw new Error(`Invalid artifact type: ${artifactTypeName}`);
        }

        const phase = artifactType.lifecyclePhase?.name || 'Unknown';

        // Check if artifact of this type already exists (except for Use Cases and C4 Components)
        const existingOfType = (await this.artifactRepository.getArtifactsByProjectIdAndPhase(projectId, phase))
            .filter(a => a.artifactType?.name === artifactTypeName);

        if (existingOfType.length > 0 &&
            !(phase === 'Requirements' && artifactTypeName === 'Use Cases') &&
            !(phase === 'Design' && artifactTypeName === 'C4 Component')) {
            throw new Error(`Project already has an artifact of type '${artifactTypeName}'`);
        }

        // Create the artifact
        const artifact = await this.artifactRepository.create({
            projectId,
            artifactTypeId: artifactType.id,
            name: `New ${artifactTypeName}`,
        });

        // Load the artifact with relations for context building
        const fullArtifact = await this.artifactRepository.findById(artifact.id);
        if (!fullArtifact) {
            throw new Error(`Failed to load newly created artifact`);
        }

        // Build context and generate initial AI response
        const context = await this.contextManager.getContext(fullArtifact, false, null);

        const aiOutput = await this.aiAssistant.kickoffArtifactInteraction(
            context,
            providerId,
            model
        );

        const messages: AIMessage[] = [];

        if (aiOutput.commentary && aiOutput.commentary.trim()) {
            // Create interaction record
            await this.artifactRepository.createInteraction({
                artifactId: artifact.id,
                versionId: artifact.currentVersionId || undefined,
                role: 'assistant',
                content: aiOutput.commentary,
                sequenceNumber: 1,
            });

            messages.push({
                role: 'assistant',
                content: aiOutput.commentary,
            });
        }

        // If artifact content was generated, create version
        if (aiOutput.artifactContent && aiOutput.artifactContent.trim()) {
            await this.artifactRepository.createArtifactVersion(
                artifact.id,
                aiOutput.artifactContent
            );
        }

        // Reload artifact with latest changes
        const updatedArtifact = await this.artifactRepository.findById(artifact.id);
        if (!updatedArtifact) {
            throw new Error(`Failed to reload artifact after AI interaction`);
        }

        const availableTransitions = await this.artifactRepository.getAvailableTransitions(updatedArtifact);

        return {
            artifact: {
                artifact_id: String(updatedArtifact.id),
                artifact_type_id: String(updatedArtifact.artifactTypeId),
                artifact_type_name: updatedArtifact.artifactType?.name || 'Unknown',
                artifact_version_number: updatedArtifact.currentVersion ?
                    String(updatedArtifact.currentVersion.versionNumber) : null,
                artifact_version_content: updatedArtifact.currentVersion?.content || null,
                name: updatedArtifact.name,
                state_id: String(updatedArtifact.stateId),
                state_name: updatedArtifact.state?.name || 'Unknown',
                available_transitions: availableTransitions.map(t => ({
                    state_id: String(t.id),
                    state_name: t.name,
                })),
                dependent_type_id: updatedArtifact.artifactType?.dependencies?.length ?
                    String(updatedArtifact.artifactType.dependencies[0].id) : null,
            },
            chat_completion: {
                messages,
            },
        };
    }

    /**
     * Interact with an artifact (send user message to AI)
     * 
     * @param artifactId Artifact ID
     * @param userMessage User message
     * @param providerId Optional AI provider ID
     * @param model Optional AI model name
     * @returns Updated artifact details with AI response
     * @throws NotFoundException if artifact not found
     */
    async interactArtifact(
        artifactId: number,
        userMessage: string,
        providerId?: string,
        model?: string
    ): Promise<ArtifactDetails> {
        const artifact = await this.artifactRepository.findById(artifactId);
        if (!artifact) {
            throw new NotFoundException(`Artifact with id ${artifactId} not found`);
        }

        // Get recent interactions for context
        const [lastInteractions, nextSequence] = await this.artifactRepository.getLastInteractions(artifactId, 3);

        // Create user interaction
        await this.artifactRepository.createInteraction({
            artifactId,
            versionId: artifact.currentVersionId || undefined,
            role: 'user',
            content: userMessage,
            sequenceNumber: nextSequence,
        });

        // Build context and generate AI response
        const context = await this.contextManager.getContext(artifact, true, userMessage);

        const aiOutput = await this.aiAssistant.updateArtifact(
            context,
            userMessage,
            providerId,
            model,
            // Convert to AIMessage format - reverse to get chronological order
            [...lastInteractions].reverse().map(interaction => ({
                role: interaction.role,
                content: interaction.content,
            }))
        );

        // Track current version
        let currentVersion = artifact.currentVersion;

        // If content was generated, create new version
        if (aiOutput.artifactContent && aiOutput.artifactContent.trim()) {
            currentVersion = await this.artifactRepository.createArtifactVersion(
                artifactId,
                aiOutput.artifactContent
            );
        }

        const messages: AIMessage[] = [];

        // Create AI interaction record if there was commentary
        if (aiOutput.commentary && aiOutput.commentary.trim()) {
            await this.artifactRepository.createInteraction({
                artifactId,
                versionId: currentVersion?.id,
                role: 'assistant',
                content: aiOutput.commentary,
                sequenceNumber: nextSequence + 1,
            });

            messages.push({
                role: 'assistant',
                content: aiOutput.commentary,
            });
        }

        // If artifact is not in "In Progress" state, update it
        if (artifact.state?.name !== 'In Progress') {
            await this.artifactRepository.updateArtifactState(artifactId, 'In Progress');
        }

        // Reload artifact with latest changes
        const updatedArtifact = await this.artifactRepository.findById(artifactId);
        if (!updatedArtifact) {
            throw new Error(`Failed to reload artifact after AI interaction`);
        }

        const availableTransitions = await this.artifactRepository.getAvailableTransitions(updatedArtifact);

        return {
            artifact: {
                artifact_id: String(updatedArtifact.id),
                artifact_type_id: String(updatedArtifact.artifactTypeId),
                artifact_type_name: updatedArtifact.artifactType?.name || 'Unknown',
                artifact_version_number: updatedArtifact.currentVersion ?
                    String(updatedArtifact.currentVersion.versionNumber) : null,
                artifact_version_content: updatedArtifact.currentVersion?.content || null,
                name: updatedArtifact.name,
                state_id: String(updatedArtifact.stateId),
                state_name: updatedArtifact.state?.name || 'Unknown',
                available_transitions: availableTransitions.map(t => ({
                    state_id: String(t.id),
                    state_name: t.name,
                })),
                dependent_type_id: updatedArtifact.artifactType?.dependencies?.length ?
                    String(updatedArtifact.artifactType.dependencies[0].id) : null,
            },
            chat_completion: {
                messages,
            },
        };
    }

    /**
     * Update an artifact's properties
     * 
     * @param artifactId Artifact ID
     * @param name New name for the artifact
     * @param content New content for the artifact
     * @returns Updated artifact
     * @throws NotFoundException if artifact not found
     */
    async updateArtifact(
        artifactId: number,
        name: string,
        content: string
    ): Promise<Artifact> {
        const updatedArtifact = await this.artifactRepository.update(artifactId, {
            name,
            content,
        });

        if (!updatedArtifact) {
            throw new NotFoundException(`Artifact with id ${artifactId} not found`);
        }

        return updatedArtifact;
    }

    /**
     * Transition an artifact to a new state
     * 
     * @param artifactId Artifact ID
     * @param newStateId ID of the new state
     * @returns Artifact details after transition
     * @throws NotFoundException if artifact not found
     * @throws Error if state transition fails
     */
    async transitionArtifact(
        artifactId: number,
        newStateId: number
    ): Promise<ArtifactDetails> {
        const artifact = await this.artifactRepository.findById(artifactId);
        if (!artifact) {
            throw new NotFoundException(`Artifact with id ${artifactId} not found`);
        }

        const updatedArtifact = await this.artifactRepository.updateArtifactStateWithId(artifactId, newStateId);
        if (!updatedArtifact) {
            throw new Error(`Failed to update artifact state to state id: ${newStateId}`);
        }

        const availableTransitions = await this.artifactRepository.getAvailableTransitions(updatedArtifact);

        return {
            artifact: {
                artifact_id: String(updatedArtifact.id),
                artifact_type_id: String(updatedArtifact.artifactTypeId),
                artifact_type_name: updatedArtifact.artifactType?.name || 'Unknown',
                artifact_version_number: updatedArtifact.currentVersion ?
                    String(updatedArtifact.currentVersion.versionNumber) : null,
                artifact_version_content: updatedArtifact.currentVersion?.content || null,
                name: updatedArtifact.name,
                state_id: String(updatedArtifact.stateId),
                state_name: updatedArtifact.state?.name || 'Unknown',
                available_transitions: availableTransitions.map(t => ({
                    state_id: String(t.id),
                    state_name: t.name,
                })),
                dependent_type_id: updatedArtifact.artifactType?.dependencies?.length ?
                    String(updatedArtifact.artifactType.dependencies[0].id) : null,
            },
            chat_completion: {
                messages: [],
            },
        };
    }
}