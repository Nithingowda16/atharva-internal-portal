const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const STANDARD_CATEGORIES = [
  { name: 'Vehicle Repair', transactionType: 'EXPENSE', defaultClassification: 'DEBIT', assignedAccountSlug: 'ALL', reportingGroup: 'VEHICLE', isCashImpact: true, requiresConfirmation: true, description: 'Vehicle mechanical or electrical repairs' },
  { name: 'Driver Penalty', transactionType: 'DEDUCTION', defaultClassification: 'CREDIT', assignedAccountSlug: 'harish-gs', reportingGroup: 'DRIVER', isCashImpact: false, requiresConfirmation: false, description: 'Penalty deduction from driver settlements' },
  { name: 'Fuel Advance', transactionType: 'EXPENSE', defaultClassification: 'DEBIT', assignedAccountSlug: 'ALL', reportingGroup: 'OPERATING', isCashImpact: true, requiresConfirmation: true, description: 'Fuel advance issued for vehicle trips' },
  { name: 'Fuel Handling Charge', transactionType: 'DEDUCTION', defaultClassification: 'CREDIT', assignedAccountSlug: 'ALL', reportingGroup: 'OPERATING', isCashImpact: false, requiresConfirmation: false, description: 'Fuel management and handling fee deduction' },
  { name: 'Company Penalty', transactionType: 'DEDUCTION', defaultClassification: 'CREDIT', assignedAccountSlug: 'ALL', reportingGroup: 'OPERATING', isCashImpact: false, requiresConfirmation: false, description: 'Penalty charged by client company for SLA violation' },
  { name: 'Advance Payment', transactionType: 'EXPENSE', defaultClassification: 'DEBIT', assignedAccountSlug: 'ALL', reportingGroup: 'OPERATING', isCashImpact: true, requiresConfirmation: true, description: 'Advance disbursed to vendor or driver' },
  { name: 'Toll/Parking', transactionType: 'EXPENSE', defaultClassification: 'DEBIT', assignedAccountSlug: 'ALL', reportingGroup: 'OPERATING', isCashImpact: true, requiresConfirmation: true, description: 'Fastag toll and parking charges' },
  { name: 'Bonus', transactionType: 'EXPENSE', defaultClassification: 'DEBIT', assignedAccountSlug: 'ALL', reportingGroup: 'OPERATING', isCashImpact: true, requiresConfirmation: true, description: 'Incentive or festival bonus payment' },
  { name: 'TDS Deduction', transactionType: 'DEDUCTION', defaultClassification: 'CREDIT', assignedAccountSlug: 'ALL', reportingGroup: 'TAX', isCashImpact: false, requiresConfirmation: false, description: 'Tax deducted at source receivable' },
  { name: 'BGV Charges', transactionType: 'DEDUCTION', defaultClassification: 'CREDIT', assignedAccountSlug: 'ALL', reportingGroup: 'ADMIN', isCashImpact: false, requiresConfirmation: false, description: 'Background verification fee deduction' },
  { name: 'GPS Rental', transactionType: 'EXPENSE', defaultClassification: 'DEBIT', assignedAccountSlug: 'ALL', reportingGroup: 'VEHICLE', isCashImpact: true, requiresConfirmation: true, description: 'Monthly GPS device tracking rental' },
  { name: 'Office Rent', transactionType: 'EXPENSE', defaultClassification: 'DEBIT', assignedAccountSlug: 'expense', reportingGroup: 'ADMIN', isCashImpact: true, requiresConfirmation: true, description: 'Monthly office premises rental' },
  { name: 'Current Bill', transactionType: 'EXPENSE', defaultClassification: 'DEBIT', assignedAccountSlug: 'expense', reportingGroup: 'ADMIN', isCashImpact: true, requiresConfirmation: true, description: 'Electricity and utility expenses' },
  { name: 'CA Fee', transactionType: 'EXPENSE', defaultClassification: 'DEBIT', assignedAccountSlug: 'expense', reportingGroup: 'ADMIN', isCashImpact: true, requiresConfirmation: true, description: 'Chartered Accountant audit and filing fees' },
  { name: 'Bank Charges', transactionType: 'EXPENSE', defaultClassification: 'DEBIT', assignedAccountSlug: 'ALL', reportingGroup: 'FINANCIAL', isCashImpact: true, requiresConfirmation: true, description: 'Bank processing and ledger maintenance charges' },
  { name: 'Vehicle EMI', transactionType: 'EXPENSE', defaultClassification: 'DEBIT', assignedAccountSlug: 'ALL', reportingGroup: 'VEHICLE', isCashImpact: true, requiresConfirmation: true, description: 'Monthly vehicle loan EMI deduction/payment' },
  { name: 'Insurance', transactionType: 'EXPENSE', defaultClassification: 'DEBIT', assignedAccountSlug: 'ALL', reportingGroup: 'VEHICLE', isCashImpact: true, requiresConfirmation: true, description: 'Vehicle comprehensive insurance premium' },
  { name: 'Customer Inflow / Billing Receipt', transactionType: 'INCOME', defaultClassification: 'CREDIT', assignedAccountSlug: 'ALL', reportingGroup: 'OPERATING', isCashImpact: true, requiresConfirmation: true, description: 'Direct customer bank remittance receipt' },
  { name: 'Boss Fund Transfer', transactionType: 'TRANSFER', defaultClassification: 'CREDIT', assignedAccountSlug: 'bank-balance', reportingGroup: 'FINANCIAL', isCashImpact: true, requiresConfirmation: true, description: 'Direct fund transfer from/to company directors' },
  { name: 'Miscellaneous Deduction', transactionType: 'DEDUCTION', defaultClassification: 'CREDIT', assignedAccountSlug: 'ALL', reportingGroup: 'OPERATING', isCashImpact: false, requiresConfirmation: false, description: 'General operational deduction' },
];

async function seedCategories() {
  console.log('Seeding standard accounting categories...');
  let count = 0;
  for (const cat of STANDARD_CATEGORIES) {
    await prisma.accountingCategory.upsert({
      where: { name: cat.name },
      update: cat,
      create: {
        ...cat,
        createdByEmail: 'system@atharvatravels.com',
      },
    });
    count++;
  }
  console.log(`✔ Successfully seeded ${count} standard accounting categories.`);
  await prisma.$disconnect();
}

seedCategories().catch(err => {
  console.error(err);
  process.exit(1);
});

