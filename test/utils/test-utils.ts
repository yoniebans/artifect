// test/utils/test-utils.ts

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppModule } from '../../src/app.module';
import { PrismaService } from '../../src/database/prisma.service';
import { HttpExceptionFilter } from '../../src/api/filters/http-exception.filter';
import { WorkflowOrchestratorModule } from '../../src/workflow/workflow-orchestrator.module';
import { ApiModule } from '../../src/api/api.module';
import { HealthController } from '../../src/api/controllers/health.controller';
import { ProjectController } from '../../src/api/controllers/project.controller';
import { ArtifactController } from '../../src/api/controllers/artifact.controller';
import { AIProviderController } from '../../src/api/controllers/ai-provider.controller';
import { StreamingController } from '../../src/api/controllers/streaming.controller';
import { AppService } from '../../src/app.service';
import { SSEService } from '../../src/api/services/sse.service';

/**
 * Set up the test application with all the necessary configurations
 * @returns The configured app and prisma service
 */
export async function setupTestApp(): Promise<{
    app: INestApplication;
    prisma: PrismaService;
}> {
    // Create test module with specific controllers and providers
    const moduleFixture: TestingModule = await Test.createTestingModule({
        imports: [
            ConfigModule.forRoot({ isGlobal: true }),
            WorkflowOrchestratorModule,
        ],
        controllers: [
            HealthController,
            ProjectController,
            ArtifactController,
            AIProviderController,
            StreamingController,
        ],
        providers: [
            PrismaService,
            AppService,
            SSEService,
        ],
    }).compile();

    // Create app instance
    const app = moduleFixture.createNestApplication();

    // Get the PrismaService instance
    const prisma = app.get<PrismaService>(PrismaService);

    // Set up global pipes and filters
    app.useGlobalPipes(
        new ValidationPipe({
            transform: true,
            whitelist: true,
            forbidNonWhitelisted: true,
        }),
    );
    app.useGlobalFilters(new HttpExceptionFilter());

    // Enable CORS
    app.enableCors();

    // Initialize app
    await app.init();

    // Create a mock cleaner function if the real one isn't available
    if (!prisma.cleanDatabase) {
        prisma.cleanDatabase = async (): Promise<unknown[] | undefined> => {
            console.log('Mock database cleaning called - no actual cleanup performed');
            return Promise.resolve([]);
        };
    }

    return { app, prisma };
}

/**
 * Measure the response time of a request
 * @param requestFn Function that makes the request
 * @returns The response time in milliseconds
 */
export async function measureResponseTime(requestFn: () => Promise<any>): Promise<number> {
    const start = Date.now();
    await requestFn();
    return Date.now() - start;
}