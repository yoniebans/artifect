// src/api/api.module.ts

import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { WorkflowOrchestratorModule } from '../workflow/workflow-orchestrator.module';
import {
    HealthController,
    ProjectController,
    ArtifactController,
    AIProviderController,
    StreamingController
} from './controllers';
import { LoggingInterceptor } from './interceptors/logging.interceptor';
import { SSEService } from './services/sse.service';

/**
 * Module for API Gateway
 */
@Module({
    imports: [
        WorkflowOrchestratorModule,
    ],
    controllers: [
        HealthController,
        ProjectController,
        ArtifactController,
        AIProviderController,
        StreamingController,
    ],
    providers: [
        {
            provide: APP_INTERCEPTOR,
            useClass: LoggingInterceptor,
        },
        SSEService,
    ],
})
export class ApiModule { }