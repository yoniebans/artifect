// test/artifact-interactions.e2e-spec.ts

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
 * E2E test for artifact interactions
 * 
 * This test uses the actual AI providers and services,
 * testing the complete system end-to-end with real dependencies.
 */
describe('Artifact Interactions (e2e)', () => {
  let app: INestApplication;
  let projectId: string;
  let artifactId: string;
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

  it('should create a project', async () => {
    const response = await request(app.getHttpServer())
      .post('/project/new')
      .set('Authorization', 'Bearer valid-token')  // The token doesn't matter as we're mocking auth
      .send({ name: 'Test Project for Artifact Interactions' })
      .expect(201);

    expect(response.body).toHaveProperty('project_id');
    projectId = response.body.project_id;

    // Verify project type info
    expect(response.body).toHaveProperty('project_type_id');
    expect(response.body).toHaveProperty('project_type_name', 'Software Engineering');
  });

  it('should create a new artifact', async () => {
    const response = await request(app.getHttpServer())
      .post('/artifact/new')
      .set('Authorization', 'Bearer valid-token')
      .send({
        project_id: projectId,
        artifact_type_name: 'Vision Document',
      })
      .expect(201);

    expect(response.body).toHaveProperty('artifact');
    expect(response.body.artifact).toHaveProperty('artifact_id');
    expect(response.body.chat_completion).toHaveProperty('messages');

    // Verify artifact has project type info
    expect(response.body.artifact).toHaveProperty('project_type_id');
    expect(response.body.artifact).toHaveProperty('project_type_name', 'Software Engineering');

    // The initial response should have an assistant message with commentary
    expect(response.body.chat_completion.messages.length).toBeGreaterThan(0);

    artifactId = response.body.artifact.artifact_id;
  });

  // Testing information gathering phase
  it('should allow AI to respond with only commentary when gathering information', async () => {
    const response = await request(app.getHttpServer())
      .put(`/artifact/${artifactId}/ai`)
      .set('Authorization', 'Bearer valid-token')
      .send({
        messages: [
          {
            role: 'user',
            content: 'I need help figuring out what to include in this vision document.'
          }
        ]
      })
      .expect(200);

    expect(response.body).toHaveProperty('artifact');
    expect(response.body).toHaveProperty('chat_completion');
    expect(response.body.chat_completion).toHaveProperty('messages');

    // Check project type info in response
    expect(response.body.artifact).toHaveProperty('project_type_id');
    expect(response.body.artifact).toHaveProperty('project_type_name', 'Software Engineering');

    // Verify that the response contains a new assistant message
    expect(response.body.chat_completion.messages.length).toBeGreaterThan(0);
  });

  // Testing content generation phase
  it('should update artifact with content after receiving sufficient information', async () => {
    const response = await request(app.getHttpServer())
      .put(`/artifact/${artifactId}/ai`)
      .set('Authorization', 'Bearer valid-token')
      .send({
        messages: [
          {
            role: 'user',
            content: 'Let\'s create a vision document for a project management system. It should include user tracking, task management, and reporting features. The target audience is enterprise teams, and the key objective is to improve collaboration and productivity.'
          }
        ]
      })
      .expect(200);

    expect(response.body.artifact).toHaveProperty('artifact_version_content');
    // Note: With real AI, content may vary - we can only check the response structure

    // Check project type info
    expect(response.body.artifact).toHaveProperty('project_type_id');
    expect(response.body.artifact).toHaveProperty('project_type_name', 'Software Engineering');
  });

  // Testing follow-up questions after content exists
  it('should handle follow-up questions after content exists', async () => {
    const response = await request(app.getHttpServer())
      .put(`/artifact/${artifactId}/ai`)
      .set('Authorization', 'Bearer valid-token')
      .send({
        messages: [
          {
            role: 'user',
            content: 'Do you have any suggestions for improving this vision document?'
          }
        ]
      })
      .expect(200);

    // Verify we got a response without error
    expect(response.body).toHaveProperty('chat_completion');
    expect(response.body.chat_completion).toHaveProperty('messages');
    expect(response.body.chat_completion.messages.length).toBeGreaterThan(0);

    // Check project type info
    expect(response.body.artifact).toHaveProperty('project_type_id');
    expect(response.body.artifact).toHaveProperty('project_type_name', 'Software Engineering');
  });

  // Additional tests for project type specific artifacts
  describe('Project Type Specific Artifacts', () => {
    let productDesignProjectId: string;
    let userResearchArtifactId: string;

    // Test creating a product design project
    it('should create a Product Design project', async () => {
      const response = await request(app.getHttpServer())
        .post('/project/new')
        .set('Authorization', 'Bearer valid-token')
        .send({
          name: 'Test Product Design for Artifacts',
          project_type_id: 2 // Product Design
        })
        .expect(201);

      expect(response.body).toHaveProperty('project_id');
      productDesignProjectId = response.body.project_id;
      expect(response.body).toHaveProperty('project_type_id', '2');
      expect(response.body).toHaveProperty('project_type_name', 'Product Design');
    });

    // Test creating a Product Design specific artifact
    it('should create a User Research artifact for Product Design project', async () => {
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
      userResearchArtifactId = response.body.artifact.artifact_id;

      // Verify artifact has correct project type info
      expect(response.body.artifact).toHaveProperty('artifact_type_name', 'User Research');
      expect(response.body.artifact).toHaveProperty('project_type_id', '2');
      expect(response.body.artifact).toHaveProperty('project_type_name', 'Product Design');
    });

    // Test that project type validation prevents invalid artifact creation
    it('should reject creating Vision Document in Product Design project', async () => {
      await request(app.getHttpServer())
        .post('/artifact/new')
        .set('Authorization', 'Bearer valid-token')
        .send({
          project_id: productDesignProjectId,
          artifact_type_name: 'Vision Document', // Software Engineering artifact
        })
        .expect(400); // Should be rejected with 400 Bad Request
    });

    // Test that information gathering works for Product Design artifacts
    it('should allow AI to respond for Product Design artifact', async () => {
      const response = await request(app.getHttpServer())
        .put(`/artifact/${userResearchArtifactId}/ai`)
        .set('Authorization', 'Bearer valid-token')
        .send({
          messages: [
            {
              role: 'user',
              content: 'What should I include in a user research document?'
            }
          ]
        })
        .expect(200);

      // The response should include project type information
      expect(response.body).toHaveProperty('artifact');
      expect(response.body).toHaveProperty('chat_completion');
      expect(response.body.artifact).toHaveProperty('project_type_id', '2');
      expect(response.body.artifact).toHaveProperty('project_type_name', 'Product Design');

      // The AI response should mention user research concepts
      const aiMessage = response.body.chat_completion.messages[0]?.content || '';
      expect(aiMessage).toBeTruthy();

      // Look for user research related terms in the AI response
      const researchTerms = ['user', 'research', 'interview', 'persona', 'behavior'];
      const containsResearchTerms = researchTerms.some(term =>
        aiMessage.toLowerCase().includes(term)
      );
      expect(containsResearchTerms).toBe(true);
    });
  });
});