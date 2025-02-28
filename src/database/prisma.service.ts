import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
    constructor() {
        super({
            log: process.env.NODE_ENV === 'development' ? ['query', 'info', 'warn', 'error'] : ['error'],
        });
    }

    async onModuleInit() {
        await this.$connect();
    }

    async onModuleDestroy() {
        await this.$disconnect();
    }

    async cleanDatabase() {
        if (process.env.NODE_ENV !== 'production') {
            // Define a type for a generic Prisma model
            type PrismaModel = {
                deleteMany: () => Promise<unknown>;
            };

            // Helper method for testing - cleans database
            const modelKeys = Object.keys(this).filter((key) => {
                return !key.startsWith('_') && !key.startsWith('$');
            });

            // Cast this to a dynamic object with PrismaModel values
            const prismaClient = this as unknown as Record<string, PrismaModel>;

            const promises = modelKeys.map((key) => {
                if (prismaClient[key] && typeof prismaClient[key].deleteMany === 'function') {
                    return prismaClient[key].deleteMany();
                }
                return Promise.resolve();
            });

            return Promise.all(promises);
        }
    }
}