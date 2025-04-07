// src/repositories/repositories.module.ts

import { Module } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { ProjectRepository } from './project.repository';
import { ArtifactRepository } from './artifact.repository';
import { StateRepository } from './state.repository';
import { ReasoningRepository } from './reasoning.repository';
import { UserRepository } from './user.repository';
import { ProjectTypeRepository } from './project-type.repository';
import { CacheModule } from '../services/cache/cache.module';

@Module({
    imports: [CacheModule],
    providers: [
        PrismaService,
        ProjectRepository,
        ArtifactRepository,
        StateRepository,
        ReasoningRepository,
        UserRepository,
        ProjectTypeRepository,
    ],
    exports: [
        ProjectRepository,
        ArtifactRepository,
        StateRepository,
        ReasoningRepository,
        UserRepository,
        ProjectTypeRepository,
    ]
})
export class RepositoriesModule { }