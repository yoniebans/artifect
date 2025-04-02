// src/app.module.ts

import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaService } from './database/prisma.service';
import { RepositoriesModule } from './repositories/repositories.module';
import { CacheModule } from './services/cache/cache.module';
import { TemplatesModule } from './templates/templates.module';
import { AIModule } from './ai/ai.module';
import { ContextManagerModule } from './context/context-manager.module';
import { WorkflowOrchestratorModule } from './workflow/workflow-orchestrator.module';
import { ApiModule } from './api/api.module';
import { AuthModule } from './auth/auth.module';
import configuration from './config/configuration';
import { validationSchema } from './config/validation.schema';
import aiConfiguration from './ai/ai.config';
import authConfiguration from './auth/auth.config';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration, aiConfiguration, authConfiguration],
      validationSchema: validationSchema,
    }),
    CacheModule,
    RepositoriesModule,
    TemplatesModule,
    AIModule,
    ContextManagerModule,
    WorkflowOrchestratorModule,
    ApiModule,
    AuthModule,
  ],
  controllers: [AppController],
  providers: [AppService, PrismaService],
})
export class AppModule { }