// test/project-type-comparison.e2e-spec.ts

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
import { CacheService } from 'src/services/cache/cache.service';
import { PrismaService } from 'src/database/prisma.service';

/**
 * E2E test for comparing workflows between different project types
 */
describe('Project Type Comparison (e2e)', () => {
    let app: INestApplication;
    let softwareProjectId: string;
    let productDesignProjectId: string;
    let softwareArtifactId: string;
    let productDesignArtifactId: string;
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

        // Apply same pipes and filters as in main.ts
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

    // Setup: Create a Software Engineering project
    it('should create a Software Engineering project', async () => {
        const response = await request(app.getHttpServer())
            .post('/project/new')
            .set('Authorization', 'Bearer valid-token')
            .send({
                name: 'Software Engineering Comparison',
                project_type_id: PROJECT_TYPES.SOFTWARE_ENGINEERING
            })
            .expect(201);

        expect(response.body).toHaveProperty('project_id');
        softwareProjectId = response.body.project_id;
        expect(response.body).toHaveProperty('project_type_id', PROJECT_TYPES.SOFTWARE_ENGINEERING.toString());
        expect(response.body).toHaveProperty('project_type_name', 'Software Engineering');
    });

    // Setup: Create a Product Design project
    it('should create a Product Design project', async () => {
        const response = await request(app.getHttpServer())
            .post('/project/new')
            .set('Authorization', 'Bearer valid-token')
            .send({
                name: 'Product Design Comparison',
                project_type_id: PROJECT_TYPES.PRODUCT_DESIGN
            })
            .expect(201);

        expect(response.body).toHaveProperty('project_id');
        productDesignProjectId = response.body.project_id;
        expect(response.body).toHaveProperty('project_type_id', PROJECT_TYPES.PRODUCT_DESIGN.toString());
        expect(response.body).toHaveProperty('project_type_name', 'Product Design');
    });

    // Compare project details to verify different phases
    it('should have different phases for different project types', async () => {
        // Get Software Engineering project details
        const softwareResponse = await request(app.getHttpServer())
            .get(`/project/${softwareProjectId}`)
            .set('Authorization', 'Bearer valid-token')
            .expect(200);

        // Get Product Design project details
        const productDesignResponse = await request(app.getHttpServer())
            .get(`/project/${productDesignProjectId}`)
            .set('Authorization', 'Bearer valid-token')
            .expect(200);

        // Extract phase names from both projects
        const softwarePhases = softwareResponse.body.phases.map((phase: any) => phase.name);
        const productDesignPhases = productDesignResponse.body.phases.map((phase: any) => phase.name);

        // Software Engineering should have Requirements and Design phases
        expect(softwarePhases).toContain('Requirements');
        expect(softwarePhases).toContain('Design');

        // Product Design should have Research and Concept phases
        expect(productDesignPhases).toContain('Research');
        expect(productDesignPhases).toContain('Concept');

        // Verify phases are different between project types
        expect(softwarePhases).not.toEqual(productDesignPhases);

        console.log('\nProject Type Comparison:');
        console.log(`Software Engineering Phases: ${softwarePhases.join(', ')}`);
        console.log(`Product Design Phases: ${productDesignPhases.join(', ')}`);
    });

    it('should debug artifact types', async () => {
        // Get direct database access
        const prismaService = app.get(PrismaService);

        // Query the database directly
        const dbTypes = await prismaService.artifactType.findMany({
            include: { lifecyclePhase: { include: { projectType: true } } }
        });

        console.log('DB Artifact Types:',
            dbTypes.map(t => ({
                id: t.id,
                name: t.name,
                phase: t.lifecyclePhase.name,
                projectType: t.lifecyclePhase.projectType.name
            }))
        );

        // Check what's in the cache
        const cacheService = app.get(CacheService);
        // Assuming a method that dumps the cached artifact types
        console.log('Expected Vision Doc:', SOFTWARE_ARTIFACT_TYPES.VISION_DOCUMENT);
        console.log('Expected User Research:', PRODUCT_DESIGN_ARTIFACT_TYPES.USER_RESEARCH);

        // Try to get these types directly
        const visionType = await cacheService.getArtifactTypeInfo(SOFTWARE_ARTIFACT_TYPES.VISION_DOCUMENT);
        const researchType = await cacheService.getArtifactTypeInfo(PRODUCT_DESIGN_ARTIFACT_TYPES.USER_RESEARCH);

        console.log('Vision Type in Cache:', visionType);
        console.log('Research Type in Cache:', researchType);
    });

    // Create a Vision Document in Software Engineering project
    it('should create a Vision Document in Software Engineering project', async () => {
        console.log(`Creating artifact with type: ${SOFTWARE_ARTIFACT_TYPES.VISION_DOCUMENT}`);
        console.log(`Software Project ID: ${softwareProjectId}`);

        const response = await request(app.getHttpServer())
            .post('/artifact/new')
            .set('Authorization', 'Bearer valid-token')
            .send({
                project_id: softwareProjectId,
                artifact_type_name: SOFTWARE_ARTIFACT_TYPES.VISION_DOCUMENT,
            })
            .expect(201);

        expect(response.body).toHaveProperty('artifact');
        expect(response.body.artifact).toHaveProperty('artifact_id');
        softwareArtifactId = response.body.artifact.artifact_id;
        expect(response.body.artifact).toHaveProperty('artifact_type_name', SOFTWARE_ARTIFACT_TYPES.VISION_DOCUMENT);
        expect(response.body.artifact).toHaveProperty('project_type_id', PROJECT_TYPES.SOFTWARE_ENGINEERING.toString());
    });

    // Create a User Research artifact in Product Design project
    it('should create a User Research artifact in Product Design project', async () => {
        console.log(`Creating artifact with type: ${PRODUCT_DESIGN_ARTIFACT_TYPES.USER_RESEARCH}`);

        const response = await request(app.getHttpServer())
            .post('/artifact/new')
            .set('Authorization', 'Bearer valid-token')
            .send({
                project_id: productDesignProjectId,
                artifact_type_name: PRODUCT_DESIGN_ARTIFACT_TYPES.USER_RESEARCH,
            })
            .expect(201);

        expect(response.body).toHaveProperty('artifact');
        expect(response.body.artifact).toHaveProperty('artifact_id');
        productDesignArtifactId = response.body.artifact.artifact_id;
        expect(response.body.artifact).toHaveProperty('artifact_type_name', PRODUCT_DESIGN_ARTIFACT_TYPES.USER_RESEARCH);
        expect(response.body.artifact).toHaveProperty('project_type_id', PROJECT_TYPES.PRODUCT_DESIGN.toString());
    });

    // Test cross-validation between project types
    it('should validate project type constraints', async () => {
        // Try to create a Software Engineering artifact in a Product Design project
        const softwareInDesignResponse = await request(app.getHttpServer())
            .post('/artifact/new')
            .set('Authorization', 'Bearer valid-token')
            .send({
                project_id: productDesignProjectId,
                artifact_type_name: SOFTWARE_ARTIFACT_TYPES.VISION_DOCUMENT,
            })
            .expect(400);

        // Try to create a Product Design artifact in a Software Engineering project
        const designInSoftwareResponse = await request(app.getHttpServer())
            .post('/artifact/new')
            .set('Authorization', 'Bearer valid-token')
            .send({
                project_id: softwareProjectId,
                artifact_type_name: PRODUCT_DESIGN_ARTIFACT_TYPES.USER_RESEARCH,
            })
            .expect(400);

        // Check for appropriate error messages
        expect(softwareInDesignResponse.body).toHaveProperty('message');
        expect(designInSoftwareResponse.body).toHaveProperty('message');

        // Expect the error messages to mention the project type constraint
        const softwareError = softwareInDesignResponse.body.message;
        const designError = designInSoftwareResponse.body.message;

        // More flexibly test the error message format
        expect(
            softwareError.includes('not valid for project type') ||
            softwareError.includes('not allowed in this project type')
        ).toBe(true);

        expect(
            designError.includes('not valid for project type') ||
            designError.includes('not allowed in this project type')
        ).toBe(true);
    });

    // Compare AI responses for both project types
    it('should provide different guidance for different project types', async () => {
        // First, get a response for Software Engineering artifact
        const softwareResponse = await request(app.getHttpServer())
            .put(`/artifact/${softwareArtifactId}/ai`)
            .set('Authorization', 'Bearer valid-token')
            .send({
                messages: [
                    {
                        role: 'user',
                        content: 'What should I include in this document?'
                    }
                ]
            })
            .expect(200);

        // Then, get a response for Product Design artifact
        const productDesignResponse = await request(app.getHttpServer())
            .put(`/artifact/${productDesignArtifactId}/ai`)
            .set('Authorization', 'Bearer valid-token')
            .send({
                messages: [
                    {
                        role: 'user',
                        content: 'What should I include in this document?'
                    }
                ]
            })
            .expect(200);

        // Extract AI messages from both responses
        const softwareMessage = softwareResponse.body.chat_completion.messages[0]?.content || '';
        const productDesignMessage = productDesignResponse.body.chat_completion.messages[0]?.content || '';

        // Verify the responses are different
        expect(softwareMessage).not.toEqual(productDesignMessage);

        // Software response should mention software-specific terms
        const softwareTerms = ['vision', 'software', 'features', 'requirements', 'stakeholders'];
        const softwareMatches = softwareTerms.some(term =>
            softwareMessage.toLowerCase().includes(term)
        );

        // Product Design response should mention design-specific terms  
        const designTerms = ['research', 'user', 'design', 'personas', 'interview'];
        const designMatches = designTerms.some(term =>
            productDesignMessage.toLowerCase().includes(term)
        );

        // Verify each response contains terminology appropriate to its project type
        expect(softwareMatches).toBe(true);
        expect(designMatches).toBe(true);
    });
});