import { Test, TestingModule } from '@nestjs/testing';
import { RepositoriesModule } from './repositories.module';
import { ProjectRepository } from './project.repository';
import { ArtifactRepository } from './artifact.repository';
import { StateRepository } from './state.repository';
import { ReasoningRepository } from './reasoning.repository';
import { ConfigModule } from '@nestjs/config';
import configuration from '../config/configuration';
import { PrismaService } from '../database/prisma.service';

describe('RepositoriesModule Integration', () => {
    let moduleRef: TestingModule;
    let projectRepository: ProjectRepository;
    let artifactRepository: ArtifactRepository;
    let stateRepository: StateRepository;
    let reasoningRepository: ReasoningRepository;
    let prismaService: PrismaService;

    beforeEach(async () => {
        moduleRef = await Test.createTestingModule({
            imports: [
                // Import ConfigModule to provide environment variables
                ConfigModule.forRoot({
                    load: [configuration],
                }),
                RepositoriesModule,
            ],
        }).compile();

        // Get repository instances from the test module
        projectRepository = moduleRef.get<ProjectRepository>(ProjectRepository);
        artifactRepository = moduleRef.get<ArtifactRepository>(ArtifactRepository);
        stateRepository = moduleRef.get<StateRepository>(StateRepository);
        reasoningRepository = moduleRef.get<ReasoningRepository>(ReasoningRepository);
        prismaService = moduleRef.get<PrismaService>(PrismaService);
    });

    afterEach(async () => {
        await moduleRef.close();
    });

    it('should provide ProjectRepository', () => {
        expect(projectRepository).toBeDefined();
    });

    it('should provide ArtifactRepository', () => {
        expect(artifactRepository).toBeDefined();
    });

    it('should provide StateRepository', () => {
        expect(stateRepository).toBeDefined();
    });

    it('should provide ReasoningRepository', () => {
        expect(reasoningRepository).toBeDefined();
    });

    it('should provide PrismaService to repositories', () => {
        expect(prismaService).toBeDefined();
    });

    // Test repository relationships are properly set up
    it('should have CacheService injected in relevant repositories', () => {
        // Using TypeScript's type assertions to access private properties
        // This isn't ideal but works for testing private dependencies

        const artifactRepoCacheService = (artifactRepository as any).cacheService;
        expect(artifactRepoCacheService).toBeDefined();

        const stateRepoCacheService = (stateRepository as any).cacheService;
        expect(stateRepoCacheService).toBeDefined();
    });

    // Add a simple mock test for each repository to ensure basic methods are defined
    it('should have findAll method on ProjectRepository', () => {
        expect(typeof projectRepository.findAll).toBe('function');
    });

    it('should have findById method on ArtifactRepository', () => {
        expect(typeof artifactRepository.findById).toBe('function');
    });

    it('should have getCurrentState method on StateRepository', () => {
        expect(typeof stateRepository.getCurrentState).toBe('function');
    });

    it('should have getReasoningSummary method on ReasoningRepository', () => {
        expect(typeof reasoningRepository.getReasoningSummary).toBe('function');
    });
});