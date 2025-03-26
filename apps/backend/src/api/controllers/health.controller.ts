// src/api/controllers/health.controller.ts

import { Controller, Get } from '@nestjs/common';
import { AppService } from '../../app.service';
import { ApiHealthCheck } from '../decorators/swagger.decorator';
import { Public } from '../../auth/decorators/public.decorator';

/**
 * Controller for health check endpoint - should be publicly accessible
 */
@Controller()
export class HealthController {
    constructor(private readonly appService: AppService) { }

    /**
     * Get application health status
     * @returns Health status object
     */
    @Get('health')
    @Public()
    @ApiHealthCheck()
    getHealth() {
        return this.appService.getHealth();
    }
}