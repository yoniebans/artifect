
// src/auth/guards/admin.guard.ts

import {
    Injectable,
    CanActivate,
    ExecutionContext,
    ForbiddenException,
    Logger,
  } from '@nestjs/common';
  import { AuthService } from '../auth.service';
  import { RequestWithUser } from '../interfaces/request-with-user.interface';
  
  @Injectable()
  export class AdminGuard implements CanActivate {
    private readonly logger = new Logger(AdminGuard.name);
  
    constructor(private authService: AuthService) {}
  
    async canActivate(context: ExecutionContext): Promise<boolean> {
      const request = context.switchToHttp().getRequest<RequestWithUser>();
      const user = request.user;
  
      // User should already be authenticated by AuthGuard
      if (!user) {
        this.logger.error('No user found in request. AuthGuard should be used before AdminGuard');
        throw new ForbiddenException('User not authenticated');
      }
  
      // Check if user is an admin
      const isAdmin = await this.authService.isAdmin(user.id);
      
      if (!isAdmin) {
        throw new ForbiddenException('Admin privileges required');
      }
  
      return true;
    }
  }