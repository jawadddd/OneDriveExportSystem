# OneDriveExportSystem

A unified export platform for Microsoft OneDrive content, built as a multi-project repository with a dedicated backend and frontend.

This repository includes:

- `backend/`: Node.js service for authentication, GraphQL and REST APIs, OneDrive integration, queue-driven export jobs, MongoDB storage, Redis-backed background workers, and AWS S3 uploads.
- `frontend/`: Next.js application with Azure AD login, file browsing, export request workflows, admin management screens, and realtime export status.

---

## Architecture

### Backend

The backend is an Express server that exposes:

- REST endpoints under `/api/files` and `/api/export`
- GraphQL schema at `/graphql`
- health check at `/health`

Core backend responsibilities:

- Connect to MongoDB for tenant users, drive file metadata, and export job records
- Use Redis + BullMQ for export, fetch, upload, and admin job queues
- Use Azure Microsoft Graph API to access OneDrive and tenant resources
- Upload exported files to AWS S3
- Authenticate admin actions with JWT tokens

Key backend modules:

- `src/index.js` — app startup, middleware, GraphQL server, error handling
- `src/config/mongodb.js` — MongoDB connection and index cleanup
- `src/config/redis.js` — Redis connection and event logging
- `src/config/s3.js` — AWS S3 client configuration
- `src/config/graphClient.js` — Microsoft Graph client using Azure credentials
- `src/queues/` — queue definitions for export and admin workflows
- `src/workers/` — background workers for export, fetch, and upload processing

### Frontend

The frontend is a Next.js application that provides:

- Azure AD authentication via NextAuth
- a dashboard for users and admins
- file list browsing for OneDrive content
- export initiation and upload progress tracking
- Apollo GraphQL client integration for admin operations

Key frontend modules:

- `lib/auth.ts` — Azure AD provider and token refresh logic
- `lib/apolloClient.ts` — Apollo client setup with admin token header injection
- `app/` — Next.js app route definitions and page components
- `app/admin/` — admin-specific UI for fetch/upload jobs and tenant management

---

## Required Environment Variables

### Backend

The backend expects a local `.env` file in `backend/` with these variables:

- `PORT` — backend server port (default: `5000`)
- `FRONTEND_URL` — frontend CORS origin, e.g. `http://localhost:3000`
- `MONGODB_URI` — MongoDB connection string
- `JWT_SECRET` — JWT signing secret for admin authentication
- `REDIS_HOST` — Redis host
- `REDIS_PORT` — Redis port
- `REDIS_PASSWORD` — Redis password
- `AWS_REGION` — AWS region for S3 storage
- `AWS_ACCESS_KEY_ID` — AWS credentials access key
- `AWS_SECRET_ACCESS_KEY` — AWS credentials secret key
- `AWS_BUCKET_NAME` — S3 bucket name for export uploads
- `TENANT_ID` — Azure tenant ID
- `CLIENT_ID` — Azure AD app client ID
- `CLIENT_SECRET` — Azure AD app client secret

### Frontend

The frontend expects a local `.env.local` file with these variables:

- `NEXT_PUBLIC_BACKEND_URL` — backend URL for GraphQL requests, e.g. `http://localhost:5000`
- `TENANT_ID` — Azure tenant ID
- `CLIENT_ID` — Azure AD app client ID
- `CLIENT_SECRET` — Azure AD app client secret

> Note: Azure auth is configured for Microsoft identity and uses `openid profile email User.Read Files.Read offline_access` scopes.

---

## Local Development

### Backend

```bash
cd backend
npm install
npm run dev
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

### General flow

1. Start backend service on port `5000`
2. Start frontend on port `3000`
3. Authenticate with Azure AD in the frontend
4. Use the UI to browse files and trigger export jobs

---

## Deployment Notes

- `backend/` and `frontend/` are separate installable subprojects, but they live in the same repository.
- Environment files are still ignored in the service folders via `backend/.gitignore` and `frontend/.gitignore`.

## Project Structure

```text
backend/
  package.json
  src/
    index.js
    config/
    controllers/
    graphql/
    models/
    queues/
    routes/
    services/
    workers/
frontend/
  package.json
  app/
  lib/
  public/
  types/
```

## Notes

- The backend uses `dotenv` for local environment loading.
- The frontend uses `next-auth` for Azure AD login and refresh token handling.
- Admin interactions are authenticated using JWT headers from local storage.
- MongoDB and Redis are required for job processing and state persistence.

If you need, add a `README` file in `backend/` and `frontend/` later for service-specific developer docs.

