'use client';

import React from 'react';
import AccountSheetView from '@/components/bank/AccountSheetView';

export default function ECOTravelsPage() {
  return (
    <AccountSheetView
      slug="eco-travels"
      sheetTitle="ECO Travels"
      description="ECO Travels Corporate Account – monthly billing, payments, Oracle & Walmart client margins, and net operating profit."
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

