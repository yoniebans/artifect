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
import { TEST_USER_CLERK_ID, TEST_USER_EMAIL, getTestUserFromDb } from './test-utils';
import { User } from '@prisma/client';

/**
 * E2E test for comparing workflows between different project types
 * 
 * This test creates both Software Engineering and Product Design projects,
 * compares their phases and artifact types, and verifies that the correct
 * templates and validation rules are applied to each.
 */
describe('Project Type Comparison (e2e)', () => {
    let app: INestApplication;
    let softwareProjectId: string;
    let productDesignProjectId: string;
    let softwareArtifactId: string;
    let productDesignArtifactId: string;
    let testUser: User;

    // Project type constants
    const SOFTWARE_ENGINEERING_TYPE_ID = 1;
    const PRODUCT_DESIGN_TYPE_ID = 2;

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
                project_type_id: SOFTWARE_ENGINEERING_TYPE_ID
            })
            .expect(201);

        expect(response.body).toHaveProperty('project_id');
        softwareProjectId = response.body.project_id;
        expect(response.body).toHaveProperty('project_type_id', SOFTWARE_ENGINEERING_TYPE_ID.toString());
        expect(response.body).toHaveProperty('project_type_name', 'Software Engineering');
    });

    // Setup: Create a Product Design project
    it('should create a Product Design project', async () => {
        const response = await request(app.getHttpServer())
            .post('/project/new')
            .set('Authorization', 'Bearer valid-token')
            .send({ 
                name: 'Product Design Comparison',
                project_type_id: PRODUCT_DESIGN_TYPE_ID
            })
            .expect(201);

        expect(response.body).toHaveProperty('project_id');
        productDesignProjectId = response.body.project_id;
        expect(response.body).toHaveProperty('project_type_id', PRODUCT_DESIGN_TYPE_ID.toString());
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

    // Create a Vision Document in Software Engineering project
    it('should create a Vision Document in Software Engineering project', async () => {
        const response = await request(app.getHttpServer())
            .post('/artifact/new')
            .set('Authorization', 'Bearer valid-token')
            .send({
                project_id: softwareProjectId,
                artifact_type_name: 'Vision Document',
            })
            .expect(201);

        expect(response.body).toHaveProperty('artifact');
        expect(response.body.artifact).toHaveProperty('artifact_id');
        softwareArtifactId = response.body.artifact.artifact_id;
        expect(response.body.artifact).toHaveProperty('artifact_type_name', 'Vision Document');
        expect(response.body.artifact).toHaveProperty('project_type_id', SOFTWARE_ENGINEERING_TYPE_ID.toString());
    });

    // Create a User Research artifact in Product Design project
    it('should create a User Research artifact in Product Design project', async () => {
        const response = await request(app.getHttpServer())
            .post('/artifact/new')
            .set('Authorization', 'Bearer valid-token')
            .send({
                project_id: productDesignProjectId,
                artifact_type_name: 'User Research',
            })
            .expect(201);

        expect(response.body).toHaveProperty('artifact');
        expect(response.body.artifact).toHaveProperty('artifact_id');
        productDesignArtifactId = response.body.artifact.artifact_id;
        expect(response.body.artifact).toHaveProperty('artifact_type_name', 'User Research');
        expect(response.body.artifact).toHaveProperty('project_type_id', PRODUCT_DESIGN_TYPE_ID.toString());
    });

    // Test cross-validation between project types
    it('should validate project type constraints', async () => {
        // Try to create a Software Engineering artifact in a Product Design project
        const softwareInDesignResponse = await request(app.getHttpServer())
            .post('/artifact/new')
            .set('Authorization', 'Bearer valid-token')
            .send({
                project_id: productDesignProjectId,
                artifact_type_name: 'Vision Document', // Software Engineering artifact
            })
            .expect(400);
            
        // Try to create a Product Design artifact in a Software Engineering project
        const designInSoftwareResponse = await request(app.getHttpServer())
            .post('/artifact/new')
            .set('Authorization', 'Bearer valid-token')
            .send({
                project_id: softwareProjectId,
                artifact_type_name: 'User Research', // Product Design artifact
            })
            .expect(400);
            
        // Verify error messages mention project type constraints
        expect(softwareInDesignResponse.body.message).toContain('not allowed in this project type');
        expect(designInSoftwareResponse.body.message).toContain('not allowed in this project type');
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