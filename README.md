# Pulse360

Pulse360 is an AI-assisted 360-degree feedback platform leveraging Flux AI to ensure secure, intelligent, and personalized feedback experiences.

## Modular Architecture

This project uses a modular architecture where each component can be developed and tested independently:

1. **ContextHub** - HR content and context upload
2. **ControlHub** - Feedback cycle management and report handling
3. **FeedbackHub** - Evaluator portal with AI support
4. **Integration Layer** - Combines all modules into a seamless application

## Technology Stack

- **Frontend**: React with TypeScript, Tailwind CSS, Shadcn/UI components
- **Backend**: FastAPI (Python), SQLAlchemy ORM, JWT authentication
- **Database**: PostgreSQL for data, Redis for caching and events
- **Storage**: MinIO (S3-compatible) for document storage
- **Development**: Docker Compose for local development environment

## Prerequisites

- [Docker](https://www.docker.com/products/docker-desktop/) and Docker Compose
- [Git](https://git-scm.com/downloads)

## Getting Started

1. Clone the repository:
   ```bash
   git clone https://github.com/your-org/pulse360.git
   cd pulse360
   ```

2. Set up the development environment:
   ```bash
   # Make scripts executable
   chmod +x scripts/*.sh
   
   # Set up the development environment
   ./scripts/setup-dev.sh
   ```

3. Create a module:
   ```bash
   # Create a new module (e.g., context-hub)
   ./scripts/create-module.sh context-hub
   ```

4. Run the module:
   ```bash
   # Go to the module directory
   cd context-hub
   
   # Start the module
   docker-compose up
   ```

5. Access the module:
   - Backend API: http://localhost:8000
   - Frontend: http://localhost:3000
   - API Documentation: http://localhost:8000/docs

## Project Structure

```
pulse360/
├── docker-compose.yml             # Main Docker Compose configuration
├── .env.example                   # Environment variables template
├── README.md                      # This file
│
├── shared/                        # Shared core foundation
│   ├── Dockerfile                 # Shared core container configuration
│   ├── requirements.txt           # Python dependencies
│   ├── shared/                    # Actual shared package
│   │   ├── db/                    # Database models & configuration
│   │   ├── auth/                  # Authentication
│   │   ├── ai/                    # AI integration
│   │   ├── events/                # Event bus
│   │   └── utils/                 # Utilities
│   └── alembic/                   # Database migrations
│
├── context-hub/                   # ContextHub module
│   ├── backend/                   # Backend code
│   ├── frontend/                  # Frontend code
│   └── docker-compose.yml         # Module-specific Docker configuration
│
├── control-hub/                   # ControlHub module
│   ├── backend/                   # Backend code
│   ├── frontend/                  # Frontend code
│   └── docker-compose.yml         # Module-specific Docker configuration
│
├── feedback-hub/                  # FeedbackHub module
│   ├── backend/                   # Backend code
│   ├── frontend/                  # Frontend code
│   └── docker-compose.yml         # Module-specific Docker configuration
│
├── integration/                   # Integration components
│   ├── api-gateway/               # API Gateway
│   └── event-bus/                 # Event bus configuration
│
└── scripts/                       # Utility scripts
    ├── setup-dev.sh               # Setup development environment
    ├── run-tests.sh               # Run all tests
    └── create-module.sh           # Create a new module
```

## Development Workflow

1. **Work on modules independently**:
   - Each module has its own Docker Compose configuration
   - Run modules in isolation for faster development
   - Test independently before integration

2. **Integration testing**:
   - Use the main Docker Compose configuration
   - Test interactions between modules
   - Verify end-to-end workflows

3. **Continuous testing**:
   - Run tests for individual modules
   - Run integration tests for the whole system
   - Ensure code quality with pre-commit hooks

## Default Credentials

During development, the following default credentials are set up:

- **Admin User**:
  - Email: admin@pulse360.com
  - Password: adminpassword

**Note**: These credentials should be changed in production.

## License

[Your License]