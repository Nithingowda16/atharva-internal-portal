import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export function exportToCSV(data: any[], filename: string) {
  if (!data || !data.length) return;
  const worksheet = XLSX.utils.json_to_sheet(data);
  const csv = XLSX.utils.sheet_to_csv(worksheet);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export function exportToExcel(data: any[], sheetName: string, filename: string) {
  if (!data || !data.length) return;
  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName || 'Atharva Finance');
  XLSX.writeFile(workbook, `${filename}.xlsx`);
}

export function exportToPDF(params: {
  title: string;
  subtitle?: string;
  headers: string[];
  rows: (string | number)[][];
  filename: string;
}) {
  const doc = new jsPDF({ orientation: 'landscape' });

  // Atharva Travels Header
  doc.setFontSize(16);
  doc.setTextColor(15, 23, 42); // Navy
  doc.text('ATHARVA TRAVELS – Internal Finance Statement', 14, 15);

  doc.setFontSize(11);
  doc.setTextColor(51, 65, 85);
  doc.text(params.title, 14, 22);

  if (params.subtitle) {
    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139);
    doc.text(params.subtitle, 14, 27);
  }

  autoTable(doc, {
    startY: params.subtitle ? 31 : 26,
    head: [params.headers],
    body: params.rows,
    styles: { fontSize: 8, cellPadding: 2 },
    headStyles: { fillColor: [15, 23, 42], textColor: [255, 255, 255], fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    margin: { left: 14, right: 14 },
  });

  doc.save(`${params.filename}.pdf`);
}

export interface SalaryReceiptData {
  voucherNumber?: string;
  generatedDate?: string;
  periodName: string;
  monthCode?: string;
  sectionIndex?: number;
  vehicle: {
    registrationNumber: string;
    vehicleType?: string;
    ownerName?: string;
  };
  driver?: {
    name: string;
    phone?: string;
    panMasked?: string;
    dlMasked?: string;
    status?: string;
  } | null;
  bankDetails?: string;
  grossBilling: number;
  tdsAmount: number;
  salaryAdvances: number;
  fuelAdvances: number;
  driverPenalties: number;
  otherDeductions: number;
  totalDeductions: number;
  netPayable: number;
  amountPaid: number;
  balanceDue: number;
  paymentStatus: string;
  paymentDate?: string;
  paymentMode?: string;
  referenceNumber?: string;
  bankName?: string;
  remarks?: string;
  adjustmentsList?: Array<{ category: string; amount: number; notes?: string; type?: string }>;
  billingLinesList?: Array<{ companyName: string; kmOrTrips?: number; applicableRate?: number; billingAmount: number }>;
  paymentsList?: Array<{ amount: number; paymentDate: string; paymentMode: string; referenceNumber?: string; bankName?: string }>;
}

