# Pulse360: AI-Assisted 360-Degree Feedback Platform

Pulse360 is a comprehensive AI-augmented feedback platform designed to enhance and streamline the 360-degree feedback process. Leveraging Flux AI, the platform provides secure, intelligent, and personalized feedback experiences while minimizing common biases and inefficiencies.

## Key Features

- **AI-Assisted Feedback**: Evaluators receive real-time AI assistance to improve the quality and specificity of their feedback
- **Context-Aware Evaluation**: Upload organizational documents to provide context for the AI
- **Intelligent Reporting**: Generate comprehensive reports with AI-summarized insights
- **Bias Detection**: AI helps identify and mitigate rating biases and patterns
- **Continuous Feedback**: Support for regular feedback cycles rather than just annual reviews

## Architecture Overview

Pulse360 is built with a modern tech stack and organized into three core modules:

### Core Modules

1. **ContextHub**: HR content and context upload system
   - Document management
   - Context provisioning for AI

2. **ControlHub**: Feedback cycle management system
   - Cycle creation and management
   - Evaluator assignment
   - Reports and analytics

3. **FeedbackHub**: Evaluator portal with AI support
   - AI-assisted feedback forms
   - Real-time suggestions and improvements
   - Secure token-based access

### Technology Stack

- **Frontend**: 
  - React.js with Tailwind CSS
  - React Query for data fetching
  - Form management with Formik

- **Backend**:
  - Python/FastAPI
  - PostgreSQL (SQLAlchemy ORM)
  - Redis for caching
  - Celery for background tasks

- **AI Integration**:
  - Flux AI API
  - RAG (Retrieval Augmented Generation)
  - Circuit breaker pattern for resilience

- **DevOps**:
  - Docker/Docker Compose
  - Nginx for reverse proxy and security
  - Automated testing with pytest/Jest

## Installation and Setup

### Requirements

- Docker and Docker Compose
- Flux AI API key
- SMTP server (for email notifications)

### Development Setup

1. Clone the repository:
   ```bash
   git clone https://github.com/your-org/pulse360.git
   cd pulse360
   ```

2. Create a `.env` file with required environment variables:
   ```
   # Database
   POSTGRES_USER=pulse360
   POSTGRES_PASSWORD=your_secure_password
   POSTGRES_DB=pulse360
   
   # Security
   SECRET_KEY=your_secret_key
   
   # Flux AI
   FLUX_AI_API_KEY=your_flux_ai_api_key
   
   # Redis
   REDIS_PASSWORD=your_redis_password
   
   # Email (optional for development)
   SMTP_HOST=smtp.example.com
   SMTP_PORT=587
   SMTP_USER=your_email@example.com
   SMTP_PASSWORD=your_smtp_password
   
   # Admin user
   FIRST_ADMIN_EMAIL=admin@example.com
   FIRST_ADMIN_PASSWORD=admin_password
   ```

3. Start the development environment:
   ```bash
   docker-compose up -d
   ```

4. Access the application:
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:8000/api
   - API Documentation: http://localhost:8000/docs

### Production Deployment

For production deployment, use the enhanced Docker Compose file:

```bash
docker-compose -f docker-compose.prod.enhanced.yml up -d
```

Make sure to update the Nginx configuration with your domain name and SSL certificates.

## Project Structure

```
pulse360/
├── backend/                 # FastAPI backend
│   ├── app/
│   │   ├── api/             # API endpoints
│   │   ├── core/            # Core functionality
│   │   ├── db/              # Database models and session
│   │   ├── models/          # SQLAlchemy models
│   │   ├── schemas/         # Pydantic schemas
│   │   ├── services/        # Business logic
│   │   └── tasks/           # Celery tasks
│   ├── tests/               # Backend tests
│   └── alembic/             # Database migrations
├── frontend/                # React frontend
│   ├── src/
│   │   ├── components/      # React components
│   │   ├── contexts/        # Context providers
│   │   ├── pages/           # Page components
│   │   ├── services/        # API services
│   │   └── layouts/         # Layout components
│   └── public/              # Static assets
├── nginx/                   # Nginx configuration
├── scripts/                 # Utility scripts
└── docker-compose.yml       # Docker Compose configuration
```

## Module Documentation

### ContextHub

ContextHub allows HR professionals to upload and manage documents that provide context for AI-assisted feedback. These documents can include:

- Leadership models
- Competency frameworks
- Role descriptions
- Performance expectations

The AI uses these documents to better understand organizational context and provide more relevant assistance to evaluators.

### ControlHub

ControlHub is the management interface for HR and administrators to:

- Create and configure feedback cycles
- Manage templates and questions
- Send invitations to evaluators
- Monitor completion status
- Generate and analyze reports

The module provides comprehensive analytics and insights into feedback trends.

### FeedbackHub

FeedbackHub is the interface for evaluators to provide feedback. Key features include:

- Secure, token-based access to feedback forms
- AI assistance for improving feedback quality
- Support for various question types
- Draft saving and final submission
- Anonymous feedback options

## API Documentation

The complete API documentation is available at `/api/docs` when running the application. Key endpoints include:

- `/api/auth/*` - Authentication endpoints
- `/api/documents/*` - ContextHub document management
- `/api/templates/*` - Feedback templates
- `/api/cycles/*` - Feedback cycles
- `/api/feedback/*` - Feedback management

## Testing

### Backend Testing

Run the backend tests with pytest:

```bash
cd backend
pytest
```

### Frontend Testing

Run the frontend tests with Jest:

```bash
cd frontend
npm test
```

## License

This project is proprietary and confidential. All rights reserved.

## Support

For support, please contact support@pulse360.example.com.