const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

const VIEWER_PERMISSIONS = [
  'VIEW_DASHBOARD',
  'VIEW_FINANCE',
  'VIEW_FLEET',
  'VIEW_DRIVERS',
  'VIEW_COMPANIES',
  'VIEW_BILLING',
  'VIEW_PAYMENTS',
  'VIEW_ADJUSTMENTS',
  'VIEW_REPORTS',
  'VIEW_AUDIT',
  'VIEW_ARCHIVE',
];

const SUPER_ADMIN_PERMISSIONS = [
  'ALL_PERMISSIONS',
  'VIEW_DASHBOARD',
  'VIEW_FINANCE',
  'EDIT_FINANCE',
  'DELETE_FINANCE',
  'RESTORE_FINANCE',
  'REVERT_VERSIONS',
  'CREATE_MONTH',
  'APPROVE_PAYMENTS',
  'UPDATE_PAYMENTS',
  'VIEW_FLEET',
  'MANAGE_FLEET',
  'VIEW_DRIVERS',
  'MANAGE_DRIVERS',
  'VIEW_COMPANIES',
  'MANAGE_COMPANIES',
  'VIEW_BILLING',
  'VIEW_PAYMENTS',
  'VIEW_ADJUSTMENTS',
  'VIEW_REPORTS',
  'EXPORT_DATA',
  'IMPORT_DATA',
  'MANAGE_USERS',
  'VIEW_AUDIT',
  'MANAGE_BACKUPS',
  'REVEAL_SENSITIVE',
];

async function seedAuthorizedAccounts() {
  console.log('--- PROVISIONING EXACT AUTHORIZED RBAC USER ACCOUNTS ---');

  const defaultPassword = 'atharvatravels@internal';
  const salt = await bcrypt.genSalt(10);
  const defaultPasswordHash = await bcrypt.hash(defaultPassword, salt);

  const targetAccounts = [
    {
      email: 'bhaskar.internal@atharvatravels.com',
      name: 'Bhaskar',
      role: 'SUPER_ADMIN',
      permissions: JSON.stringify(SUPER_ADMIN_PERMISSIONS),
      legacyEmails: [],
    },
    {
      email: 'harish.interval@atharvatravels.com',
      name: 'Harish',
      role: 'VIEWER',
      permissions: JSON.stringify(VIEWER_PERMISSIONS),
      legacyEmails: ['harish.internal@atharvatravels.com'],
    },
    {
      email: 'hemaraj.interval@atharvatravels.com',
      name: 'Hemaraj',
      role: 'VIEWER',
      permissions: JSON.stringify(VIEWER_PERMISSIONS),
      legacyEmails: ['hemaraj.internal@atharvatravels.com'],
    },
  ];

  for (const acc of targetAccounts) {
    // Check if target email exists
    let existing = await prisma.user.findUnique({ where: { email: acc.email } });

    // Check if legacy email exists (to migrate without breaking foreign keys)
    if (!existing && acc.legacyEmails.length > 0) {
      for (const leg of acc.legacyEmails) {
        const legacyUser = await prisma.user.findUnique({ where: { email: leg } });
        if (legacyUser) {
          existing = await prisma.user.update({
            where: { id: legacyUser.id },
            data: {
              email: acc.email,
              name: acc.name,
              role: acc.role,
              permissions: acc.permissions,
              isAllowed: true,
            },
          });
          console.log(`  Migrated legacy account ${leg} -> ${acc.email} (${acc.role})`);
          break;
        }
      }
    }

    if (existing) {
      // Update role and permissions, never overwrite password if already set
      await prisma.user.update({
        where: { id: existing.id },
        data: {
          email: acc.email,
          name: acc.name,
          role: acc.role,
          permissions: acc.permissions,
          isAllowed: true,
        },
      });
      console.log(`  Updated authorized account: ${acc.email} [${acc.role}]`);
    } else {
      await prisma.user.create({
        data: {
          email: acc.email,
          name: acc.name,
          role: acc.role,
          passwordHash: defaultPasswordHash,
          permissions: acc.permissions,
          isAllowed: true,
        },
      });
      console.log(`  Created authorized account: ${acc.email} [${acc.role}]`);
    }
  }

  // Ensure any other accounts are deactivated
  const authorizedEmails = targetAccounts.map((a) => a.email);
  const deactivated = await prisma.user.updateMany({
    where: {
      email: { notIn: authorizedEmails },
      isAllowed: true,
    },
    data: {
      isAllowed: false,
    },
  });
  if (deactivated.count > 0) {
    console.log(`  Deactivated ${deactivated.count} unauthorized or non-allowlisted accounts.`);
  }

  const activeUsers = await prisma.user.findMany({ where: { isAllowed: true } });
  console.log(`\nActive Authorized Accounts in Portal (${activeUsers.length}):`);
  for (const u of activeUsers) {
    console.log(`  - ${u.name} <${u.email}> Role: ${u.role}`);
  }
}

if (require.main === module) {
  seedAuthorizedAccounts()
    .catch((e) => {
      console.error('Provisioning failed:', e);
      process.exit(1);
    })
    .finally(() => prisma.$disconnect());
}

module.exports = { seedAuthorizedAccounts, VIEWER_PERMISSIONS, SUPER_ADMIN_PERMISSIONS };
