import { Module } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CacheService } from './cache.service';

@Module({
    providers: [CacheService, PrismaService],
    exports: [CacheService]
})
export class CacheModule { }