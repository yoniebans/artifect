// prisma/reset.ts
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function resetDatabase() {
    try {
        console.log('Resetting database...');

        // Delete all data in the correct order to avoid foreign key constraint issues
        console.log('Deleting all data...');
        await prisma.$transaction([
            prisma.typeDependency.deleteMany({}),
            prisma.summaryVersion.deleteMany({}),
            prisma.reasoningPoint.deleteMany({}),
            prisma.reasoningSummary.deleteMany({}),
            prisma.artifactInteraction.deleteMany({}),
            prisma.artifactVersion.deleteMany({}),
            prisma.artifact.deleteMany({}),
            prisma.stateTransition.deleteMany({}),
            prisma.artifactType.deleteMany({}),
            prisma.artifactState.deleteMany({}),
            prisma.lifecyclePhase.deleteMany({}),
            prisma.project.deleteMany({})
        ]);

        // Reset all sequences
        console.log('Resetting sequences...');
        await prisma.$executeRawUnsafe(`
      DO $$
      DECLARE
        r RECORD;
      BEGIN
        FOR r IN (SELECT sequence_name FROM information_schema.sequences WHERE sequence_schema = 'public') LOOP
          EXECUTE 'ALTER SEQUENCE ' || quote_ident(r.sequence_name) || ' RESTART WITH 1;';
        END LOOP;
      END $$;
    `);

        console.log('Database reset complete.');
    } catch (error) {
        console.error('Error resetting database:', error);
        process.exit(1);
    } finally {
        await prisma.$disconnect();
    }
}

resetDatabase();