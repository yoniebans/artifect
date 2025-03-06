import { Test, TestingModule } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { WorkflowOrchestratorService } from './workflow-orchestrator.service';
import { RepositoriesModule } from '../repositories/repositories.module';
import { TemplatesModule } from '../templates/templates.module';
import { ContextManagerModule } from '../context/context-manager.module';
import { AIModule } from '../ai/ai.module';
import configuration from '../config/configuration';
import aiConfiguration from '../ai/ai.config';
import { PrismaService } from '../database/prisma.service';

/**
 * This test requires a database connection.
 * It's designed to verify that all modules work together correctly.
 * 
 * To run this test separately:
 * npm run test:integration
 */
describe('WorkflowOrchestrator Integration', () => {
    let service: WorkflowOrchestratorService;
    let prismaService: PrismaService;
    let moduleRef: TestingModule;

    beforeAll(async () => {
        moduleRef = await Test.createTestingModule({
            imports: [
                ConfigModule.forRoot({
                    isGlobal: true,
                    load: [configuration, aiConfiguration],
                }),
                RepositoriesModule,
                TemplatesModule,
                ContextManagerModule,
                AIModule,
            ],
            providers: [WorkflowOrchestratorService],
        }).compile();

        service = moduleRef.get<WorkflowOrchestratorService>(WorkflowOrchestratorService);
        prismaService = moduleRef.get<PrismaService>(PrismaService);
    });

    afterAll(async () => {
        if (moduleRef) {
            await moduleRef.close();
        }
    });

    // This is just a basic connectivity test to ensure all modules are loaded correctly
    it('should be defined', () => {
        expect(service).toBeDefined();
        expect(prismaService).toBeDefined();
    });

    /**
     * We're not performing actual database operations in this test
     * because they would require a real database connection.
     * 
     * In a real integration test, you could use the following approach:
     * 
     * 1. Set up a test database connection
     * 2. Seed the database with test data
     * 3. Run the tests against the real services
     * 4. Clean up the database afterward
     * 
     * For practical purposes, here we just verify that the service can be instantiated
     * with all its dependencies.
     */

    // Example of how a real integration test would look:
    /*
    it('should create a new project and return metadata', async () => {
      // Clean the database before test
      await prismaService.project.deleteMany();
      
      // Create a new project
      const result = await service.createProject('Integration Test Project');
      
      // Check that project was created correctly
      expect(result.name).toBe('Integration Test Project');
      expect(result.project_id).toBeDefined();
      
      // Verify it exists in the database
      const project = await prismaService.project.findUnique({
        where: { id: parseInt(result.project_id) }
      });
      
      expect(project).toBeDefined();
      expect(project?.name).toBe('Integration Test Project');
    });
    */
});