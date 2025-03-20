// src/auth/clerk.service.ts

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createRemoteJWKSet, jwtVerify } from 'jose';

@Injectable()
export class ClerkService {
  private readonly logger = new Logger(ClerkService.name);
  private readonly jwksUrl: string;
  private readonly jwks: ReturnType<typeof createRemoteJWKSet>;
  private readonly clerkApiKey: string;
  private readonly clerkApiBaseUrl: string;

  constructor(private configService: ConfigService) {
    // Load configuration
    const clerkJwksUrl = this.configService.get<string>('CLERK_JWKS_URL') ||
      'https://api.clerk.dev/v1/jwks';
    this.clerkApiKey = this.configService.get<string>('CLERK_API_KEY') || '';
    this.clerkApiBaseUrl = this.configService.get<string>('CLERK_API_BASE_URL') || 
      'https://api.clerk.com/v1';

    // Set up JWKS endpoint
    this.jwksUrl = clerkJwksUrl;
    this.jwks = createRemoteJWKSet(new URL(this.jwksUrl));
  }

  /**
   * Verify and decode a JWT token from Clerk
   * @param token JWT token to verify
   * @returns Decoded JWT payload or null if invalid
   */
  async verifyToken(token: string): Promise<any | null> {
    try {
      const { payload } = await jwtVerify(token, this.jwks, {
        issuer: 'clerk',
        audience: this.configService.get<string>('CLERK_JWT_AUDIENCE'),
      });
      
      return payload;
    } catch (error) {
      this.logger.error(`Token verification failed: ${error.message}`);
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
      const response = await fetch(`${this.clerkApiBaseUrl}/users/${userId}`, {
        headers: {
          Authorization: `Bearer ${this.clerkApiKey}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch user: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      this.logger.error(`Failed to get user details: ${error.message}`);
      return null;
    }
  }
}