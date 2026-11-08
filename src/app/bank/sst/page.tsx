'use client';

import React from 'react';
import AccountSheetView from '@/components/bank/AccountSheetView';

export default function SSTPage() {
  return (
    <AccountSheetView
      slug="sst"
      sheetTitle="SST"
      description="SST Financial Records – 2025 and 2026 client billing, payments, paid vs received reconciliation, and net settlement tracking."
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

