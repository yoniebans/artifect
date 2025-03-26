// src/api/controllers/health.controller.spec.ts

import { Test, TestingModule } from '@nestjs/testing';
import { HealthController } from './health.controller';
import { AppService } from '../../app.service';

describe('HealthController', () => {
    let controller: HealthController;
    let appService: AppService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            controllers: [HealthController],
            providers: [
                {
                    provide: AppService,
                    useValue: {
                        getHealth: jest.fn(),
                    },
                },
            ],
        }).compile();

        controller = module.get<HealthController>(HealthController);
        appService = module.get<AppService>(AppService);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('should be defined', () => {
        expect(controller).toBeDefined();
    });

    describe('getHealth', () => {
        it('should return the health status from AppService', () => {
            const mockHealthStatus = { status: 'healthy', timestamp: new Date().toISOString() };
            jest.spyOn(appService, 'getHealth').mockReturnValue(mockHealthStatus);

            const result = controller.getHealth();

            expect(result).toBe(mockHealthStatus);
            expect(appService.getHealth).toHaveBeenCalledTimes(1);
        });
    });
});