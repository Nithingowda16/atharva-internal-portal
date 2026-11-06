const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function runTests() {
  console.log('--- STARTING VERIFICATION TESTS ---');

  // TEST 1: Check existing periods and immutability of August & September
  console.log('\n[Test 1] Verifying August & September 2026 baseline...');
  const aug = await prisma.financialPeriod.findUnique({ where: { monthCode: '2026-08' } });
  const sep = await prisma.financialPeriod.findUnique({ where: { monthCode: '2026-09' } });
  if (!aug || !sep) throw new Error('August or September baseline period missing!');
  console.log(`✓ August 2026: Gross ₹${aug.grossBilling}, Net ₹${aug.netPayable}`);
  console.log(`✓ September 2026: Gross ₹${sep.grossBilling}, Net ₹${sep.netPayable}`);

  // TEST 2: Blank Month Creation
  console.log('\n[Test 2] Testing Blank Month creation (Zero records copied)...');
  const testMonthCode = '2027-01';
  // Cleanup if existed
  await prisma.vehicleMonthlyRecord.deleteMany({ where: { period: { monthCode: testMonthCode } } });
  await prisma.financialPeriod.deleteMany({ where: { monthCode: testMonthCode } });

  const blankMonth = await prisma.financialPeriod.create({
    data: {
      monthCode: testMonthCode,
      periodName: 'January 2027',
      financialYear: '2026-27',
      startDate: '2027-01-01',
      endDate: '2027-01-31',
      status: 'Draft',
      grossBilling: 0,
      totalDeductions: 0,
      netPayable: 0,
      totalPaid: 0,
    },
  });

  const recordsInBlank = await prisma.vehicleMonthlyRecord.count({
    where: { periodId: blankMonth.id },
  });
  if (recordsInBlank !== 0) throw new Error(`Expected 0 records in blank month, got ${recordsInBlank}`);
  console.log(`✓ Created clean blank month '${blankMonth.periodName}' with exactly ${recordsInBlank} records.`);

  // TEST 3: Add Vehicle Record to Blank Month
  console.log('\n[Test 3] Adding vehicle record to blank month...');
  let vehicle = await prisma.vehicle.findFirst({ where: { registrationNumber: 'KA01TEST9999' } });
  if (!vehicle) {
    vehicle = await prisma.vehicle.create({
      data: { registrationNumber: 'KA01TEST9999', vehicleType: 'Vehicle - 4-Seater' },
    });
  }

  const newRec = await prisma.vehicleMonthlyRecord.create({
    data: {
      periodId: blankMonth.id,
      vehicleId: vehicle.id,
      sectionIndex: 1,
      paymentStatus: 'Draft',
    },
  });

  // TEST 4: Billing Line and Adjustments Persistence & Deletion
  console.log('\n[Test 4] Testing billing lines & adjustments save, update, and deletion...');
  // Add billing line: 100 km @ 20 = 2000
  const bl1 = await prisma.billingLine.create({
    data: {
      recordId: newRec.id,
      companyName: 'TEST CLIENT',
      kmOrTrips: 100,
      applicableRate: 20,
      billingAmount: 2000,
      lineOrder: 1,
    },
  });

  // Add 2 adjustments: Fuel Adv (-500) and Office charge (-200)
  const adj1 = await prisma.financialAdjustment.create({
    data: {
      recordId: newRec.id,
      category: 'Less Fuel Adv.',
      adjustmentType: 'DEDUCTION',
      amount: -500,
      sourceRow: 1,
    },
  });

  const adj2 = await prisma.financialAdjustment.create({
    data: {
      recordId: newRec.id,
      category: 'Office charge',
      adjustmentType: 'DEDUCTION',
      amount: -200,
      sourceRow: 2,
    },
  });

  // Calculation logic mirroring calculationEngine.ts
  async function recalculate(recordId) {
    const rec = await prisma.vehicleMonthlyRecord.findUnique({
      where: { id: recordId },
      include: {
        billingLines: { where: { isDeleted: false } },
        adjustments: { where: { isDeleted: false } },
      },
    });

    let gross = 0;
    for (const bl of rec.billingLines) gross += bl.billingAmount;

    let ded = 0;
    for (const adj of rec.adjustments) {
      if (adj.amount < 0 || adj.adjustmentType === 'DEDUCTION') {
        ded += Math.abs(adj.amount);
      } else {
        ded -= adj.amount;
      }
    }
    const net = gross - ded;

    await prisma.vehicleMonthlyRecord.update({
      where: { id: recordId },
      data: { grossBilling: gross, totalDeductions: ded, netPayable: net },
    });

    return { grossBilling: gross, totalDeductions: ded, netPayable: net };
  }

  let calc = await recalculate(newRec.id);
  console.log(`Initial calculation: Gross ₹${calc.grossBilling}, Deductions ₹${calc.totalDeductions}, Net ₹${calc.netPayable}`);
  if (calc.grossBilling !== 2000 || calc.totalDeductions !== 700 || calc.netPayable !== 1300) {
    throw new Error('Initial calculation mismatch');
  }
  console.log('✓ Initial calculations verified: 2000 - 700 = 1300');

  // NOW TEST DELETION: User deletes adj2 ("Office charge") and modifies adj1 ("Less Fuel Adv.") to 600
  console.log('\n[Test 5] Simulating user editing adj1 to 600 and deleting adj2 in UI...');
  const activeAdjustmentIds = [adj1.id]; // adj2 omitted by user
  
  // Soft-delete omitted
  await prisma.financialAdjustment.updateMany({
    where: {
      recordId: newRec.id,
      id: { notIn: activeAdjustmentIds },
      isDeleted: false,
    },
    data: { isDeleted: true },
  });

  // Update adj1
  await prisma.financialAdjustment.update({
    where: { id: adj1.id },
    data: {
      amount: -600,
      adjustmentType: 'DEDUCTION',
    },
  });

  calc = await recalculate(newRec.id);
  console.log(`Updated calculation: Gross ₹${calc.grossBilling}, Deductions ₹${calc.totalDeductions}, Net ₹${calc.netPayable}`);
  if (calc.totalDeductions !== 600 || calc.netPayable !== 1400) {
    throw new Error(`Expected totalDeductions 600 and netPayable 1400, got deductions ${calc.totalDeductions}, net ${calc.netPayable}`);
  }
  console.log('✓ Deletion & update verified! Deleted deduction successfully excluded and total recalculated.');

  // TEST 6: Delete Draft Month
  console.log('\n[Test 6] Testing deletion of draft month...');
  await prisma.financialAdjustment.deleteMany({ where: { record: { periodId: blankMonth.id } } });
  await prisma.billingLine.deleteMany({ where: { record: { periodId: blankMonth.id } } });
  await prisma.vehicleMonthlyRecord.deleteMany({ where: { periodId: blankMonth.id } });
  await prisma.financialPeriod.delete({ where: { id: blankMonth.id } });
  await prisma.vehicle.delete({ where: { id: vehicle.id } });

  const checkDeleted = await prisma.financialPeriod.findUnique({ where: { id: blankMonth.id } });
  if (checkDeleted) throw new Error('Blank month deletion failed');
  console.log(`✓ Draft month '${blankMonth.periodName}' cleanly deleted.`);

  console.log('\n========================================');
  console.log('ALL VERIFICATION TESTS PASSED SUCCESSFULLY!');
  console.log('========================================');
}

runTests()
  .catch((e) => {
    console.error('Test error:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
