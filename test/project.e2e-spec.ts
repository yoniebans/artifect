// test/e2e/project.e2e-spec.ts

import * as request from 'supertest';
import { INestApplication } from '@nestjs/common';
import { PrismaService } from '../src/database/prisma.service';
import { setupTestApp } from './utils/test-utils';

// Define interface for project response
interface ProjectResponse {
    project_id: string;
    name: string;
    created_at: string;
    updated_at: string | null;
}

describe('Project Management (e2e)', () => {
    let app: INestApplication;
    let prisma: PrismaService;
    let projectId: string;

    beforeAll(async () => {
        try {
            const testEnv = await setupTestApp();
            app = testEnv.app;
            prisma = testEnv.prisma;
        } catch (error) {
            console.error('Failed to set up test environment:', error);
            throw error;
        }
    });

    // afterAll(async () => {
    //     try {
    //         if (prisma?.cleanDatabase) {
    //             await prisma.cleanDatabase();
    //         }
    //         if (app) {
    //             await app.close();
    //         }
    //     } catch (error) {
    //         console.error('Error during cleanup:', error);
    //     }
    // });

    afterAll(async () => {
        try {
            // Only close the app, don't clean the database at the end of each test
            if (app) {
                await app.close();
            }
        } catch (error) {
            console.error('Error during cleanup:', error);
        }
    });

    it('should create a new project', async () => {
        const response = await request(app.getHttpServer())
            .post('/project/new')
            .send({ name: 'E2E Test Project' })
            .expect(201);

        expect(response.body).toHaveProperty('project_id');
        expect(response.body.name).toBe('E2E Test Project');

        // Save project ID for subsequent tests
        projectId = response.body.project_id;
    });

    it('should list all projects', async () => {
        const response = await request(app.getHttpServer())
            .get('/project')
            .expect(200);

        expect(Array.isArray(response.body)).toBe(true);

        // Should find our created project
        const foundProject = response.body.find((p: ProjectResponse) => p.project_id === projectId);
        expect(foundProject).toBeDefined();
        expect(foundProject.name).toBe('E2E Test Project');
    });

    it('should get project details', async () => {
        const response = await request(app.getHttpServer())
            .get(`/project/${projectId}`)
            .expect(200);

        expect(response.body).toHaveProperty('project_id', projectId);
        expect(response.body).toHaveProperty('name', 'E2E Test Project');
        expect(response.body).toHaveProperty('phases');
    });

    it('should return 404 for non-existent project', async () => {
        await request(app.getHttpServer())
            .get('/project/99999')
            .expect(404);
    });
});