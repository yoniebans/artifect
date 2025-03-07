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
        const project = await this.workflowOrchestrator.createProject(projectData.name);
        return project;
    }

    /**
     * List all projects
     * @returns Array of project summaries
     */
    @Get()
    @ApiListProjects()
    async listProjects(): Promise<ProjectSummaryDto[]> {
        return this.workflowOrchestrator.listProjects();
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

            // Convert the project data to the expected format
            const projectDto: ProjectDto = {
                project_id: projectData.project_id,
                name: projectData.name,
                created_at: projectData.created_at,
                updated_at: projectData.updated_at,
                phases: Object.entries(projectData.artifacts).map(([phaseName, artifacts]) => {
                    // Find the phase ID and order
                    const phase = artifacts.length > 0 && artifacts[0]?.phase_id
                        ? { id: artifacts[0].phase_id, order: artifacts[0].order }
                        : { id: '0', order: '0' };

                    return {
                        name: phaseName,
                        phase_id: phase.id,
                        order: phase.order,
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