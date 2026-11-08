'use client';

import React from 'react';
import AccountSheetView from '@/components/bank/AccountSheetView';

export default function OrixParexelPage() {
  return (
    <AccountSheetView
      slug="orix-parexel"
      sheetTitle="ORIX -Parexel"
      description="ORIX Parexel Project Account – client payments, vehicle operational expenses, net margin analysis, and corporate project profit."
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

