// apps/backend/prisma/project-types/product-design.ts

import { PrismaClient, ProjectType } from '@prisma/client';

/**
 * Script to seed the Product Design project type in the database
 * 
 * This script adds:
 * 1. The Product Design project type
 * 2. Lifecycle phases for Product Design
 * 3. Artifact types for each phase
 * 4. Dependencies between artifact types
 */
export async function seedProductDesign(prisma: PrismaClient): Promise<ProjectType> {
  console.log('Seeding Product Design project type...');

  // Check if the project type already exists
  const existingType = await prisma.projectType.findFirst({
    where: { name: 'Product Design' }
  });

  if (existingType) {
    console.log('Product Design project type already exists with ID:', existingType.id);
    return existingType;
  }

  // Create Product Design project type
  const productDesignType = await prisma.projectType.create({
    data: {
      name: 'Product Design',
      description: 'A project type for designing user-centered products with comprehensive research and prototyping',
      isActive: true
    }
  });

  console.log(`Created Product Design project type with ID: ${productDesignType.id}`);

  // Create lifecycle phases
  const researchPhase = await prisma.lifecyclePhase.create({
    data: {
      name: 'Research',
      order: 1,
      projectTypeId: productDesignType.id
    }
  });

  const conceptPhase = await prisma.lifecyclePhase.create({
    data: {
      name: 'Concept',
      order: 2,
      projectTypeId: productDesignType.id
    }
  });

  const prototypingPhase = await prisma.lifecyclePhase.create({
    data: {
      name: 'Prototyping',
      order: 3,
      projectTypeId: productDesignType.id
    }
  });

  const testingPhase = await prisma.lifecyclePhase.create({
    data: {
      name: 'Testing',
      order: 4,
      projectTypeId: productDesignType.id
    }
  });

  console.log(`Created Research phase with ID: ${researchPhase.id}`);
  console.log(`Created Concept phase with ID: ${conceptPhase.id}`);
  console.log(`Created Prototyping phase with ID: ${prototypingPhase.id}`);
  console.log(`Created Testing phase with ID: ${testingPhase.id}`);

  // Create artifact types
  // Research phase artifacts
  const userResearchType = await prisma.artifactType.create({
    data: {
      name: 'User Research',
      slug: 'user-research',
      syntax: 'md',
      lifecyclePhaseId: researchPhase.id
    }
  });

  const designBriefType = await prisma.artifactType.create({
    data: {
      name: 'Design Brief',
      slug: 'design-brief',
      syntax: 'md',
      lifecyclePhaseId: researchPhase.id
    }
  });

  // Concept phase artifacts
  const wireframesType = await prisma.artifactType.create({
    data: {
      name: 'Wireframes',
      slug: 'wireframes',
      syntax: 'md',
      lifecyclePhaseId: conceptPhase.id
    }
  });

  const mockupsType = await prisma.artifactType.create({
    data: {
      name: 'Mockups',
      slug: 'mockups',
      syntax: 'md',
      lifecyclePhaseId: conceptPhase.id
    }
  });

  // Prototyping phase artifacts
  const interactivePrototypeType = await prisma.artifactType.create({
    data: {
      name: 'Interactive Prototype',
      slug: 'interactive-prototype',
      syntax: 'md',
      lifecyclePhaseId: prototypingPhase.id
    }
  });

  const designSystemType = await prisma.artifactType.create({
    data: {
      name: 'Design System',
      slug: 'design-system',
      syntax: 'md',
      lifecyclePhaseId: prototypingPhase.id
    }
  });

  // Testing phase artifacts
  const usabilityTestPlanType = await prisma.artifactType.create({
    data: {
      name: 'Usability Test Plan',
      slug: 'usability-test-plan',
      syntax: 'md',
      lifecyclePhaseId: testingPhase.id
    }
  });

  const usabilityTestResultsType = await prisma.artifactType.create({
    data: {
      name: 'Usability Test Results',
      slug: 'usability-test-results',
      syntax: 'md',
      lifecyclePhaseId: testingPhase.id
    }
  });

  console.log('Created Product Design artifact types');

  // Create dependencies following the same pattern as Software Engineering
  await prisma.typeDependency.create({
    data: {
      dependentTypeId: designBriefType.id,
      dependencyTypeId: userResearchType.id
    }
  });

  await prisma.typeDependency.create({
    data: {
      dependentTypeId: wireframesType.id,
      dependencyTypeId: designBriefType.id
    }
  });

  await prisma.typeDependency.create({
    data: {
      dependentTypeId: mockupsType.id,
      dependencyTypeId: wireframesType.id
    }
  });

  await prisma.typeDependency.create({
    data: {
      dependentTypeId: interactivePrototypeType.id,
      dependencyTypeId: mockupsType.id
    }
  });

  await prisma.typeDependency.create({
    data: {
      dependentTypeId: designSystemType.id,
      dependencyTypeId: mockupsType.id
    }
  });

  await prisma.typeDependency.create({
    data: {
      dependentTypeId: usabilityTestPlanType.id,
      dependencyTypeId: interactivePrototypeType.id
    }
  });

  await prisma.typeDependency.create({
    data: {
      dependentTypeId: usabilityTestResultsType.id,
      dependencyTypeId: usabilityTestPlanType.id
    }
  });

  console.log('Created Product Design type dependencies');

  return productDesignType;
}