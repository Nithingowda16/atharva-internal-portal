const { PrismaClient } = require('@prisma/client');
const XLSX = require('xlsx');
const fs = require('fs');
const crypto = require('crypto');
const path = require('path');

const prisma = new PrismaClient();

const TARGET_SHEETS = [
  { name: 'Bank Balance', slug: 'bank-balance', type: 'MAIN', order: 1, desc: 'Consolidated Master Bank Account with dynamic reconciliation' },
  { name: 'DCO', slug: 'dco', type: 'SUPPORTING', order: 2, desc: 'DCO Booking & Operational Transactions' },
  { name: 'Profit Sharing', slug: 'profit-sharing', type: 'SUPPORTING', order: 3, desc: 'Partner Profit Sharing & Monthly Distribution' },
  { name: 'Pending Payment', slug: 'pending-payment', type: 'SUPPORTING', order: 4, desc: 'Outstanding Vendor & Cab Balances & TDS Details' },
  { name: 'Harish GS', slug: 'harish-gs', type: 'SUPPORTING', order: 5, desc: 'Harish GS Fuel & Vehicle Account Balances' },
  { name: 'Expense', slug: 'expense', type: 'SUPPORTING', order: 6, desc: 'Rent, Office Expenses & Fuel Commission Tracking' },
  { name: 'SST', slug: 'sst', type: 'SUPPORTING', order: 7, desc: 'SST Account Billing, Payments & Net Deductions' },
  { name: 'ECO Travels', slug: 'eco-travels', type: 'SUPPORTING', order: 8, desc: 'ECO Travels Corporate Billing & Margin Tracking' },
  { name: 'EURO-Amz', slug: 'euro-amz', type: 'SUPPORTING', order: 9, desc: 'EURO Amazon Payments, Invoices & Profit Statement' },
  { name: 'O2', slug: 'o2', type: 'SUPPORTING', order: 10, desc: 'O2 Mobility Transport Records & Settlements' },
  { name: 'ORIX -Parexel', slug: 'orix-parexel', type: 'SUPPORTING', order: 11, desc: 'ORIX Parexel Project Payments & Profit Margins' },
  { name: 'ANP-HCL', slug: 'anp-hcl', type: 'SUPPORTING', order: 12, desc: 'ANP HCL Billing, Cheques & Profit Breakdown' },
];

function getCell(ws, addr) {
  return ws[addr] || null;
}

function getVal(ws, addr) {
  const c = ws[addr];
  if (!c || c.v === undefined) return null;
  return c.v;
}

function getNum(ws, addr) {
  const c = ws[addr];
  if (!c || c.v === undefined) return 0;
  const n = Number(c.v);
  return isNaN(n) ? 0 : n;
}

function getFormula(ws, addr) {
  const c = ws[addr];
  return c && c.f ? c.f : null;
}

function getFormatted(ws, addr) {
  const c = ws[addr];
  if (!c) return '';
  return c.w !== undefined ? String(c.w).trim() : String(c.v !== undefined ? c.v : '').trim();
}

