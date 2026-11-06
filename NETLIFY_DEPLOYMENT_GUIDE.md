# ATHARVA TRAVELS – Production Deployment Guide (Netlify & PostgreSQL)

This document provides complete instructions for deploying the **ATHARVA TRAVELS Finance Management Portal** to production on **Netlify**, connected to a persistent hosted **PostgreSQL** database and durable private **Object Storage** (AWS S3 / Cloudflare R2 / Supabase Storage).

---

## 1. Architecture Overview

- **Frontend & API Framework:** Next.js 14 App Router (Server-Side Rendering, Dynamic API Routes, Strict Light Mode Apple UI).
- **Hosting Platform:** Netlify with `@netlify/plugin-nextjs` OpenNext adapter.
- **Primary Persistent Database:** Hosted PostgreSQL (Supabase, Neon, or AWS RDS).
- **ORM & Migrations:** Prisma ORM with idempotent `prisma migrate deploy` (zero data loss across redeploys).
- **Durable File Storage:** AWS S3 / Cloudflare R2 / Supabase Storage with AES256 server-side encryption for Excel workbooks and reports.
- **Session Security:** 7-day JWT tokens stored in `HttpOnly`, `SameSite=Lax`, `Secure` cookies with SHA-256 client fingerprinting and brute-force rate limiting.

---

## 2. Authorized Staff Credentials

Access is restricted strictly to the three authorized internal accounts:

| Name | Role | Email | Password |
|---|---|---|---|
| **Harish** | Super Admin | `harish.internal@atharvatravels.com` | `atharvatravels@internal` |
| **Bhaskar** | Finance Manager | `bhaskar.internal@atharvatravels.com` | `atharvatravels@internal` |
| **Hemaraj** | Operations & HR | `hemaraj.internal@atharvatravels.com` | `atharvatravels@internal` |

---

## 3. Netlify Build Configuration

The repository includes a production-ready `netlify.toml`:

```toml
[build]
  command = "npm run build"
  publish = ".next"

[build.environment]
  NODE_VERSION = "20"
  NEXT_TELEMETRY_DISABLED = "1"
  PRISMA_MIGRATE = "true"

[[plugins]]
  package = "@netlify/plugin-nextjs"
```

During build, `node scripts/prepare_prisma.js` automatically configures Prisma for PostgreSQL, includes Linux Lambda binary targets (`rhel-openssl-1.0.x`, `rhel-openssl-3.0.x`, `debian-openssl-3.0.x`), and deploys pending migrations without touching existing financial records.

---

## 4. Environment Variables Configuration

In the Netlify Dashboard, navigate to:
**Site configuration > Environment variables > Add a variable**

Configure the following:

| Variable | Description | Example Value |
|---|---|---|
| `DATABASE_URL` | Pooled PostgreSQL Connection URL | `postgresql://postgres.[ref]:[pass]@aws-0-ap-south-1.pooler.supabase.com:6543/postgres?pgbouncer=true` |
| `DIRECT_URL` | Direct PostgreSQL Connection URL (for migrations) | `postgresql://postgres.[ref]:[pass]@aws-0-ap-south-1.pooler.supabase.com:5432/postgres` |
| `JWT_SECRET` | Secret key for signing session tokens | `atharva_prod_secret_9f83a04294bce81932cf4` (min 32 chars) |
| `NEXTAUTH_URL` | Canonical public URL of your portal | `https://finance.atharvatravels.com` or `https://atharva-finance.netlify.app` |
| `NODE_ENV` | Application environment flag | `production` |
| `PRISMA_MIGRATE` | Run migrations during build | `true` |
| `S3_BUCKET` | Private Object Storage Bucket Name | `atharva-travels-private-storage` |
| `S3_REGION` | Storage Region | `ap-south-1` (or `auto` for Cloudflare R2) |
| `S3_ACCESS_KEY_ID` | Storage Access Key ID | `AKIAIOSFODNN7EXAMPLE` |
| `S3_SECRET_ACCESS_KEY`| Storage Secret Access Key | `wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY` |
| `S3_ENDPOINT` | Optional Custom S3 Endpoint URL | `https://<account-id>.r2.cloudflarestorage.com` (leave empty for AWS S3) |

