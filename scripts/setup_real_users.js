const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  const commonPassword = 'atharvatravels@internal';
  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash(commonPassword, salt);

  const realAccounts = [
    {
      email: 'harish.internal@atharvatravels.com',
      name: 'Harish',
      role: 'SUPER_ADMIN',
      permissions: JSON.stringify([
        'ALL_PERMISSIONS',
        'MANAGE_USERS',
        'VIEW_FINANCE',
        'EDIT_FINANCE',
        'DELETE_FINANCE',
        'PURGE_RECORDS',
        'CREATE_MONTH',
        'MANAGE_BACKUPS',
      ]),
      isAllowed: true,
    },
    {
      email: 'bhaskar.internal@atharvatravels.com',
      name: 'Bhaskar',
      role: 'FINANCE_MANAGER',
      permissions: JSON.stringify([
        'VIEW_FINANCE',
        'EDIT_FINANCE',
        'DELETE_FINANCE',
        'RESTORE_FINANCE',
        'CREATE_MONTH',
        'APPROVE_PAYMENTS',
        'REVERT_VERSIONS',
      ]),
      isAllowed: true,
    },
    {
      email: 'hemaraj.internal@atharvatravels.com',
      name: 'Hemaraj',
      role: 'OPERATIONS',
      permissions: JSON.stringify([
        'VIEW_FINANCE',
        'EDIT_FINANCE',
        'ADD_REMARKS',
        'UPDATE_PAYMENTS',
        'VIEW_VEHICLES',
        'VIEW_REPORTS',
      ]),
      isAllowed: true,
    },
  ];

  console.log('Setting up real Atharva Travels internal user accounts...');

  for (const acc of realAccounts) {
    const existing = await prisma.user.findUnique({ where: { email: acc.email } });
    if (existing) {
      await prisma.user.update({
        where: { email: acc.email },
        data: {
          name: acc.name,
          role: acc.role,
          passwordHash,
          permissions: acc.permissions,
          isAllowed: true,
        },
      });
      console.log(`  Updated account: ${acc.email} (${acc.role})`);
    } else {
      await prisma.user.create({
        data: {
          email: acc.email,
          name: acc.name,
          role: acc.role,
          passwordHash,
          permissions: acc.permissions,
          isAllowed: true,
        },
      });
      console.log(`  Created account: ${acc.email} (${acc.role})`);
    }
  }

  // Also remove the old placeholder internal accounts if they exist, or keep them disabled
  const oldEmails = [
    'admin@atharvatravels.internal',
    'finance@atharvatravels.internal',
    'ops@atharvatravels.internal',
  ];

  for (const oldEmail of oldEmails) {
    try {
      await prisma.user.delete({ where: { email: oldEmail } });
      console.log(`  Removed old placeholder account: ${oldEmail}`);
    } catch (e) {
      // Ignore if foreign key or not found
      await prisma.user.update({
        where: { email: oldEmail },
        data: { isAllowed: false }
      }).catch(() => {});
    }
  }

  const allUsers = await prisma.user.findMany({ where: { isAllowed: true } });
  console.log('\nActive Authorized Accounts in DB:');
  for (const u of allUsers) {
    console.log(` - ${u.name} <${u.email}> [${u.role}] (isAllowed: ${u.isAllowed})`);
  }
}

main().finally(() => prisma.$disconnect());

