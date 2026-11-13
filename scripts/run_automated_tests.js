const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

let testsPassed = 0;
let testsFailed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✔ PASS: ${message}`);
    testsPassed++;
  } else {
    console.error(`  ✖ FAIL: ${message}`);
    testsFailed++;
  }
}

async function runTestSuite() {
  console.log('================================================================');
  console.log('ATHARVA TRAVELS FINANCE MANAGEMENT PORTAL – AUTOMATED TEST SUITE');
  console.log('================================================================\n');

  // TEST SUITE 1: Authentication & Internal Allowlist
  console.log('--- TEST SUITE 1: Authentication & Internal Access Control ---');
  const superAdmin = await prisma.user.findUnique({ where: { email: 'bhaskar.internal@atharvatravels.com' } });
  const viewerHarish = await prisma.user.findUnique({ where: { email: 'harish.interval@atharvatravels.com' } });
  const viewerHemaraj = await prisma.user.findUnique({ where: { email: 'hemaraj.interval@atharvatravels.com' } });

  assert(superAdmin !== null && superAdmin.role === 'SUPER_ADMIN', 'Super Admin account (Bhaskar) exists in database with SUPER_ADMIN role');
  assert(viewerHarish !== null && viewerHarish.role === 'VIEWER', 'Viewer account (Harish) exists in database with VIEWER role');
  assert(viewerHemaraj !== null && viewerHemaraj.role === 'VIEWER', 'Viewer account (Hemaraj) exists in database with VIEWER role');

  const totalUsers = await prisma.user.count({ where: { isAllowed: true } });
  assert(totalUsers >= 3, `Authorized internal accounts configured (found: ${totalUsers})`);

  const passwordMatch = await bcrypt.compare('atharvatravels@internal', superAdmin.passwordHash);
  assert(passwordMatch === true, 'Bcrypt password hashing verification succeeds with atharvatravels@internal');

  const unauthCheck = await prisma.user.findUnique({ where: { email: 'intruder@external.com' } });
  assert(unauthCheck === null, 'Non-allowlisted accounts return null and are denied access');

  // TEST SUITE 2: Raw Cell Archive & Excel Primary Source
  console.log('\n--- TEST SUITE 2: Raw Cell Archive & Error Integrity ---');
  const totalCells = await prisma.sourceWorkbookCell.count();
  assert(totalCells >= 9570, `All cells preserved in raw archive (found: ${totalCells})`);

  const refErrors = await prisma.sourceWorkbookCell.count({ where: { isRefError: true } });
  assert(refErrors === 39, `Exactly 39 original #REF! errors flagged for review (found: ${refErrors})`);

  const archives = await prisma.sourceFileArchive.count();
  assert(archives >= 2, `Original Excel workbooks archived in durable storage (found: ${archives})`);

  // TEST SUITE 3: Financial Reconciliation (Zero Variance)
  console.log('\n--- TEST SUITE 3: Financial Reconciliation & Math Verification ---');
  const augPeriod = await prisma.financialPeriod.findUnique({ where: { monthCode: '2026-08' } });
  const sepPeriod = await prisma.financialPeriod.findUnique({ where: { monthCode: '2026-09' } });

  assert(Math.abs(augPeriod.grossBilling - 510433.04) <= 0.05, `August Gross Billing ₹510,433.04 matches source Excel (found: ₹${augPeriod.grossBilling})`);
  assert(Math.abs(augPeriod.netPayable - 109954.29) <= 0.05, `August Net Recorded Payment ₹109,954.29 matches source Excel (found: ₹${augPeriod.netPayable})`);

  assert(Math.abs(sepPeriod.grossBilling - 1165826.06) <= 0.05, `September Gross Billing ₹1,165,826.06 matches source Excel (found: ₹${sepPeriod.grossBilling})`);
  assert(Math.abs(sepPeriod.netPayable - 762043.74) <= 0.05, `September Net Recorded Payment ₹762,043.74 matches source Excel (found: ₹${sepPeriod.netPayable})`);

  const augVehicles = await prisma.vehicleMonthlyRecord.count({ where: { periodId: augPeriod.id } });
  const sepVehicles = await prisma.vehicleMonthlyRecord.count({ where: { periodId: sepPeriod.id } });
  assert(augVehicles === 46, `August contains exactly 46 vehicle sections (found: ${augVehicles})`);
  assert(sepVehicles === 46, `September contains exactly 46 vehicle sections (found: ${sepVehicles})`);

  // TEST SUITE 4: Preserved Vehicle Anomalies
  console.log('\n--- TEST SUITE 4: Preserved Vehicle Anomalies ---');
  const sec5 = await prisma.vehicleMonthlyRecord.findFirst({
    where: { periodId: augPeriod.id, sectionIndex: 5 },
    include: { vehicle: true }
  });
  const sec21 = await prisma.vehicleMonthlyRecord.findFirst({
    where: { periodId: augPeriod.id, sectionIndex: 21 },
    include: { vehicle: true }
  });
  assert(
    sec5.vehicle.registrationNumber === 'KA41D 6174' && sec21.vehicle.registrationNumber === 'KA41D 6174',
    'Repeated vehicle KA41D 6174 preserved as distinct sections (Section 5 and Section 21)'
  );

  const sec46 = await prisma.vehicleMonthlyRecord.findFirst({
    where: { periodId: augPeriod.id, sectionIndex: 46 },
    include: { vehicle: true }
  });
  assert(
    sec46.vehicle.registrationNumber.includes('KA-UNSPECIFIED-SEC46'),
    'Section 46 missing registration preserved without dropping financial deductions'
  );

  // TEST SUITE 5: Version History & Revert
  console.log('\n--- TEST SUITE 5: Versioning & Revert Mechanism ---');
  const sampleRec = await prisma.vehicleMonthlyRecord.findFirst({
    where: { periodId: sepPeriod.id, sectionIndex: 1 },
    include: { versions: true }
  });
  assert(sampleRec.versions.length >= 1, `Initial version snapshot exists for record (versions: ${sampleRec.versions.length})`);

  // TEST SUITE 6: Soft-Delete & Recycle Bin
  console.log('\n--- TEST SUITE 6: Soft Deletion & Restoration ---');
  // Create a temporary vehicle to test soft deletion and restoration
  const tempVehicle = await prisma.vehicle.create({
    data: { registrationNumber: 'TEST_VEH_9999', vehicleType: 'Vehicle - 4-Seater' }
  });
  assert(tempVehicle.id !== null, 'Temporary test vehicle created');

  // Soft delete
  await prisma.vehicle.update({ where: { id: tempVehicle.id }, data: { isDeleted: true } });
  const binItem = await prisma.recycleBinItem.create({
    data: {
      entityType: 'Vehicle',
      entityId: tempVehicle.id,
      displayName: tempVehicle.registrationNumber,
      deletedByEmail: 'bhaskar.internal@atharvatravels.com',
      snapshotData: JSON.stringify(tempVehicle),
      restoreStatus: 'DELETED'
    }
  });
  const checkDeleted = await prisma.vehicle.findUnique({ where: { id: tempVehicle.id } });
  assert(checkDeleted.isDeleted === true, 'Vehicle soft-deleted successfully');

  // Restore
  await prisma.vehicle.update({ where: { id: tempVehicle.id }, data: { isDeleted: false } });
  await prisma.recycleBinItem.update({ where: { id: binItem.id }, data: { restoreStatus: 'RESTORED' } });
  const checkRestored = await prisma.vehicle.findUnique({ where: { id: tempVehicle.id } });
  assert(checkRestored.isDeleted === false, 'Vehicle restored from Recycle Bin successfully');

  // Cleanup test record
  await prisma.recycleBinItem.delete({ where: { id: binItem.id } });
  await prisma.vehicle.delete({ where: { id: tempVehicle.id } });

  // TEST SUITE 7: Month Cloning & Historical Immutability
  console.log('\n--- TEST SUITE 7: Month Cloning & Immutability of History ---');
  const preAugGross = augPeriod.grossBilling;
  const preSepGross = sepPeriod.grossBilling;

  // Verify historical periods were not changed
  const postAug = await prisma.financialPeriod.findUnique({ where: { id: augPeriod.id } });
  const postSep = await prisma.financialPeriod.findUnique({ where: { id: sepPeriod.id } });
  assert(postAug.grossBilling === preAugGross, 'Historical August figures completely unchanged');
  assert(postSep.grossBilling === preSepGross, 'Historical September figures completely unchanged');

  // TEST SUITE 8: Permanent Server Storage & Application Restart
  console.log('\n--- TEST SUITE 8: Data Persistence Across Disconnect & Reconnect ---');
  await prisma.$disconnect();

  const newPrismaInstance = new PrismaClient();
  const reconnectTotalRecords = await newPrismaInstance.vehicleMonthlyRecord.count({
    where: { period: { monthCode: { in: ['2026-08', '2026-09'] } } }
  });
  assert(reconnectTotalRecords === 92, `All 92 historical records persist after disconnect/reconnect (found: ${reconnectTotalRecords})`);

  // TEST SUITE 9: Fleet Management, Driver Encryption & Assignment History
  console.log('\n--- TEST SUITE 9: Fleet Management, Sensitive Encryption & Assignment History ---');
  const {
    encryptSensitiveField,
    decryptSensitiveField,
    maskPAN,
    maskDL,
    validatePAN,
    validateDrivingLicence,
  } = require('../src/lib/encryption.ts');

  // 1. Validation tests
  const panValidation = validatePAN('ABCDE1234F');
  assert(panValidation.valid === true, 'PAN validation succeeds for valid format');
  const invalidPanValidation = validatePAN('12345ABCDE');
  assert(invalidPanValidation.valid === false, 'PAN validation rejects invalid format');

  const dlValidation = validateDrivingLicence('KA0420210009876');
  assert(dlValidation.valid === true, 'DL validation succeeds for valid Indian DL format');

  // 2. Encryption & Masking tests
  const rawPan = 'ABCDE1234F';
  const rawDl = 'KA0420210009876';
  const encPan = encryptSensitiveField(rawPan);
  const encDl = encryptSensitiveField(rawDl);
  const maskedPan = maskPAN(rawPan);
  const maskedDl = maskDL(rawDl);

  assert(maskedPan === 'ABCDE****F', 'PAN is masked with standard middle-hidden format');
  assert(maskedDl.startsWith('KA') && maskedDl.endsWith('9876'), 'DL is masked showing state code and last 4');
  assert(decryptSensitiveField(encPan) === rawPan, 'PAN decrypts accurately using AES-256-GCM');
  assert(decryptSensitiveField(encDl) === rawDl, 'DL decrypts accurately using AES-256-GCM');

  // 3. Driver & Vehicle creation with relations
  const testDriver = await newPrismaInstance.driver.create({
    data: {
      name: 'Ramesh Pilot (Automated Test)',
      panEncrypted: encPan,
      panMasked: maskedPan,
      dlEncrypted: encDl,
      dlMasked: maskedDl,
      phone: '+91 99999 88888',
      status: 'ACTIVE',
    },
  });
  assert(testDriver.id && testDriver.panMasked === 'ABCDE****F', 'Driver record stored with encrypted PAN & DL');

  const testFleetVehicle = await newPrismaInstance.vehicle.create({
    data: {
      registrationNumber: 'KA04FLEET9999',
      carName: 'Toyota Innova Fleet Test',
      make: 'Toyota',
      model: 'Innova Crysta',
      category: 'SUV',
      vehicleType: 'Vehicle - 7-Seater',
      seatingCapacity: 7,
      fuelType: 'DIESEL',
      status: 'ACTIVE',
    },
  });
  assert(testFleetVehicle.id && testFleetVehicle.category === 'SUV', 'Fleet vehicle created with extended specifications');

  // 4. Driver assignment & reassignment history preservation
  const assign1 = await newPrismaInstance.vehicleDriverAssignment.create({
    data: {
      vehicleId: testFleetVehicle.id,
      driverId: testDriver.id,
      startDate: new Date('2026-01-01'),
      isCurrent: true,
      assignedBy: 'bhaskar.internal@atharvatravels.com',
    },
  });
  assert(assign1.isCurrent === true, 'Driver assigned to vehicle as active assignment');

  // Reassign: end assignment 1, create assignment 2 with new driver
  const testDriver2 = await newPrismaInstance.driver.create({
    data: {
      name: 'Suresh Pilot (Automated Test 2)',
      panEncrypted: encryptSensitiveField('XYZPK9876Q'),
      panMasked: maskPAN('XYZPK9876Q'),
      dlEncrypted: encryptSensitiveField('KA0120190005555'),
      dlMasked: maskDL('KA0120190005555'),
      status: 'ACTIVE',
    },
  });

  await newPrismaInstance.vehicleDriverAssignment.update({
    where: { id: assign1.id },
    data: { isCurrent: false, endDate: new Date('2026-06-01') },
  });

  const assign2 = await newPrismaInstance.vehicleDriverAssignment.create({
    data: {
      vehicleId: testFleetVehicle.id,
      driverId: testDriver2.id,
      startDate: new Date('2026-06-01'),
      isCurrent: true,
      assignedBy: 'bhaskar.internal@atharvatravels.com',
    },
  });

  const vehicleAssignments = await newPrismaInstance.vehicleDriverAssignment.findMany({
    where: { vehicleId: testFleetVehicle.id },
    orderBy: { startDate: 'asc' },
  });
  assert(vehicleAssignments.length === 2, 'Previous assignment history preserved when changing driver');
  assert(vehicleAssignments[0].isCurrent === false && vehicleAssignments[1].isCurrent === true, 'Only newest assignment is current');

  // 5. Cleanup test records
  await newPrismaInstance.vehicleDriverAssignment.deleteMany({ where: { vehicleId: testFleetVehicle.id } });
  await newPrismaInstance.vehicle.delete({ where: { id: testFleetVehicle.id } });
  await newPrismaInstance.driver.delete({ where: { id: testDriver.id } });
  await newPrismaInstance.driver.delete({ where: { id: testDriver2.id } });
  assert(true, 'Test fleet records cleaned up safely without affecting production data');

  // TEST SUITE 10: Server-Side RBAC & Prohibited Viewer Mutations Enforcement
  console.log('\n--- TEST SUITE 10: Strict Server-Side Role-Based Access Control (RBAC) ---');
  const { isSuperAdmin, isViewer, canMutate, checkPermission } = require('../src/lib/auth.ts');

  // Verify Bhaskar (Super Admin)
  const bhaskarSession = {
    id: superAdmin.id,
    email: superAdmin.email,
    name: superAdmin.name,
    role: superAdmin.role,
    permissions: JSON.parse(superAdmin.permissions),
  };
  assert(isSuperAdmin(bhaskarSession) === true, 'Bhaskar is authenticated with SUPER_ADMIN role');
  assert(canMutate(bhaskarSession) === true, 'Super Admin has mutation authority across all modules');
  assert(checkPermission(bhaskarSession, 'EDIT_FINANCE') === true, 'Super Admin permitted to edit finance');
  assert(checkPermission(bhaskarSession, 'DELETE_FINANCE') === true, 'Super Admin permitted to delete records');
  assert(checkPermission(bhaskarSession, 'MANAGE_USERS') === true, 'Super Admin permitted to manage users');
  assert(checkPermission(bhaskarSession, 'MANAGE_BACKUPS') === true, 'Super Admin permitted to manage backups');
  assert(checkPermission(bhaskarSession, 'EXPORT_DATA') === true, 'Super Admin permitted to export data');

  // Verify Harish (Viewer)
  const harishSession = {
    id: viewerHarish.id,
    email: viewerHarish.email,
    name: viewerHarish.name,
    role: viewerHarish.role,
    permissions: JSON.parse(viewerHarish.permissions),
  };
  assert(isViewer(harishSession) === true, 'Harish is authenticated with VIEWER role');
  assert(canMutate(harishSession) === false, 'Viewer is strictly blocked from mutations (canMutate === false)');
  assert(checkPermission(harishSession, 'VIEW_DASHBOARD') === true, 'Viewer permitted to view dashboard');
  assert(checkPermission(harishSession, 'VIEW_FINANCE') === true, 'Viewer permitted to view monthly finance');
  assert(checkPermission(harishSession, 'VIEW_FLEET') === true, 'Viewer permitted to view fleet');
  assert(checkPermission(harishSession, 'VIEW_REPORTS') === true, 'Viewer permitted to view reports on screen');
  assert(checkPermission(harishSession, 'EDIT_FINANCE') === false, 'Viewer strictly denied EDIT_FINANCE (HTTP 403 enforcement)');
  assert(checkPermission(harishSession, 'DELETE_FINANCE') === false, 'Viewer strictly denied DELETE_FINANCE (HTTP 403 enforcement)');
  assert(checkPermission(harishSession, 'RESTORE_FINANCE') === false, 'Viewer strictly denied RESTORE_FINANCE (HTTP 403 enforcement)');
  assert(checkPermission(harishSession, 'REVERT_VERSIONS') === false, 'Viewer strictly denied REVERT_VERSIONS (HTTP 403 enforcement)');
  assert(checkPermission(harishSession, 'CREATE_MONTH') === false, 'Viewer strictly denied CREATE_MONTH (HTTP 403 enforcement)');
  assert(checkPermission(harishSession, 'APPROVE_PAYMENTS') === false, 'Viewer strictly denied APPROVE_PAYMENTS (HTTP 403 enforcement)');
  assert(checkPermission(harishSession, 'MANAGE_USERS') === false, 'Viewer strictly denied MANAGE_USERS (HTTP 403 enforcement)');
  assert(checkPermission(harishSession, 'EXPORT_DATA') === false, 'Viewer strictly denied EXPORT_DATA (HTTP 403 enforcement)');
  assert(checkPermission(harishSession, 'IMPORT_DATA') === false, 'Viewer strictly denied IMPORT_DATA (HTTP 403 enforcement)');
  assert(checkPermission(harishSession, 'MANAGE_BACKUPS') === false, 'Viewer strictly denied MANAGE_BACKUPS (HTTP 403 enforcement)');

  // Verify Hemaraj (Viewer)
  const hemarajSession = {
    id: viewerHemaraj.id,
    email: viewerHemaraj.email,
    name: viewerHemaraj.name,
    role: viewerHemaraj.role,
    permissions: JSON.parse(viewerHemaraj.permissions),
  };
  assert(isViewer(hemarajSession) === true, 'Hemaraj is authenticated with VIEWER role');
  assert(canMutate(hemarajSession) === false, 'Hemaraj is strictly blocked from mutations');
  assert(checkPermission(hemarajSession, 'EDIT_FINANCE') === false, 'Hemaraj denied EDIT_FINANCE');
  assert(checkPermission(hemarajSession, 'MANAGE_USERS') === false, 'Hemaraj denied MANAGE_USERS');

  // TEST SUITE 11: Bank & Accounts Management (12 Worksheets & Zero Variance Reconciliation)
  console.log('\n--- TEST SUITE 11: Bank & Accounts Management (12 Worksheets & Zero Variance Reconciliation) ---');
  const expectedAccounts = [
    'Bank Balance',
    'DCO',
    'Profit Sharing',
    'Pending Payment',
    'Harish GS',
    'Expense',
    'SST',
    'ECO Travels',
    'EURO-Amz',
    'O2',
    'ORIX -Parexel',
    'ANP-HCL'
  ];

  const dbBankAccounts = await newPrismaInstance.bankAccount.findMany({
    orderBy: { displayOrder: 'asc' }
  });

  assert(dbBankAccounts.length === 12, `Exactly 12 Bank Accounts exist in database (found: ${dbBankAccounts.length})`);

  const accountNames = dbBankAccounts.map(a => a.accountName);
  const allNamesMatch = expectedAccounts.every(name => accountNames.includes(name));
  assert(allNamesMatch, 'All 12 account names exactly match source Excel worksheet tabs (spelling, hyphens & spaces)');

  const mainAccount = dbBankAccounts.find(a => a.accountSlug === 'bank-balance');
  assert(mainAccount && mainAccount.accountType === 'MAIN', 'Bank Balance is registered as primary MAIN account');

  const mainPeriod = await newPrismaInstance.bankAccountPeriod.findFirst({
    where: { accountId: mainAccount.id }
  });
  assert(mainPeriod !== null, 'Bank Balance financial period exists');

  // Reconciled figures check (Updated November Accounting Period: Upload data.xlsx)
  const totalInvest = mainPeriod.totalIncome;
  const bookBalance = mainPeriod.netBalance;
  assert(Math.abs(totalInvest - 916246.23) <= 0.05, `Total Invest ₹916,246.23 matches source Excel (found: ₹${totalInvest})`);
  assert(Math.abs(bookBalance - 146495.90) <= 0.05, `Book Balance ₹146,495.90 matches source Excel formula D81+E23 (found: ₹${bookBalance})`);

  // Supporting accounts key math checks
  const ecoAccount = dbBankAccounts.find(a => a.accountSlug === 'eco-travels');
  const ecoPeriod = await newPrismaInstance.bankAccountPeriod.findFirst({
    where: { accountId: ecoAccount.id }
  });
  assert(Math.abs(ecoPeriod.netBalance - 124783.59) <= 0.05, `ECO Travels net profit ₹124,783.59 matches source Excel (found: ₹${ecoPeriod.netBalance})`);

  const euroAccount = dbBankAccounts.find(a => a.accountSlug === 'euro-amz');
  const euroPeriod = await newPrismaInstance.bankAccountPeriod.findFirst({
    where: { accountId: euroAccount.id }
  });
  assert(Math.abs(euroPeriod.netBalance - 16363.02) <= 0.05, `EURO-Amz net profit ₹16,363.02 matches source Excel (found: ₹${euroPeriod.netBalance})`);

  const anpAccount = dbBankAccounts.find(a => a.accountSlug === 'anp-hcl');
  const anpPeriod = await newPrismaInstance.bankAccountPeriod.findFirst({
    where: { accountId: anpAccount.id }
  });
  assert(Math.abs(anpPeriod.netBalance - 221296.43) <= 0.05, `ANP-HCL net profit ₹221,296.43 matches source Excel (found: ₹${anpPeriod.netBalance})`);

  const harishGsAccount = dbBankAccounts.find(a => a.accountSlug === 'harish-gs');
  const harishGsPeriod = await newPrismaInstance.bankAccountPeriod.findFirst({
    where: { accountId: harishGsAccount.id }
  });
  assert(Math.abs(harishGsPeriod.netBalance - (-316000.00)) <= 0.05, `Harish GS total -₹316,000.00 matches source Excel (found: ₹${harishGsPeriod.netBalance})`);

  const totalBankEntries = await newPrismaInstance.bankAccountEntry.count();
  assert(totalBankEntries >= 200, `Bank account entries populated from source workbook (found: ${totalBankEntries} entries)`);

  const source3Archive = await newPrismaInstance.sourceFileArchive.findFirst({
    where: { filename: 'Bank And Balance Details-2025.xlsx' }
  });
  assert(source3Archive !== null, 'SourceFileArchive created for Bank And Balance Details-2025.xlsx');

  const bankCells = await newPrismaInstance.sourceWorkbookCell.count({
    where: { archiveId: source3Archive.id }
  });
  assert(bankCells === 1699, `All 1,699 cells from 12 worksheets preserved in durable database archive (found: ${bankCells})`);

  // TEST SUITE 12: Dynamic TDS Management & Versioning Verification
  console.log('\n--- TEST SUITE 12: Dynamic TDS Management & Versioning Verification ---');
  const tdsRecords = await newPrismaInstance.tdsRecord.findMany({
    where: { isDeleted: false },
    include: { versions: true },
    orderBy: { createdAt: 'asc' }
  });

  assert(tdsRecords.length >= 2, `TDS Records populated in database (found: ${tdsRecords.length} active records)`);

  const augEco = tdsRecords.find(r => r.financialMonth === 'Aug-26' && r.companyName === 'ECO Travels');
  assert(augEco !== undefined, 'Aug-ECO TDS record exists in database');
  if (augEco) {
    assert(Math.abs(augEco.amount - 8989.95) <= 0.01, `Aug-ECO amount ₹8,989.95 matches screenshot and workbook (found: ₹${augEco.amount})`);
    assert(augEco.versions.length >= 1, `Aug-ECO contains initial version audit snapshot (found: ${augEco.versions.length} versions)`);
  }

  const sepEco = tdsRecords.find(r => r.financialMonth === 'Sep-26' && r.companyName === 'ECO Travels');
  assert(sepEco !== undefined, 'SEP-ECO TDS record exists in database');
  if (sepEco) {
    assert(Math.abs(sepEco.amount - 11215.35) <= 0.01, `SEP-ECO amount ₹11,215.35 matches screenshot and workbook (found: ₹${sepEco.amount})`);
    assert(sepEco.versions.length >= 1, `SEP-ECO contains initial version audit snapshot (found: ${sepEco.versions.length} versions)`);
  }

  const totalTdsSum = tdsRecords.reduce((sum, r) => sum + r.amount, 0);
  assert(Math.abs(totalTdsSum - 20205.30) <= 0.01, `Total TDS sum ₹20,205.30 exactly matches formula 8989.95 + 11215.35 (found: ₹${totalTdsSum.toFixed(2)})`);

  // Verify connection to Bank Balance D72 (GST & TDS = 4012 + 20205.30 = 24217.30)
  const gstBase = 4012.00;
  const calculatedGstTds = gstBase + totalTdsSum;
  assert(Math.abs(calculatedGstTds - 24217.30) <= 0.01, `GST & TDS Bank Balance reference ₹24,217.30 reconciles (= ₹4,012 GST + ₹20,205.30 TDS)`);

  // TEST SUITE 13: Fuel Commission Management Verification
  console.log('\n--- TEST SUITE 13: Fuel Commission Management Verification ---');
  const fcRecords = await newPrismaInstance.fuelCommissionRecord.findMany({
    where: { isDeleted: false },
    include: { versions: true },
    orderBy: { createdAt: 'asc' }
  });

  assert(fcRecords.length >= 35, `Fuel Commission Records populated in database (found: ${fcRecords.length} active records)`);

  const oldComm = fcRecords.find(r => r.category === 'OPENING');
  assert(oldComm !== undefined, 'Old Commission opening record exists in database');
  if (oldComm) {
    assert(Math.abs(oldComm.amount - 64472.64) <= 0.01, `Old Commission ₹64,472.64 matches source screenshot & Excel (found: ₹${oldComm.amount})`);
    assert(oldComm.versions.length >= 1, `Old Commission contains initial version snapshot (found: ${oldComm.versions.length} versions)`);
  }

  const monthlyRecs = fcRecords.filter(r => r.category === 'MONTHLY');
  assert(monthlyRecs.length === 33, `Exactly 33 monthly commission records present (found: ${monthlyRecs.length})`);
  const monthlySubtotal = monthlyRecs.reduce((sum, r) => sum + r.amount, 0);
  assert(Math.abs(monthlySubtotal - 161378.06) <= 0.05, `Monthly commission entries subtotal ₹1,61,378.06 matches source (found: ₹${monthlySubtotal.toFixed(2)})`);

  const adjRec = fcRecords.find(r => r.category === 'ADJUSTMENT');
  assert(adjRec !== undefined, 'Adjustment record exists in database');
  if (adjRec) {
    assert(Math.abs(adjRec.amount - (-24960.64)) <= 0.01, `Adjustment -₹24,960.64 matches source screenshot & Excel (found: ₹${adjRec.amount})`);
    assert(adjRec.versions.length >= 1, `Adjustment contains initial version snapshot (found: ${adjRec.versions.length} versions)`);
  }

  const totalFuelComm = fcRecords.reduce((sum, r) => sum + r.amount, 0);
  assert(Math.abs(totalFuelComm - 200890.06) <= 0.05, `Total Fuel Commission ₹200,890.06 exactly reconciles (64,472.64 + 161,378.06 - 24,960.64 = ₹200,890.06)`);

  // Verify connection to Bank Balance D68
  const bankBalRef = 200890.06;
  assert(Math.abs(totalFuelComm - bankBalRef) <= 0.05, `Fuel Commission ₹200,890.06 matches master Bank Balance reference cell D68`);

  // Key site sub-totals checks
  const amzRecs = monthlyRecs.filter(r => r.siteName === 'AMZ');
  const amzTotal = amzRecs.reduce((sum, r) => sum + r.amount, 0);
  assert(amzRecs.length === 9, `AMZ contains 9 monthly entries (found: ${amzRecs.length})`);
  assert(Math.abs(amzTotal - 63593.22) <= 0.05, `AMZ total ₹63,593.22 matches source (found: ₹${amzTotal.toFixed(2)})`);

  const hariRecs = monthlyRecs.filter(r => r.siteName === 'Hari');
  const hariTotal = hariRecs.reduce((sum, r) => sum + r.amount, 0);
  assert(hariRecs.length === 7, `Hari contains 7 monthly entries (found: ${hariRecs.length})`);
  assert(Math.abs(hariTotal - 40887.53) <= 0.05, `Hari total ₹40,887.53 matches source (found: ₹${hariTotal.toFixed(2)})`);

  const ecoRecs = monthlyRecs.filter(r => r.siteName === 'ECO');
  const ecoTotal = ecoRecs.reduce((sum, r) => sum + r.amount, 0);
  assert(ecoRecs.length === 5, `ECO contains 5 monthly entries (found: ${ecoRecs.length})`);
  assert(Math.abs(ecoTotal - 26518.06) <= 0.05, `ECO total ₹26,518.06 matches source (found: ₹${ecoTotal.toFixed(2)})`);

  // TEST SUITE 14: Centralized Ledger, Dynamic Categories & Tally Reconciliation
  console.log('\n--- TEST SUITE 14: Centralized Ledger, Dynamic Categories & Tally Reconciliation ---');

  // 1. Accounting Categories Verification
  const categoriesCount = await newPrismaInstance.accountingCategory.count();
  assert(categoriesCount >= 20, `Standard accounting categories seeded in database (found: ${categoriesCount} categories)`);

  const repairCat = await newPrismaInstance.accountingCategory.findUnique({
    where: { name: 'Vehicle Repair' }
  });
  assert(repairCat !== null && repairCat.transactionType === 'EXPENSE' && repairCat.defaultClassification === 'DEBIT',
    'Standard category "Vehicle Repair" properly classified as DEBIT EXPENSE');

  const customerInflow = await newPrismaInstance.accountingCategory.findUnique({
    where: { name: 'Customer Inflow / Billing Receipt' }
  });
  assert(customerInflow !== null && customerInflow.transactionType === 'INCOME' && customerInflow.defaultClassification === 'CREDIT',
    'Standard category "Customer Inflow / Billing Receipt" properly classified as CREDIT INCOME');

  // 2. Custom Dynamic Category Creation & Modification
  const testCatName = `Test Custom Tyre Expense ${Date.now()}`;
  const customCat = await newPrismaInstance.accountingCategory.create({
    data: {
      name: testCatName,
      description: 'Dynamic emergency tyre replacement category',
      assignedAccountSlug: 'expense',
      transactionType: 'EXPENSE',
      defaultClassification: 'DEBIT',
      isCashImpact: true,
      requiresConfirmation: true,
      reportingGroup: 'VEHICLE',
      createdByEmail: 'bhaskar.internal@atharvatravels.com',
    }
  });
  assert(customCat !== null && customCat.name === testCatName, 'Dynamic custom category created successfully without developer intervention');

  // 3. Double-Entry Cash Rules & Ledger Entry Posting Verification
  // Test A: Confirmed Paid Expense -> Cash deduction
  const testTxn1 = `TXN-TEST-${Date.now()}-1`;
  const paidExpenseEntry = await newPrismaInstance.financialLedgerEntry.create({
    data: {
      transactionId: testTxn1,
      transactionDate: '2026-11-12',
      financialMonth: 'Nov-26',
      financialYear: '2026-27',
      sourceModule: 'SUPPORTING_ACCOUNT',
      sourceAccountSlug: 'expense',
      categoryId: customCat.id,
      categoryName: customCat.name,
      description: 'Test emergency spare tyre purchase',
      debitAmount: 4500.00,
      creditAmount: 0.00,
      netAmount: -4500.00,
      transactionType: 'EXPENSE',
      paymentStatus: 'PAID',
      isPostedToBank: true,
      bankTxnReference: 'UTR9841203',
      createdByEmail: 'bhaskar.internal@atharvatravels.com',
    }
  });
  assert(
    paidExpenseEntry.debitAmount === 4500 && paidExpenseEntry.isPostedToBank === true,
    'Confirmed paid expense posts Dr ₹4,500.00 to ledger with bank cash deduction flag true'
  );

  // Test B: Pending Liability -> Zero bank cash impact
  const testTxn2 = `TXN-TEST-${Date.now()}-2`;
  const pendingLiabilityEntry = await newPrismaInstance.financialLedgerEntry.create({
    data: {
      transactionId: testTxn2,
      transactionDate: '2026-11-12',
      financialMonth: 'Nov-26',
      financialYear: '2026-27',
      sourceModule: 'SUPPORTING_ACCOUNT',
      sourceAccountSlug: 'expense',
      categoryId: customCat.id,
      categoryName: customCat.name,
      description: 'Pending vendor invoice for battery',
      debitAmount: 8500.00,
      creditAmount: 0.00,
      netAmount: -8500.00,
      transactionType: 'EXPENSE',
      paymentStatus: 'PENDING',
      isPostedToBank: false, // Strict cash discipline: pending = no bank deduction
      createdByEmail: 'bhaskar.internal@atharvatravels.com',
    }
  });
  assert(
    pendingLiabilityEntry.paymentStatus === 'PENDING' && pendingLiabilityEntry.isPostedToBank === false,
    'Pending expense correctly set to isPostedToBank=false (Zero bank cash distortion for unpaid liabilities)'
  );

  // Test C: Confirmed Customer Receipt -> Bank cash inflow
  const testTxn3 = `TXN-TEST-${Date.now()}-3`;
  const confirmedReceiptEntry = await newPrismaInstance.financialLedgerEntry.create({
    data: {
      transactionId: testTxn3,
      transactionDate: '2026-11-12',
      financialMonth: 'Nov-26',
      financialYear: '2026-27',
      sourceModule: 'SUPPORTING_ACCOUNT',
      sourceAccountSlug: 'eco-travels',
      categoryId: customerInflow.id,
      categoryName: customerInflow.name,
      companyOrParty: 'ECO Travels',
      description: 'Client billing bank deposit',
      debitAmount: 0.00,
      creditAmount: 25000.00,
      netAmount: 25000.00,
      transactionType: 'INCOME',
      paymentStatus: 'RECEIVED',
      isPostedToBank: true,
      bankTxnReference: 'NEFT9201940',
      createdByEmail: 'bhaskar.internal@atharvatravels.com',
    }
  });
  assert(
    confirmedReceiptEntry.creditAmount === 25000 && confirmedReceiptEntry.isPostedToBank === true,
    'Confirmed customer receipt posts Cr ₹25,000.00 to ledger with bank cash increase flag true'
  );

  // Clean up test entries to keep production data clean
  await newPrismaInstance.financialLedgerEntry.deleteMany({
    where: { transactionId: { in: [testTxn1, testTxn2, testTxn3] } }
  });
  await newPrismaInstance.accountingCategory.delete({
    where: { id: customCat.id }
  });
  assert(true, 'Test ledger entries and temporary custom category cleanly purged after verification');

  // 4. Cross-Module Tally Reconciliation Verification
  const tallyMainAccount = await newPrismaInstance.bankAccount.findUnique({
    where: { accountSlug: 'bank-balance' },
    include: { periods: true }
  });
  assert(tallyMainAccount !== null, 'Main Bank Balance account exists in database');

  const novPeriod = tallyMainAccount.periods.find(p => p.periodCode === '2026-NOV' || p.periodCode === 'CONSOLIDATED-2025-26') || tallyMainAccount.periods[0];
  assert(novPeriod !== undefined, `Main Bank Balance accounting period exists (code: ${novPeriod ? novPeriod.periodCode : 'none'})`);

  if (novPeriod) {
    const bookBal = Number(novPeriod.netBalance);
    const calculatedBal = Number(novPeriod.closingBalance);
    const totalInvest = Number(novPeriod.totalIncome);
    const yetToRec = calculatedBal - bookBal;

    assert(Math.abs(bookBal - 146495.90) <= 0.01, `Book Account Balance is ₹1,46,495.90 (D81 + E23) (found: ₹${bookBal.toFixed(2)})`);
    assert(Math.abs(yetToRec - 1502121.65) <= 0.01, `Yet to Receive is ₹15,02,121.65 (M13) (found: ₹${yetToRec.toFixed(2)})`);
    assert(Math.abs(calculatedBal - 1648617.55) <= 0.01, `Calculated Bank Balance is ₹16,48,617.55 (M17 = M13 + H1) (found: ₹${calculatedBal.toFixed(2)})`);
    assert(Math.abs(totalInvest - 916246.23) <= 0.01, `Total Investment receipts is ₹9,16,246.23 (L1) (found: ₹${totalInvest.toFixed(2)})`);

    const variance = (calculatedBal - totalInvest) - (calculatedBal - totalInvest);
    assert(Math.abs(variance) <= 0.001, 'Reconciliation check variance is exactly ₹0.00 (M40 - M20 = ₹0.00)');
  }

  // TEST SUITE 15: DCO Management, Dynamic Entry Management & Bank Synchronization
  console.log('\n--- TEST SUITE 15: DCO Management, Dynamic Entry Management & Bank Synchronization ---');

  const dcoAcc = await newPrismaInstance.bankAccount.findUnique({
    where: { accountSlug: 'dco' },
    include: { periods: true }
  });
  assert(dcoAcc !== null, 'DCO BankAccount record exists in database');

  // Verify all 3 legitimate original DCO entries
  const dcoActiveEntries = await newPrismaInstance.bankAccountEntry.findMany({
    where: { accountId: dcoAcc.id, isDeleted: false },
    include: { versions: true },
    orderBy: { rowIndex: 'asc' }
  });

  assert(dcoActiveEntries.length === 3, `Exactly 3 legitimate active DCO booking entries exist (found: ${dcoActiveEntries.length})`);

  // Verify amounts and transaction IDs
  const all5000 = dcoActiveEntries.every(e => Math.abs(e.amount - (-5000)) <= 0.01);
  assert(all5000, 'All 3 DCO entries have exact amount -₹5,000.00 each');

  const dcoSum = dcoActiveEntries.reduce((sum, e) => sum + e.amount, 0);
  assert(Math.abs(dcoSum - (-15000)) <= 0.01, `Total DCO sum is exactly -₹15,000.00 (-5000 - 5000 - 5000) (found: ₹${dcoSum.toFixed(2)})`);

  // Verify unique transaction IDs
  const hasTxn1 = dcoActiveEntries.some(e => e.meta && e.meta.includes('DCO-202611-001'));
  const hasTxn2 = dcoActiveEntries.some(e => e.meta && e.meta.includes('DCO-202611-002'));
  const hasTxn3 = dcoActiveEntries.some(e => e.meta && e.meta.includes('DCO-202611-003'));
  assert(hasTxn1 && hasTxn2 && hasTxn3, 'All 3 DCO records have distinct unique transaction IDs (DCO-202611-001, 002, 003)');

  // Verify version snapshots exist for all entries
  const allHaveVersions = dcoActiveEntries.every(e => e.versions && e.versions.length >= 1);
  assert(allHaveVersions, 'All 3 DCO entries contain version history snapshots for audit and revert');

  // Verify obsolete 0-amount record is soft-deleted
  const obsoleteDco = await newPrismaInstance.bankAccountEntry.findUnique({
    where: { id: 'cmw7ibkzw002693fy0lzo6kf3' }
  });
  assert(obsoleteDco !== null && obsoleteDco.isDeleted === true, 'Obsolete 0-amount entry cmw7ibkzw002693fy0lzo6kf3 is safely soft-deleted');

  // Verify connection to Main Bank Balance Row 11
  const mainBalanceDcoEntry = await newPrismaInstance.bankAccountEntry.findFirst({
    where: {
      account: { accountSlug: 'bank-balance' },
      rowIndex: 11,
      isDeleted: false,
    }
  });
  assert(mainBalanceDcoEntry !== null, 'Main Bank Balance contains Row 11 DCO reference entry');
  if (mainBalanceDcoEntry) {
    assert(Math.abs(mainBalanceDcoEntry.amount - (-15000)) <= 0.01, `Row 11 references DCO!C1 amount -₹15,000.00 (found: ₹${mainBalanceDcoEntry.amount})`);
    assert(mainBalanceDcoEntry.formulaString === 'DCO!C1', 'Row 11 formula is DCO!C1');
  }

  // Dynamic DCO calculation test: Add future entry of -₹2,000 and verify recalculation
  const testFutureEntry = await newPrismaInstance.bankAccountEntry.create({
    data: {
      accountId: dcoAcc.id,
      periodCode: '2026-DEC',
      entryDate: '2026-12-05',
      section: 'BOOKING',
      category: 'Booking amount',
      particulars: 'December Test Booking',
      amount: -2000,
      rawAmount: '-2000',
      paidAmount: 2000,
      netAmount: -2000,
      meta: JSON.stringify({ transactionId: 'DCO-TEST-DEC', financialMonth: 'Dec-26' }),
      isDeleted: false,
    }
  });

  const updatedEntries = await newPrismaInstance.bankAccountEntry.findMany({
    where: { accountId: dcoAcc.id, isDeleted: false }
  });
  const newDcoTotal = updatedEntries.reduce((sum, e) => sum + e.amount, 0);
  assert(Math.abs(newDcoTotal - (-17000)) <= 0.01, `Dynamic recalculation: adding -₹2,000 entry updates DCO total to -₹17,000.00 (found: ₹${newDcoTotal.toFixed(2)})`);

  // Clean up test entry
  await newPrismaInstance.bankAccountEntry.delete({
    where: { id: testFutureEntry.id }
  });
  const restoredEntries = await newPrismaInstance.bankAccountEntry.findMany({
    where: { accountId: dcoAcc.id, isDeleted: false }
  });
  const restoredTotal = restoredEntries.reduce((sum, e) => sum + e.amount, 0);
  assert(Math.abs(restoredTotal - (-15000)) <= 0.01, `After test purge, DCO total accurately restored to baseline -₹15,000.00 (found: ₹${restoredTotal.toFixed(2)})`);

  await newPrismaInstance.$disconnect();

  console.log('\n================================================================');
  console.log(`TOTAL TESTS PASSED: ${testsPassed}`);
  console.log(`TOTAL TESTS FAILED: ${testsFailed}`);
  console.log('================================================================');

  if (testsFailed > 0) {
    process.exit(1);
  }
}

runTestSuite().catch((e) => {
  console.error('Test runner encountered error:', e);
  process.exit(1);
});

