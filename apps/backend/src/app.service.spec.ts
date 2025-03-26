import { Test, TestingModule } from '@nestjs/testing';
import { AppService } from './app.service';
import { PrismaService } from './database/prisma.service';

describe('AppService', () => {
    let service: AppService;
    let prismaService: PrismaService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                AppService,
                {
                    provide: PrismaService,
                    useValue: {
                        // Mock PrismaService
                    },
                },
            ],
        }).compile();

        service = module.get<AppService>(AppService);
        prismaService = module.get<PrismaService>(PrismaService);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    describe('getHealth', () => {
        it('should return a health status', () => {
            const result = service.getHealth();

            expect(result).toHaveProperty('status');
            expect(result).toHaveProperty('timestamp');
            expect(result.status).toBe('healthy');
            expect(typeof result.timestamp).toBe('string');
        });

        it('should provide the current timestamp', () => {
            // Mock Date.now
            const mockDate = new Date('2025-02-28T12:00:00Z');
            const spy = jest.spyOn(global, 'Date').mockImplementation(() => mockDate);

            const result = service.getHealth();

            expect(result.timestamp).toBe(mockDate.toISOString());

            spy.mockRestore();
        });
    });
});