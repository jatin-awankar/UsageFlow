## Backend Foundation
- Multi-tenant architecture using org-based scoping
- Role-based access control (OWNER, ADMIN, DEVELOPER, VIEWER)
- Centralized permissions map
- Input validation using Zod

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
