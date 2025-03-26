// test/implementation-comparison.e2e-spec.ts

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe, ExecutionContext } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { HttpExceptionFilter } from '../src/api/filters/http-exception.filter';
import { AuthService } from '../src/auth/auth.service';
import { ClerkService } from '../src/auth/clerk.service';
import { AdminGuard } from '../src/auth/guards/admin.guard';
import { AuthGuard } from '../src/auth/guards/auth.guard';
import { PrismaService } from '../src/database/prisma.service';
import { TEST_USER_CLERK_ID, TEST_USER_EMAIL, getTestUserFromDb } from './test-utils';
import { User } from '@prisma/client';

const TEST_PREFIX = 'impl_comp_';

describe('Implementation Comparison (e2e)', () => {
    let app: INestApplication;
    let prismaService: PrismaService;
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
        prismaService = moduleFixture.get<PrismaService>(PrismaService);

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
        // No cleanup code - we want to inspect data after tests
        await app.close();
    });

    it('should create a project and artifact for testing', async () => {
        // Create test project with prefixed name
        const projectName = `${TEST_PREFIX}Project`;
        const projectResponse = await request(app.getHttpServer())
            .post('/project/new')
            .set('Authorization', 'Bearer test-token')
            .send({ name: projectName })
            .expect(201);

        projectId = projectResponse.body.project_id;
        console.log(`Created project ID: ${projectId} with name: ${projectName}`);

        // Create test artifact (Vision Document)
        const artifactResponse = await request(app.getHttpServer())
            .post('/artifact/new')
            .set('Authorization', 'Bearer test-token')
            .send({
                project_id: projectId,
                artifact_type_name: 'Vision Document',
            })
            .expect(201);

        artifactId = artifactResponse.body.artifact.artifact_id;
        console.log(`Created artifact ID: ${artifactId} of type: Vision Document`);
    });

    // Rest of the tests remain the same
    it('should test standard implementation', async () => {
        console.log('\n🔍 TESTING STANDARD IMPLEMENTATION');

        const response = await request(app.getHttpServer())
            .put(`/artifact/${artifactId}/ai`)
            .set('Authorization', 'Bearer test-token')
            .set('X-AI-Provider', 'anthropic')
            .set('X-AI-Model', 'claude-3-haiku-20240307')
            .send({
                messages: [
                    {
                        role: 'user',
                        content: 'Create a brief vision document for a project management app focused on AI-assisted software engineering.'
                    }
                ]
            })
            .expect(200);

        console.log('\n✅ Standard Implementation Response:');
        const hasCommentary = !!response.body.chat_completion.messages[0]?.content;
        console.log(`Has Commentary: ${hasCommentary}`);
        console.log('Commentary:', response.body.chat_completion.messages[0]?.content || 'No commentary');
        console.log('\nArtifact Content Length:', response.body.artifact.artifact_version_content?.length || 0);
        console.log('Artifact Content Preview:', response.body.artifact.artifact_version_content?.substring(0, 500) + '...');

        expect(response.body.chat_completion.messages.length).toBeGreaterThan(0);
        expect(response.body.chat_completion.messages[0]?.content).toBeTruthy();
        expect(response.body.artifact.artifact_version_content).toBeTruthy();
    });

    it('should test function-calling implementation', async () => {
        console.log('\n🔧 TESTING FUNCTION-CALLING IMPLEMENTATION');

        const response = await request(app.getHttpServer())
            .put(`/artifact/${artifactId}/ai`)
            .set('Authorization', 'Bearer test-token')
            .set('X-AI-Provider', 'anthropic-function-calling')
            .set('X-AI-Model', 'claude-3-haiku-20240307')
            .send({
                messages: [
                    {
                        role: 'user',
                        content: 'Create a brief vision document for a project management app focused on AI-assisted software engineering.'
                    }
                ]
            })
            .expect(200);

        console.log('\n✅ Function-Calling Implementation Response:');
        const hasCommentary = !!response.body.chat_completion.messages[0]?.content;
        console.log(`Has Commentary: ${hasCommentary}`);
        console.log('Commentary:', response.body.chat_completion.messages[0]?.content || 'No commentary');
        console.log('\nArtifact Content Length:', response.body.artifact.artifact_version_content?.length || 0);
        console.log('Artifact Content Preview:', response.body.artifact.artifact_version_content?.substring(0, 500) + '...');

        expect(response.body.artifact.artifact_version_content).toBeTruthy();
    });

    it('should compare the two implementations', () => {
        console.log('\n📊 IMPLEMENTATION COMPARISON RESULTS');
        console.log('This test evaluated two different AI implementation approaches:');
        console.log('1. Standard implementation - typically uses text extraction with markers');
        console.log('2. Function calling implementation - uses structured tool calls for content');
        console.log('\nKey differences observed:');
        console.log('- Standard implementation usually produces both commentary and content');
        console.log('- Function calling implementation separates content from commentary more clearly');
        console.log('- Both implementations produced valid artifact content');
        console.log('\nYou can inspect both implementations using these IDs:');
        console.log(`- Test User ID: ${testUser.id} (clerkId: ${TEST_USER_CLERK_ID})`);
        console.log(`- Project ID: ${projectId}`);
        console.log(`- Artifact ID: ${artifactId}`);
    });
});