import { Module } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { ProjectRepository } from './project.repository';
import { ArtifactRepository } from './artifact.repository';
import { StateRepository } from './state.repository';
import { CacheService } from '../services/cache/cache.service';

@Module({
    providers: [
        PrismaService,
        CacheService,
        ProjectRepository,
        ArtifactRepository,
        StateRepository
    ],
    exports: [
        ProjectRepository,
        ArtifactRepository,
        StateRepository
    ]
})
export class RepositoriesModule { }