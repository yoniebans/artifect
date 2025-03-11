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
import { StateRepository } from '../src/repositories/state.repository';
import { ReasoningRepository } from '../src/repositories/reasoning.repository';
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
    let stateRepository: StateRepository;
    let reasoningRepository: ReasoningRepository;

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
        stateRepository = app.get<StateRepository>(StateRepository);
        reasoningRepository = app.get<ReasoningRepository>(ReasoningRepository);

        // Clean up any test data from previous runs
        // await cleanupPreviousTestData();
    });

    afterAll(async () => {
        try {
            // Only close the app, don't clean the database at the end of each test
            if (app) {
                await app.close();
            }
        } catch (error) {
            console.error('Error during cleanup:', error);
        }
    });

    // afterAll(async () => {
    //     // Clean up test data created in this test run
    //     await cleanupTestData();
    //     await app.close();
    // });

    // async function cleanupTestData() {
    //     try {
    //         // Only attempt to clean up if we have valid IDs
    //         if (testArtifactId !== null) {
    //             // Delete reasoning data first (due to foreign key constraints)
    //             await prismaService.reasoningPoint.deleteMany({
    //                 where: {
    //                     summary: {
    //                         artifactId: testArtifactId
    //                     }
    //                 }
    //             });

    //             await prismaService.summaryVersion.deleteMany({
    //                 where: {
    //                     summary: {
    //                         artifactId: testArtifactId
    //                     }
    //                 }
    //             });

    //             await prismaService.reasoningSummary.deleteMany({
    //                 where: {
    //                     artifactId: testArtifactId
    //                 }
    //             });

    //             // Delete interactions and versions
    //             await prismaService.artifactInteraction.deleteMany({
    //                 where: { artifactId: testArtifactId },
    //             });

    //             await prismaService.artifactVersion.deleteMany({
    //                 where: { artifactId: testArtifactId },
    //             });

    //             // Finally delete the artifact
    //             await prismaService.artifact.delete({
    //                 where: { id: testArtifactId },
    //             }).catch(e => console.log('Error deleting artifact:', e instanceof Error ? e.message : String(e)));

    //             testArtifactId = null;
    //         }

    //         if (testProjectId !== null) {
    //             await prismaService.project.delete({
    //                 where: { id: testProjectId },
    //             }).catch(e => console.log('Error deleting project:', e instanceof Error ? e.message : String(e)));

    //             testProjectId = null;
    //         }
    //     } catch (error) {
    //         console.log('Error during cleanup:', error instanceof Error ? error.message : String(error));
    //     }
    // }

    // async function cleanupPreviousTestData() {
    //     try {
    //         // Look for test data by name
    //         const previousProject = await prismaService.project.findFirst({
    //             where: { name: testProjectName },
    //         });

    //         if (previousProject) {
    //             // Find artifacts linked to this project
    //             const artifacts = await prismaService.artifact.findMany({
    //                 where: { projectId: previousProject.id },
    //             });

    //             // Clean up artifacts first - in the correct order
    //             for (const artifact of artifacts) {
    //                 // Delete reasoning data
    //                 await prismaService.reasoningPoint.deleteMany({
    //                     where: {
    //                         summary: {
    //                             artifactId: artifact.id
    //                         }
    //                     }
    //                 });

    //                 await prismaService.summaryVersion.deleteMany({
    //                     where: {
    //                         summary: {
    //                             artifactId: artifact.id
    //                         }
    //                     }
    //                 });

    //                 await prismaService.reasoningSummary.deleteMany({
    //                     where: { artifactId: artifact.id }
    //                 });

    //                 // Delete interactions
    //                 await prismaService.artifactInteraction.deleteMany({
    //                     where: { artifactId: artifact.id },
    //                 });

    //                 // Delete versions
    //                 await prismaService.artifactVersion.deleteMany({
    //                     where: { artifactId: artifact.id },
    //                 });

    //                 // Delete the artifact
    //                 await prismaService.artifact.delete({
    //                     where: { id: artifact.id },
    //                 });
    //             }

    //             // Delete the project
    //             await prismaService.project.delete({
    //                 where: { id: previousProject.id },
    //             });
    //         }
    //     } catch (error) {
    //         console.log('Error during cleanup of previous test data:', error instanceof Error ? error.message : String(error));
    //     }
    // }

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

    describe('StateRepository', () => {
        it('should get current state of an artifact', async () => {
            if (!testArtifactId) {
                fail('Test artifact was not created');
                return;
            }

            const currentState = await stateRepository.getCurrentState(testArtifactId);
            expect(currentState).toBeDefined();
            // Initially should be "In Progress" from creation
            expect(currentState?.name).toBe('In Progress');
        });

        it('should get available transitions', async () => {
            if (!testArtifactId) {
                fail('Test artifact was not created');
                return;
            }

            // Output state ID for debugging
            const artifact = await prismaService.artifact.findUnique({
                where: { id: testArtifactId },
                select: { stateId: true }
            });

            // Get all transitions for debugging            
            const transitions = await stateRepository.getAvailableTransitions(testArtifactId);

            expect(transitions).toBeDefined();
            expect(Array.isArray(transitions)).toBe(true);

            // Since we know we start in "In Progress", we should have a transition to "Approved"
            const hasApprovedTransition = transitions.some(t => t.name === 'Approved');
            expect(hasApprovedTransition).toBe(true);
        });

        it('should transition artifact state', async () => {
            if (!testArtifactId) {
                fail('Test artifact was not created');
                return;
            }

            // Get the Approved state
            const approvedState = await prismaService.artifactState.findFirst({
                where: { name: 'Approved' }
            });
            expect(approvedState).toBeDefined();

            if (approvedState) {
                // Check if transition exists in database
                const artifact = await prismaService.artifact.findUnique({
                    where: { id: testArtifactId },
                    select: { stateId: true }
                });

                const transitionExists = await prismaService.stateTransition.findFirst({
                    where: {
                        fromStateId: artifact?.stateId,
                        toStateId: approvedState.id
                    }
                });

                // Perform the transition
                const [success, message] = await stateRepository.transitionState(testArtifactId, approvedState.id);

                expect(success).toBe(true);

                // Verify the state changed
                const newState = await stateRepository.getCurrentState(testArtifactId);
                expect(newState?.name).toBe('Approved');
            }
        });
    });

    // Add these variables to the top level of your test file
    let testSummaryId: number | null = null;

    // Then in the ReasoningRepository test block:
    describe('ReasoningRepository', () => {
        it('should create a reasoning summary', async () => {
            if (!testArtifactId) {
                fail('Test artifact was not created');
                return;
            }

            // Get the current version of the artifact
            const artifact = await prismaService.artifact.findUnique({
                where: { id: testArtifactId },
                include: { currentVersion: true }
            });
            expect(artifact?.currentVersion).toBeDefined();

            if (artifact?.currentVersion) {
                const summary = await reasoningRepository.createReasoningSummary(
                    artifact.currentVersion.id,
                    1, // reasoning entry ID (kept for compatibility)
                    'This is a test reasoning summary'
                );

                expect(summary).toBeDefined();
                expect(summary.artifactId).toBe(testArtifactId);
                expect(summary.summary).toBe('This is a test reasoning summary');

                testSummaryId = summary.id;
            }
        });

        it('should create reasoning points', async () => {
            if (!testSummaryId) {
                fail('Test summary was not created');
                return;
            }

            const point = await reasoningRepository.createReasoningPoint(
                testSummaryId,
                'Design Decision',
                'We chose this approach because of performance considerations',
                8 // high importance
            );

            expect(point).toBeDefined();
            expect(point.summaryId).toBe(testSummaryId);
            expect(point.category).toBe('Design Decision');
            expect(point.importanceScore).toBe(8);
        });

        it('should retrieve reasoning points for a summary', async () => {
            if (!testSummaryId) {
                fail('Test summary was not created');
                return;
            }

            const points = await reasoningRepository.getReasoningPoints(testSummaryId);

            expect(points).toBeDefined();
            expect(Array.isArray(points)).toBe(true);
            expect(points.length).toBeGreaterThan(0);
            expect(points[0].category).toBe('Design Decision');
        });

        it('should update a reasoning summary', async () => {
            if (!testSummaryId) {
                fail('Test summary was not created');
                return;
            }

            const updatedSummary = await reasoningRepository.updateReasoningSummary(
                testSummaryId,
                'Updated test reasoning summary'
            );

            expect(updatedSummary).toBeDefined();
            if (updatedSummary) {
                expect(updatedSummary.summary).toBe('Updated test reasoning summary');
            }
        });
    });

    describe('ArtifactRepository Extended', () => {
        it('should create multiple versions of an artifact', async () => {
            if (!testArtifactId) {
                fail('Test artifact was not created');
                return;
            }

            // Create a new version
            const newContent = 'New version content for testing';
            const newVersion = await artifactRepository.createArtifactVersion(testArtifactId, newContent);

            expect(newVersion).toBeDefined();
            expect(newVersion.artifactId).toBe(testArtifactId);
            expect(newVersion.content).toBe(newContent);
            expect(newVersion.versionNumber).toBeGreaterThan(1); // Should be version 2 or higher

            // Get all versions
            const versions = await artifactRepository.getArtifactVersions(testArtifactId);
            expect(versions).toBeDefined();
            expect(Array.isArray(versions)).toBe(true);
            expect(versions.length).toBeGreaterThan(1); // Should have at least 2 versions now

            // Verify the artifact's current version was updated
            const artifact = await artifactRepository.findById(testArtifactId);
            expect(artifact).toBeDefined();
            if (artifact) {
                expect(artifact.currentVersionId).toBe(newVersion.id);
            }
        });

        it('should record and retrieve interaction history', async () => {
            if (!testArtifactId) {
                fail('Test artifact was not created');
                return;
            }

            // Create user interaction
            const userInteraction = await artifactRepository.createInteraction({
                artifactId: testArtifactId,
                role: 'user',
                content: 'Can you explain the design rationale?',
                sequenceNumber: 1
            });

            expect(userInteraction).toBeDefined();
            expect(userInteraction.artifactId).toBe(testArtifactId);
            expect(userInteraction.role).toBe('user');

            // Create assistant interaction
            const assistantInteraction = await artifactRepository.createInteraction({
                artifactId: testArtifactId,
                role: 'assistant',
                content: 'The design emphasizes modularity and extensibility.',
                sequenceNumber: 2
            });

            expect(assistantInteraction).toBeDefined();
            expect(assistantInteraction.role).toBe('assistant');

            // Get interaction history
            const [interactions, nextSequence] = await artifactRepository.getLastInteractions(testArtifactId);

            expect(interactions).toBeDefined();
            expect(Array.isArray(interactions)).toBe(true);
            expect(interactions.length).toBe(2);
            expect(nextSequence).toBe(3); // Next sequence number should be 3
        });
    });

    describe('CacheService Integration', () => {
        it('should initialize and provide type information', async () => {
            // Force reinitialization of cache
            await cacheService.initialize();

            // Test artifact type info retrieval
            const visionTypeInfo = await cacheService.getArtifactTypeInfo('Vision Document');
            expect(visionTypeInfo).toBeDefined();
            if (visionTypeInfo) {
                expect(visionTypeInfo.slug).toBe('vision');
            }

            // Test artifact format retrieval
            const format = await cacheService.getArtifactFormat('vision');
            expect(format).toBeDefined();
            expect(format.startTag).toBe('[VISION]');
            expect(format.syntax).toBe('markdown');
        });

        it('should provide state transition information', async () => {
            // Test state ID lookup
            const inProgressId = await cacheService.getArtifactStateIdByName('In Progress');
            expect(inProgressId).toBeDefined();

            const approvedId = await cacheService.getArtifactStateIdByName('Approved');
            expect(approvedId).toBeDefined();

            // Test transition ID lookup
            if (inProgressId && approvedId) {
                const transitionId = await cacheService.getStateTransitionId('In Progress', 'Approved');
                expect(transitionId).toBeDefined();
            }
        });
    });
});