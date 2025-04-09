import { PrismaClient, LifecyclePhase, ArtifactState, ArtifactType, ProjectType } from '@prisma/client';
import { seedSoftwareEngineering } from './project-types/software-engineering';
import { seedProductDesign } from './project-types/product-design';

const prisma = new PrismaClient();

async function seedArtifactStates(): Promise<ArtifactState[]> {
  const states = [
    { name: 'To Do' },
    { name: 'In Progress' },
    { name: 'Approved' },
  ];

  // First, clear existing states to avoid conflicts
  await prisma.artifactState.deleteMany({});

  // Create states
  const createdStates: ArtifactState[] = [];
  for (const state of states) {
    const createdState = await prisma.artifactState.create({
      data: state
    });
    createdStates.push(createdState);
  }

  console.log('Artifact states seeded');
  return createdStates;
}

async function seedStateTransitions(states: ArtifactState[]): Promise<any[]> {
  // First, clear existing transitions to avoid conflicts
  await prisma.stateTransition.deleteMany({});

  // Define the transitions based on state IDs
  // This assumes the states are created in the order: To Do (1), In Progress (2), Approved (3)
  const toDoState = states.find(s => s.name === 'To Do');
  const inProgressState = states.find(s => s.name === 'In Progress');
  const approvedState = states.find(s => s.name === 'Approved');

  if (!toDoState || !inProgressState || !approvedState) {
    throw new Error('One or more required states not found');
  }

  console.log('State IDs:', {
    'To Do': toDoState.id,
    'In Progress': inProgressState.id,
    'Approved': approvedState.id
  });

  const transitions = [
    { fromStateId: toDoState.id, toStateId: inProgressState.id },
    { fromStateId: inProgressState.id, toStateId: approvedState.id },
    { fromStateId: approvedState.id, toStateId: inProgressState.id }
  ];

  // Create transitions
  const createdTransitions = [];
  for (const transition of transitions) {
    console.log(`Creating transition: from ${transition.fromStateId} to ${transition.toStateId}`);
    const createdTransition = await prisma.stateTransition.create({
      data: transition
    });
    createdTransitions.push(createdTransition);
  }

  console.log('State transitions seeded:', createdTransitions.length);
  return createdTransitions;
}

async function main(): Promise<void> {
  try {
    console.log('Start seeding...');

    // Make sure to delete data in the correct order to avoid foreign key conflicts
    await prisma.typeDependency.deleteMany({});
    await prisma.summaryVersion.deleteMany({});
    await prisma.reasoningPoint.deleteMany({});
    await prisma.reasoningSummary.deleteMany({});
    await prisma.artifactInteraction.deleteMany({});
    await prisma.artifactVersion.deleteMany({});
    await prisma.artifact.deleteMany({});
    await prisma.stateTransition.deleteMany({});
    await prisma.artifactType.deleteMany({});
    await prisma.artifactState.deleteMany({});
    await prisma.lifecyclePhase.deleteMany({});
    await prisma.project.deleteMany({});
    await prisma.projectType.deleteMany({}); 
    await prisma.user.deleteMany({});

    // Seed artifact states and transitions (shared across all project types)
    const states = await seedArtifactStates();
    await seedStateTransitions(states);
    
    // Seed project types from separate files
    await seedSoftwareEngineering(prisma);
    await seedProductDesign(prisma);

    console.log('Seeding finished');
  } catch (error) {
    console.error('Seeding error:', error);
    process.exit(1);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });