// src/templates/templates.module.ts

import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TemplateManagerService } from './template-manager.service';
import { CacheModule } from '../services/cache/cache.module';

@Module({
    imports: [
        ConfigModule,
        CacheModule,
    ],
    providers: [
        TemplateManagerService,
    ],
    exports: [
        TemplateManagerService,
    ],
})
export class TemplatesModule { }