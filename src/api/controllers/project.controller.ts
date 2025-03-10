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

            // Convert the project data to the expected format with proper type assertions
            const projectDto: ProjectDto = {
                project_id: projectData.project_id,
                name: projectData.name,
                created_at: projectData.created_at,
                updated_at: projectData.updated_at as Date | null,
                phases: Object.entries(projectData.artifacts).map(([phaseName, artifacts]) => {
                    // Create a phaseId and order property in a more robust way
                    let phaseId = '0';
                    let order = '0';

                    if (artifacts.length > 0) {
                        // Safely access properties that might not exist using type assertion
                        const artifact = artifacts[0];
                        // Use optional chaining and nullish coalescing for safer access
                        const artifactObj = artifact as any;
                        phaseId = artifactObj?.phase_id ?? '0';
                        order = artifactObj?.order ?? '0';
                    }

                    // Map the artifacts to the expected format
                    return {
                        name: phaseName,
                        phase_id: phaseId,
                        order: order,
                        artifacts: artifacts.map(artifact => ({
                            artifact_id: artifact.id,
                            artifact_type_id: artifact.type_id,
                            artifact_type_name: artifact.type,
                            artifact_version_number: artifact.version_number,
                            artifact_version_content: artifact.content,
                            name: artifact.name,
                            dependent_type_id: artifact.dependent_type_id,
                            state_id: artifact.state_id,
                            state_name: artifact.state_name,
                            available_transitions: artifact.available_transitions.map(t => ({
                                state_id: t.state_id,
                                state_name: t.state_name
                            }))
                        }))
                    };
                })
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