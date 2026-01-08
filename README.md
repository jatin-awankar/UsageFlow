## Backend Foundation
- Multi-tenant architecture using org-based scoping
- Role-based access control (OWNER, ADMIN, DEVELOPER, VIEWER)
- Centralized permissions map
- Input validation using Zod

This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.


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

-->
