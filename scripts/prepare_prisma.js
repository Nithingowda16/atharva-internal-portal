const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Parse .env if present
const envPath = path.join(__dirname, '..', '.env');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  for (const line of envContent.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx !== -1) {
      const key = trimmed.slice(0, eqIdx).trim();
      const val = trimmed.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, '');
      if (!process.env[key]) {
        process.env[key] = val;
      }
    }
  }
}

const schemaPath = path.join(__dirname, '..', 'prisma', 'schema.prisma');
let schema = fs.readFileSync(schemaPath, 'utf8');

const dbUrl = process.env.DATABASE_URL || '';
const directUrl = process.env.DIRECT_URL || '';
const isPostgres = dbUrl.startsWith('postgres://') || dbUrl.startsWith('postgresql://');
const isNetlifyOrCI = process.env.NETLIFY === 'true' || process.env.CI === 'true' || process.env.VERCEL === 'true';

console.log(`[prepare_prisma] Detected database target: ${isPostgres ? 'PostgreSQL' : 'SQLite (Local)'}`);
console.log(`[prepare_prisma] Environment: ${isNetlifyOrCI ? 'CI/Deployment' : 'Local Development'}`);

// In CI/Netlify production, ensure RHEL/Debian OpenSSL binary targets for serverless functions
let binaryTargets = '["native"]';
if (isNetlifyOrCI || (isPostgres && process.env.INCLUDE_RHEL_ENGINES === 'true')) {
  binaryTargets = '["native", "rhel-openssl-1.0.x", "rhel-openssl-3.0.x", "debian-openssl-3.0.x"]';
}

const generatorBlock = `generator client {
  provider      = "prisma-client-js"
  binaryTargets = ${binaryTargets}
}`;

schema = schema.replace(/generator client \{[\s\S]*?\}/, generatorBlock);

if (isPostgres) {
  let datasourceBlock = `datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")`;
  if (directUrl) {
    datasourceBlock += `\n  directUrl = env("DIRECT_URL")`;
  }
  datasourceBlock += `\n}`;

  schema = schema.replace(/datasource db \{[\s\S]*?\}/, datasourceBlock);
  fs.writeFileSync(schemaPath, schema, 'utf8');
  console.log('[prepare_prisma] Updated schema.prisma for PostgreSQL.');

  console.log('[prepare_prisma] Running prisma generate...');
  execSync('npx prisma generate', { stdio: 'inherit' });

  if (process.env.PRISMA_MIGRATE === 'true' || isNetlifyOrCI) {
    console.log('[prepare_prisma] Applying database migrations to PostgreSQL...');
    try {
      execSync('npx prisma migrate deploy', { stdio: 'inherit' });
      console.log('[prepare_prisma] Migrations applied successfully.');
      console.log('[prepare_prisma] Ensuring authorized staff accounts...');
      execSync('node scripts/setup_real_users.js', { stdio: 'inherit' });
    } catch (e) {
      console.warn('[prepare_prisma] Migration warning (connection or permissions):', e.message);
    }
  }
} else {
  const datasourceBlock = `datasource db {
  provider = "sqlite"
  url      = "file:./dev.db"
}`;
  schema = schema.replace(/datasource db \{[\s\S]*?\}/, datasourceBlock);
  fs.writeFileSync(schemaPath, schema, 'utf8');
  console.log('[prepare_prisma] Updated schema.prisma for SQLite (Local/Dev).');

  console.log('[prepare_prisma] Running prisma generate...');
  execSync('npx prisma generate', { stdio: 'inherit' });
}

console.log('[prepare_prisma] Prisma preparation complete.');
