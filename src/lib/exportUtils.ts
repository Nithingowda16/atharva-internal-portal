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

