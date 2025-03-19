import { PrismaClient, LifecyclePhase, ArtifactState, ArtifactType } from '@prisma/client';

const prisma = new PrismaClient();

async function seedLifecyclePhases(): Promise<LifecyclePhase[]> {
  const phases = [
    { name: 'Requirements', order: 1 },
    { name: 'Design', order: 2 },
  ];

  // First, clear existing phases to avoid conflicts
  await prisma.lifecyclePhase.deleteMany({});

  // Create phases
  const createdPhases: LifecyclePhase[] = [];
  for (const phase of phases) {
    const createdPhase = await prisma.lifecyclePhase.create({
      data: phase
    });
    createdPhases.push(createdPhase);
  }

  console.log('Lifecycle phases seeded');
  return createdPhases;
}

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

async function seedArtifactTypes(phases: LifecyclePhase[]): Promise<ArtifactType[]> {
  // Get phase IDs
  const requirementsPhase = phases.find((p: LifecyclePhase) => p.name === 'Requirements');
  const designPhase = phases.find((p: LifecyclePhase) => p.name === 'Design');

  if (!requirementsPhase || !designPhase) {
    throw new Error('Required lifecycle phases not found');
  }

  // First, clear existing types to avoid conflicts
  await prisma.artifactType.deleteMany({});

  const types = [
    { name: 'Vision Document', slug: 'vision', syntax: 'md', lifecyclePhaseId: requirementsPhase.id },
    { name: 'Functional Requirements', slug: 'functional_requirements', syntax: 'md', lifecyclePhaseId: requirementsPhase.id },
    { name: 'Non-Functional Requirements', slug: 'non_functional_requirements', syntax: 'md', lifecyclePhaseId: requirementsPhase.id },
    { name: 'Use Cases', slug: 'use_cases', syntax: 'md', lifecyclePhaseId: requirementsPhase.id },
    { name: 'C4 Context', slug: 'c4_context', syntax: 'mermaid', lifecyclePhaseId: designPhase.id },
    { name: 'C4 Container', slug: 'c4_container', syntax: 'mermaid', lifecyclePhaseId: designPhase.id },
    { name: 'C4 Component', slug: 'c4_component', syntax: 'mermaid', lifecyclePhaseId: designPhase.id },
  ];

  // Create types
  const createdTypes: ArtifactType[] = [];
  for (const type of types) {
    const createdType = await prisma.artifactType.create({
      data: type
    });
    createdTypes.push(createdType);
  }

  console.log('Artifact types seeded');
  return createdTypes;
}

async function seedTypeDependencies(types: ArtifactType[]): Promise<any[]> {
  // First, clear existing dependencies to avoid conflicts
  await prisma.typeDependency.deleteMany({});

  // Find type objects by slug
  const visionDoc = types.find((t: ArtifactType) => t.slug === 'vision');
  const functionalReqs = types.find((t: ArtifactType) => t.slug === 'functional_requirements');
  const nonFunctionalReqs = types.find((t: ArtifactType) => t.slug === 'non_functional_requirements');
  const useCases = types.find((t: ArtifactType) => t.slug === 'use_cases');
  const c4Context = types.find((t: ArtifactType) => t.slug === 'c4_context');
  const c4Container = types.find((t: ArtifactType) => t.slug === 'c4_container');
  const c4Component = types.find((t: ArtifactType) => t.slug === 'c4_component');

  if (!visionDoc || !functionalReqs || !nonFunctionalReqs || !useCases ||
    !c4Context || !c4Container || !c4Component) {
    throw new Error('One or more required artifact types not found');
  }

  const dependencies = [
    { dependentTypeId: functionalReqs.id, dependencyTypeId: visionDoc.id },
    { dependentTypeId: nonFunctionalReqs.id, dependencyTypeId: functionalReqs.id },
    { dependentTypeId: useCases.id, dependencyTypeId: nonFunctionalReqs.id },
    { dependentTypeId: c4Container.id, dependencyTypeId: c4Context.id },
    { dependentTypeId: c4Component.id, dependencyTypeId: c4Container.id },
  ];

  // Create dependencies
  const createdDependencies = [];
  for (const dependency of dependencies) {
    const createdDependency = await prisma.typeDependency.create({
      data: dependency
    });
    createdDependencies.push(createdDependency);
  }

  console.log('Type dependencies seeded');
  return createdDependencies;
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

    // Run seeding functions in the correct order
    const phases = await seedLifecyclePhases();
    const states = await seedArtifactStates();
    await seedStateTransitions(states);
    const types = await seedArtifactTypes(phases);
    await seedTypeDependencies(types);

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