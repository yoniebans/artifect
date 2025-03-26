import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { RepositoriesModule } from '../repositories/repositories.module';
import { TemplatesModule } from '../templates/templates.module';
import { ContextManagerModule } from '../context/context-manager.module';
import { AIModule } from '../ai/ai.module';
import { WorkflowOrchestratorService } from './workflow-orchestrator.service';

/**
 * Module for workflow orchestration
 */
@Module({
    imports: [
        ConfigModule,
        RepositoriesModule,
        TemplatesModule,
        ContextManagerModule,
        AIModule,
    ],
    providers: [WorkflowOrchestratorService],
    exports: [WorkflowOrchestratorService],
})
export class WorkflowOrchestratorModule { }