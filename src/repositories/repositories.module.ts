import { Module } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { ProjectRepository } from './project.repository';

@Module({
    providers: [
        PrismaService,
        ProjectRepository
    ],
    exports: [
        ProjectRepository
    ]
})
export class RepositoriesModule { }