import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ProjectRepository } from '../src/repositories/project.repository';
import { ArtifactRepository } from '../src/repositories/artifact.repository';
import { PrismaService } from '../src/database/prisma.service';
import { RepositoriesModule } from '../src/repositories/repositories.module';
import configuration from '../src/config/configuration';
import { CacheService } from '../src/services/cache/cache.service';
import { Artifact, Project } from '@prisma/client';

/**
 * IMPORTANT: This test requires a seeded test database.
 * 
 * Before running:
 * 1. Make sure you have a test database set up
 * 2. Set DATABASE_URL in .env.test to point to your test database
 * 3. Run: NODE_ENV=test npx prisma db push
 * 4. Run: NODE_ENV=test npm run db:seed
 */
describe('Repository E2E Tests', () => {
    let app: INestApplication;
    let prismaService: PrismaService;
    let projectRepository: ProjectRepository;
    let artifactRepository: ArtifactRepository;
    let cacheService: CacheService;

    // Test data
    let testProjectId: number | null = null;
    let testArtifactId: number | null = null;
    const testProjectName = 'E2E Test Project';
    const testArtifactName = 'E2E Test Artifact';

    beforeAll(async () => {
        const moduleFixture: TestingModule = await Test.createTestingModule({
            imports: [
                ConfigModule.forRoot({
                    load: [configuration],
                    isGlobal: true,
                }),
                RepositoriesModule,
            ],
        }).compile();

        app = moduleFixture.createNestApplication();
        await app.init();

        prismaService = app.get<PrismaService>(PrismaService);
        projectRepository = app.get<ProjectRepository>(ProjectRepository);
        artifactRepository = app.get<ArtifactRepository>(ArtifactRepository);
        cacheService = app.get<CacheService>(CacheService);

        // Clean up any test data from previous runs
        await cleanupPreviousTestData();
    });

    afterAll(async () => {
        // Clean up test data created in this test run
        await cleanupTestData();
        await app.close();
    });

    // Helper function to clean up data from previous test runs
    async function cleanupPreviousTestData() {
        try {
            // Look for test data by name
            const previousProject = await prismaService.project.findFirst({
                where: { name: testProjectName },
            });

            if (previousProject) {
                // Find artifacts linked to this project
                const artifacts = await prismaService.artifact.findMany({
                    where: { projectId: previousProject.id },
                });

                // Clean up artifacts first - in the correct order
                for (const artifact of artifacts) {
                    // Delete interactions
                    await prismaService.artifactInteraction.deleteMany({
                        where: { artifactId: artifact.id },
                    });

                    // Delete versions
                    await prismaService.artifactVersion.deleteMany({
                        where: { artifactId: artifact.id },
                    });

                    // Delete the artifact
                    await prismaService.artifact.delete({
                        where: { id: artifact.id },
                    });
                }

                // Delete the project
                await prismaService.project.delete({
                    where: { id: previousProject.id },
                });
            }
        } catch (error) {
            console.log('Error during cleanup of previous test data:', error instanceof Error ? error.message : String(error));
        }
    }

    // Helper function to clean up test data from this run
    async function cleanupTestData() {
        try {
            if (testArtifactId !== null) {
                // Delete versions and interactions first
                await prismaService.artifactInteraction.deleteMany({
                    where: { artifactId: testArtifactId },
                });

                await prismaService.artifactVersion.deleteMany({
                    where: { artifactId: testArtifactId },
                });

                // Then delete the artifact
                await prismaService.artifact.delete({
                    where: { id: testArtifactId },
                }).catch(e => console.log('Error deleting artifact:', e instanceof Error ? e.message : String(e)));

                testArtifactId = null;
            }

            if (testProjectId !== null) {
                await prismaService.project.delete({
                    where: { id: testProjectId },
                }).catch(e => console.log('Error deleting project:', e instanceof Error ? e.message : String(e)));

                testProjectId = null;
            }
        } catch (error) {
            console.log('Error during cleanup:', error instanceof Error ? error.message : String(error));
        }
    }

    describe('ProjectRepository', () => {
        it('should create a project and retrieve it', async () => {
            // Create a test project
            const createdProject = await projectRepository.create({ name: testProjectName });
            testProjectId = createdProject.id;

            expect(createdProject).toBeDefined();
            expect(createdProject.name).toBe(testProjectName);

            // Retrieve the project
            const foundProject = await projectRepository.findById(testProjectId);

            expect(foundProject).toBeDefined();
            if (foundProject) {
                expect(foundProject.id).toBe(testProjectId);
                expect(foundProject.name).toBe(testProjectName);
            }
        });

        it('should update a project', async () => {
            if (!testProjectId) {
                fail('Test project was not created');
                return;
            }

            const updatedName = 'Updated E2E Test Project';
            const updatedProject = await projectRepository.update(testProjectId, { name: updatedName });

            expect(updatedProject).toBeDefined();
            if (updatedProject) {
                expect(updatedProject.name).toBe(updatedName);
            }

            // Verify the update
            const foundProject = await projectRepository.findById(testProjectId);
            if (foundProject) {
                expect(foundProject.name).toBe(updatedName);
            }
        });

        it('should retrieve all projects', async () => {
            if (!testProjectId) {
                fail('Test project was not created');
                return;
            }

            const projects = await projectRepository.findAll();

            expect(projects).toBeDefined();
            expect(Array.isArray(projects)).toBe(true);
            expect(projects.length).toBeGreaterThan(0);
            expect(projects.find(p => p.id === testProjectId)).toBeDefined();
        });
    });

    describe('ArtifactRepository', () => {
        it('should get lifecycle phases', async () => {
            const phases = await artifactRepository.getLifecyclePhases();

            expect(phases).toBeDefined();
            expect(Array.isArray(phases)).toBe(true);
            // The seed script should have created lifecycle phases
            expect(phases.length).toBeGreaterThan(0);

            // Verify seed data exists
            expect(phases.find(p => p.name === 'Requirements')).toBeDefined();
            expect(phases.find(p => p.name === 'Design')).toBeDefined();
        });

        it('should get artifact types', async () => {
            if (!testProjectId) {
                fail('Test project was not created');
                return;
            }

            const types = await artifactRepository.getArtifactTypes();

            expect(types).toBeDefined();
            expect(Array.isArray(types)).toBe(true);
            // The seed script should have created artifact types
            expect(types.length).toBeGreaterThan(0);

            // Verify seed data exists
            const visionType = types.find(t => t.slug === 'vision');
            expect(visionType).toBeDefined();

            // Create an artifact using the Vision Document type
            if (visionType) {
                const createdArtifact = await artifactRepository.create({
                    projectId: testProjectId,
                    artifactTypeId: visionType.id,
                    name: testArtifactName,
                    content: 'Test content'
                });

                testArtifactId = createdArtifact.id;

                expect(createdArtifact).toBeDefined();
                expect(createdArtifact.name).toBe(testArtifactName);
            }
        });

        it('should retrieve artifact by id', async () => {
            // Skip if we couldn't create an artifact in the previous test
            if (!testArtifactId) {
                console.log('Skipping test because no artifact was created');
                return;
            }

            const artifact = await artifactRepository.findById(testArtifactId);

            expect(artifact).toBeDefined();
            if (artifact) {
                expect(artifact.id).toBe(testArtifactId);
                expect(artifact.name).toBe(testArtifactName);
            }
        });

        it('should retrieve artifacts by project ID', async () => {
            // Skip if we couldn't create an artifact or project in the previous test
            if (!testArtifactId || !testProjectId) {
                console.log('Skipping test because no artifact or project was created');
                return;
            }

            const artifacts = await artifactRepository.getArtifactsByProjectId(testProjectId);

            expect(artifacts).toBeDefined();
            expect(Array.isArray(artifacts)).toBe(true);
            expect(artifacts.length).toBeGreaterThan(0);
            expect(artifacts.find(a => a.id === testArtifactId)).toBeDefined();
        });

        it('should update an artifact', async () => {
            // Skip if we couldn't create an artifact in the previous test
            if (!testArtifactId) {
                console.log('Skipping test because no artifact was created');
                return;
            }

            const updatedContent = 'Updated test content';
            const updatedArtifact = await artifactRepository.update(testArtifactId, {
                content: updatedContent
            });

            expect(updatedArtifact).toBeDefined();
            if (updatedArtifact) {
                // Using Prisma's nested include to get the currentVersion
                const artifact = await prismaService.artifact.findUnique({
                    where: { id: testArtifactId },
                    include: { currentVersion: true }
                });

                expect(artifact?.currentVersion).toBeDefined();
                expect(artifact?.currentVersion?.content).toBe(updatedContent);
            }
        });

        it('should get artifact states', async () => {
            const states = await artifactRepository.getArtifactStates();

            expect(states).toBeDefined();
            expect(Array.isArray(states)).toBe(true);
            expect(states.length).toBeGreaterThan(0);

            // Verify seed data exists
            expect(states.find(s => s.name === 'To Do')).toBeDefined();
            expect(states.find(s => s.name === 'In Progress')).toBeDefined();
            expect(states.find(s => s.name === 'Approved')).toBeDefined();
        });
    });
});