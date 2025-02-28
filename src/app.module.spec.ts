import { Test } from '@nestjs/testing';
import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from './database/prisma.service';

describe('AppModule', () => {
    it('should compile the module', async () => {
        const module = await Test.createTestingModule({
            imports: [AppModule],
        }).compile();

        expect(module).toBeDefined();
    });

    it('should provide ConfigService', async () => {
        const module = await Test.createTestingModule({
            imports: [AppModule],
        }).compile();

        const configService = module.get<ConfigService>(ConfigService);
        expect(configService).toBeDefined();
    });

    it('should provide PrismaService', async () => {
        const module = await Test.createTestingModule({
            imports: [AppModule],
        }).compile();

        const prismaService = module.get<PrismaService>(PrismaService);
        expect(prismaService).toBeDefined();
    });
});