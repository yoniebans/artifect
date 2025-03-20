// src/auth/interfaces/request-with-user.interface.ts

import { User } from '@prisma/client';
import { Request } from 'express';

/**
 * Extended Request interface that includes the authenticated user
 */
export interface RequestWithUser extends Request {
  user: User;
}