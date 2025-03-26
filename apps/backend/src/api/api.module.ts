// src/api/api.module.ts

import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { WorkflowOrchestratorModule } from '../workflow/workflow-orchestrator.module';
import {
    HealthController,
    ProjectController,
    ArtifactController,
    AIProviderController,
    StreamingController,
    UserController
} from './controllers';
import { LoggingInterceptor } from './interceptors/logging.interceptor';
import { SSEService } from './services/sse.service';
import { AppService } from '../app.service';
import { RepositoriesModule } from '../repositories/repositories.module';
import { AuthModule } from '../auth/auth.module';

/**
 * Module for API Gateway
 */
@Module({
    imports: [
        WorkflowOrchestratorModule,
        RepositoriesModule,
        AuthModule, // Import AuthModule to access AuthService
    ],
    controllers: [
        HealthController,
        ProjectController,
        ArtifactController,
        AIProviderController,
        StreamingController,
        UserController,
    ],
    providers: [
        {
            provide: APP_INTERCEPTOR,
            useClass: LoggingInterceptor,
        },
        SSEService,
        AppService,
    ],
})
export class ApiModule { }