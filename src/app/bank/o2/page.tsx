'use client';

import React from 'react';
import AccountSheetView from '@/components/bank/AccountSheetView';

export default function O2Page() {
  return (
    <AccountSheetView
      slug="o2"
      sheetTitle="O2"
      description="O2 Mobility Transport Account – client payments, vehicle expenses, check disbursements, and monthly net settlements."
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

