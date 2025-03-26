import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ExecutionContext } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/database/prisma.service';
import { APP_GUARD } from '@nestjs/core';
import { AuthGuard } from '../src/auth/guards/auth.guard';
import { AdminGuard } from '../src/auth/guards/admin.guard';
import { AuthService } from '../src/auth/auth.service';
import { ClerkService } from '../src/auth/clerk.service';
import { TEST_USER_CLERK_ID, getTestUserFromDb } from './test-utils';
import { User } from '@prisma/client';

describe('AppController (e2e)', () => {
  let app: INestApplication;
  let prismaService: PrismaService;
  let testUser: User;

  beforeEach(async () => {
    // Get the test user from the database
    testUser = await getTestUserFromDb();

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      // Mock ClerkService
      .overrideProvider(ClerkService)
      .useValue({
        verifyToken: jest.fn().mockResolvedValue({ sub: TEST_USER_CLERK_ID }),
        getUserDetails: jest.fn().mockResolvedValue({
          email_addresses: [{ email_address: 'test@example.com' }],
          first_name: 'Test',
          last_name: 'User'
        })
      })
      // Mock AuthService
      .overrideProvider(AuthService)
      .useValue({
        validateToken: jest.fn().mockResolvedValue(testUser),
        isAdmin: jest.fn().mockResolvedValue(false)
      })
      // Override the global APP_GUARD
      .overrideProvider(APP_GUARD)
      .useValue({ canActivate: () => true })
      // Override AdminGuard
      .overrideGuard(AdminGuard)
      .useValue({ canActivate: () => true })
      // Override AuthGuard
      .overrideGuard(AuthGuard)
      .useValue({
        canActivate: (context: ExecutionContext) => {
          const req = context.switchToHttp().getRequest();
          req.user = testUser;
          return true;
        }
      })
      .compile();

    app = moduleFixture.createNestApplication();
    prismaService = app.get<PrismaService>(PrismaService);

    // Mock the database connection
    prismaService.$connect = jest.fn();
    prismaService.$disconnect = jest.fn();

    await app.init();
  });

  afterEach(async () => {
    if (app) {
      await app.close();
    }
  });

  // Test the /health endpoint which is explicitly marked as public
  it('/health (GET)', () => {
    return request(app.getHttpServer())
      .get('/health')
      .expect(200)
      .expect(response => {
        expect(response.body).toHaveProperty('status');
        expect(response.body).toHaveProperty('timestamp');
        expect(response.body.status).toBe('healthy');
      });
  });

  // Test the root endpoint with authentication
  it('/ (GET) with auth', () => {
    return request(app.getHttpServer())
      .get('/')
      .set('Authorization', 'Bearer valid-token')
      .expect(200)
      .expect(response => {
        expect(response.body).toHaveProperty('status');
        expect(response.body).toHaveProperty('timestamp');
        expect(response.body.status).toBe('healthy');
      });
  });
});