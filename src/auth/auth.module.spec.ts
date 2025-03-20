// src/auth/auth.module.spec.ts

import { AuthModule } from './auth.module';
import { AuthService } from './auth.service';
import { ClerkService } from './clerk.service';
import { AuthGuard } from './guards/auth.guard';
import { APP_GUARD } from '@nestjs/core';

// Mock jose before importing any modules that use it
jest.mock('jose');

describe('AuthModule', () => {
    it('should be defined', () => {
        expect(AuthModule).toBeDefined();
    });

    it('should have the correct providers', () => {
        const providers = Reflect.getMetadata('providers', AuthModule);
        expect(providers).toBeDefined();

        // Check if AuthService and ClerkService are provided
        const providerClasses = providers.map((provider: any) =>
            provider.provide ? provider : provider
        );

        expect(providerClasses).toContainEqual(AuthService);
        expect(providerClasses).toContainEqual(ClerkService);

        // Check if the APP_GUARD is included
        const appGuardProvider = providers.find((provider: any) =>
            provider.provide === APP_GUARD
        );
        expect(appGuardProvider).toBeDefined();
        expect(appGuardProvider.useClass).toBe(AuthGuard);
    });

    it('should have the correct imports', () => {
        const imports = Reflect.getMetadata('imports', AuthModule);
        expect(imports).toBeDefined();

        // Check for expected modules
        expect(imports.length).toBeGreaterThan(0);
    });

    it('should export required services', () => {
        const exports = Reflect.getMetadata('exports', AuthModule);
        expect(exports).toBeDefined();

        // Check if AuthService and ClerkService are exported
        expect(exports).toContain(AuthService);
        expect(exports).toContain(ClerkService);
    });
});