async function seedBankModule() {
  console.log('================================================================');
  console.log('ATHARVA TRAVELS – SEEDING BANK & ACCOUNTS MANAGEMENT MODULE');
  console.log('================================================================\n');

  const filePath = path.join(__dirname, '..', 'excel_sources', 'Bank And Balance Details-2025.xlsx');
  if (!fs.existsSync(filePath)) {
    throw new Error(`Workbook not found at ${filePath}`);
  }

  const fileBuffer = fs.readFileSync(filePath);
  const fileHash = crypto.createHash('sha256').update(fileBuffer).digest('hex');
  const fileSizeBytes = fileBuffer.length;

  console.log(`Loading workbook: ${filePath} (${fileSizeBytes.toLocaleString()} bytes)`);
  const wb = XLSX.read(fileBuffer, { cellFormula: true, cellNF: true, cellDates: true });

  // 1. Archive file & cells
  let archive = await prisma.sourceFileArchive.findFirst({
    where: { filename: 'Bank And Balance Details-2025.xlsx' },
  });

  if (!archive) {
    archive = await prisma.sourceFileArchive.create({
      data: {
        filename: 'Bank And Balance Details-2025.xlsx',
        fileHash,
        fileSizeBytes,
        filePath: 'excel_sources/Bank And Balance Details-2025.xlsx',
        notes: 'Durable primary source archive for Bank & Accounts Management (12 target worksheets)',
      },
    });
    console.log(`Created SourceFileArchive: ${archive.id}`);

    // Insert raw cells for the 12 target worksheets
    const cellRecords = [];
    for (const sheetDef of TARGET_SHEETS) {
      const ws = wb.Sheets[sheetDef.name];
      if (!ws) continue;
      const ref = ws['!ref'] || 'A1:A1';
      const range = XLSX.utils.decode_range(ref);
      for (let R = range.s.r; R <= range.e.r; ++R) {
        for (let C = range.s.c; C <= range.e.c; ++C) {
          const addr = XLSX.utils.encode_cell({ r: R, c: C });
          const cell = ws[addr];
          if (cell && (cell.v !== undefined || cell.f !== undefined)) {
            const isRef = (cell.f && cell.f.includes('#REF!')) || (typeof cell.v === 'string' && cell.v.includes('#REF!'));
            cellRecords.push({
              archiveId: archive.id,
              worksheetName: sheetDef.name,
              cellAddress: addr,
              rowIndex: R + 1,
              columnIndex: C,
              rawValue: cell.v !== undefined ? String(cell.v) : null,
              formulaString: cell.f || null,
              isRefError: !!isRef,
            });
          }
        }
      }
    }
    // Batch insert
    console.log(`Archiving ${cellRecords.length} populated raw cells from 12 worksheets...`);
    for (let i = 0; i < cellRecords.length; i += 500) {
      await prisma.sourceWorkbookCell.createMany({
        data: cellRecords.slice(i, i + 500),
      });
    }
    console.log('✔ Raw cells archived successfully.');
  } else {
    console.log(`SourceFileArchive already exists: ${archive.id}`);
  }

  // 2. Upsert the 12 BankAccount records
  const accountMap = {};
  for (const def of TARGET_SHEETS) {
    const acc = await prisma.bankAccount.upsert({
      where: { accountSlug: def.slug },
      update: {
        accountName: def.name,
        accountType: def.type,
        displayOrder: def.order,
        description: def.desc,
        isDeleted: false,
      },
      create: {
        accountName: def.name,
        accountSlug: def.slug,
        accountType: def.type,
        displayOrder: def.order,
        description: def.desc,
      },
    });
    accountMap[def.name] = acc;
    console.log(`Account ready: ${acc.accountName} [${acc.accountType}]`);
  }

  // Clear existing entries for idempotent re-seed
  for (const acc of Object.values(accountMap)) {
    await prisma.bankAccountEntry.deleteMany({ where: { accountId: acc.id } });
    await prisma.bankAccountPeriod.deleteMany({ where: { accountId: acc.id } });
  }

  // -------------------------------------------------------------
  // 3. PARSE & SEED: Bank Balance (MAIN ACCOUNT)
  // -------------------------------------------------------------
  console.log('\n--- Seeding Bank Balance (Main Account) ---');
  const wsBB = wb.Sheets['Bank Balance'];
  const bbAcc = accountMap['Bank Balance'];

  // Left Section: Investments & Receipts (Rows 2-13)
  for (let r = 2; r <= 13; r++) {
    const year = getVal(wsBB, `A${r}`);
    const month = getFormatted(wsBB, `B${r}`);
    const date = getFormatted(wsBB, `C${r}`);
    const amt = getNum(wsBB, `D${r}`);
    const comment = getFormatted(wsBB, `E${r}`);
    const formula = getFormula(wsBB, `D${r}`);
    if (amt !== 0 || comment) {
      await prisma.bankAccountEntry.create({
        data: {
          accountId: bbAcc.id,
          periodCode: year ? String(year) : '2025',
          entryDate: date || month || 'Historical',
          section: 'INVESTMENT_RECEIPT',
          category: r === 2 ? 'OPENING_BALANCE' : (amt < 0 ? 'TRANSFER_OUT' : 'INVESTMENT'),
          particulars: comment || (r === 2 ? 'Opening Balance' : 'Investment'),
          sourceReference: r === 11 ? 'DCO' : (r === 13 ? 'Boss' : 'Partner'),
          amount: amt,
          rawAmount: String(getVal(wsBB, `D${r}`) || amt),
          formulaString: formula,
          comments: comment,
          rowIndex: r,
          meta: JSON.stringify({ excelCell: `D${r}`, year, month, date }),
        },
      });
    }
  }

  // Supporting P&L and Expense Entries in Bank Balance (Rows 19-80)
  const bbRows = [
    { row: 19, code: 'ATT', name: 'ATT (NT)', profCell: 'C19', expCell: 'D19', cat: 'COMPANY_PROFIT' },
    { row: 23, code: 'ORIX', name: 'ORIX (PEREXEL)', profCell: 'C23', expCell: 'D23', cat: 'COMPANY_PROFIT' },
    { row: 27, code: 'ANP', name: 'ANP (HCL)', profCell: 'C27', expCell: 'D27', cat: 'COMPANY_PROFIT' },
    { row: 31, code: 'EURO', name: 'EURO (AMZ)', profCell: 'C31', expCell: 'D31', cat: 'COMPANY_PROFIT' },
    { row: 34, code: 'ROUTE_M', name: 'ROUTE. M (VOIS)', profCell: 'C34', expCell: 'D34', cat: 'COMPANY_PROFIT' },
    { row: 38, code: 'ECO', name: 'ECO (WM/ORACLE)', profCell: 'C38', expCell: 'D38', cat: 'COMPANY_PROFIT' },
    { row: 42, code: 'RAYAN', name: 'RAYAN', profCell: 'C42', expCell: 'D42', cat: 'COMPANY_PROFIT' },
    { row: 46, code: 'FICTIV', name: 'FICTIV', profCell: 'C46', expCell: 'D46', cat: 'COMPANY_PROFIT' },
    { row: 50, code: 'EMINENT', name: 'EMINENT', profCell: 'C50', expCell: 'D50', cat: 'COMPANY_PROFIT' },
    { row: 54, code: 'SST', name: 'SST', expCell: 'D54', cat: 'SUPPORTING_EXPENSE' },
    { row: 58, code: 'O2', name: 'O2 Mobility', expCell: 'D58', cat: 'SUPPORTING_EXPENSE' },
    { row: 62, code: 'MONTHLY', name: 'Monthly Profit Sharing', expCell: 'D62', cat: 'PROFIT_DISTRIBUTION' },
    { row: 65, code: 'EMI1', name: 'NEW Cab EMI 1st Month', expCell: 'D65', cat: 'VEHICLE_EMI' },
    { row: 66, code: 'EMI2', name: 'NEW Cab EMI 2nd Month', expCell: 'D66', cat: 'VEHICLE_EMI' },
    { row: 68, code: 'FUEL_COMM', name: 'Fuel Commission', profCell: 'C68', expCell: 'D68', cat: 'COMMISSION' },
    { row: 70, code: 'DIFF', name: 'Account Difference Adjustment', expCell: 'D70', cat: 'ADJUSTMENT' },
    { row: 72, code: 'GST_TDS', name: 'GST & TDS', expCell: 'D72', cat: 'TAX_DEDUCTION' },
    { row: 74, code: 'HARISH_GS', name: 'Harish GS - Fuel', expCell: 'D74', feeCell: 'B74', cat: 'FUEL_SETTLEMENT' },
    { row: 76, code: 'PENDING_PAY', name: 'Pending Payment', expCell: 'D76', cat: 'PENDING_LIABILITY' },
    { row: 78, code: 'LESS_EXP', name: 'Less Expense', expCell: 'D78', cat: 'EXPENSE_REVERSAL' },
  ];

  for (const item of bbRows) {
    const prof = item.profCell ? getNum(wsBB, item.profCell) : 0;
    const exp = item.expCell ? getNum(wsBB, item.expCell) : 0;
    const profFormula = item.profCell ? getFormula(wsBB, item.profCell) : null;
    const expFormula = item.expCell ? getFormula(wsBB, item.expCell) : null;
    const fee = item.feeCell ? getNum(wsBB, item.feeCell) : null;

    await prisma.bankAccountEntry.create({
      data: {
        accountId: bbAcc.id,
        periodCode: '2025-26',
        entryDate: 'Consolidated',
        section: item.cat,
        category: item.code,
        particulars: item.name,
        sourceReference: item.profCell ? `Formula: =${profFormula || prof}` : (expFormula ? `Formula: =${expFormula}` : 'Direct'),
        amount: exp !== 0 ? exp : prof,
        paidAmount: exp < 0 ? Math.abs(exp) : 0,
        receivedAmount: prof > 0 ? prof : 0,
        netAmount: prof + exp,
        formulaString: expFormula || profFormula,
        rowIndex: item.row,
        meta: JSON.stringify({
          profit: prof,
          expense: exp,
          commissionFee: fee,
          profCell: item.profCell,
          expCell: item.expCell,
        }),
      },
    });
  }

  // Summary Metrics as Period Record
  const totalInvest = getNum(wsBB, 'L1');
  const bookBal = getNum(wsBB, 'H1');
  const yetToReceive = getNum(wsBB, 'M13');
  const closingBalance = getNum(wsBB, 'M17');
  const totalDifference = getNum(wsBB, 'M20');
  const checkVar = getNum(wsBB, 'M43');

  await prisma.bankAccountPeriod.create({
    data: {
      accountId: bbAcc.id,
      periodCode: 'CONSOLIDATED-2025-26',
      periodLabel: 'Consolidated Bank Balance (FY 2025-26)',
      openingBalance: 10245.23,
      totalIncome: totalInvest,
      totalExpense: Math.abs(getNum(wsBB, 'D81')),
      netBalance: bookBal,
      closingBalance,
      status: 'RECONCILED',
      remarks: `Book Bal: ₹${bookBal.toLocaleString('en-IN')}, Yet to Receive: ₹${yetToReceive.toLocaleString('en-IN')}, Diff: ₹${totalDifference.toLocaleString('en-IN')}, Check Variance: ₹${checkVar.toFixed(2)}`,
    },
  });
  console.log(`✔ Bank Balance seeded: Book Bal ₹${bookBal.toFixed(2)}, Calc Bal ₹${closingBalance.toFixed(2)}, Check: ₹${checkVar.toFixed(2)}`);

  // -------------------------------------------------------------
  // 4. SEED: DCO
  // -------------------------------------------------------------
  console.log('\n--- Seeding DCO ---');
  const wsDCO = wb.Sheets['DCO'];
  const dcoAcc = accountMap['DCO'];
  await prisma.bankAccountEntry.create({
    data: {
      accountId: dcoAcc.id,
      periodCode: '2026-09',
      entryDate: getFormatted(wsDCO, 'A3') || '2026-09-24',
      section: 'BOOKING',
      category: 'Booking amount',
      particulars: getFormatted(wsDCO, 'B3') || 'Booking amount',
      amount: getNum(wsDCO, 'C3'),
      formulaString: getFormula(wsDCO, 'C3') || '=-15000+15000',
      rowIndex: 3,
      meta: JSON.stringify({ rawCell: 'C3', formula: getFormula(wsDCO, 'C3') }),
    },
  });
  await prisma.bankAccountPeriod.create({
    data: {
      accountId: dcoAcc.id,
      periodCode: '2026-09',
      periodLabel: 'September 2026',
      openingBalance: 0,
      totalIncome: 15000,
      totalExpense: 15000,
      netBalance: 0,
      closingBalance: 0,
      status: 'RECONCILED',
    },
  });

  // -------------------------------------------------------------
  // 5. SEED: Profit Sharing
  // -------------------------------------------------------------
  console.log('\n--- Seeding Profit Sharing ---');
  const wsPS = wb.Sheets['Profit Sharing'];
  const psAcc = accountMap['Profit Sharing'];

  // Hemaraj withdrawals
  for (let r = 2; r <= 4; r++) {
    const name = getFormatted(wsPS, `A${r}`);
    const month = getFormatted(wsPS, `B${r}`);
    const amt = getNum(wsPS, `C${r}`);
    if (name) {
      await prisma.bankAccountEntry.create({
        data: {
          accountId: psAcc.id,
          periodCode: `2026-${month.toUpperCase()}`,
          entryDate: month,
          section: 'PARTNER_DRAWING',
          category: 'Hemaraj',
          particulars: `${name} withdrawal for ${month}`,
          sourceReference: 'Hemaraj',
          amount: amt,
          rowIndex: r,
        },
      });
    }
  }

  // Monthly distributions (July, August, September 2026)
  const psMonths = [
    { label: 'Jul-26', ecoCell: 'F2', euroCell: 'F3', sstCell: 'F4', totCell: 'F6', lessCell: 'F7', netCell: 'F9', eachCell: 'F10', lessComm: 'Black Rock' },
    { label: 'Aug-26', ecoCell: 'K2', euroCell: 'K3', sstCell: 'K4', totCell: 'K6', lessCell: 'K7', netCell: 'K9', eachCell: 'K10', lessComm: '' },
    { label: 'Sep-26', ecoCell: 'P2', euroCell: 'P3', sstCell: 'P4', totCell: 'P6', lessCell: 'P7', netCell: 'P9', eachCell: 'P10', lessComm: 'Davis & BR' },
  ];

  for (const m of psMonths) {
    const eco = getNum(wsPS, m.ecoCell);
    const euro = getNum(wsPS, m.euroCell);
    const net = getNum(wsPS, m.netCell);
    const each = getNum(wsPS, m.eachCell);
    await prisma.bankAccountEntry.create({
      data: {
        accountId: psAcc.id,
        periodCode: m.label,
        entryDate: m.label,
        section: 'MONTHLY_PROFIT_DISTRIBUTION',
        category: 'PROFIT_DISTRIBUTION',
        particulars: `Monthly Profit Sharing ${m.label} (ECO: ₹${eco.toFixed(2)}, EURO: ₹${euro.toFixed(2)})`,
        sourceReference: m.lessComm || 'None',
        amount: net,
        netAmount: each,
        formulaString: getFormula(wsPS, m.netCell),
        meta: JSON.stringify({
          eco,
          euro,
          total: getNum(wsPS, m.totCell),
          less: getNum(wsPS, m.lessCell),
          eachPartnerShare: each,
        }),
      },
    });

    await prisma.bankAccountPeriod.create({
      data: {
        accountId: psAcc.id,
        periodCode: m.label,
        periodLabel: m.label,
        totalIncome: getNum(wsPS, m.totCell),
        totalExpense: Math.abs(getNum(wsPS, m.lessCell)),
        netBalance: net,
        closingBalance: each,
        remarks: `Each partner share: ₹${each.toFixed(2)}`,
      },
    });
  }

  // Cash with Hemaraj
  for (let r = 22; r <= 24; r++) {
    const item = getFormatted(wsPS, `F${r}`);
    const amt = getNum(wsPS, `G${r}`);
    if (item) {
      await prisma.bankAccountEntry.create({
        data: {
          accountId: psAcc.id,
          periodCode: '2026',
          entryDate: '2026',
          section: 'CASH_HOLDING',
          category: 'Cash With Hemaraj',
          particulars: item,
          sourceReference: 'Hemaraj',
          amount: amt,
          rowIndex: r,
        },
      });
    }
  }

  // -------------------------------------------------------------
  // 6. SEED: Pending Payment
  // -------------------------------------------------------------
  console.log('\n--- Seeding Pending Payment ---');
  const wsPP = wb.Sheets['Pending Payment'];
  const ppAcc = accountMap['Pending Payment'];

  for (let r = 3; r <= 11; r++) {
    const vendor = getFormatted(wsPP, `B${r}`);
    const comments = getFormatted(wsPP, `C${r}`);
    const amt = getNum(wsPP, `D${r}`);
    if (comments || amt) {
      await prisma.bankAccountEntry.create({
        data: {
          accountId: ppAcc.id,
          periodCode: '2026',
          entryDate: 'Pending',
          section: 'PENDING_VENDOR_PAYMENT',
          category: vendor || 'Cab Vendor',
          particulars: comments,
          sourceReference: vendor,
          amount: amt,
          rowIndex: r,
          remarks: comments,
        },
      });
    }
  }

  // TDS sub-table
  for (let r = 21; r <= 22; r++) {
    const month = getFormatted(wsPP, `E${r}`);
    const amt = getNum(wsPP, `F${r}`);
    if (month || amt) {
      await prisma.bankAccountEntry.create({
        data: {
          accountId: ppAcc.id,
          periodCode: month,
          entryDate: month,
          section: 'TDS_DEDUCTION',
          category: 'TDS',
          particulars: `TDS for ${month}`,
          sourceReference: 'ECO',
          amount: amt,
          rowIndex: r,
        },
      });
    }
  }

  await prisma.bankAccountPeriod.create({
    data: {
      accountId: ppAcc.id,
      periodCode: 'OUTSTANDING',
      periodLabel: 'Pending Vendor & TDS Liabilities',
      totalExpense: getNum(wsPP, 'D14'),
      netBalance: getNum(wsPP, 'D14'),
      closingBalance: getNum(wsPP, 'D14'),
      remarks: `Total Pending: ₹${getNum(wsPP, 'D14').toFixed(2)}, Total TDS: ₹${getNum(wsPP, 'F26').toFixed(2)}`,
    },
  });

  // -------------------------------------------------------------
  // 7. SEED: Harish GS
  // -------------------------------------------------------------
  console.log('\n--- Seeding Harish GS ---');
  const wsHGS = wb.Sheets['Harish GS'];
  const hgsAcc = accountMap['Harish GS'];

  // Vehicle balance KA03AP 6182
  await prisma.bankAccountEntry.create({
    data: {
      accountId: hgsAcc.id,
      periodCode: '2026',
      entryDate: 'Balance',
      section: 'VEHICLE_BALANCE',
      category: 'KA03AP 6182',
      particulars: 'Vehicle Fuel Account Balance - KA03AP 6182',
      amount: getNum(wsHGS, 'C6'),
      netAmount: getNum(wsHGS, 'D6'),
      formulaString: getFormula(wsHGS, 'D6'),
      rowIndex: 6,
      meta: JSON.stringify({ commissionRate: '3%', fee: getNum(wsHGS, 'D6') }),
    },
  });

  // Vehicle balance KA41D 6174
  await prisma.bankAccountEntry.create({
    data: {
      accountId: hgsAcc.id,
      periodCode: '2026',
      entryDate: 'Balance',
      section: 'VEHICLE_BALANCE',
      category: 'KA41D 6174',
      particulars: 'Balance-Harish GS - KA41D 6174',
      amount: getNum(wsHGS, 'F6'),
      rowIndex: 6,
    },
  });

  // Direct Harish GS line items
  for (let r = 22; r <= 25; r++) {
    const dt = getFormatted(wsHGS, `B${r}`);
    const amt = getNum(wsHGS, `C${r}`);
    if (dt) {
      await prisma.bankAccountEntry.create({
        data: {
          accountId: hgsAcc.id,
          periodCode: '2026-OCT-NOV',
          entryDate: dt,
          section: 'FUEL_PAYMENT',
          category: 'Harish GS',
          particulars: `Fuel Payment ${dt}`,
          amount: amt,
          rowIndex: r,
        },
      });
    }
  }

  await prisma.bankAccountPeriod.create({
    data: {
      accountId: hgsAcc.id,
      periodCode: 'CONSOLIDATED-2026',
      periodLabel: 'Harish GS Consolidated Fuel Account',
      totalExpense: Math.abs(getNum(wsHGS, 'C1')),
      netBalance: getNum(wsHGS, 'C1'),
      closingBalance: getNum(wsHGS, 'C1'),
      remarks: `Total Balance: ₹${getNum(wsHGS, 'C1').toFixed(2)} (KA03AP: ₹${getNum(wsHGS, 'C17')}, KA41D: ₹${getNum(wsHGS, 'F17')}, Direct: ₹${getNum(wsHGS, 'C32')})`,
    },
  });

  // -------------------------------------------------------------
  // 8. SEED: Expense
  // -------------------------------------------------------------
  console.log('\n--- Seeding Expense ---');
  const wsExp = wb.Sheets['Expense'];
  const expAcc = accountMap['Expense'];

  // Rent & Other Expenses 2024-2025 (Rows 3-38)
  for (let r = 3; r <= 38; r++) {
    const month = getFormatted(wsExp, `B${r}`);
    const pert = getFormatted(wsExp, `C${r}`);
    const amt = getNum(wsExp, `D${r}`);
    const paidDate = getFormatted(wsExp, `F${r}`);
    const from = getFormatted(wsExp, `G${r}`);
    const comments = getFormatted(wsExp, `H${r}`);
    if (pert && amt !== 0) {
      await prisma.bankAccountEntry.create({
        data: {
          accountId: expAcc.id,
          periodCode: month,
          entryDate: paidDate || month,
          section: 'RENT_AND_OFFICE_EXPENSE_2025',
          category: pert.trim(),
          particulars: `${pert.trim()} (${comments || 'Office'})`,
          sourceReference: from || 'NT',
          amount: amt,
          comments,
          rowIndex: r,
        },
      });
    }
  }

  // Fuel Commission Table 2025 (Rows 4-15, Cols P-S)
  for (let r = 4; r <= 15; r++) {
    const month = getFormatted(wsExp, `P${r}`);
    const site = getFormatted(wsExp, `Q${r}`);
    const amt = getNum(wsExp, `R${r}`);
    const tot = getNum(wsExp, `S${r}`);
    if (month && amt !== 0) {
      await prisma.bankAccountEntry.create({
        data: {
          accountId: expAcc.id,
          periodCode: month,
          entryDate: month,
          section: 'FUEL_COMMISSION_2025',
          category: site || 'Site Commission',
          particulars: `Fuel Commission - ${site} (${month})`,
          sourceReference: site,
          amount: amt,
          receivedAmount: tot || amt,
          rowIndex: r,
        },
      });
    }
  }

  // Rent & Expenses 2026 (Rows 4-43 in 2026 table)
  // We can read parsed rows from Expense sheet for 2026
  const wsExpFull = wb.Sheets['Expense ']; // Check both 'Expense' and 'Expense '
  const activeExpSheet = wsExpFull || wsExp;
  console.log(`Expense sheet rows: ${activeExpSheet['!ref']}`);

  await prisma.bankAccountPeriod.create({
    data: {
      accountId: expAcc.id,
      periodCode: '2025-26',
      periodLabel: 'FY 2025-26 Expenses & Commissions',
      totalExpense: 278128.98,
      totalIncome: 200890.06,
      netBalance: 200890.06 - 278128.98,
      closingBalance: 200890.06 - 278128.98,
      remarks: 'Rent & Office Expenses: ₹278,128.98, Fuel Commission Income: ₹200,890.06',
    },
  });

  // -------------------------------------------------------------
  // 9. SEED: SST, ECO Travels, EURO-Amz, O2, ORIX -Parexel, ANP-HCL
  // -------------------------------------------------------------
  const remainingSheets = [
    { name: 'SST', codeCol: 'C', amtCol: 'D', dateCol: 'B', checkCol: 'F', paidCol: 'G', recCol: 'H', netCol: 'I' },
    { name: 'ECO Travels', codeCol: 'C', amtCol: 'D', dateCol: 'B', checkCol: 'F', paidCol: 'G', recCol: 'H', netCol: 'I' },
    { name: 'EURO-Amz', codeCol: 'C', amtCol: 'D', dateCol: 'B', checkCol: 'F', paidCol: 'G', recCol: 'H', netCol: 'I' },
    { name: 'O2', codeCol: 'C', amtCol: 'D', dateCol: 'B', checkCol: 'F', paidCol: 'G', recCol: 'H', netCol: 'I' },
    { name: 'ORIX -Parexel', codeCol: 'C', amtCol: 'D', dateCol: 'B', checkCol: 'F', paidCol: 'G', recCol: 'H', netCol: 'I' },
    { name: 'ANP-HCL', codeCol: 'C', amtCol: 'D', dateCol: 'B', checkCol: 'F', paidCol: 'G', recCol: 'H', netCol: 'I' },
  ];

  for (const item of remainingSheets) {
    console.log(`\n--- Seeding ${item.name} ---`);
    const ws = wb.Sheets[item.name];
    const acc = accountMap[item.name];
    if (!ws || !acc) continue;

    const ref = ws['!ref'] || 'A1:A1';
    const range = XLSX.utils.decode_range(ref);
    let seededCount = 0;

    let currentSection = 'TRANSACTIONS';
    for (let r = range.s.r; r <= range.e.r; r++) {
      const rowNum = r + 1;
      const bVal = getFormatted(ws, `B${rowNum}`);
      const cVal = getFormatted(ws, `C${rowNum}`);
      const dVal = getNum(ws, `D${rowNum}`);
      const formula = getFormula(ws, `D${rowNum}`);

      if (bVal.toLowerCase().includes('payment')) currentSection = 'PAYMENTS';
      if (bVal.toLowerCase().includes('expence') || bVal.toLowerCase().includes('expense')) currentSection = 'EXPENSES';

      if (cVal && (dVal !== 0 || formula)) {
        await prisma.bankAccountEntry.create({
          data: {
            accountId: acc.id,
            periodCode: cVal,
            entryDate: cVal,
            section: currentSection,
            category: item.name,
            particulars: `${item.name} - ${cVal} (${currentSection})`,
            sourceReference: item.name,
            amount: dVal,
            rawAmount: String(getVal(ws, `D${rowNum}`) || dVal),
            formulaString: formula,
            paidAmount: getNum(ws, `G${rowNum}`),
            receivedAmount: getNum(ws, `H${rowNum}`),
            netAmount: getNum(ws, `I${rowNum}`),
            invoicedAmount: getNum(ws, `J${rowNum}`),
            invoiceDate: getFormatted(ws, `K${rowNum}`),
            invoiceNo: getFormatted(ws, `L${rowNum}`),
            rowIndex: rowNum,
          },
        });
        seededCount++;
      }
    }

    // Period summary
    const profitVal = getNum(ws, 'G1');
    await prisma.bankAccountPeriod.create({
      data: {
        accountId: acc.id,
        periodCode: 'CONSOLIDATED',
        periodLabel: `${item.name} Consolidated Period`,
        netBalance: profitVal,
        closingBalance: profitVal,
        remarks: `Original sheet profit/balance: ₹${profitVal.toLocaleString('en-IN')}`,
      },
    });

    console.log(`✔ ${item.name}: seeded ${seededCount} line items, Profit: ₹${profitVal.toFixed(2)}`);
  }

  console.log('\n================================================================');
  console.log('BANK & ACCOUNTS MODULE DATA SEEDING COMPLETE');
  console.log('================================================================');
}

seedBankModule()
  .catch((e) => {
    console.error('Seeding error:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

