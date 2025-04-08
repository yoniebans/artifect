import { Module } from '@nestjs/common';
import { ContextManagerService } from './context-manager.service';
import { RepositoriesModule } from '../repositories/repositories.module';
import { CacheModule } from '../services/cache/cache.module';
import { DependencyResolver } from './dependency-resolver';

/**
 * Module for context management
 */
@Module({
    imports: [
        RepositoriesModule,
        CacheModule
    ],
    providers: [
        ContextManagerService,
        DependencyResolver
    ],
    exports: [
        ContextManagerService
    ],
})
export class ContextManagerModule { }