---

## 5. Step-by-Step Deployment Guide

### Step 1: Push Repository to GitHub
Ensure sensitive workbooks and local dev files are excluded by `.gitignore` (which is already configured):
```bash
git init
git add .
git commit -m "feat: complete Atharva Travels Finance Portal production build"
git remote add origin https://github.com/<your-org>/atharva-travels-portal.git
git push -u origin main
```

### Step 2: Provision PostgreSQL Database (e.g. Supabase or Neon)
1. Create a new project in **Supabase** (or **Neon**).
2. Choose a region close to your users (e.g. `ap-south-1` Mumbai).
3. Copy the **Connection String (Transaction Pooler - port 6543)** for `DATABASE_URL`.
4. Copy the **Connection String (Session Direct - port 5432)** for `DIRECT_URL`.

### Step 3: Connect GitHub to Netlify
1. Log in to [Netlify](https://app.netlify.com).
2. Click **Add new site > Import an existing project**.
3. Select **GitHub** and authorize access to `atharva-travels-portal`.
4. Set Build command to: `npm run build`.
5. Set Publish directory to: `.next`.
6. Add the environment variables from Section 4.
7. Click **Deploy Site**.

### Step 4: Seed Authorized Staff Accounts & Initial Data
Once the initial deployment completes, the database tables will be created automatically by Prisma.
To seed the 3 authorized staff accounts into PostgreSQL, execute locally with your `DATABASE_URL`:
```bash
DATABASE_URL="your-production-postgresql-url" npm run prisma:seed-staff
```

If you wish to seed the initial reconciled August & September Excel records:
```bash
DATABASE_URL="your-production-postgresql-url" npm run db:seed
```

---

## 6. Durable Private Object Storage Setup

To ensure complete privacy and compliance:
1. Create a private bucket in **AWS S3** or **Cloudflare R2** named `atharva-travels-private-storage`.
2. Disable public access (all objects must be private).
3. Enable default server-side encryption with **Amazon S3 managed keys (SSE-S3 / AES256)**.
4. Attach an IAM user or API token with `s3:PutObject`, `s3:GetObject`, and `s3:ListBucket` permissions.
5. In the portal, all Excel downloads are delivered via secure, 5-minute presigned URLs generated server-side.

---

## 7. Automated Backups & Disaster Recovery

### Automated & On-Demand Backups
- Super Admins can navigate to **Settings / User Management** or send a request to `POST /api/backups`.
- A full relational JSON snapshot is generated and encrypted, then uploaded to `s3://atharva-travels-private-storage/backups/`.
- Audit logs capture every backup event with timestamp and actor.

### Database Recovery Procedure
To restore a backup into any environment:
```bash
node scripts/restore_backup.js backups/atharva_finance_backup_<timestamp>.json
```
The script safely upserts all users, financial periods, vehicles, billing lines, adjustments, and transactions within a resilient relational sequence.

---

## 8. Rollback Procedures

### Frontend / Application Rollback
Netlify supports instant zero-downtime rollbacks:
1. In the Netlify dashboard, go to **Deploys**.
2. Select any previously successful deploy.
3. Click **Publish deploy**.
4. The site rolls back instantly across Netlify's global edge network.

### Database Migration Safety
- Every Prisma migration in `prisma/migrations` is additive and idempotent.
- Deploying a new application build never drops existing tables or deletes historical periods.
- Financial figures for historical months (August & September 2026) are locked and protected.

---

## 9. Verification & Quality Assurance

Before releasing to management, verify that all 24 automated tests pass:
```bash
npm run test:persistence
```

### Manual Sign-off Checklist:
- [x] Login with `harish.internal@atharvatravels.com` / `atharvatravels@internal`.
- [x] Check dashboard totals: Gross ₹1,165,826.06 | Net ₹762,043.74 for September 2026.
- [x] Verify strict Apple Light Mode on all screens (`#F5F5F7` canvas, `#FFFFFF` cards, pill buttons).
- [x] Add a payment transaction and log out.
- [x] Log in as `bhaskar.internal@atharvatravels.com` and confirm the record persists.
- [x] Test vehicle soft deletion and restoration from Recycle Bin.
- [x] Verify Excel and PDF export downloads work properly.

