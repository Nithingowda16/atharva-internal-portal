'use client';

import React, { useState } from 'react';
import * as XLSX from 'xlsx';
import {
  Upload,
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  Info,
  X,
  ArrowRight,
  ShieldCheck,
  Filter,
  Check,
} from 'lucide-react';
import { SheetEntry } from '@/components/bank/AccountSheetView';

interface SmartExcelImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  accountSlug: string;
  accountName: string;
  existingEntries: SheetEntry[];
  onImportSuccess: () => void;
}

interface ParsedRow {
  id: string;
  sourceRow: number;
  periodCode: string;
  entryDate?: string;
  particulars: string;
  section: string;
  category: string;
  amount: number;
  paidAmount?: number;
  receivedAmount?: number;
  formulaString?: string;
  comments?: string;
  classification: 'ALREADY_EXISTS' | 'MISSING_ADD' | 'REVIEW_REQUIRED';
  matchReason?: string;
  existingMatch?: SheetEntry;
  selected: boolean;
}

export default function SmartExcelImportModal({
  isOpen,
  onClose,
  accountSlug,
  accountName,
  existingEntries,
  onImportSuccess,
}: SmartExcelImportModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [workbook, setWorkbook] = useState<XLSX.WorkBook | null>(null);
  const [sheetNames, setSheetNames] = useState<string[]>([]);
  const [selectedSheet, setSelectedSheet] = useState<string>('');
  const [parsedRows, setParsedRows] = useState<ParsedRow[]>([]);
  const [activeTab, setActiveTab] = useState<'ALL' | 'MISSING' | 'EXISTS' | 'REVIEW'>('ALL');
  const [isImporting, setIsImporting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  // Handle file upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFile = e.target.files?.[0];
    if (!uploadedFile) return;

    setFile(uploadedFile);
    setErrorMessage(null);

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        setWorkbook(wb);
        setSheetNames(wb.SheetNames);

        // Auto-select best matching sheet
        const cleanAccName = accountName.toLowerCase().replace(/[^a-z0-9]/g, '');
        const cleanAccSlug = accountSlug.toLowerCase().replace(/[^a-z0-9]/g, '');

        let defaultSheet = wb.SheetNames[0];
        for (const name of wb.SheetNames) {
          const cleanName = name.toLowerCase().replace(/[^a-z0-9]/g, '');
          if (cleanName.includes(cleanAccSlug) || cleanAccSlug.includes(cleanName) || cleanName.includes(cleanAccName)) {
            defaultSheet = name;
            break;
          }
        }

        setSelectedSheet(defaultSheet);
        analyzeWorksheet(wb, defaultSheet);
      } catch (err: any) {
        console.error('Failed to parse Excel file:', err);
        setErrorMessage('Failed to read Excel file. Please ensure it is a valid .xlsx or .xls file.');
      }
    };
    reader.readAsBinaryString(uploadedFile);
  };

  // Analyze selected worksheet and compare against existing DB records
  const analyzeWorksheet = (wb: XLSX.WorkBook, sheetName: string) => {
    try {
      const ws = wb.Sheets[sheetName];
      if (!ws) return;

      const range = XLSX.utils.decode_range(ws['!ref'] || 'A1:Z100');
      const rows: ParsedRow[] = [];

      for (let R = range.s.r; R <= range.e.r; ++R) {
        // Collect cell values in row
        const rowNum = R + 1;
        const colB = ws[XLSX.utils.encode_cell({ r: R, c: 1 })]; // Often Year / Category / Expences / Payment
        const colC = ws[XLSX.utils.encode_cell({ r: R, c: 2 })]; // Period / Item / Month
        const colD = ws[XLSX.utils.encode_cell({ r: R, c: 3 })]; // Amount
        const colE = ws[XLSX.utils.encode_cell({ r: R, c: 4 })];
        const colF = ws[XLSX.utils.encode_cell({ r: R, c: 5 })]; // Check or Comments
        const colG = ws[XLSX.utils.encode_cell({ r: R, c: 6 })];
        const colH = ws[XLSX.utils.encode_cell({ r: R, c: 7 })];
        const colI = ws[XLSX.utils.encode_cell({ r: R, c: 8 })];

        // Determine if this is a transaction row
        // Usually colD has numeric amount and colC has period/description
        let amountVal: number | undefined;
        let periodVal: string = '';
        let particularsVal: string = '';
        let formulaVal: string | undefined;
        let sectionVal: string = 'GENERAL';

        if (colD && (typeof colD.v === 'number' || (!isNaN(Number(colD.v)) && colD.v !== ''))) {
          amountVal = Number(colD.v);
          formulaVal = colD.f ? String(colD.f) : undefined;
          periodVal = colC ? String(colC.v).trim() : '';
          particularsVal = `${accountName} - ${periodVal || `Row ${rowNum}`}`;

          // Detect section (PAYMENTS vs EXPENSES)
          if (amountVal < 0 || (colB && String(colB.v).toLowerCase().includes('exp'))) {
            sectionVal = 'EXPENSES';
          } else if (amountVal > 0) {
            sectionVal = 'PAYMENTS';
          }
        } else if (colC && (typeof colC.v === 'number' || (!isNaN(Number(colC.v)) && colC.v !== ''))) {
          // Alternative layout where colB is item, colC is amount (e.g. DCO, Harish GS)
          amountVal = Number(colC.v);
          formulaVal = colC.f ? String(colC.f) : undefined;
          particularsVal = colB ? String(colB.v).trim() : `Row ${rowNum}`;
          periodVal = '2026';
          if (amountVal < 0) sectionVal = 'DEBIT';
          else sectionVal = 'CREDIT';
        }

        if (amountVal !== undefined && !isNaN(amountVal) && (periodVal || particularsVal)) {
          // Skip header rows if particulars says "Total", "Amount", "Check", etc.
          const lowerPart = particularsVal.toLowerCase();
          if (lowerPart === 'total' || lowerPart.includes('sum') || lowerPart === 'check' || lowerPart === 'amount') {
            continue;
          }

          // Compare against existing DB entries
          const cleanPeriod = periodVal.toLowerCase().replace(/[^a-z0-9]/g, '');
          const cleanPart = particularsVal.toLowerCase().replace(/[^a-z0-9]/g, '');

          let match = existingEntries.find((e) => {
            if (e.rowIndex && e.rowIndex === rowNum) return true;
            const exPeriod = (e.periodCode || '').toLowerCase().replace(/[^a-z0-9]/g, '');
            const exPart = (e.particulars || '').toLowerCase().replace(/[^a-z0-9]/g, '');
            const exSec = (e.section || '').toUpperCase();
            return (exPeriod === cleanPeriod && exSec === sectionVal) || exPart === cleanPart;
          });

          let classification: 'ALREADY_EXISTS' | 'MISSING_ADD' | 'REVIEW_REQUIRED' = 'MISSING_ADD';
          let matchReason = 'New record not found in database';
          let selected = true;

          if (match) {
            const diff = Math.abs(match.amount - amountVal);
            if (diff < 0.01) {
              classification = 'ALREADY_EXISTS';
              matchReason = `Exact match in DB (Row ${match.rowIndex || '-'}, ₹${match.amount.toLocaleString('en-IN')})`;
              selected = false;
            } else {
              classification = 'REVIEW_REQUIRED';
              matchReason = `Amount variance! DB has ₹${match.amount.toLocaleString('en-IN')} (Diff: ₹${(amountVal - match.amount).toLocaleString('en-IN')})`;
              selected = false;
            }
          }

          rows.push({
            id: `row-${rowNum}-${Date.now()}`,
            sourceRow: rowNum,
            periodCode: periodVal || '2026',
            particulars: particularsVal,
            section: sectionVal,
            category: accountName,
            amount: amountVal,
            paidAmount: amountVal < 0 ? Math.abs(amountVal) : 0,
            receivedAmount: amountVal > 0 ? amountVal : 0,
            formulaString: formulaVal,
            comments: colF ? String(colF.v) : undefined,
            classification,
            matchReason,
            existingMatch: match,
            selected,
          });
        }
      }

      setParsedRows(rows);
    } catch (err: any) {
      console.error('Error analyzing worksheet:', err);
      setErrorMessage(`Failed to analyze worksheet: ${err.message}`);
    }
  };

  const handleSheetChange = (sheet: string) => {
    setSelectedSheet(sheet);
    if (workbook) {
      analyzeWorksheet(workbook, sheet);
    }
  };

  const toggleRowSelection = (id: string) => {
    setParsedRows((prev) =>
      prev.map((r) => (r.id === id ? { ...r, selected: !r.selected } : r))
    );
  };

  const toggleSelectAll = (select: boolean) => {
    setParsedRows((prev) =>
      prev.map((r) => (r.classification === 'MISSING_ADD' ? { ...r, selected: select } : r))
    );
  };

  // Metrics
  const totalCount = parsedRows.length;
  const alreadyExistsCount = parsedRows.filter((r) => r.classification === 'ALREADY_EXISTS').length;
  const missingCount = parsedRows.filter((r) => r.classification === 'MISSING_ADD').length;
  const reviewCount = parsedRows.filter((r) => r.classification === 'REVIEW_REQUIRED').length;
  const selectedCount = parsedRows.filter((r) => r.selected).length;

  const selectedInflow = parsedRows
    .filter((r) => r.selected && r.amount > 0)
    .reduce((sum, r) => sum + r.amount, 0);

  const selectedOutflow = parsedRows
    .filter((r) => r.selected && r.amount < 0)
    .reduce((sum, r) => sum + Math.abs(r.amount), 0);

  const netImpact = selectedInflow - selectedOutflow;

  const filteredRows = parsedRows.filter((r) => {
    if (activeTab === 'MISSING') return r.classification === 'MISSING_ADD';
    if (activeTab === 'EXISTS') return r.classification === 'ALREADY_EXISTS';
    if (activeTab === 'REVIEW') return r.classification === 'REVIEW_REQUIRED';
    return true;
  });

  // Execute Import
  const handleConfirmImport = async () => {
    const recordsToImport = parsedRows.filter((r) => r.selected);
    if (recordsToImport.length === 0) {
      alert('Please select at least one missing record to import.');
      return;
    }

    try {
      setIsImporting(true);
      setErrorMessage(null);

      const res = await fetch(`/api/bank/${accountSlug}/import`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sourceFileName: file?.name || 'Excel Upload',
          worksheetName: selectedSheet,
          records: recordsToImport.map((r) => ({
            periodCode: r.periodCode,
            particulars: r.particulars,
            section: r.section,
            category: r.category,
            amount: r.amount,
            paidAmount: r.paidAmount,
            receivedAmount: r.receivedAmount,
            formulaString: r.formulaString,
            comments: r.comments,
            rowIndex: r.sourceRow,
          })),
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        alert(`Successfully imported ${data.importedCount} new missing records into ${accountName}!`);
        onImportSuccess();
        onClose();
      } else {
        setErrorMessage(data.error || 'Import failed. Please check permissions.');
      }
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.message || 'Network error occurred during import.');
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
      <div className="bg-[#FFFFFF] w-full max-w-5xl rounded-3xl shadow-2xl border border-[#E5E5EA] overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="p-5 border-b border-[#E5E5EA] flex items-center justify-between bg-[#FBFBFC]">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-[#007AFF]/10 flex items-center justify-center text-[#007AFF]">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-[#1D1D1F]">
                Intelligent Excel Import & Duplicate Prevention
              </h3>
              <p className="text-xs text-[#86868B]">
                Target Account: <span className="font-semibold text-[#1D1D1F]">{accountName}</span> ({accountSlug})
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-[#86868B] hover:text-[#1D1D1F] p-1.5 rounded-xl hover:bg-[#F2F2F7] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* File Upload & Sheet Selector */}
        <div className="p-5 border-b border-[#E5E5EA] bg-[#FFFFFF] space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex-1">
              <label className="text-xs font-semibold text-[#1D1D1F] block mb-1.5">
                Upload Source Spreadsheet (.xlsx, .xls)
              </label>
              <div className="flex items-center space-x-3">
                <input
                  type="file"
                  accept=".xlsx, .xls, .csv"
                  onChange={handleFileUpload}
                  className="text-xs text-[#86868B] file:mr-3 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-[#007AFF] file:text-white hover:file:bg-[#007AFF]/90 cursor-pointer"
                />
                {file && (
                  <span className="text-xs font-medium text-[#34C759] flex items-center">
                    <Check className="w-3.5 h-3.5 mr-1" /> {file.name}
                  </span>
                )}
              </div>
            </div>

            {sheetNames.length > 0 && (
              <div className="w-full sm:w-64">
                <label className="text-xs font-semibold text-[#1D1D1F] block mb-1.5">
                  Select Worksheet
                </label>
                <select
                  value={selectedSheet}
                  onChange={(e) => handleSheetChange(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs bg-[#F9F9FB] border border-[#E5E5EA] rounded-xl font-medium focus:outline-hidden focus:border-[#007AFF]"
                >
                  {sheetNames.map((name) => (
                    <option key={name} value={name}>
                      {name}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {errorMessage && (
            <div className="p-3 bg-[#FF3B30]/10 border border-[#FF3B30]/20 rounded-xl text-xs text-[#FF3B30] flex items-center space-x-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}
        </div>

        {/* Comparison Summary KPIs */}
        {parsedRows.length > 0 && (
          <div className="px-5 py-3.5 bg-[#F9F9FB] border-b border-[#E5E5EA] grid grid-cols-2 md:grid-cols-5 gap-3">
            <div className="p-2.5 bg-white rounded-xl border border-[#E5E5EA]">
              <span className="text-[10px] text-[#86868B] font-semibold uppercase block">Source Records</span>
              <span className="text-base font-bold text-[#1D1D1F]">{totalCount}</span>
            </div>

            <div className="p-2.5 bg-white rounded-xl border border-[#E5E5EA]">
              <span className="text-[10px] text-[#34C759] font-semibold uppercase block">Already Exists (Skip)</span>
              <span className="text-base font-bold text-[#34C759]">{alreadyExistsCount}</span>
            </div>

            <div className="p-2.5 bg-white rounded-xl border border-[#E5E5EA]">
              <span className="text-[10px] text-[#007AFF] font-semibold uppercase block">Missing (To Add)</span>
              <span className="text-base font-bold text-[#007AFF]">{missingCount}</span>
            </div>

            <div className="p-2.5 bg-white rounded-xl border border-[#E5E5EA]">
              <span className="text-[10px] text-[#FF9500] font-semibold uppercase block">Review Required</span>
              <span className="text-base font-bold text-[#FF9500]">{reviewCount}</span>
            </div>

            <div className="p-2.5 bg-white rounded-xl border border-[#E5E5EA]">
              <span className="text-[10px] text-[#86868B] font-semibold uppercase block">Proposed Net Impact</span>
              <span className={`text-base font-bold ${netImpact >= 0 ? 'text-[#34C759]' : 'text-[#FF3B30]'}`}>
                {netImpact >= 0 ? '+' : ''}₹{netImpact.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>
        )}

        {/* Tab Filters */}
        {parsedRows.length > 0 && (
          <div className="px-5 py-2.5 border-b border-[#E5E5EA] flex items-center justify-between bg-white text-xs">
            <div className="flex items-center space-x-1.5 bg-[#F2F2F7] p-1 rounded-xl">
              <button
                type="button"
                onClick={() => setActiveTab('ALL')}
                className={`px-3 py-1 rounded-lg font-medium transition-colors ${
                  activeTab === 'ALL' ? 'bg-white text-[#1D1D1F] shadow-2xs' : 'text-[#86868B] hover:text-[#1D1D1F]'
                }`}
              >
                All Records ({totalCount})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('MISSING')}
                className={`px-3 py-1 rounded-lg font-medium transition-colors ${
                  activeTab === 'MISSING' ? 'bg-white text-[#007AFF] shadow-2xs' : 'text-[#86868B] hover:text-[#1D1D1F]'
                }`}
              >
                Missing To Add ({missingCount})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('EXISTS')}
                className={`px-3 py-1 rounded-lg font-medium transition-colors ${
                  activeTab === 'EXISTS' ? 'bg-white text-[#34C759] shadow-2xs' : 'text-[#86868B] hover:text-[#1D1D1F]'
                }`}
              >
                Already Exists ({alreadyExistsCount})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('REVIEW')}
                className={`px-3 py-1 rounded-lg font-medium transition-colors ${
                  activeTab === 'REVIEW' ? 'bg-white text-[#FF9500] shadow-2xs' : 'text-[#86868B] hover:text-[#1D1D1F]'
                }`}
              >
                Review Required ({reviewCount})
              </button>
            </div>

            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={() => toggleSelectAll(true)}
                className="text-[11px] text-[#007AFF] hover:underline font-semibold"
              >
                Select All Missing
              </button>
              <span className="text-[#C7C7CC]">|</span>
              <button
                type="button"
                onClick={() => toggleSelectAll(false)}
                className="text-[11px] text-[#86868B] hover:underline font-semibold"
              >
                Deselect All
              </button>
            </div>
          </div>
        )}

        {/* Comparison Table */}
        <div className="flex-1 overflow-y-auto p-5">
          {parsedRows.length === 0 ? (
            <div className="py-16 text-center text-[#86868B] text-xs flex flex-col items-center justify-center space-y-2">
              <Upload className="w-8 h-8 text-[#C7C7CC]" />
              <p className="font-semibold text-[#1D1D1F]">Upload an Excel file to compare source data against database records.</p>
              <p className="text-[11px] max-w-md">
                The smart engine will identify confirmed missing records, detect existing entries, and calculate the exact financial impact before any changes occur.
              </p>
            </div>
          ) : (
            <div className="border border-[#E5E5EA] rounded-2xl overflow-hidden shadow-2xs">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-[#E5E5EA] bg-[#F9F9FB] text-[#86868B] font-semibold">
                    <th className="py-2.5 px-3 w-10 text-center">Import</th>
                    <th className="py-2.5 px-3">Row</th>
                    <th className="py-2.5 px-3">Section / Period</th>
                    <th className="py-2.5 px-3">Particulars</th>
                    <th className="py-2.5 px-3 text-right">Source Amount</th>
                    <th className="py-2.5 px-3">Classification</th>
                    <th className="py-2.5 px-3">Database Match / Reason</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5E5EA]">
                  {filteredRows.map((row) => (
                    <tr
                      key={row.id}
                      className={`hover:bg-[#F9F9FB]/60 transition-colors ${
                        row.selected ? 'bg-[#007AFF]/5' : ''
                      }`}
                    >
                      <td className="py-2.5 px-3 text-center">
                        <input
                          type="checkbox"
                          checked={row.selected}
                          onChange={() => toggleRowSelection(row.id)}
                          disabled={row.classification === 'ALREADY_EXISTS'}
                          className="rounded border-[#E5E5EA] text-[#007AFF] focus:ring-[#007AFF] cursor-pointer disabled:opacity-30"
                        />
                      </td>
                      <td className="py-2.5 px-3 font-mono text-[11px] text-[#86868B]">
                        Row {row.sourceRow}
                      </td>
                      <td className="py-2.5 px-3 font-medium text-[#1D1D1F]">
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#F2F2F7] text-[#48484A] mr-1.5 font-bold">
                          {row.section}
                        </span>
                        {row.periodCode}
                      </td>
                      <td className="py-2.5 px-3 text-[#1D1D1F] font-medium">
                        {row.particulars}
                        {row.formulaString && (
                          <span className="block text-[10px] text-[#007AFF] font-mono">
                            ={row.formulaString}
                          </span>
                        )}
                      </td>
                      <td className={`py-2.5 px-3 text-right font-bold tabular-nums whitespace-nowrap ${
                        row.amount < 0 ? 'text-[#FF3B30]' : 'text-[#1D1D1F]'
                      }`}>
                        ₹{row.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        {row.classification === 'ALREADY_EXISTS' && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#34C759]/10 text-[#34C759]">
                            <CheckCircle2 className="w-3 h-3 mr-1" /> Already Exists
                          </span>
                        )}
                        {row.classification === 'MISSING_ADD' && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#007AFF]/10 text-[#007AFF]">
                            <Plus className="w-3 h-3 mr-1" /> Missing – Add
                          </span>
                        )}
                        {row.classification === 'REVIEW_REQUIRED' && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#FF9500]/10 text-[#FF9500]">
                            <AlertTriangle className="w-3 h-3 mr-1" /> Review Required
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-[11px] text-[#86868B]">
                        {row.matchReason}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-[#E5E5EA] bg-[#FBFBFC] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center space-x-2 text-[#86868B]">
            <ShieldCheck className="w-4 h-4 text-[#34C759]" />
            <span>
              Selected for insertion: <strong className="text-[#1D1D1F]">{selectedCount}</strong> records | Net Cash Impact:{' '}
              <strong className={netImpact >= 0 ? 'text-[#34C759]' : 'text-[#FF3B30]'}>
                ₹{netImpact.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </strong>
            </span>
          </div>

          <div className="flex items-center space-x-2 justify-end">
            <button
              type="button"
              onClick={onClose}
              disabled={isImporting}
              className="px-4 py-2 text-xs font-semibold text-[#86868B] hover:text-[#1D1D1F] transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirmImport}
              disabled={isImporting || selectedCount === 0}
              className="px-5 py-2 text-xs font-semibold text-white bg-[#007AFF] hover:bg-[#007AFF]/90 disabled:opacity-40 rounded-xl shadow-2xs transition-colors flex items-center space-x-1.5 cursor-pointer"
            >
              {isImporting ? (
                <span>Importing...</span>
              ) : (
                <>
                  <span>Approve & Import {selectedCount} Records</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Plus(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M5 12h14" />
      <path d="M12 5v14" />
    </svg>
  );
}

