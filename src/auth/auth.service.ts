// src/auth/auth.service.ts

import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { ClerkService } from './clerk.service';
import { UserRepository } from '../repositories/user.repository';
import { User } from '@prisma/client';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private clerkService: ClerkService,
    private userRepository: UserRepository,
  ) {}

  /**
   * Validate an authentication token and return the associated user
   * @param token JWT token from request
   * @returns Authenticated user
   * @throws UnauthorizedException if token is invalid
   */
  async validateToken(token: string): Promise<User> {
    // Verify token with Clerk
    const payload = await this.clerkService.verifyToken(token);
    if (!payload) {
      throw new UnauthorizedException('Invalid token');
    }

    const clerkUserId = payload.sub;
    if (!clerkUserId) {
      throw new UnauthorizedException('Invalid user ID in token');
    }

    // Find or create user in our database
    let user = await this.userRepository.findByClerkId(clerkUserId);

    if (!user) {
      // Fetch user details from Clerk
      const clerkUser = await this.clerkService.getUserDetails(clerkUserId);
      if (!clerkUser) {
        throw new UnauthorizedException('User not found in Clerk');
      }

      // Create new user in our database
      user = await this.userRepository.create({
        clerkId: clerkUserId,
        email: clerkUser.email_addresses?.[0]?.email_address || '',
        firstName: clerkUser.first_name || '',
        lastName: clerkUser.last_name || '',
        isAdmin: false, // New users are not admins by default
      });
    }

    return user;
  }

  /**
   * Check if a user has admin privileges
   * @param userId User ID
   * @returns True if user is an admin
   */
  async isAdmin(userId: number): Promise<boolean> {
    const user = await this.userRepository.findById(userId);
    return user?.isAdmin || false;
  }
}