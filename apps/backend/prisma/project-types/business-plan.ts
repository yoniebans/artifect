// apps/backend/prisma/project-types/business-plan.ts

import { PrismaClient, ProjectType } from '@prisma/client';

/**
 * Script to seed the Business Plan project type in the database
 * 
 * This script adds:
 * 1. The Business Plan project type
 * 2. Lifecycle phases for Business Plan
 * 3. Artifact types for each phase
 * 4. Dependencies between artifact types
 */
export async function seedBusinessPlan(prisma: PrismaClient): Promise<ProjectType> {
    console.log('Seeding Business Plan project type...');

    // Check if the project type already exists
    const existingType = await prisma.projectType.findFirst({
        where: { name: 'Business Plan' }
    });

    if (existingType) {
        console.log('Business Plan project type already exists with ID:', existingType.id);
        return existingType;
    }

    // Create Business Plan project type
    const businessPlanType = await prisma.projectType.create({
        data: {
            name: 'Business Plan',
            description: 'A comprehensive business plan for startups and new ventures',
            isActive: true
        }
    });

    console.log(`Created Business Plan project type with ID: ${businessPlanType.id}`);

    // Create lifecycle phases
    const strategyPhase = await prisma.lifecyclePhase.create({
        data: {
            name: 'Strategy',
            order: 1,
            projectTypeId: businessPlanType.id
        }
    });

    const planningPhase = await prisma.lifecyclePhase.create({
        data: {
            name: 'Planning',
            order: 2,
            projectTypeId: businessPlanType.id
        }
    });

    const financialPhase = await prisma.lifecyclePhase.create({
        data: {
            name: 'Financial',
            order: 3,
            projectTypeId: businessPlanType.id
        }
    });

    const legalPhase = await prisma.lifecyclePhase.create({
        data: {
            name: 'Legal',
            order: 4,
            projectTypeId: businessPlanType.id
        }
    });

    const summaryPhase = await prisma.lifecyclePhase.create({
        data: {
            name: 'Summary',
            order: 5,
            projectTypeId: businessPlanType.id
        }
    });

    console.log(`Created Strategy phase with ID: ${strategyPhase.id}`);
    console.log(`Created Planning phase with ID: ${planningPhase.id}`);
    console.log(`Created Financial phase with ID: ${financialPhase.id}`);
    console.log(`Created Legal phase with ID: ${legalPhase.id}`);
    console.log(`Created Summary phase with ID: ${summaryPhase.id}`);

    // Create artifact types for Strategy phase
    const missionVisionType = await prisma.artifactType.create({
        data: {
            name: 'Mission and Vision',
            slug: 'mission-vision',
            syntax: 'md',
            lifecyclePhaseId: strategyPhase.id
        }
    });

    const marketAnalysisType = await prisma.artifactType.create({
        data: {
            name: 'Market Analysis',
            slug: 'market-analysis',
            syntax: 'md',
            lifecyclePhaseId: strategyPhase.id
        }
    });

    // Create artifact types for Planning phase
    const productDescriptionType = await prisma.artifactType.create({
        data: {
            name: 'Product Description',
            slug: 'product-description',
            syntax: 'md',
            lifecyclePhaseId: planningPhase.id
        }
    });

    const managementPlanType = await prisma.artifactType.create({
        data: {
            name: 'Management Plan',
            slug: 'management-plan',
            syntax: 'md',
            lifecyclePhaseId: planningPhase.id
        }
    });

    const operationalPlanType = await prisma.artifactType.create({
        data: {
            name: 'Operational Plan',
            slug: 'operational-plan',
            syntax: 'md',
            lifecyclePhaseId: planningPhase.id
        }
    });

    // Create artifact types for Financial phase
    const marketingStrategyType = await prisma.artifactType.create({
        data: {
            name: 'Marketing Strategy',
            slug: 'marketing-strategy',
            syntax: 'md',
            lifecyclePhaseId: financialPhase.id
        }
    });

    const financialProjectionsType = await prisma.artifactType.create({
        data: {
            name: 'Financial Projections',
            slug: 'financial-projections',
            syntax: 'md',
            lifecyclePhaseId: financialPhase.id
        }
    });

    // Create artifact types for Legal phase
    const legalStructureType = await prisma.artifactType.create({
        data: {
            name: 'Legal Structure',
            slug: 'legal-structure',
            syntax: 'md',
            lifecyclePhaseId: legalPhase.id
        }
    });

    const riskAssessmentType = await prisma.artifactType.create({
        data: {
            name: 'Risk Assessment',
            slug: 'risk-assessment',
            syntax: 'md',
            lifecyclePhaseId: legalPhase.id
        }
    });

    // Create artifact types for Summary phase
    const fundingRequestType = await prisma.artifactType.create({
        data: {
            name: 'Funding Request',
            slug: 'funding-request',
            syntax: 'md',
            lifecyclePhaseId: summaryPhase.id
        }
    });

    const executiveSummaryType = await prisma.artifactType.create({
        data: {
            name: 'Executive Summary',
            slug: 'executive-summary',
            syntax: 'md',
            lifecyclePhaseId: summaryPhase.id
        }
    });

    console.log('Created Business Plan artifact types');

    // Create dependencies between artifact types
    await prisma.typeDependency.create({
        data: {
            dependentTypeId: marketAnalysisType.id,
            dependencyTypeId: missionVisionType.id
        }
    });

    await prisma.typeDependency.create({
        data: {
            dependentTypeId: productDescriptionType.id,
            dependencyTypeId: marketAnalysisType.id
        }
    });

    await prisma.typeDependency.create({
        data: {
            dependentTypeId: managementPlanType.id,
            dependencyTypeId: productDescriptionType.id
        }
    });

    await prisma.typeDependency.create({
        data: {
            dependentTypeId: operationalPlanType.id,
            dependencyTypeId: managementPlanType.id
        }
    });

    await prisma.typeDependency.create({
        data: {
            dependentTypeId: marketingStrategyType.id,
            dependencyTypeId: operationalPlanType.id
        }
    });

    await prisma.typeDependency.create({
        data: {
            dependentTypeId: financialProjectionsType.id,
            dependencyTypeId: marketingStrategyType.id
        }
    });

    await prisma.typeDependency.create({
        data: {
            dependentTypeId: legalStructureType.id,
            dependencyTypeId: financialProjectionsType.id
        }
    });

    await prisma.typeDependency.create({
        data: {
            dependentTypeId: riskAssessmentType.id,
            dependencyTypeId: legalStructureType.id
        }
    });

    await prisma.typeDependency.create({
        data: {
            dependentTypeId: fundingRequestType.id,
            dependencyTypeId: riskAssessmentType.id
        }
    });

    await prisma.typeDependency.create({
        data: {
            dependentTypeId: executiveSummaryType.id,
            dependencyTypeId: fundingRequestType.id
        }
    });

    console.log('Created Business Plan type dependencies');

    return businessPlanType;
}