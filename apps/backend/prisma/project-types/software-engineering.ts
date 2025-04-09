// apps/backend/prisma/project-types/software-engineering.ts

import { PrismaClient, ProjectType } from '@prisma/client';

/**
 * Script to seed the Software Engineering project type in the database
 * 
 * This script adds:
 * 1. The Software Engineering project type
 * 2. Lifecycle phases for Software Engineering
 * 3. Artifact types for each phase
 * 4. Dependencies between artifact types
 */
export async function seedSoftwareEngineering(prisma: PrismaClient): Promise<ProjectType> {
    console.log('Seeding Software Engineering project type...');

    // Check if the project type already exists
    const existingType = await prisma.projectType.findFirst({
        where: { name: 'Software Engineering' }
    });

    if (existingType) {
        console.log('Software Engineering project type already exists with ID:', existingType.id);
        return existingType;
    }

    // Create Software Engineering project type
    const softwareEngineeringType = await prisma.projectType.create({
        data: {
            name: 'Software Engineering',
            description: 'Traditional software engineering lifecycle with Requirements and Design phases',
            isActive: true
        }
    });

    console.log(`Created Software Engineering project type with ID: ${softwareEngineeringType.id}`);

    // Create lifecycle phases
    const requirementsPhase = await prisma.lifecyclePhase.create({
        data: {
            name: 'Requirements',
            order: 1,
            projectTypeId: softwareEngineeringType.id
        }
    });

    const designPhase = await prisma.lifecyclePhase.create({
        data: {
            name: 'Design',
            order: 2,
            projectTypeId: softwareEngineeringType.id
        }
    });

    console.log(`Created Requirements phase with ID: ${requirementsPhase.id}`);
    console.log(`Created Design phase with ID: ${designPhase.id}`);

    // Create artifact types
    // Requirements phase artifacts
    const visionType = await prisma.artifactType.create({
        data: {
            name: 'Vision Document',
            slug: 'vision',
            syntax: 'md',
            lifecyclePhaseId: requirementsPhase.id
        }
    });

    const functionalReqsType = await prisma.artifactType.create({
        data: {
            name: 'Functional Requirements',
            slug: 'functional-requirements',
            syntax: 'md',
            lifecyclePhaseId: requirementsPhase.id
        }
    });

    const nonFunctionalReqsType = await prisma.artifactType.create({
        data: {
            name: 'Non-Functional Requirements',
            slug: 'non-functional-requirements',
            syntax: 'md',
            lifecyclePhaseId: requirementsPhase.id
        }
    });

    const useCasesType = await prisma.artifactType.create({
        data: {
            name: 'Use Cases',
            slug: 'use-cases',
            syntax: 'md',
            lifecyclePhaseId: requirementsPhase.id
        }
    });

    // Design phase artifacts
    const c4ContextType = await prisma.artifactType.create({
        data: {
            name: 'C4 Context Diagram',
            slug: 'c4-context',
            syntax: 'mermaid',
            lifecyclePhaseId: designPhase.id
        }
    });

    const c4ContainerType = await prisma.artifactType.create({
        data: {
            name: 'C4 Container Diagram',
            slug: 'c4-container',
            syntax: 'mermaid',
            lifecyclePhaseId: designPhase.id
        }
    });

    const c4ComponentType = await prisma.artifactType.create({
        data: {
            name: 'C4 Component Diagram',
            slug: 'c4-component',
            syntax: 'mermaid',
            lifecyclePhaseId: designPhase.id
        }
    });

    console.log('Created Software Engineering artifact types');

    // Create dependencies
    // Define the dependencies based on artifact type IDs
    await prisma.typeDependency.create({
        data: {
            dependentTypeId: functionalReqsType.id,
            dependencyTypeId: visionType.id
        }
    });

    await prisma.typeDependency.create({
        data: {
            dependentTypeId: nonFunctionalReqsType.id,
            dependencyTypeId: functionalReqsType.id
        }
    });

    await prisma.typeDependency.create({
        data: {
            dependentTypeId: useCasesType.id,
            dependencyTypeId: nonFunctionalReqsType.id
        }
    });

    await prisma.typeDependency.create({
        data: {
            dependentTypeId: c4ContextType.id,
            dependencyTypeId: useCasesType.id
        }
    });

    await prisma.typeDependency.create({
        data: {
            dependentTypeId: c4ContainerType.id,
            dependencyTypeId: c4ContextType.id
        }
    });

    await prisma.typeDependency.create({
        data: {
            dependentTypeId: c4ComponentType.id,
            dependencyTypeId: c4ContainerType.id
        }
    });

    console.log('Created Software Engineering type dependencies');

    return softwareEngineeringType;
}