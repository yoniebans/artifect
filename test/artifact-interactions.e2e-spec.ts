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
  });
});