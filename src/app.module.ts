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
import configuration from './config/configuration';
import { validationSchema } from './config/validation.schema';
import aiConfiguration from './ai/ai.config';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration, aiConfiguration],
      validationSchema: validationSchema,
    }),
    CacheModule,
    RepositoriesModule,
    TemplatesModule,
    AIModule,
  ],
  controllers: [AppController],
  providers: [AppService, PrismaService],
})
export class AppModule { }