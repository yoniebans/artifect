// src/auth/guards/auth.guard.ts

import {
    Injectable,
    CanActivate,
    ExecutionContext,
    UnauthorizedException,
    Logger,
  } from '@nestjs/common';
  import { Reflector } from '@nestjs/core';
  import { AuthService } from '../auth.service';
  import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
  import { RequestWithUser } from '../interfaces/request-with-user.interface';
  
  @Injectable()
  export class AuthGuard implements CanActivate {
    private readonly logger = new Logger(AuthGuard.name);
  
    constructor(
      private authService: AuthService,
      private reflector: Reflector,
    ) {}
  
    async canActivate(context: ExecutionContext): Promise<boolean> {
      // Check if the endpoint is marked as public
      const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
        context.getHandler(),
        context.getClass(),
      ]);
  
      if (isPublic) {
        return true;
      }
  
      const request = context.switchToHttp().getRequest<RequestWithUser>();
      const token = this.extractTokenFromHeader(request);
  
      if (!token) {
        throw new UnauthorizedException('No authorization token provided');
      }
  
      try {
        // Validate token and get user
        const user = await this.authService.validateToken(token);
        
        // Attach user to request object for use in controllers
        request.user = user;
        
        return true;
      } catch (error) {
        this.logger.error(`Authentication failed: ${error.message}`);
        throw new UnauthorizedException('Invalid authentication token');
      }
    }
  
    private extractTokenFromHeader(request: Request): string | undefined {
      const authHeader = request.headers['authorization'];
      if (!authHeader) return undefined;
      
      const [type, token] = authHeader.split(' ');
      return type === 'Bearer' ? token : undefined;
    }
  }