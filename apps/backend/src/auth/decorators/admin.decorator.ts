// src/auth/decorators/admin.decorator.ts

import { UseGuards, applyDecorators } from '@nestjs/common';
import { AdminGuard } from '../guards/admin.guard';

/**
 * Decorator to mark a route as requiring admin privileges
 * Note: AuthGuard should be applied globally, so we only need to add AdminGuard
 */
export const Admin = () => applyDecorators(UseGuards(AdminGuard));