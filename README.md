# AI-Assisted Artifact Engineering Platform

This is a NestJS implementation of the AI-Assisted Artifact Engineering Platform with Prisma ORM.

## Prerequisites

- Node.js (v14 or later)
- npm or yarn
- PostgreSQL database

## Installation

```bash
# Install dependencies
$ npm install

# Generate Prisma client
$ npx prisma generate
```

## Database Setup

1. Make sure your PostgreSQL database is running
2. Set the correct DATABASE_URL in the .env file
3. Run migrations to create the database schema:

```bash
# Apply migrations
$ npm run db:migrate:dev

# Seed the database with initial data
$ npm run db:seed
```

## Running the Application

```bash
# Development mode
$ npm run start:dev

# Production mode
$ npm run build
$ npm run start:prod
```

## Database Management

```bash
# Generate Prisma client after schema changes
$ npm run db:generate

# Create migrations after schema changes
$ npm run db:migrate:dev

# Deploy migrations in production
$ npm run db:migrate:deploy

# Seed the database
$ npm run db:seed

# Open Prisma Studio (web-based database explorer)
$ npm run db:studio
```

## Project Structure

- `prisma/`: Database schema and migrations
  - `schema.prisma`: Prisma schema definition
  - `migrations/`: Auto-generated migration files
  - `seed.ts`: Database seeding script
- `src/`: Source code
  - `config/`: Configuration files
  - `database/`: Prisma service and database utilities
  - `app.module.ts`: Main application module
  - `main.ts`: Application entry point

## Database Schema

The database schema includes the following models:

- `Project`: Top-level container for artifacts
- `Artifact`: Generic container for all project elements
- `ArtifactVersion`: Version history for artifacts
- `ArtifactType`: Categories for artifacts (Vision, Requirements, etc.)
- `LifecyclePhase`: Development stages (Requirements, Design, etc.)
- `ArtifactState`: Status tracking (To Do, In Progress, Approved)
- `StateTransition`: Valid state transitions
- `ArtifactInteraction`: Record of user and AI interactions
- `ReasoningSummary`: AI explanations for changes
- `ReasoningPoint`: Specific reasoning elements

## Environment Variables

Create a `.env` file in the project root with the following variables:

```
DATABASE_URL="postgresql://user:password@localhost:5432/dbname?schema=public"
PORT=3000
NODE_ENV=development
```

## Running Test

To run the tests we've created, add or edit the following scripts in your package.json:

```json
"scripts": {
  // ... existing scripts
  "test:db": "jest src/database --runInBand",
  "test:config": "jest src/config --runInBand",
  "test:app": "jest src/app --runInBand",
  "test:all": "jest --runInBand",
  "test:e2e": "jest --config ./test/jest-e2e.json --runInBand",
  // ... other scripts
}
```

The `--runInBand` flag ensures tests run sequentially, which is important for database tests.

You can run the tests with:

```bash
# Run all unit tests
npm run test:all

# Run just database tests
npm run test:db

# Run just config tests
npm run test:config

# Run just app tests
npm run test:app

# Run end-to-end tests
npm run test:e2e
```

These minimal test suites verify:

1. The database connection works through PrismaService
2. Configuration and validation are working correctly
3. The App service/controller are functioning
4. Basic e2e test verifies the system works end-to-end

As you implement more features in future chunks, you can expand these tests.
