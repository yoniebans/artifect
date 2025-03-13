// src/api/controllers/project.controller.ts

import { Controller, Get, Post, Body, Param, NotFoundException } from '@nestjs/common';
import { WorkflowOrchestratorService } from '../../workflow/workflow-orchestrator.service';
import { ProjectCreateDto, ProjectSummaryDto, ProjectDto } from '../dto';
import { ApiCreateProject, ApiListProjects, ApiViewProject } from '../decorators/swagger.decorator';

/**
 * Controller for project-related endpoints
 */
@Controller('project')
export class ProjectController {
    constructor(private readonly workflowOrchestrator: WorkflowOrchestratorService) { }

    /**
     * Create a new project
     * @param projectData Project creation data
     * @returns Created project summary
     */
    @Post('new')
    @ApiCreateProject()
    async createProject(@Body() projectData: ProjectCreateDto): Promise<ProjectSummaryDto> {
        // Use type assertion to handle the mismatch between ProjectMetadata and ProjectSummaryDto
        const project = await this.workflowOrchestrator.createProject(projectData.name);
        return project as unknown as ProjectSummaryDto;
    }

    /**
     * List all projects
     * @returns Array of project summaries
     */
    @Get()
    @ApiListProjects()
    async listProjects(): Promise<ProjectSummaryDto[]> {
        // Use type assertion to handle the mismatch between ProjectMetadata[] and ProjectSummaryDto[]
        return this.workflowOrchestrator.listProjects() as unknown as ProjectSummaryDto[];
    }

    /**
     * Get detailed project information
     * @param projectId Project ID
     * @returns Project details with artifacts
     */
    @Get(':project_id')
    @ApiViewProject()
    async viewProject(@Param('project_id') projectId: string): Promise<ProjectDto> {
        try {
            const projectData = await this.workflowOrchestrator.viewProject(Number(projectId));

            // Define the phase order mapping just like in the Python version
            const phaseOrder: Record<string, string> = {
                "Requirements": "1",
                "Design": "2"
            };

            // Create artifact phases array
            const artifactPhases: any[] = [];

            // Process each phase and its artifacts
            for (const [phaseName, artifacts] of Object.entries(projectData.artifacts)) {
                const phaseArtifacts: any[] = [];

                // Process each artifact in this phase
                for (const artifact of artifacts) {
                    phaseArtifacts.push({
                        artifact_id: artifact.id ? String(artifact.id) : "",
                        artifact_type_id: String(artifact.type_id),
                        artifact_type_name: artifact.type,
                        artifact_version_number: artifact.version_number,
                        artifact_version_content: artifact.content,
                        name: artifact.name,
                        dependent_type_id: artifact.dependent_type_id ? String(artifact.dependent_type_id) : null,
                        state_id: String(artifact.state_id),
                        state_name: artifact.state_name,
                        available_transitions: artifact.available_transitions.map(t => ({
                            state_id: String(t.state_id),
                            state_name: t.state_name
                        }))
                    });
                }

                // Add this phase to the phases array
                artifactPhases.push({
                    name: phaseName,
                    phase_id: phaseOrder[phaseName] || "",
                    order: phaseOrder[phaseName] || "",
                    artifacts: phaseArtifacts
                });
            }

            // Construct the full project response
            const projectDto: ProjectDto = {
                project_id: projectData.project_id,
                name: projectData.name,
                created_at: projectData.created_at,
                updated_at: projectData.updated_at,
                phases: artifactPhases
            };

            return projectDto;
        } catch (error) {
            if (error.message.includes('not found')) {
                throw new NotFoundException(error.message);
            }
            throw error;
        }
    }
}