'use client';

import React, { useState, useEffect } from 'react';
import Navbar from '@/components/Navbar';
import {
  FileSpreadsheet,
  Search,
  Filter,
  AlertTriangle,
  CheckCircle2,
  Download,
  Database,
  Hash,
  ChevronLeft,
  ChevronRight,
  ShieldCheck
} from 'lucide-react';
import { exportToExcel, exportToCSV } from '@/lib/exportUtils';

export default function RawCellsPage() {
  const [cells, setCells] = useState<any[]>([]);
  const [archives, setArchives] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [sheetFilter, setSheetFilter] = useState('ALL');
  const [onlyRef, setOnlyRef] = useState(false);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [refErrorCount, setRefErrorCount] = useState(0);

  useEffect(() => {
    // Check if query has onlyRef
    const params = new URLSearchParams(window.location.search);
    if (params.get('onlyRef') === 'true') {
      setOnlyRef(true);
    }
  }, []);

  useEffect(() => {
    fetchRawCells();
  }, [sheetFilter, onlyRef, search, page]);

  const fetchRawCells = async () => {
    setLoading(true);
    try {
      let url = `/api/raw-cells?page=${page}&pageSize=100`;
      if (sheetFilter !== 'ALL') url += `&sheet=${encodeURIComponent(sheetFilter)}`;
      if (onlyRef) url += '&onlyRef=true';
      if (search) url += `&search=${encodeURIComponent(search)}`;

      const res = await fetch(url);
      const data = await res.json();
      setCells(data.cells || []);
      setArchives(data.archives || []);
      setTotalPages(data.totalPages || 1);
      setTotalCount(data.totalCount || 0);
      setRefErrorCount(data.refErrorCount || 0);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = (format: 'xlsx' | 'csv') => {
    const exportData = cells.map((c) => ({
      Worksheet: c.worksheetName,
      'Cell Address': c.cellAddress,
      Row: c.rowIndex,
      Column: c.columnIndex,
      'Raw / Calculated Value': c.rawValue,
      'Formula String': c.formulaString || 'Literal Value',
      'Has #REF! Error': c.isRefError ? 'YES' : 'NO',
    }));

    if (format === 'xlsx') {
      exportToExcel(exportData, 'Raw Cells Archive', 'Atharva_Raw_Cells_Archive');
    } else {
      exportToCSV(exportData, 'Atharva_Raw_Cells_Archive');
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto selection:bg-[#B3D7FF]">
      <Navbar
        title="Excel Source Cell Inspector"
        subtitle="Immutable Primary Source Archive • 9,570 Preserved Cells & 39 Flagged #REF! Errors"
        onRefresh={fetchRawCells}
      />

      {/* Source Files Archive Cards (Apple Light Mode) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {archives.map((a) => (
          <div key={a.id} className="bg-[#FFFFFF] p-5 rounded-[22px] border border-[#E5E5EA] shadow-apple-card">
            <div className="flex items-center space-x-3.5">
              <div className="w-10 h-10 rounded-full bg-[#EBF5FF] text-[#007AFF] flex items-center justify-center shrink-0">
                <FileSpreadsheet className="w-5 h-5" />
              </div>
              <div className="overflow-hidden">
                <h4 className="font-bold text-xs text-[#1D1D1F] tracking-tight truncate">{a.filename}</h4>
                <p className="text-[11px] text-[#86868B] font-mono mt-0.5">
                  Size: {(a.fileSizeBytes / (1024 * 1024)).toFixed(2)} MB • SHA-256 Verified
                </p>
              </div>
            </div>
            <div className="mt-3.5 pt-3 border-t border-[#E5E5EA] flex items-center justify-between text-[11px] font-mono text-[#86868B]">
              <span className="truncate max-w-[280px]">SHA-256: {a.fileHash}</span>
              <span className="px-2.5 py-0.5 rounded-full bg-[#EAF9EE] text-[#34C759] border border-[#D2F4DA] text-[10px] font-semibold shrink-0">
                Protected Source
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Apple Styled Filter & Action Toolbar */}
      <div className="bg-[#FFFFFF] p-4 rounded-[22px] border border-[#E5E5EA] shadow-apple-card flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 text-[#86868B] absolute left-3.5 top-3" />
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Search cell (e.g. C11, I16) or formula..."
              className="w-full pl-9 pr-4 py-2 bg-[#F2F2F7] border border-[#E5E5EA] rounded-full text-xs text-[#1D1D1F] focus:bg-[#FFFFFF] focus:outline-hidden focus:ring-2 focus:ring-[#007AFF] transition-all"
            />
          </div>

          <div className="flex items-center space-x-2">
            <span className="text-xs text-[#86868B] font-medium">Sheet:</span>
            <select
              value={sheetFilter}
              onChange={(e) => {
                setSheetFilter(e.target.value);
                setPage(1);
              }}
              className="px-3 py-2 bg-[#F2F2F7] border border-[#E5E5EA] rounded-full text-xs font-medium text-[#1D1D1F] focus:outline-hidden focus:ring-2 focus:ring-[#007AFF] transition-all cursor-pointer"
            >
              <option value="ALL">All Sheets (9,570 cells)</option>
              <option value="6182 & 6188">6182 & 6188 (August 2026)</option>
              <option value="Pay slip">Pay slip (September 2026)</option>
            </select>
          </div>

          <button
            onClick={() => {
              setOnlyRef(!onlyRef);
              setPage(1);
            }}
            className={`px-4 py-2 rounded-full text-xs font-semibold flex items-center space-x-1.5 transition-all ${
              onlyRef
                ? 'bg-[#FF9F0A] text-white shadow-apple-btn'
                : 'bg-[#FFF5E5] text-[#FF9F0A] border border-[#FFE4B8] hover:bg-[#FFEECF]'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>Show 39 #REF! Errors Only</span>
          </button>
        </div>

        <div className="flex items-center space-x-2 self-end md:self-auto">
          <button
            onClick={() => handleExport('xlsx')}
            className="px-4 py-2 rounded-full border border-[#E5E5EA] bg-[#F2F2F7] hover:bg-[#E5E5EA] text-[#1D1D1F] text-xs font-medium flex items-center space-x-1.5 transition-colors"
          >
            <Download className="w-3.5 h-3.5 text-[#34C759]" />
            <span>Excel</span>
          </button>
          <button
            onClick={() => handleExport('csv')}
            className="px-4 py-2 rounded-full border border-[#E5E5EA] bg-[#F2F2F7] hover:bg-[#E5E5EA] text-[#1D1D1F] text-xs font-medium flex items-center space-x-1.5 transition-colors"
          >
            <Download className="w-3.5 h-3.5 text-[#007AFF]" />
            <span>CSV</span>
          </button>
        </div>
      </div>

      {/* Raw Cells Table */}
      <div className="bg-[#FFFFFF] rounded-[24px] border border-[#E5E5EA] shadow-apple-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse">
            <thead className="bg-[#F2F2F7] text-[#1D1D1F] font-semibold border-b border-[#E5E5EA]">
              <tr>
                <th className="py-3 px-4 w-16">Cell</th>
                <th className="py-3 px-3">Worksheet</th>
                <th className="py-3 px-3 w-16 text-center">Row</th>
                <th className="py-3 px-3 w-16 text-center">Col</th>
                <th className="py-3 px-4">Raw / Calculated Value</th>
                <th className="py-3 px-6">Original Formula String</th>
                <th className="py-3 px-3 text-center">Audit Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E5EA]">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-[#86868B]">
                    Loading cell archive...
                  </td>
                </tr>
              ) : cells.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-[#86868B]">
                    No cell records found.
                  </td>
                </tr>
              ) : (
                cells.map((c) => (
                  <tr
                    key={c.id}
                    className={`transition-colors ${
                      c.isRefError ? 'bg-[#FFF5E5]/60 hover:bg-[#FFF5E5]' : 'hover:bg-[#F2F2F7]/50'
                    }`}
                  >
                    <td className="py-3 px-4 font-mono font-bold text-[#007AFF]">{c.cellAddress}</td>
                    <td className="py-3 px-3 font-semibold text-[#1D1D1F]">{c.worksheetName}</td>
                    <td className="py-3 px-3 text-center font-mono text-[#86868B]">{c.rowIndex}</td>
                    <td className="py-3 px-3 text-center font-mono text-[#86868B]">{c.columnIndex}</td>
                    <td
                      className={`py-3 px-4 font-mono font-semibold ${
                        c.isRefError ? 'text-[#FF3B30]' : 'text-[#1D1D1F]'
                      }`}
                    >
                      {c.rawValue !== null ? c.rawValue : '<EMPTY>'}
                    </td>
                    <td className="py-3 px-6 font-mono text-[#1D1D1F] truncate max-w-md">
                      {c.formulaString ? (
                        <span className="text-[#007AFF] font-medium">{c.formulaString}</span>
                      ) : (
                        <span className="text-[#86868B]">Literal</span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-center">
                      {c.isRefError ? (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#FFF5E5] text-[#FF9F0A] border border-[#FFE4B8] flex items-center justify-center space-x-1">
                          <AlertTriangle className="w-3 h-3 text-[#FF9F0A]" />
                          <span>#REF! Flagged</span>
                        </span>
                      ) : (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-[#F2F2F7] text-[#86868B]">
                          Preserved
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Apple Styled Pagination Toolbar */}
        <div className="p-4 border-t border-[#E5E5EA] bg-[#F2F2F7]/60 flex items-center justify-between text-xs text-[#86868B]">
          <div>
            Showing {cells.length} of {totalCount} preserved cells (Page {page} of {totalPages})
          </div>
          <div className="flex items-center space-x-2">
            <button
              disabled={page <= 1}
              onClick={() => setPage(page - 1)}
              className="p-1.5 rounded-full border border-[#E5E5EA] bg-[#FFFFFF] hover:bg-[#F2F2F7] disabled:opacity-40 transition-colors cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4 text-[#1D1D1F]" />
            </button>
            <span className="font-semibold text-[#1D1D1F] font-mono px-2">
              {page} / {totalPages}
            </span>
            <button
              disabled={page >= totalPages}
              onClick={() => setPage(page + 1)}
              className="p-1.5 rounded-full border border-[#E5E5EA] bg-[#FFFFFF] hover:bg-[#F2F2F7] disabled:opacity-40 transition-colors cursor-pointer"
            >
              <ChevronRight className="w-4 h-4 text-[#1D1D1F]" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
