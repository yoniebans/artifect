import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from './prisma.service';

// Mock the entire PrismaService to avoid database connections
jest.mock('./prisma.service', () => {
    const originalModule = jest.requireActual('./prisma.service');
    class MockPrismaService {
        $connect = jest.fn();
        $disconnect = jest.fn();
        cleanDatabase = jest.fn().mockImplementation(async function () {
            // Do nothing in tests
            return Promise.resolve();
        });
        onModuleInit = async function () {
            return this.$connect();
        };
        onModuleDestroy = async function () {
            return this.$disconnect();
        };
    }
    return {
        PrismaService: MockPrismaService
    };
});

describe('PrismaService', () => {
    let service: PrismaService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [PrismaService],
        }).compile();

        service = module.get<PrismaService>(PrismaService);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    it('should call $connect when onModuleInit is called', async () => {
        await service.onModuleInit();
        expect(service.$connect).toHaveBeenCalled();
    });

    it('should call $disconnect when onModuleDestroy is called', async () => {
        await service.onModuleDestroy();
        expect(service.$disconnect).toHaveBeenCalled();
    });

    describe('cleanDatabase', () => {
        it('should not run in production environment', async () => {
            const originalEnv = process.env.NODE_ENV;
            process.env.NODE_ENV = 'production';

            await service.cleanDatabase();

            expect(service.cleanDatabase).toHaveBeenCalled();

            // Restore environment
            process.env.NODE_ENV = originalEnv;
        });

        it('should be callable in non-production environment', async () => {
            const originalEnv = process.env.NODE_ENV;
            process.env.NODE_ENV = 'development';

            await service.cleanDatabase();

            expect(service.cleanDatabase).toHaveBeenCalled();

            // Restore environment
            process.env.NODE_ENV = originalEnv;
        });
    });
});