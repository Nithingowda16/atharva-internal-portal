'use client';

import React from 'react';
import AccountSheetView from '@/components/bank/AccountSheetView';

export default function ProfitSharingPage() {
  return (
    <AccountSheetView
      slug="profit-sharing"
      sheetTitle="Profit Sharing"
      description="Partner Profit Sharing Account – Monthly ECO & EURO distributions (July, Aug, Sep 2026), partner drawings and cash balances."
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

