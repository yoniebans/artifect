import { Module } from '@nestjs/common';
import { ContextManagerService } from './context-manager.service';
import { RepositoriesModule } from '../repositories/repositories.module';
import { CacheModule } from '../services/cache/cache.module';

/**
 * Module for context management
 */
@Module({
    imports: [
        RepositoriesModule,
        CacheModule
    ],
    providers: [
        ContextManagerService
    ],
    exports: [
        ContextManagerService
    ],
})
export class ContextManagerModule { }