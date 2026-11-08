'use client';

import React from 'react';
import AccountSheetView from '@/components/bank/AccountSheetView';

export default function PendingPaymentPage() {
  return (
    <AccountSheetView
      slug="pending-payment"
      sheetTitle="Pending Payment"
      description="Pending Vendor & Cab Liabilities – outstanding payments for EURO cab, Fictive, GS Penalties, ECO, and Monthly TDS deductions."
      columns={{
        showPeriod: true,
        showDate: false,
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

