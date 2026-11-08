'use client';

import React from 'react';
import AccountSheetView from '@/components/bank/AccountSheetView';

export default function DCOPage() {
  return (
    <AccountSheetView
      slug="dco"
      sheetTitle="DCO"
      description="DCO Booking and Operations Account – tracking booking amounts and settlement adjustments."
      columns={{
        showPeriod: true,
        showDate: true,
        showParticulars: true,
        showCategory: true,
        showPaid: false,
        showReceived: false,
        showNet: false,
        showInvoiced: false,
        showInvoiceNo: false,
        showFormula: true,
        showComments: true,
      }}
    />
  );
}