export function exportSalaryReceiptPDF(data: SalaryReceiptData, filename?: string) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const voucherNo = data.voucherNumber || `VCH-${data.vehicle.registrationNumber.replace(/\s+/g, '')}-${Date.now().toString().slice(-6)}`;
  const dateStr = data.generatedDate || new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

  // 1. Company Brand Header
  doc.setFillColor(15, 23, 42); // #0F172A
  doc.rect(0, 0, 210, 26, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(255, 255, 255);
  doc.text('ATHARVA TRAVELS', 14, 12);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(203, 213, 225); // Slate 300
  doc.text('- Let\'s Drive Together', 14, 18);
  doc.text('OFFICIAL MONTHLY SALARY VOUCHER & INTERNAL FINANCE RECEIPT', 14, 23);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(255, 255, 255);
  doc.text(`Voucher #: ${voucherNo}`, 196, 12, { align: 'right' });
  doc.setFont('helvetica', 'normal');
  doc.text(`Date: ${dateStr}`, 196, 18, { align: 'right' });
  doc.text(`Period: ${data.periodName}`, 196, 23, { align: 'right' });

  let currentY = 32;

  // 2. Section 1: Vehicle & Driver Information (Two side-by-side columns)
  const vehicleInfo = [
    ['Vehicle Registration', data.vehicle.registrationNumber],
    ['Vehicle Model / Type', data.vehicle.vehicleType || 'Vehicle - 4-Seater'],
    ['Section Number', `Section ${data.sectionIndex || '-'}`],
    ['Fleet Owner / Tag', data.vehicle.ownerName || 'ATHARVA FLEET'],
  ];

  const driverInfo = [
    ['Driver Name', data.driver?.name || 'Driver Not Assigned'],
    ['Driver Contact Phone', data.driver?.phone || 'Not on file'],
    ['PAN (Tax ID)', data.driver?.panMasked || '••••••••••'],
    ['Driving Licence (DL)', data.driver?.dlMasked || '•••••••••••••'],
    ['Bank Details', data.bankDetails || 'Registered Bank Account'],
  ];

  autoTable(doc, {
    startY: currentY,
    head: [['VEHICLE SPECIFICATIONS', '']],
    body: vehicleInfo,
    theme: 'plain',
    margin: { left: 14, right: 110 },
    styles: { fontSize: 8, cellPadding: 2 },
    headStyles: { fillColor: [241, 245, 249], textColor: [15, 23, 42], fontStyle: 'bold' },
    columnStyles: {
      0: { fontStyle: 'bold', textColor: [100, 116, 139], cellWidth: 42 },
      1: { textColor: [15, 23, 42] },
    },
  });

  autoTable(doc, {
    startY: currentY,
    head: [['ASSIGNED DRIVER & PAYEE PROFILE', '']],
    body: driverInfo,
    theme: 'plain',
    margin: { left: 110, right: 14 },
    styles: { fontSize: 8, cellPadding: 2 },
    headStyles: { fillColor: [241, 245, 249], textColor: [15, 23, 42], fontStyle: 'bold' },
    columnStyles: {
      0: { fontStyle: 'bold', textColor: [100, 116, 139], cellWidth: 42 },
      1: { textColor: [15, 23, 42] },
    },
  });

  currentY = 65;

  // 3. Section 2: Mathematical Breakdown of Monthly Salary & Deductions
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text('MONTHLY SALARY BREAKDOWN & DEDUCTIONS STATEMENT', 14, currentY);
  currentY += 3;

  const fmt = (n: number) => `INR ${n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const calculationRows: any[] = [
    ['1. Main Monthly Salary (Gross Client Trips Billing)', fmt(data.grossBilling), 'Base earnings from client operations'],
    ['   - 1% TDS Deduction (Tax Deducted at Source)', `- ${fmt(data.tdsAmount)}`, 'Statutory 1% TDS deducted from main monthly salary'],
    ['   - Early Salary Advances Taken by Driver', `- ${fmt(data.salaryAdvances)}`, 'Disbursed during month, adjusted from salary payout'],
    ['   - Operational Fuel Advances Disbursed', `- ${fmt(data.fuelAdvances)}`, 'Diesel / fuel advances provided to driver'],
    ['   - Driver Penalties, Fines & Client Deductions', `- ${fmt(data.driverPenalties)}`, 'Penalties for client violations / speeding / damage'],
    ['   - Other Fleet / Handling / GPS Deductions', `- ${fmt(data.otherDeductions)}`, 'GPS fee, 3% handling, administrative charges'],
    ['TOTAL DEDUCTIONS APPLIED', `- ${fmt(data.totalDeductions)}`, 'Sum of all deductions & advances adjusted'],
    ['NET MONTHLY SALARY PAYABLE TO DRIVER', fmt(data.netPayable), 'Net amount due to driver for this month'],
    ['Less: Amount Paid / Disbursed to Date', `- ${fmt(data.amountPaid)}`, `Payment Status: ${data.paymentStatus}`],
    ['OUTSTANDING BALANCE REMAINING', fmt(data.balanceDue), data.balanceDue > 0 ? 'Pending final disbursement' : 'Settled in full'],
  ];

  autoTable(doc, {
    startY: currentY,
    head: [['Item Description', 'Amount', 'Explanation / Account Note']],
    body: calculationRows,
    styles: { fontSize: 8.5, cellPadding: 2.5 },
    headStyles: { fillColor: [15, 23, 42], textColor: [255, 255, 255], fontStyle: 'bold' },
    columnStyles: {
      0: { cellWidth: 95 },
      1: { cellWidth: 40, halign: 'right', fontStyle: 'bold' },
      2: { cellWidth: 47, textColor: [100, 116, 139] },
    },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    didParseCell: function (dataHook) {
      // Highlight Net Payable and Balance rows
      if (dataHook.row.index === 7) {
        dataHook.cell.styles.fillColor = [235, 245, 255]; // Soft blue
        dataHook.cell.styles.fontStyle = 'bold';
        dataHook.cell.styles.textColor = [0, 122, 255];
      } else if (dataHook.row.index === 6) {
        dataHook.cell.styles.textColor = [255, 59, 48]; // Red
        dataHook.cell.styles.fontStyle = 'bold';
      } else if (dataHook.row.index === 9) {
        dataHook.cell.styles.fillColor = [240, 253, 244]; // Soft green
        dataHook.cell.styles.fontStyle = 'bold';
        dataHook.cell.styles.textColor = [36, 138, 61];
      }
    },
    margin: { left: 14, right: 14 },
  });

  // 4. Section 3: Payment Disbursement Record (if available)
  const finalY = (doc as any).lastAutoTable.finalY + 6;

  if (data.paymentsList && data.paymentsList.length > 0) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(15, 23, 42);
    doc.text('DISBURSEMENT TRANSACTION DETAILS', 14, finalY);

    const paymentRows = data.paymentsList.map((p) => [
      p.paymentDate,
      p.paymentMode || 'NEFT',
      fmt(p.amount),
      p.referenceNumber || 'N/A',
      p.bankName || data.bankName || 'Registered Account',
    ]);

    autoTable(doc, {
      startY: finalY + 2,
      head: [['Payment Date', 'Mode', 'Amount Paid', 'UTR / Ref No', 'Bank Name']],
      body: paymentRows,
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: [51, 65, 85], textColor: [255, 255, 255], fontStyle: 'bold' },
      columnStyles: {
        2: { halign: 'right', fontStyle: 'bold', textColor: [36, 138, 61] },
      },
      margin: { left: 14, right: 14 },
    });
  }

  // 5. Section 4: Sign-off & Audit Acknowledgement block at bottom
  const sigY = 250;

  doc.setDrawColor(226, 232, 240);
  doc.line(14, sigY, 65, sigY);
  doc.line(80, sigY, 130, sigY);
  doc.line(145, sigY, 196, sigY);

  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text('Prepared by (Accountant)', 14, sigY + 4);
  doc.text('ATHARVA TRAVELS FINANCE', 14, sigY + 8);

  doc.text('Verified by (Super Admin)', 80, sigY + 4);
  doc.text('BHASKAR VAIDYA / NITHIN R', 80, sigY + 8);

  doc.text('Driver Acknowledgement & Signature', 145, sigY + 4);
  doc.text(data.driver?.name || 'Driver Signature', 145, sigY + 8);

  // Footer notes
  doc.setFontSize(7);
  doc.setTextColor(148, 163, 184);
  doc.text(
    'Computer-generated official receipt from Atharva Travels Finance Portal. Historical record preserved with immutable audit trail.',
    14,
    285
  );

  const saveName = filename || `Salary_Receipt_${data.vehicle.registrationNumber.replace(/\s+/g, '')}_${data.periodName.replace(/\s+/g, '_')}`;
  doc.save(`${saveName}.pdf`);
}
