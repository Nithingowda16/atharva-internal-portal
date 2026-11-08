'use client';

import React from 'react';
import AccountSheetView from '@/components/bank/AccountSheetView';

export default function AnpHclPage() {
  return (
    <AccountSheetView
      slug="anp-hcl"
      sheetTitle="ANP-HCL"
      description="ANP HCL Account – 2025 client billing, invoice numbers, cheque disbursements, expense deductions (rent, bills, CA fees), and net profit."
      columns={{
        showPeriod: true,
        showDate: true,
        showParticulars: true,
        showCategory: true,
        showPaid: true,
        showReceived: true,
        showNet: true,
        showInvoiced: true,
        showInvoiceNo: true,
        showFormula: true,
        showComments: true,
      }}
    />
  );
}

