// src/auth/decorators/user.decorator.ts

import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { User } from '@prisma/client';
import { RequestWithUser } from '../interfaces/request-with-user.interface';

/**
 * Parameter decorator to extract the current user from request
 */
export const CurrentUser = createParamDecorator(
    (data: unknown, ctx: ExecutionContext): User => {
        const request = ctx.switchToHttp().getRequest<RequestWithUser>();
        return request.user;
    },
);