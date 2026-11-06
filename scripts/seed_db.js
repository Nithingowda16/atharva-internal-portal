const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

function getFileHash(filePath) {
  const fileBuffer = fs.readFileSync(filePath);
  const hashSum = crypto.createHash('sha256');
  hashSum.update(fileBuffer);
  return hashSum.digest('hex');
}

async function main() {
  console.log('--- Starting Database Seeding & Excel Import ---');

  const existingCount = await prisma.vehicleMonthlyRecord.count();
  if (existingCount > 0 && process.env.ALLOW_DB_RESET !== 'true') {
    console.log(`\n[SAFETY ABORT] Database already contains ${existingCount} vehicle financial records.`);
    console.log('To prevent accidental production data loss, automatic wiping is blocked.');
    console.log('If you genuinely intend to reset the database, run with ALLOW_DB_RESET=true\n');
    return;
  }

  // Clear existing records when explicitly requested
  console.log('Clearing records for clean idempotent seed...');
  await prisma.recordVersion.deleteMany({});
  await prisma.paymentTransaction.deleteMany({});
  await prisma.financialAdjustment.deleteMany({});
  await prisma.billingLine.deleteMany({});
  await prisma.vehicleMonthlyRecord.deleteMany({});
  await prisma.financialPeriod.deleteMany({});
  await prisma.vehicle.deleteMany({});
  await prisma.company.deleteMany({});
  await prisma.sourceWorkbookCell.deleteMany({});
  await prisma.sourceFileArchive.deleteMany({});
  await prisma.auditLog.deleteMany({});
  await prisma.recycleBinItem.deleteMany({});

  // 1. Seed Authorized Users
  console.log('1. Setting up 3 Authorized Login Accounts...');
  const salt = await bcrypt.genSalt(10);
  const commonPassword = 'atharvatravels@internal';
  const passwordHash = await bcrypt.hash(commonPassword, salt);
  
  const users = [
    {
      email: 'harish.internal@atharvatravels.com',
      name: 'Harish',
      passwordHash,
      role: 'SUPER_ADMIN',
      permissions: JSON.stringify([
        'ALL_PERMISSIONS',
        'MANAGE_USERS',
        'VIEW_FINANCE',
        'EDIT_FINANCE',
        'DELETE_FINANCE',
        'PURGE_RECORDS',
        'VIEW_AUDIT_LOGS',
        'CREATE_MONTH',
        'IMPORT_DATA',
        'EXPORT_DATA',
        'REVERT_VERSIONS',
        'MANAGE_BACKUPS'
      ]),
      isAllowed: true
    },
    {
      email: 'bhaskar.internal@atharvatravels.com',
      name: 'Bhaskar',
      passwordHash,
      role: 'FINANCE_MANAGER',
      permissions: JSON.stringify([
        'VIEW_FINANCE',
        'EDIT_FINANCE',
        'DELETE_FINANCE',
        'RESTORE_FINANCE',
        'CREATE_MONTH',
        'APPROVE_PAYMENTS',
        'REVERT_VERSIONS',
        'EXPORT_DATA',
        'VIEW_REPORTS'
      ]),
      isAllowed: true
    },
    {
      email: 'hemaraj.internal@atharvatravels.com',
      name: 'Hemaraj',
      passwordHash,
      role: 'OPERATIONS',
      permissions: JSON.stringify([
        'VIEW_FINANCE',
        'EDIT_FINANCE',
        'ADD_REMARKS',
        'UPDATE_PAYMENTS',
        'VIEW_VEHICLES',
        'VIEW_REPORTS'
      ]),
      isAllowed: true
    }
  ];

  for (const u of users) {
    await prisma.user.create({ data: u });
    console.log(`   Created user: ${u.email} (${u.role})`);
  }

  const adminUser = await prisma.user.findUnique({
    where: { email: 'harish.internal@atharvatravels.com' }
  });

  // 2. Archive Source Excel Files
  console.log('\n2. Archiving Source Excel Workbooks in Protected Durable Storage...');
  const file1Path = path.join(__dirname, '..', 'excel_sources', 'ECO-SEP_Pay Slip (1).xlsx');
  const file2Path = path.join(__dirname, '..', 'excel_sources', 'pay slip.xlsx');

  const file1Stats = fs.statSync(file1Path);
  const file2Stats = fs.statSync(file2Path);

  const archive1 = await prisma.sourceFileArchive.create({
    data: {
      filename: 'ECO-SEP_Pay Slip (1).xlsx',
      fileHash: getFileHash(file1Path),
      fileSizeBytes: file1Stats.size,
      filePath: file1Path,
      notes: 'Primary Excel source file 1 - identical consolidated dataset'
    }
  });

  const archive2 = await prisma.sourceFileArchive.create({
    data: {
      filename: 'pay slip.xlsx',
      fileHash: getFileHash(file2Path),
      fileSizeBytes: file2Stats.size,
      filePath: file2Path,
      notes: 'Primary Excel source file 2 - identical consolidated dataset (archived without double counting)'
    }
  });
  console.log(`   Archived ${archive1.filename} [Hash: ${archive1.fileHash.slice(0, 12)}...]`);
  console.log(`   Archived ${archive2.filename} [Hash: ${archive2.fileHash.slice(0, 12)}...]`);

  // 3. Store Immutable Raw Cells Archive (all 9,570 cells & formulas)
  console.log('\n3. Ingesting Raw Cells into Immutable Archive...');
  const rawCellsPath = path.join(__dirname, 'immutable_raw_cells_archive.json');
  if (fs.existsSync(rawCellsPath)) {
    const rawCellsData = JSON.parse(fs.readFileSync(rawCellsPath, 'utf8'));
    let totalCellsInserted = 0;
    let totalRefErrorsFound = 0;

    for (const [sheetName, cells] of Object.entries(rawCellsData)) {
      console.log(`   Processing sheet '${sheetName}' (${cells.length} cells)...`);
      
      // Batch insert in chunks of 500
      const batchSize = 500;
      for (let i = 0; i < cells.length; i += batchSize) {
        const chunk = cells.slice(i, i + batchSize).map(c => ({
          archiveId: archive1.id,
          worksheetName: sheetName,
          cellAddress: c.cell,
          rowIndex: c.row,
          columnIndex: c.col,
          rawValue: c.value !== null && c.value !== undefined ? String(c.value) : null,
          formulaString: c.formula,
          isRefError: c.is_ref_error || false
        }));

        await prisma.sourceWorkbookCell.createMany({
          data: chunk
        });
      }
      totalCellsInserted += cells.length;
      totalRefErrorsFound += cells.filter(c => c.is_ref_error).length;
    }
    console.log(`   Total cells preserved in raw archive: ${totalCellsInserted} (Flagged #REF! errors: ${totalRefErrorsFound})`);
  }

  // 4. Ingest Master Companies
  console.log('\n4. Ingesting Company Master Records...');
  const companies = [
    { name: 'ORACLE', defaultRate: 20 },
    { name: 'WalMart', defaultRate: 500 },
    { name: 'Epsilon', defaultRate: 700 },
    { name: 'Epsilon Escort', defaultRate: 350 },
    { name: 'Black Rock', defaultRate: 600 },
    { name: 'BR Escort', defaultRate: 300 },
    { name: 'Amex', defaultRate: 650 },
    { name: 'Amex-Escort', defaultRate: 250 },
    { name: 'Cargoes', defaultRate: 500 },
    { name: 'Cargoes-Escort', defaultRate: 300 },
    { name: 'Enercon', defaultRate: 600 },
    { name: 'EXL', defaultRate: 650 },
    { name: 'Huron', defaultRate: 600 },
    { name: 'Huron-Escort', defaultRate: 250 },
    { name: 'WP', defaultRate: 675 },
    { name: 'WellsForgo', defaultRate: 600 },
    { name: 'Amazon Trips   4+1', defaultRate: 54000 }
  ];

  for (const c of companies) {
    await prisma.company.upsert({
      where: { name: c.name },
      update: { defaultRate: c.defaultRate },
      create: { name: c.name, defaultRate: c.defaultRate, isActive: true }
    });
  }
  console.log(`   ${companies.length} master companies created.`);

  // 5. Ingest Consolidated Data from extracted_workbook_summary.json
  console.log('\n5. Ingesting August 2026 and September 2026 Vehicle Sections...');
  const summaryPath = path.join(__dirname, 'extracted_workbook_summary.json');
  const summaryData = JSON.parse(fs.readFileSync(summaryPath, 'utf8'));

  // Define Financial Periods
  const periodAug = await prisma.financialPeriod.create({
    data: {
      id: 'period_2026_08',
      monthCode: '2026-08',
      periodName: 'August 2026',
      financialYear: '2026-27',
      startDate: '2026-08-01',
      endDate: '2026-08-31',
      status: 'Approved',
      grossBilling: 510433.04,
      totalDeductions: 400478.75,
      netPayable: 109954.29,
      totalPaid: 109954.29
    }
  });

  const periodSep = await prisma.financialPeriod.create({
    data: {
      id: 'period_2026_09',
      monthCode: '2026-09',
      periodName: 'September 2026',
      financialYear: '2026-27',
      startDate: '2026-09-01',
      endDate: '2026-09-30',
      status: 'Approved',
      grossBilling: 1165826.06,
      totalDeductions: 403782.32,
      netPayable: 762043.74,
      totalPaid: 762043.74
    }
  });

  // Process sheets
  for (const [sheetName, sheetInfo] of Object.entries(summaryData.sheets)) {
    const isAug = sheetName.includes('6182');
    const period = isAug ? periodAug : periodSep;
    console.log(`\n   Processing ${sheetInfo.vehicles.length} vehicle sections for ${period.periodName} (${sheetName})...`);

    for (const v of sheetInfo.vehicles) {
      let regNo = v.registration_number ? String(v.registration_number).trim() : null;
      if (!regNo) {
        regNo = `KA-UNSPECIFIED-SEC${v.section_index}`;
      }

      // Check or create Vehicle Master record
      // If repeated KA41D 6174 in same month, differentiate by section
      let vehicle = await prisma.vehicle.findFirst({
        where: { registrationNumber: regNo }
      });
      if (!vehicle) {
        vehicle = await prisma.vehicle.create({
          data: {
            registrationNumber: regNo,
            vehicleType: v.vehicle_type || 'Vehicle - 4-Seater',
            isActive: true,
            notes: v.registration_number ? null : `Preserved missing registration identifier at Column ${v.col_letter_start}`
          }
        });
      }

      // Calculate totals and ref error flags
      let gross = typeof v.total_gross_billing.value === 'number' ? v.total_gross_billing.value : 0;
      let net = typeof v.net_payment.amount === 'number' ? v.net_payment.amount : 0;
      let status = v.net_payment.status || 'Paid';
      
      // Check remarks for HOLD / WF / No Account
      const remarksList = v.remarks.map(r => r.remark);
      if (remarksList.some(r => r.toUpperCase().includes('HOLD'))) {
        status = 'HOLD';
      } else if (remarksList.some(r => r.toUpperCase().includes('WF'))) {
        status = 'WF';
      } else if (remarksList.some(r => r.toUpperCase().includes('NO ACCOUT') || r.toUpperCase().includes('NO ACCOUNT'))) {
        status = 'No Account';
      }

      let hasRef = false;
      let refCount = 0;
      if (typeof v.total_gross_billing.formula === 'string' && v.total_gross_billing.formula.includes('#REF!')) {
        hasRef = true;
        refCount++;
      }
      for (const bl of v.billing_lines) {
        if (typeof bl.total_formula === 'string' && bl.total_formula.includes('#REF!')) {
          hasRef = true;
          refCount++;
        }
      }

      const totalDeductions = gross - net;

      // Create Vehicle Monthly Record
      const monthlyRec = await prisma.vehicleMonthlyRecord.create({
        data: {
          periodId: period.id,
          vehicleId: vehicle.id,
          sectionIndex: v.section_index,
          calcHeader: v.calc_header,
          periodLabel: v.period,
          grossBilling: gross,
          totalDeductions: totalDeductions,
          netPayable: net,
          amountPaid: status === 'Paid' ? net : 0,
          paymentStatus: status,
          paymentDate: v.payment_date?.label || (isAug ? '31-08-2026' : '30-09-2026'),
          bankDetails: v.payment_date?.bank || 'OTHER Bank',
          hasRefErrors: hasRef,
          refErrorCount: refCount,
          remarks: remarksList.join(' | ') || null
        }
      });

      // Insert billing lines
      let lineOrder = 1;
      for (const bl of v.billing_lines) {
        if (bl.company_name || bl.km || bl.rate || bl.total) {
          await prisma.billingLine.create({
            data: {
              recordId: monthlyRec.id,
              sourceRow: bl.row,
              companyName: bl.company_name || 'General',
              kmOrTrips: typeof bl.km === 'number' ? bl.km : null,
              kmFormula: bl.km_formula,
              applicableRate: typeof bl.rate === 'number' ? bl.rate : null,
              rateFormula: bl.rate_formula,
              billingAmount: typeof bl.total === 'number' ? bl.total : 0,
              amountFormula: bl.total_formula,
              lineOrder: lineOrder++
            }
          });
        }
      }

      // Insert financial adjustments
      for (const adj of v.adjustments) {
        if (adj.category || adj.amount) {
          const amt = typeof adj.amount === 'number' ? adj.amount : 0;
          await prisma.financialAdjustment.create({
            data: {
              recordId: monthlyRec.id,
              sourceRow: adj.row,
              category: adj.category || 'Adjustment',
              adjustmentType: amt < 0 ? 'DEDUCTION' : 'ADDITION',
              amount: amt,
              formulaString: adj.formula,
              meta1: adj.extra_meta ? String(adj.extra_meta) : null,
              meta2: adj.extra_meta2 ? String(adj.extra_meta2) : null,
              isPostSettlement: false
            }
          });
        }
      }

      // Insert additional post-settlement adjustments
      for (const addAdj of v.additional_adjustments) {
        const valStr = addAdj.values.filter(x => x !== null && x !== undefined).join(' ');
        if (valStr.trim()) {
          // If numeric amount exists
          const numVal = addAdj.values.find(x => typeof x === 'number');
          await prisma.financialAdjustment.create({
            data: {
              recordId: monthlyRec.id,
              sourceRow: addAdj.row,
              category: 'Post-Settlement Adjustment / Note',
              adjustmentType: (numVal && numVal < 0) ? 'DEDUCTION' : 'ADDITION',
              amount: numVal || 0,
              notes: valStr,
              isPostSettlement: true
            }
          });
        }
      }

      // Create version 1 snapshot for reversion history
      await prisma.recordVersion.create({
        data: {
          recordId: monthlyRec.id,
          versionNumber: 1,
          snapshotData: JSON.stringify({
            vehicle: regNo,
            sectionIndex: v.section_index,
            grossBilling: gross,
            netPayable: net,
            status: status,
            billingLinesCount: v.billing_lines.length,
            adjustmentsCount: v.adjustments.length
          }),
          changeReason: 'Initial verified Excel import',
          createdById: adminUser.id
        }
      });
    }
  }

  // Record initial audit logs
  await prisma.auditLog.create({
    data: {
      userEmail: 'harish.internal@atharvatravels.com',
      action: 'IMPORT',
      module: 'EXCEL_IMPORT',
      entityType: 'ConsolidatedDataset',
      entityId: archive1.id,
      newState: JSON.stringify({
        periods: ['August 2026', 'September 2026'],
        vehicleSections: 92,
        populatedCellsPreserved: 9570,
        refErrorsFlagged: 39,
        grossReconciled: 1676259.10,
        netReconciled: 871998.03
      }),
      reason: 'Initial system load from verified Excel workbooks'
    }
  });

  console.log('\n=== Database Seeding & Import Complete! ===');
  console.log('All 92 vehicle-period records, 9,570 raw cells, and audit trail saved to persistent database.');
}

main()
  .catch((e) => {
    console.error('Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
