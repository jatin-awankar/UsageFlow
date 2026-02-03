# UsageFlow – Usage-Based Billing & Webhook Platform

UsageFlow is a multi-tenant SaaS platform that enables applications to track usage events, configure pricing plans, generate invoices, and deliver billing events to external systems via reliable webhooks.
It is designed as a developer-first, production-oriented system, inspired by real-world billing platforms like Stripe.

## 🚀 Key Features

- Multi-Tenant Architecture
  - Organizations with role-based access control (RBAC)
  - Single active subscription per organization
- Usage Tracking
  - Secure ingestion via API keys
  - Event-based usage collection
- Flexible Pricing Engine
  - Metrics (API calls, users, etc.)
  - Plans with base price + per-metric overages
- Subscription & Invoicing
  - Plan activation per organization
  - Invoice generation per billing period
- Reliable Webhooks
  - Durable event storage
  - Background delivery with retries
  - Secure HMAC signature verification
  - Delivery logs & observability UI
- Audit Logging
  - Track all sensitive actions (plans, keys, subscriptions, webhooks)
- Background Workers
  - Usage aggregation
  - Invoice generation
  - Webhook delivery via BullMQ
- Validation using Zod

## 🧠 Architecture Overview

UsageFlow is built with a decoupled, event-driven architecture:
- Next.js App
  - Dashboard UI
  - Authenticated server actions
  - Public ingestion API
- PostgreSQL (Prisma)
  - Source of truth for all data
- Redis + BullMQ
  - Background job queue
- Worker Service
  - Usage aggregation
  - Invoice generation
  - Webhook delivery

## 🛠️ Tech Stack

- Frontend / Backend: Next.js (App Router), TypeScript
- Auth: NextAuth
- Database: PostgreSQL (Prisma ORM)
- Queue & Cache: Redis (BullMQ)
- Workers: Node.js + BullMQ Workers
- Deployment: Vercel (App), Railway / Render (Worker)

## 🔐 Security Practices

- API keys stored as hashed values
- Webhook secrets shown only once
- HMAC-signed webhook payloads
- Strict server-side RBAC enforcement
- No sensitive logic on the client

## 📈 Why This Project Matters

UsageFlow is not a CRUD app.

It demonstrates real SaaS engineering concepts:
- Multi-tenancy
- Event-driven systems
- Background processing
- Reliable webhooks
- Observability & auditability

<!-- 
PRISMA >>
Install Dependencies -> npm install prisma @types/node --save-dev 
                        npm install prisma @prisma/client @prisma/adapter-pg dotenv
install & init prisma -> npx prisma init 

format & validate schema -> npx prisma format
                            npx prisma validate

prisma migration command -> npx prisma migrate dev --name init

generate prisma client -> npx prisma generate

Reset DB -> npx prisma migrate reset

Apply new schema -> npx prisma migrate dev

DOCKER >>
Start DB -> docker compose up -d
check -> docker ps
Stop DB -> docker compose down

npm install @upstash/redis
npm install bullmq ioredis
npm i axios
npm install -D tsx

npm install next-auth @auth/prisma-adapter bcryptjs


CREATE UNIQUE INDEX one_active_subscription_per_org
ON "Subscription"(orgId)
WHERE status = 'ACTIVE';

Audit:
{
  metric: "API_CALL",
  used: 1200,
  included: 1000,
  overage: 200,
  cost: 400
}


-->
