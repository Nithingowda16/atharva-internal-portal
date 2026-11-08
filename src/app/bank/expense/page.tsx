'use client';

import React from 'react';
import AccountSheetView from '@/components/bank/AccountSheetView';

export default function ExpensePage() {
  return (
    <AccountSheetView
      slug="expense"
      sheetTitle="Expense"
      description="Corporate Expenses & Fuel Commissions – Rent, CA fees, IT, office equipment, website development, and fuel commissions across clients."
      columns={{
        showPeriod: true,
        showDate: true,
        showParticulars: true,
        showCategory: true,
        showPaid: true,
        showReceived: true,
        showNet: false,
        showInvoiced: false,
        showInvoiceNo: false,
        showFormula: true,
        showComments: true,
      }}
    />
  );
}

