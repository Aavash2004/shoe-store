# ABXV

A full-stack shoe e-commerce app built with Next.js (App Router), TypeScript, Tailwind CSS, Prisma, and PostgreSQL (Neon).

## Tech Stack

- **Framework:** Next.js + App Router
- **Language:** TypeScript
- **Styling:** Tailwind CSS + shadcn/ui
- **State:** Zustand
- **Forms/Validation:** React Hook Form + Zod
- **Database:** PostgreSQL (Neon) via Prisma ORM
- **Auth:** NextAuth / Auth.js

## Getting Started

Install dependencies:

```bash
pnpm install
```

Set up your `.env` file with a `DATABASE_URL` pointing to your PostgreSQL instance (see `.env.example`).

Run migrations:

```bash
pnpm dlx prisma migrate dev
```

Start the dev server:

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

## Project Docs

See `/docs` for architecture, database schema, and API notes.