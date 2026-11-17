# BillPro AI installation guide

BillPro AI is a self-hosted web application. It uses a React/Vite interface, an Express API, and MongoDB. The Gemini key is read by the backend only from `server/.env`; never put it in a `VITE_*` variable or browser code.

## Requirements

For the Docker installation, install Docker Engine/Desktop and the Docker Compose plugin. For manual development, install Node.js 22 or later, pnpm 11.25.0, and MongoDB 7 or later. Ensure port 3000 is available for the web application.

## Quick start with Docker

1. Copy `server/.env.example` to `server/.env`.
2. Set `JWT_SECRET` to a long random value. Keep `GEMINI_API_KEY` blank until you are ready to use AI. The Gemini key belongs only in `server/.env`.
3. Start the application from the project root with `docker compose up --build -d`.
4. Open `http://localhost:3000`. Create the first business/admin account from the Register screen, or select the clearly labeled Demo Workspace to explore non-production sample data.
5. Inspect service status with `docker compose ps`; view logs with `docker compose logs -f app`.
6. Stop services with `docker compose down`. To retain MongoDB data, do not remove the named `billpro_mongo_data` volume. For a full data reset, use `docker compose down -v` only after taking a backup; this permanently deletes the local database volume.

Docker Compose supplies the MongoDB container address to the app. Do not change it to `localhost` from inside the app container. For a remote MongoDB deployment, set `MONGODB_URI` in the backend environment and apply the database provider's network/IP access controls.

## Manual development setup

Install dependencies with `pnpm install`. Copy `server/.env.example` to `server/.env`, then configure `MONGODB_URI`, a unique `JWT_SECRET`, and the required SMTP settings if password-reset emails are needed. For local HTTP, keep `BILLPRO_COOKIE_SECURE=false`; public HTTPS deployments should use secure cookies (`BILLPRO_COOKIE_SECURE=true`). Start development with `pnpm dev`. Vite listens on port 3000 and proxies `/api` requests to Express on port 3001. Run `pnpm check`, `pnpm test`, and `pnpm build` to check types, calculation tests and the production client build.

## Gemini configuration

The backend reads `GEMINI_API_KEY` from `server/.env`. Put the value only in that file, restrict file permissions on shared machines, and never commit or send it to the browser. `.gitignore` excludes the file; `server/.env.example` contains only a blank variable placeholder. Restart the server after changing it. Without a key, the AI assistant reports that the integration is not configured.

## Production and security notes

Before exposing the app to the Internet, use HTTPS, a unique high-entropy JWT secret, a production MongoDB database with backups and access restrictions, secure cookie mode, monitored mail delivery, and a restricted administrator account. Review firewall, reverse-proxy, data-retention, privacy, and incident-response requirements. This package is not a security audit or a legal compliance certification. GST requirements depend on the transaction and taxpayer; have an Indian GST accountant review invoice fields and tax treatment. The app captures IRN/QR reference fields but does not issue authenticated GST e-invoices through a portal.
