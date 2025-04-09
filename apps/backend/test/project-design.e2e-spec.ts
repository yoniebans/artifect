// test/project-design.e2e-spec.ts

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe, ExecutionContext } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { HttpExceptionFilter } from '../src/api/filters/http-exception.filter';
import { AuthService } from '../src/auth/auth.service';
import { ClerkService } from '../src/auth/clerk.service';
import { AdminGuard } from '../src/auth/guards/admin.guard';
import { AuthGuard } from '../src/auth/guards/auth.guard';
import {
    TEST_USER_CLERK_ID,
    TEST_USER_EMAIL,
    getTestUserFromDb,
    PROJECT_TYPES,
    SOFTWARE_ARTIFACT_TYPES,
    PRODUCT_DESIGN_ARTIFACT_TYPES
} from './test-utils';
import { User } from '@prisma/client';

/**
 * E2E test for Product Design project type workflow
 * 
 * This test verifies the complete workflow for the Product Design project type,
 * including creating a project with this specific type and creating artifacts
 * that are valid for this project type.
 */
describe('Product Design Project Type (e2e)', () => {
    let app: INestApplication;
    let projectId: string;
    let testUser: User;

    beforeAll(async () => {
        // First, get the test user from the database
        testUser = await getTestUserFromDb();
        console.log(`Using test user with ID: ${testUser.id}`);

        const moduleFixture: TestingModule = await Test.createTestingModule({
            imports: [AppModule],
        })
            .overrideProvider(ClerkService)
            .useValue({
                verifyToken: jest.fn().mockImplementation(() => ({ sub: TEST_USER_CLERK_ID })),
                getUserDetails: jest.fn().mockImplementation(() => ({
                    email_addresses: [{ email_address: TEST_USER_EMAIL }],
                    first_name: 'Test',
                    last_name: 'User'
                }))
            })
            .overrideProvider(AuthService)
            .useValue({
                validateToken: jest.fn().mockResolvedValue(testUser),
                isAdmin: jest.fn().mockResolvedValue(false)
            })
            .overrideGuard(AdminGuard)
            .useValue({ canActivate: () => true })
            .overrideGuard(AuthGuard)
            .useValue({
                canActivate: (context: ExecutionContext) => {
                    const req = context.switchToHttp().getRequest();
                    req.user = testUser;
                    return true;
                }
            })
            .compile();

        app = moduleFixture.createNestApplication();

        // Apply the same pipes and filters as in main.ts
        app.useGlobalPipes(
            new ValidationPipe({
                transform: true,
                whitelist: true,
                forbidNonWhitelisted: true,
            }),
        );
        app.useGlobalFilters(new HttpExceptionFilter());

        await app.init();
    });

    afterAll(async () => {
        if (app) {
            await app.close();
        }
    });

    // Step 1: Create a Product Design project
    it('should create a new Product Design project', async () => {
        const response = await request(app.getHttpServer())
            .post('/project/new')
            .set('Authorization', 'Bearer valid-token')
            .send({
                name: 'Test Product Design Project',
                project_type_id: PROJECT_TYPES.PRODUCT_DESIGN
            })
            .expect(201);

        expect(response.body).toHaveProperty('project_id');
        projectId = response.body.project_id;

        // Verify the project was created with the Product Design project type
        expect(response.body).toHaveProperty('project_type_id', PROJECT_TYPES.PRODUCT_DESIGN.toString());
        expect(response.body).toHaveProperty('project_type_name', 'Product Design');
    });

    // Step 2: Verify project details include appropriate phases for Product Design
    it('should show Product Design specific phases in project details', async () => {
        const response = await request(app.getHttpServer())
            .get(`/project/${projectId}`)
            .set('Authorization', 'Bearer valid-token')
            .expect(200);

        // Verify project details have Product Design project type
        expect(response.body).toHaveProperty('project_type_id', PROJECT_TYPES.PRODUCT_DESIGN.toString());
        expect(response.body).toHaveProperty('project_type_name', 'Product Design');

        // Verify phases match the expected ones for Product Design
        expect(response.body).toHaveProperty('phases');
        expect(Array.isArray(response.body.phases)).toBe(true);

        // Check that Research and Concept phases exist
        const phaseNames = response.body.phases.map((phase: any) => phase.name);
        expect(phaseNames).toContain('Research');
        expect(phaseNames).toContain('Concept');
    });

    // Step 3: Create a User Research artifact (valid for Product Design)
    it('should create a User Research artifact for the Product Design project', async () => {
        console.log(`Creating artifact type: ${PRODUCT_DESIGN_ARTIFACT_TYPES.USER_RESEARCH}`);

        const response = await request(app.getHttpServer())
            .post('/artifact/new')
            .set('Authorization', 'Bearer valid-token')
            .send({
                project_id: projectId,
                artifact_type_name: PRODUCT_DESIGN_ARTIFACT_TYPES.USER_RESEARCH
            })
            .expect(201);

        expect(response.body).toHaveProperty('artifact');
        expect(response.body.artifact).toHaveProperty('artifact_id');
        expect(response.body.artifact).toHaveProperty('artifact_type_name', PRODUCT_DESIGN_ARTIFACT_TYPES.USER_RESEARCH);
        expect(response.body.artifact).toHaveProperty('project_type_id', PROJECT_TYPES.PRODUCT_DESIGN.toString());
        expect(response.body.artifact).toHaveProperty('project_type_name', 'Product Design');
    });

    // Step 4: Test validation by trying to create a Software Engineering artifact
    it('should reject creating a Vision Document (Software Engineering artifact) for a Product Design project', async () => {
        console.log(`Trying to create invalid artifact type: ${SOFTWARE_ARTIFACT_TYPES.VISION_DOCUMENT}`);

        const response = await request(app.getHttpServer())
            .post('/artifact/new')
            .set('Authorization', 'Bearer valid-token')
            .send({
                project_id: projectId,
                artifact_type_name: SOFTWARE_ARTIFACT_TYPES.VISION_DOCUMENT // This belongs to Software Engineering
            })
            .expect(400);

        // Verify that the error message indicates it's a project type constraint issue
        expect(response.body).toHaveProperty('message');

        // More flexible check for error message
        const errorMessage = response.body.message;
        expect(
            errorMessage.includes('not valid for project type') ||
            errorMessage.includes('not allowed in this project type')
        ).toBe(true);
    });

    // Step 5: Create a Design Brief after User Research
    it('should create a Design Brief artifact after User Research', async () => {
        console.log(`Creating artifact type: ${PRODUCT_DESIGN_ARTIFACT_TYPES.DESIGN_BRIEF}`);

        const response = await request(app.getHttpServer())
            .post('/artifact/new')
            .set('Authorization', 'Bearer valid-token')
            .send({
                project_id: projectId,
                artifact_type_name: PRODUCT_DESIGN_ARTIFACT_TYPES.DESIGN_BRIEF
            })
            .expect(201);

        expect(response.body).toHaveProperty('artifact');
        expect(response.body.artifact).toHaveProperty('artifact_type_name', PRODUCT_DESIGN_ARTIFACT_TYPES.DESIGN_BRIEF);
    });

    // Step 6: Create Wireframes in the Concept phase
    it('should create Wireframes artifact in the Concept phase', async () => {
        console.log(`Creating artifact type: ${PRODUCT_DESIGN_ARTIFACT_TYPES.WIREFRAMES}`);

        const response = await request(app.getHttpServer())
            .post('/artifact/new')
            .set('Authorization', 'Bearer valid-token')
            .send({
                project_id: projectId,
                artifact_type_name: PRODUCT_DESIGN_ARTIFACT_TYPES.WIREFRAMES
            })
            .expect(201);

        expect(response.body).toHaveProperty('artifact');
        expect(response.body.artifact).toHaveProperty('artifact_type_name', PRODUCT_DESIGN_ARTIFACT_TYPES.WIREFRAMES);
    });

    // Step 7: Finally create Mockups which depend on Wireframes
    it('should create Mockups artifact which depends on Wireframes', async () => {
        console.log(`Creating artifact type: ${PRODUCT_DESIGN_ARTIFACT_TYPES.MOCKUPS}`);

        const response = await request(app.getHttpServer())
            .post('/artifact/new')
            .set('Authorization', 'Bearer valid-token')
            .send({
                project_id: projectId,
                artifact_type_name: PRODUCT_DESIGN_ARTIFACT_TYPES.MOCKUPS
            })
            .expect(201);

        expect(response.body).toHaveProperty('artifact');
        expect(response.body.artifact).toHaveProperty('artifact_type_name', PRODUCT_DESIGN_ARTIFACT_TYPES.MOCKUPS);
    });

    // Step 8: Verify the complete project structure with all artifacts
    it('should show the complete project with all artifacts organized by phases', async () => {
        const response = await request(app.getHttpServer())
            .get(`/project/${projectId}`)
            .set('Authorization', 'Bearer valid-token')
            .expect(200);

        // Verify project details
        expect(response.body).toHaveProperty('project_type_name', 'Product Design');

        // Get all artifacts across all phases
        const allArtifacts = response.body.phases.reduce((artifacts: any, phase: any) => {
            return artifacts.concat(phase.artifacts);
        }, []);

        // Verify all expected artifact types exist
        const artifactTypeNames = allArtifacts.map((artifact: any) => artifact.artifact_type_name);
        expect(artifactTypeNames).toContain(PRODUCT_DESIGN_ARTIFACT_TYPES.USER_RESEARCH);
        expect(artifactTypeNames).toContain(PRODUCT_DESIGN_ARTIFACT_TYPES.DESIGN_BRIEF);
        expect(artifactTypeNames).toContain(PRODUCT_DESIGN_ARTIFACT_TYPES.WIREFRAMES);
        expect(artifactTypeNames).toContain(PRODUCT_DESIGN_ARTIFACT_TYPES.MOCKUPS);

        // Verify User Research and Design Brief are in the Research phase
        const researchPhase = response.body.phases.find((phase: any) => phase.name === 'Research');
        expect(researchPhase).toBeDefined();
        if (researchPhase) {
            const researchArtifactTypes = researchPhase.artifacts.map((a: any) => a.artifact_type_name);
            expect(researchArtifactTypes).toContain(PRODUCT_DESIGN_ARTIFACT_TYPES.USER_RESEARCH);
            expect(researchArtifactTypes).toContain(PRODUCT_DESIGN_ARTIFACT_TYPES.DESIGN_BRIEF);
        }

        // Verify Wireframes and Mockups are in the Concept phase
        const conceptPhase = response.body.phases.find((phase: any) => phase.name === 'Concept');
        expect(conceptPhase).toBeDefined();
        if (conceptPhase) {
            const conceptArtifactTypes = conceptPhase.artifacts.map((a: any) => a.artifact_type_name);
            expect(conceptArtifactTypes).toContain(PRODUCT_DESIGN_ARTIFACT_TYPES.WIREFRAMES);
            expect(conceptArtifactTypes).toContain(PRODUCT_DESIGN_ARTIFACT_TYPES.MOCKUPS);
        }
    });
});