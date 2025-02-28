import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function seedLifecyclePhases() {
  const phases = [
    { name: 'Requirements', order: 1 },
    { name: 'Design', order: 2 },
  ];
  
  for (const phase of phases) {
    await prisma.lifecyclePhase.upsert({
      where: { id: phases.indexOf(phase) + 1 },
      update: phase,
      create: phase,
    });
  }
  
  console.log('Lifecycle phases seeded');
}

async function seedArtifactStates() {
  const states = [
    { name: 'To Do' },
    { name: 'In Progress' },
    { name: 'Approved' },
  ];
  
  for (const state of states) {
    await prisma.artifactState.upsert({
      where: { id: states.indexOf(state) + 1 },
      update: state,
      create: state,
    });
  }
  
  console.log('Artifact states seeded');
}

async function seedStateTransitions() {
  const transitions = [
    { fromStateId: 1, toStateId: 2 }, // To Do to In Progress
    { fromStateId: 2, toStateId: 3 }, // In Progress to Approved
    { fromStateId: 3, toStateId: 2 }, // Approved to In Progress (creates new version)
  ];
  
  for (const transition of transitions) {
    await prisma.stateTransition.upsert({
      where: { id: transitions.indexOf(transition) + 1 },
      update: transition,
      create: transition,
    });
  }
  
  console.log('State transitions seeded');
}

async function seedArtifactTypes() {
  const types = [
    { name: 'Vision Document', slug: 'vision', syntax: 'markdown', lifecyclePhaseId: 1 },
    { name: 'Functional Requirements', slug: 'functional_requirements', syntax: 'markdown', lifecyclePhaseId: 1 },
    { name: 'Non-Functional Requirements', slug: 'non_functional_requirements', syntax: 'markdown', lifecyclePhaseId: 1 },
    { name: 'Use Cases', slug: 'use_cases', syntax: 'markdown', lifecyclePhaseId: 1 },
    { name: 'C4 Context', slug: 'c4_context', syntax: 'mermaid', lifecyclePhaseId: 2 },
    { name: 'C4 Container', slug: 'c4_container', syntax: 'mermaid', lifecyclePhaseId: 2 },
    { name: 'C4 Component', slug: 'c4_component', syntax: 'mermaid', lifecyclePhaseId: 2 },
  ];
  
  for (const type of types) {
    await prisma.artifactType.upsert({
      where: { id: types.indexOf(type) + 1 },
      update: type,
      create: type,
    });
  }
  
  console.log('Artifact types seeded');
}

async function seedTypeDependencies() {
  const dependencies = [
    { dependentTypeId: 2, dependencyTypeId: 1 }, // Functional Requirements depends on Vision Document
    { dependentTypeId: 3, dependencyTypeId: 2 }, // Non-Functional Requirements depends on Functional Requirements
    { dependentTypeId: 4, dependencyTypeId: 3 }, // Use Cases depends on Non-Functional Requirements
    { dependentTypeId: 5, dependencyTypeId: 4 }, // C4 Context depends on Use Cases
    { dependentTypeId: 6, dependencyTypeId: 5 }, // C4 Container depends on C4 Context
    { dependentTypeId: 7, dependencyTypeId: 6 }, // C4 Component depends on C4 Container
  ];
  
  for (const dependency of dependencies) {
    await prisma.typeDependency.upsert({
      where: {
        dependentTypeId_dependencyTypeId: {
          dependentTypeId: dependency.dependentTypeId,
          dependencyTypeId: dependency.dependencyTypeId,
        },
      },
      update: dependency,
      create: dependency,
    });
  }
  
  console.log('Type dependencies seeded');
}

async function main() {
  console.log('Start seeding...');
  
  await seedLifecyclePhases();
  await seedArtifactStates();
  await seedStateTransitions();
  await seedArtifactTypes();
  await seedTypeDependencies();
  
  console.log('Seeding finished');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });