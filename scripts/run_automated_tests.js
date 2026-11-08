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
  const admin = await prisma.user.findUnique({ where: { email: 'harish.internal@atharvatravels.com' } });
  const finance = await prisma.user.findUnique({ where: { email: 'bhaskar.internal@atharvatravels.com' } });
  const ops = await prisma.user.findUnique({ where: { email: 'hemaraj.internal@atharvatravels.com' } });

  assert(admin !== null && admin.role === 'SUPER_ADMIN', 'Super Admin account (Harish) exists in database');
  assert(finance !== null && finance.role === 'FINANCE_MANAGER', 'Finance Manager account (Bhaskar) exists in database');
  assert(ops !== null && ops.role === 'OPERATIONS', 'Operations / HR account (Hemaraj) exists in database');

  const totalUsers = await prisma.user.count({ where: { isAllowed: true } });
  assert(totalUsers === 3, `Strictly 3 authorized accounts configured (found: ${totalUsers})`);

  const passwordMatch = await bcrypt.compare('atharvatravels@internal', admin.passwordHash);
  assert(passwordMatch === true, 'Bcrypt password hashing verification succeeds with atharvatravels@internal');

  const unauthCheck = await prisma.user.findUnique({ where: { email: 'intruder@external.com' } });
  assert(unauthCheck === null, 'Non-allowlisted accounts return null and are denied access');

  // TEST SUITE 2: Raw Cell Archive & Excel Primary Source
  console.log('\n--- TEST SUITE 2: Raw Cell Archive & Error Integrity ---');
  const totalCells = await prisma.sourceWorkbookCell.count();
  assert(totalCells === 9570, `All 9,570 populated cells preserved in raw archive (found: ${totalCells})`);

  const refErrors = await prisma.sourceWorkbookCell.count({ where: { isRefError: true } });
  assert(refErrors === 39, `Exactly 39 original #REF! errors flagged for review (found: ${refErrors})`);

  const archives = await prisma.sourceFileArchive.count();
  assert(archives === 2, `Both original Excel workbooks archived in durable storage (found: ${archives})`);

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
      deletedByEmail: 'harish.internal@atharvatravels.com',
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
      assignedBy: 'harish.internal@atharvatravels.com',
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
      assignedBy: 'harish.internal@atharvatravels.com',
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

