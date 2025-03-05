import { Module } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { ProjectRepository } from './project.repository';
import { ArtifactRepository } from './artifact.repository';
import { StateRepository } from './state.repository';
import { ReasoningRepository } from './reasoning.repository';
import { CacheService } from '../services/cache/cache.service';

@Module({
    providers: [
        PrismaService,
        CacheService,
        ProjectRepository,
        ArtifactRepository,
        StateRepository,
        ReasoningRepository
    ],
    exports: [
        ProjectRepository,
        ArtifactRepository,
        StateRepository,
        ReasoningRepository
    ]
})
export class RepositoriesModule { }