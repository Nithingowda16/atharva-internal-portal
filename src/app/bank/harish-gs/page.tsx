'use client';

import React from 'react';
import AccountSheetView from '@/components/bank/AccountSheetView';

export default function HarishGSPage() {
  return (
    <AccountSheetView
      slug="harish-gs"
      sheetTitle="Harish GS"
      description="Harish GS Fuel & Vehicle Account – vehicle fuel balances (KA03AP 6182, KA41D 6174), 3% commission fees, and Hemaraj settlements."
      columns={{
        showPeriod: true,
        showDate: true,
        showParticulars: true,
        showCategory: true,
        showPaid: false,
        showReceived: false,
        showNet: true,
        showInvoiced: false,
        showInvoiceNo: false,
        showFormula: true,
        showComments: true,
      }}
    />
  );
}

