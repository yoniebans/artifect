// src/app.module.spec.ts
import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from './database/prisma.service';
import { AppService } from './app.service';
import { HealthController } from './api/controllers/health.controller';

describe('AppModule', () => {
    it('should compile the module', async () => {
        const module = await Test.createTestingModule({
            controllers: [HealthController],
            providers: [
                AppService,
                PrismaService,
                ConfigService
            ],
        }).compile();

        expect(module).toBeDefined();
    });

    it('should provide ConfigService', async () => {
        const module = await Test.createTestingModule({
            controllers: [HealthController],
            providers: [
                AppService,
                PrismaService,
                ConfigService
            ],
        }).compile();

        const configService = module.get<ConfigService>(ConfigService);
        expect(configService).toBeDefined();
    });

    it('should provide PrismaService', async () => {
        const module = await Test.createTestingModule({
            controllers: [HealthController],
            providers: [
                AppService,
                PrismaService,
                ConfigService
            ],
        }).compile();

        const prismaService = module.get<PrismaService>(PrismaService);
        expect(prismaService).toBeDefined();
    });
});