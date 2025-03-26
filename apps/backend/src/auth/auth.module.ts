// src/auth/auth.module.ts

import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { AuthGuard } from './guards/auth.guard';
import { AuthService } from './auth.service';
import { ClerkService } from './clerk.service';
import { RepositoriesModule } from '../repositories/repositories.module';

@Module({
    imports: [
        ConfigModule,
        RepositoriesModule,
    ],
    providers: [
        AuthService,
        ClerkService,
        {
            provide: APP_GUARD,
            useClass: AuthGuard,
        },
    ],
    exports: [AuthService, ClerkService],
})
export class AuthModule { }