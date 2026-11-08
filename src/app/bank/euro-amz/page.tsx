'use client';

import React from 'react';
import AccountSheetView from '@/components/bank/AccountSheetView';

export default function EUROAmzPage() {
  return (
    <AccountSheetView
      slug="euro-amz"
      sheetTitle="EURO-Amz"
      description="EURO Amazon Corporate Account – Amazon client billing, monthly disbursements, invoice reconciliation, and operating profit statement."
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

