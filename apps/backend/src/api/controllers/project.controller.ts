// src/api/controllers/project.controller.ts

import { Controller, Get, Post, Body, Param, NotFoundException, Req } from '@nestjs/common';
import { WorkflowOrchestratorService } from '../../workflow/workflow-orchestrator.service';
import { ProjectCreateDto, ProjectSummaryDto, ProjectDto } from '../dto';
import { ApiCreateProject, ApiListProjects, ApiViewProject } from '../decorators/swagger.decorator';
import { CurrentUser } from '../../auth/decorators/user.decorator';
import { User } from '@prisma/client';
import { Admin } from '../../auth/decorators/admin.decorator';
import { RequestWithUser } from '../../auth/interfaces/request-with-user.interface';

/**
 * Controller for project-related endpoints
 */
@Controller('project')
export class ProjectController {
    constructor(private readonly workflowOrchestrator: WorkflowOrchestratorService) { }

    /**
     * Create a new project
     * @param projectData Project creation data
     * @param user Current authenticated user
     * @returns Created project summary
     */
    @Post('new')
    @ApiCreateProject()
    async createProject(
        @Body() projectData: ProjectCreateDto,
        @CurrentUser() user: User
    ): Promise<ProjectSummaryDto> {
        // Pass the optional project type ID to associate the project with a specific type
        const project = await this.workflowOrchestrator.createProject(
            projectData.name,
            user.id,
            projectData.project_type_id
        );
        return project as unknown as ProjectSummaryDto;
    }

    /**
     * List projects for the current user
     * @param user Current authenticated user
     * @returns Array of project summaries
     */
    @Get()
    @ApiListProjects()
    async listProjects(@CurrentUser() user: User): Promise<ProjectSummaryDto[]> {
        // Only return projects associated with the current user
        return this.workflowOrchestrator.listProjectsByUser(user.id) as unknown as ProjectSummaryDto[];
    }

    /**
     * Admin endpoint to list all projects from all users
     * @returns Array of project summaries
     */
    @Get('admin/all')
    @Admin() // Use the Admin decorator to require admin privileges
    @ApiListProjects()
    async listAllProjects(): Promise<ProjectSummaryDto[]> {
        // Admin can see all projects
        return this.workflowOrchestrator.listProjects() as unknown as ProjectSummaryDto[];
    }

    @Get(':project_id')
    @ApiViewProject()
    async viewProject(
        @Param('project_id') projectId: string,
        @CurrentUser() user: User
    ): Promise<ProjectDto> {
        try {
            const projectData = await this.workflowOrchestrator.viewProject(
                Number(projectId),
                user.id
            );

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

            // Create and populate a ProjectDto instance
            const projectDto = new ProjectDto();
            projectDto.project_id = projectData.project_id;
            projectDto.name = projectData.name;
            projectDto.created_at = this.convertToString(projectData.created_at) || "";
            projectDto.updated_at = this.convertToString(projectData.updated_at);
            projectDto.project_type_id = projectData.project_type_id;
            projectDto.project_type_name = projectData.project_type_name;
            projectDto.phases = artifactPhases;

            return projectDto;
        } catch (error) {
            if (error.message.includes('not found')) {
                throw new NotFoundException(error.message);
            }
            throw error;
        }
    }

    // Helper method to convert dates to strings (add this to the ProjectController class)
    private convertToString(value: Date | string | null | undefined): string | null {
        if (value instanceof Date) {
            return value.toISOString();
        }
        if (typeof value === 'string') {
            return value;
        }
        if (value === null || value === undefined) {
            return null;
        }
        return String(value);
    }
}