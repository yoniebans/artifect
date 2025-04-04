# Artifect Frontend

A Next.js application for AI-assisted artifact engineering and software design. This tool helps you create, manage, and collaborate on software design artifacts with the assistance of AI.

## Overview

Artifect is a modern web application that streamlines the software design process by providing an organized approach to creating and managing design artifacts. The application integrates AI to help generate and refine artifacts like requirements documents, use cases, and C4 architecture diagrams.

## Features

- **Project Management**: Create and organize projects
- **Phased Artifact Creation**: Structured workflow through Requirements and Design phases
- **AI-Assisted Content Generation**: Leverage AI models to help create and refine artifacts
- **Real-time Markdown Preview**: Instant preview of documentation
- **Mermaid Diagram Integration**: Visualize and create C4 architecture diagrams
- **Artifact Approval Workflow**: Track progress through statuses (To Do, In Progress, Approved)
- **Export Functionality**: Download approved artifacts as ZIP files
- **Authentication**: Secure user authentication via Clerk

## Technology Stack

- **Framework**: Next.js 14.2
- **UI Library**: React 18
- **Styling**: Tailwind CSS
- **Components**: shadcn/ui (based on Radix UI)
- **Authentication**: Clerk
- **Languages**: TypeScript
- **Package Manager**: pnpm
- **Diagram Rendering**: Mermaid
- **Markdown Rendering**: React Markdown
- **File Generation**: JSZip

## Project Structure

```
apps/frontend/
├── app/               # Next.js App Router pages
├── components/        # React components
│   ├── ui/            # shadcn/ui components
│   ├── loading/       # Loading state management
│   ├── transitions/   # Animation and transition components
├── hooks/             # Custom React hooks
├── lib/               # Utility functions
├── types/             # TypeScript types
├── public/            # Static assets
```

## Prerequisites

- Node.js 18+
- pnpm 9.14.4+

## Environment Variables

Create a `.env.local` file in the `apps/frontend` directory with the following variables:

```
# Backend API URL
NEXT_PUBLIC_BACKEND_URL=http://localhost:3001

# Clerk Authentication (get these from your Clerk dashboard)
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_...
CLERK_SECRET_KEY=sk_...

# Clerk Authentication Routes
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/dashboard
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/dashboard
```

## Getting Started

### Installation

Clone the repository and install dependencies:

```bash
# Clone the repository
git clone <repository-url>
cd artifect

# Install dependencies
pnpm install
```

### Development

To start the development server:

```bash
# Start frontend only
pnpm --filter=@artifect/frontend dev

# Or start all services
pnpm dev
```

The frontend will be available at http://localhost:3001

### Build

To build the application for production:

```bash
# Build frontend only
pnpm --filter=@artifect/frontend build

# Or build all services
pnpm build
```

### Production

To start the production server:

```bash
# Start frontend only
pnpm --filter=@artifect/frontend start

# Or start all services
pnpm start
```

## Available Scripts

- `pnpm dev` - Start the development server
- `pnpm build` - Build the application for production
- `pnpm start` - Start the production server
- `pnpm lint` - Run ESLint
- `pnpm clean` - Clean build artifacts and node_modules

## Key Components

### Authentication

Authentication is handled by Clerk. The application uses middleware to protect routes and redirects unauthenticated users to the sign-in page.

### Project Management

The dashboard displays all projects and allows users to create new ones. Projects are the top-level organizational unit.

### Artifact Workflow

Each project contains phases (Requirements, Design) with various artifact types:

- **Requirements Phase**: Vision Document, Functional Requirements, Non-Functional Requirements, Use Cases
- **Design Phase**: C4 Context, C4 Container, C4 Component diagrams

### AI Integration

The application connects to AI providers to assist with artifact creation and editing. Users can select different AI providers and models through the UI.

### Loading and State Management

Custom loading indicators and state management ensure a smooth user experience during API calls and transitions.

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

Distributed under the MIT License. See `LICENSE` for more information.

## Acknowledgements

- [Next.js](https://nextjs.org/)
- [React](https://reactjs.org/)
- [Tailwind CSS](https://tailwindcss.com/)
- [shadcn/ui](https://ui.shadcn.com)
- [Clerk](https://clerk.dev/)
- [Mermaid](https://mermaid-js.github.io/mermaid/)
