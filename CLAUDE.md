# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Dockerized Node.js service providing a secure API wrapper for Transbank Webpay Plus payment gateway integration. Uses Fastify web framework, MongoDB for transaction storage, and the official Transbank SDK.

## Development Commands

```bash
# Start development environment with hot-reload
npm run up

# View container logs in real-time
npm run watch

# Stop all containers
npm run down

# Build Docker image
docker build --target dev -t npulidom/tbk-webpayplus:dev .
docker build --target prod -t npulidom/tbk-webpayplus:latest .
```

## Environment Configuration

Required environment variables (see README.md for full list):

- `MONGO_URL` - MongoDB connection string (required)
- `BASE_URL` - Service base URL, supports path prefix (e.g., https://domain.com/tbk-webpayplus/)
- `API_KEY` - Bearer token for API authentication (required)
- `ENCRYPTION_KEY` - 32-char key for URL encryption (optional, auto-generated if not provided)
- `TBK_CODE` / `TBK_KEY` - Production credentials (omit for testing mode)
- `TBK_SUCCESS_URL` / `TBK_FAILED_URL` - Payment callback URLs (required)
- `DEBUG_LOGS` - Enable debug logging in production

## Architecture

### Application Bootstrap (init.js)

Entry point that orchestrates service initialization:
1. Creates Fastify server instance
2. Connects to MongoDB
3. Configures Transbank SDK (testing vs production mode)
4. Registers global hooks for CORS, request validation, error handling
5. Mounts API routes with bearer auth
6. Starts server on port 80

### Core Modules

**api/server.js** - Fastify server configuration
- Environment-aware logging (pino-pretty for dev, structured JSON for prod)
- Base path extraction from BASE_URL for multi-tenant setups
- Health check endpoints (both `/health` and `${basePath}health`)
- CORS header management
- Graceful shutdown handling

**api/api.js** - Route registration
- Bearer auth middleware for protected endpoints (`/trx/create`, `/trx/refund`)
- Public callbacks for Transbank (`/trx/authorize/:hash`)

**api/transbank.js** - Payment processing logic
- `createTrx()` - Initiates payment, returns Transbank form URL + token
- `authorizeTrx()` - Callback handler for Transbank, commits transaction and saves to DB
- `refund()` - Processes refund via Transbank API
- Uses encrypted hashes in callback URLs to prevent tampering with buyOrder
- Duplicate transaction prevention via buyOrder uniqueness check

**api/mongo.js** - Database abstraction layer
- Thin wrapper around MongoDB Node.js driver
- Auto-converts string `_id` to ObjectId where appropriate
- Collection: `tbkWebpayPlusTrx` for transaction records

**api/utils.js** - Cryptographic utilities
- AES-256-CBC encryption/decryption for buyOrder in callback URLs
- Auto-generates ENCRYPTION_KEY if not provided (warning: inconsistent across restarts)

### Payment Flow

1. Client calls `POST /trx/create` with `{ buyOrder, sessionId, amount }`
2. Service generates encrypted hash from buyOrder, creates returnUrl
3. Transbank SDK creates transaction, returns payment form URL + token
4. User completes payment on Transbank site
5. Transbank redirects to `GET/POST /trx/authorize/:hash?token_ws=xxx`
6. Service decrypts buyOrder from hash, commits transaction via SDK
7. Transaction data saved to MongoDB
8. User redirected to TBK_SUCCESS_URL or TBK_FAILED_URL

### Security Considerations

- Never expose this API directly to client-side applications (per README)
- Bearer auth required for all mutation endpoints
- XSS sanitization on user inputs
- Encrypted buyOrder in callback URLs prevents manipulation
- Duplicate transaction checks prevent double-processing
- ENCRYPTION_KEY should be set explicitly in production to ensure consistency across restarts

## Docker Architecture

Multi-stage Dockerfile with `base`, `dev`, and `prod` targets:
- Uses Node.js 22 Alpine
- Grants cap_net_bind_service to allow non-root user to bind port 80
- Dev stage runs with `--watch` flag for hot-reload
- Production stage runs clean install without dev dependencies

Docker Compose includes:
- MongoDB 6 container with persistent volume
- nginx-proxy for virtual host routing (development convenience)
- Custom network for inter-container communication

## Key Implementation Details

- **ES Modules**: Uses `"type": "module"` in package.json, all imports use `.js` extensions
- **CommonJS SDK Workaround**: Transbank SDK requires destructuring `{ WebpayPlus } = tbk` due to default export
- **Status Code Strategy**: Returns 418 status for application errors (JSON with `"status":"error"`)
- **Transaction Date**: Uses `transaction_date` from Transbank response, not server time
- **Card Security**: Only stores last 4 digits of card number
- **Response Format**: All API responses follow `{ status: "ok"|"error", ...data }` pattern
- **Log Levels**: Development uses debug+pretty, production defaults to info (unless DEBUG_LOGS=1)

## Testing

Uses Transbank's testing environment when TBK_CODE/TBK_KEY are not set. Test card numbers available in README.md.
