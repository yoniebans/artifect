// test/implementation-comparison.e2e-spec.ts

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { HttpExceptionFilter } from '../src/api/filters/http-exception.filter';

/**
 * This test creates an artifact and then tests both standard and function-calling
 * implementations to compare their outputs.
 * 
 * Run with: npm run test:e2e -- implementation-comparison
 */
describe('Implementation Comparison (e2e)', () => {
    let app: INestApplication;
    let projectId: string;
    let artifactId: string;

    beforeAll(async () => {
        const moduleFixture: TestingModule = await Test.createTestingModule({
            imports: [AppModule],
        }).compile();

        app = moduleFixture.createNestApplication();

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
        await app.close();
    });

    it('should create a project and artifact for testing', async () => {
        // Create test project
        const projectResponse = await request(app.getHttpServer())
            .post('/project/new')
            .send({ name: 'Implementation Test Project' })
            .expect(201);

        projectId = projectResponse.body.project_id;

        // Create test artifact (Vision Document)
        const artifactResponse = await request(app.getHttpServer())
            .post('/artifact/new')
            .send({
                project_id: projectId,
                artifact_type_name: 'Vision Document',
            })
            .expect(201);

        artifactId = artifactResponse.body.artifact.artifact_id;

        console.log(`Created test artifact: ${artifactId}`);
    });

    it('should test standard implementation', async () => {
        console.log('\n🔍 TESTING STANDARD IMPLEMENTATION');

        const response = await request(app.getHttpServer())
            .put(`/artifact/${artifactId}/ai`)
            .set('X-AI-Provider', 'anthropic') // Use standard implementation
            .set('X-AI-Model', 'claude-3-haiku-20240307') // Faster, cheaper model for testing
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
        console.log('Commentary:', response.body.chat_completion.messages[0]?.content || 'No commentary');
        console.log('\nArtifact Content:', response.body.artifact.artifact_version_content?.substring(0, 500) + '...');
    });

    it('should test function-calling implementation', async () => {
        console.log('\n🔧 TESTING FUNCTION-CALLING IMPLEMENTATION');

        const response = await request(app.getHttpServer())
            .put(`/artifact/${artifactId}/ai`)
            .set('X-AI-Provider', 'anthropic-function-calling') // Use function-calling implementation
            .set('X-AI-Model', 'claude-3-haiku-20240307') // Faster, cheaper model for testing
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
        console.log('Commentary:', response.body.chat_completion.messages[0]?.content || 'No commentary');
        console.log('\nArtifact Content:', response.body.artifact.artifact_version_content?.substring(0, 500) + '...');
    });
});