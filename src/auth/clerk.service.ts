// src/auth/clerk.service.ts

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { clerkClient, verifyToken } from '@clerk/clerk-sdk-node';

@Injectable()
export class ClerkService {
  private readonly logger = new Logger(ClerkService.name);
  private readonly clerk;
  private readonly jwtAudience: string | undefined;
  private readonly jwtKey: string | undefined;

  constructor(private configService: ConfigService) {
    // Get configuration
    const secretKey = this.configService.get<string>('CLERK_SECRET_KEY');
    this.jwtAudience = this.configService.get<string>('CLERK_JWT_AUDIENCE');

    // Process the JWT key - handle potentially quoted multi-line format
    const rawJwtKey = this.configService.get<string>('CLERK_JWT_KEY');
    if (rawJwtKey) {
      // The dotenv loader should properly handle quoted multi-line values
      this.jwtKey = rawJwtKey;
      this.logger.log('JWT verification key loaded successfully');
    }

    if (!secretKey) {
      this.logger.warn('CLERK_SECRET_KEY is not defined. Authentication will not work properly.');
    } else {
      this.logger.log(`Secret key available: Yes (ends with ${secretKey.slice(-4)})`);
    }

    // Use the pre-initialized client
    this.clerk = clerkClient;
  }

  /**
   * Verify and decode a JWT token from Clerk
   * @param token JWT token to verify
   * @returns Decoded JWT payload or null if invalid
   */
  async verifyToken(token: string): Promise<any | null> {
    try {
      // Create options for token verification
      const options: Record<string, any> = {};

      // Set audience if provided
      if (this.jwtAudience) {
        options.audience = this.jwtAudience;
      }

      // Set JWT key if available - this allows offline verification
      if (this.jwtKey) {
        options.jwtKey = this.jwtKey;
        this.logger.debug('Using JWT verification key for token verification');
      } else {
        this.logger.debug('No JWT key provided, using online JWKS verification');
      }

      // Verify the JWT token
      const verifiedToken = await verifyToken(token, options);

      return verifiedToken;
    } catch (error) {
      this.logger.error(`Token verification failed: ${error.message}`);

      // For debugging
      try {
        const parts = token.split('.');
        if (parts.length === 3) {
          const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
          this.logger.debug(`Token issuer: ${payload.iss || 'none'}`);
          this.logger.debug(`Token subject: ${payload.sub || 'none'}`);
          this.logger.debug(`Token expiration: ${new Date(payload.exp * 1000).toISOString()}`);

          // Check if token is expired
          if (payload.exp && payload.exp * 1000 < Date.now()) {
            this.logger.warn(`Token is expired. Expired at: ${new Date(payload.exp * 1000).toISOString()}`);
          }
        }
      } catch (e) {
        this.logger.debug('Could not parse token for debugging');
      }

      return null;
    }
  }

  /**
   * Get user details from Clerk API
   * @param userId Clerk user ID
   * @returns User details or null if error
   */
  async getUserDetails(userId: string): Promise<any | null> {
    try {
      // Use the clerk client's users resource
      const user = await this.clerk.users.getUser(userId);
      return user;
    } catch (error) {
      this.logger.error(`Failed to get user details: ${error.message}`);
      return null;
    }
  }
}