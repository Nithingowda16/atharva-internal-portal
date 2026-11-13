'use client';

import React, { useState, useEffect } from 'react';
import {
  Search,
  Plus,
  Edit2,
  Trash2,
  Calendar,
  FileSpreadsheet,
  Download,
  Upload,
  History,
  AlertTriangle,
  X,
  RefreshCw,
  Tag,
  ArrowRight,
  RotateCcw,
  ShieldCheck,
  Check,
} from 'lucide-react';
import CategoryManagerModal from '@/components/accounting/CategoryManagerModal';
import SmartExcelImportModal from '@/components/accounting/SmartExcelImportModal';

export interface SheetEntryVersion {
  id: string;
  versionNumber: number;
  snapshotData: string;
  changeReason?: string;
  createdById?: string;
  createdByEmail?: string;
  createdAt: string;
}

export interface SheetEntry {
  id: string;
  periodCode?: string;
  entryDate?: string;
  section?: string;
  category?: string;
  particulars?: string;
  sourceReference?: string;
  amount: number;
  rawAmount?: string;
  formulaString?: string;
  paidAmount?: number;
  receivedAmount?: number;
  netAmount?: number;
  invoicedAmount?: number;
  invoiceDate?: string;
  invoiceNo?: string;
  comments?: string;
  remarks?: string;
  rowIndex?: number;
  meta?: string;
  versions?: SheetEntryVersion[];
}

interface AccountSheetViewProps {
  slug: string;
  sheetTitle: string;
  description: string;
  defaultSection?: string;
  columns?: {
    showPeriod?: boolean;
    showDate?: boolean;
    showParticulars?: boolean;
    showCategory?: boolean;
    showPaid?: boolean;
    showReceived?: boolean;
    showNet?: boolean;
    showInvoiced?: boolean;
    showInvoiceNo?: boolean;
    showFormula?: boolean;
    showComments?: boolean;
  };
}

export default function AccountSheetView({
  slug,
  sheetTitle,
  description,
  columns = {
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
  },
}: AccountSheetViewProps) {
  const [loading, setLoading] = useState(true);
  const [entries, setEntries] = useState<SheetEntry[]>([]);
  const [account, setAccount] = useState<any>(null);
  const [metrics, setMetrics] = useState<any>({ totalIncome: 0, totalExpense: 0, netBalance: 0 });
  const [periods, setPeriods] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [selectedSection, setSelectedSection] = useState('ALL');
  const [selectedPeriod, setSelectedPeriod] = useState('ALL');
  const [userRole, setUserRole] = useState<'SUPER_ADMIN' | 'VIEWER'>('SUPER_ADMIN');
  const [isCatModalOpen, setIsCatModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [availableCategories, setAvailableCategories] = useState<string[]>([]);

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<SheetEntry | null>(null);
  const [editChangeReason, setEditChangeReason] = useState('');
  const [deletingEntry, setDeletingEntry] = useState<SheetEntry | null>(null);
  const [isPeriodModalOpen, setIsPeriodModalOpen] = useState(false);

  // Version history drawer
  const [historyEntry, setHistoryEntry] = useState<SheetEntry | null>(null);
  const [isReverting, setIsReverting] = useState(false);

  // Form states
  const [formData, setFormData] = useState<any>({
    periodCode: '2026',
    entryDate: new Date().toISOString().split('T')[0],
    section: 'GENERAL',
    category: sheetTitle,
    particulars: '',
    sourceReference: '',
    amount: '',
    formulaString: '',
    paidAmount: '',
    receivedAmount: '',
    netAmount: '',
    invoicedAmount: '',
    invoiceDate: '',
    invoiceNo: '',
    comments: '',
    paymentStatus: 'PAID',
    bankTxnReference: '',
  });

  const [periodFormData, setPeriodFormData] = useState({
    periodCode: '',
    periodLabel: '',
    openingBalance: '0',
    carryForward: true,
    remarks: '',
  });

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/bank/${slug}`);
      const data = await res.json();
      if (data.success) {
        setEntries(data.entries || []);
        setAccount(data.account || null);
        setMetrics(data.metrics || { totalIncome: 0, totalExpense: 0, netBalance: 0 });
        setPeriods(data.periods || []);
      }
      const authRes = await fetch('/api/users');
      if (authRes.status === 403) {
        setUserRole('VIEWER');
      } else {
        setUserRole('SUPER_ADMIN');
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const res = await fetch(`/api/accounting/categories?accountSlug=${slug}`);
      const data = await res.json();
      if (data.success && Array.isArray(data.categories)) {
        setAvailableCategories(data.categories.map((c: any) => c.name));
      }
    } catch (e) {
      console.error('Failed to fetch accounting categories:', e);
    }
  };

  useEffect(() => {
    fetchData();
    fetchCategories();
  }, [slug]);

  const isSuperAdmin = userRole === 'SUPER_ADMIN';

  // Available unique sections & periods
  const sections = Array.from(new Set(entries.map((e) => e.section).filter(Boolean)));
  const periodCodes = Array.from(new Set(entries.map((e) => e.periodCode).filter(Boolean)));

  const filteredEntries = entries.filter((e) => {
    if (selectedSection !== 'ALL' && e.section !== selectedSection) return false;
    if (selectedPeriod !== 'ALL' && e.periodCode !== selectedPeriod) return false;
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      e.particulars?.toLowerCase().includes(q) ||
      e.category?.toLowerCase().includes(q) ||
      e.sourceReference?.toLowerCase().includes(q) ||
      e.comments?.toLowerCase().includes(q) ||
      e.periodCode?.toLowerCase().includes(q)
    );
  });

  // Export CSV with UTF-8 BOM
  const handleExportCSV = () => {
    if (entries.length === 0) {
      alert('No records available to export.');
      return;
    }

    const headers = [
      'ID',
      'Period',
      'Date',
      'Section',
      'Category',
      'Particulars',
      'Amount',
      'Paid Amount',
      'Received Amount',
      'Net Amount',
      'Formula / Source',
      'Comments',
    ];

    const rows = filteredEntries.map((e) => [
      `"${e.id}"`,
      `"${e.periodCode || ''}"`,
      `"${e.entryDate || ''}"`,
      `"${e.section || ''}"`,
      `"${e.category || ''}"`,
      `"${(e.particulars || '').replace(/"/g, '""')}"`,
      e.amount || 0,
      e.paidAmount || 0,
      e.receivedAmount || 0,
      e.netAmount || 0,
      `"${(e.formulaString || e.sourceReference || '').replace(/"/g, '""')}"`,
      `"${(e.comments || '').replace(/"/g, '""')}"`,
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `${slug}_records_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Handle Create Entry
  const handleCreateEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isSuperAdmin) return;
    try {
      const res = await fetch(`/api/bank/${slug}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      if (res.ok) {
        setIsAddModalOpen(false);
        setFormData({
          periodCode: '2026',
          entryDate: new Date().toISOString().split('T')[0],
          section: 'GENERAL',
          category: sheetTitle,
          particulars: '',
          sourceReference: '',
          amount: '',
          formulaString: '',
          paidAmount: '',
          receivedAmount: '',
          netAmount: '',
          invoicedAmount: '',
          invoiceDate: '',
          invoiceNo: '',
          comments: '',
          paymentStatus: 'PAID',
          bankTxnReference: '',
        });
        fetchData();
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to create entry');
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Handle Edit Entry
  const handleUpdateEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isSuperAdmin || !editingEntry) return;

    if (!editChangeReason.trim()) {
      alert('Please specify a reason for this financial modification for audit history.');
      return;
    }

    try {
      const res = await fetch(`/api/bank/${slug}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...editingEntry,
          changeReason: editChangeReason.trim(),
        }),
      });
      if (res.ok) {
        setEditingEntry(null);
        setEditChangeReason('');
        fetchData();
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to update entry');
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Handle Delete Entry
  const handleConfirmDelete = async () => {
    if (!isSuperAdmin || !deletingEntry) return;
    try {
      const res = await fetch(`/api/bank/${slug}?id=${deletingEntry.id}`, { method: 'DELETE' });
      if (res.ok) {
        setDeletingEntry(null);
        fetchData();
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to delete entry');
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Handle 1-Click Rollback
  const handleRevertVersion = async (entryId: string, versionNumber: number) => {
    if (!isSuperAdmin) return;
    if (!confirm(`Are you sure you want to revert this entry back to Version ${versionNumber}?`)) return;

    try {
      setIsReverting(true);
      const res = await fetch(`/api/bank/${slug}/${entryId}/revert`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ versionNumber }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        alert(`Successfully reverted to Version ${versionNumber}!`);
        setHistoryEntry(null);
        fetchData();
      } else {
        alert(data.error || 'Failed to revert version.');
      }
    } catch (err: any) {
      console.error(err);
      alert('Network error while reverting version.');
    } finally {
      setIsReverting(false);
    }
  };

  // Handle Create Future Period
  const handleCreatePeriod = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isSuperAdmin) return;
    try {
      const res = await fetch(`/api/bank/${slug}/periods`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(periodFormData),
      });
      if (res.ok) {
        setIsPeriodModalOpen(false);
        setPeriodFormData({
          periodCode: '',
          periodLabel: '',
          openingBalance: '0',
          carryForward: true,
          remarks: '',
        });
        fetchData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-6">
      {/* Account Header Card */}
      <div className="bg-[#FFFFFF] p-5 rounded-2xl border border-[#E5E5EA] shadow-2xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-xl font-bold text-[#1D1D1F] tracking-tight">{sheetTitle}</h2>
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[#007AFF]/10 text-[#007AFF] border border-[#007AFF]/20">
                Supporting Account
              </span>
            </div>
            <p className="text-xs text-[#86868B] mt-1">{description}</p>
          </div>

          {/* Quick Metrics */}
          <div className="flex items-center space-x-3">
            <div className="px-3.5 py-2 bg-[#F9F9FB] rounded-xl border border-[#E5E5EA] text-right">
              <span className="text-[10px] text-[#86868B] font-medium block">Total Entries</span>
              <span className="text-sm font-bold text-[#1D1D1F]">{entries.length}</span>
            </div>

            <div className="px-3.5 py-2 bg-[#F9F9FB] rounded-xl border border-[#E5E5EA] text-right">
              <span className="text-[10px] text-[#86868B] font-medium block">Calculated Net</span>
              <span className={`text-sm font-bold ${metrics.netBalance >= 0 ? 'text-[#34C759]' : 'text-[#FF3B30]'}`}>
                ₹{Number(metrics.netBalance || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Action Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#FFFFFF] p-3.5 rounded-2xl border border-[#E5E5EA] shadow-2xs">
        <div className="flex flex-wrap items-center gap-2">
          {/* Search */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-[#86868B] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder={`Search ${sheetTitle}...`}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 pr-3 py-1.5 text-xs bg-[#F9F9FB] border border-[#E5E5EA] rounded-xl focus:outline-hidden focus:border-[#007AFF] w-44 sm:w-56"
            />
          </div>

          {/* Period Filter */}
          {periodCodes.length > 0 && (
            <select
              value={selectedPeriod}
              onChange={(e) => setSelectedPeriod(e.target.value)}
              className="px-3 py-1.5 text-xs bg-[#F9F9FB] border border-[#E5E5EA] rounded-xl text-[#1D1D1F] focus:outline-hidden focus:border-[#007AFF]"
            >
              <option value="ALL">All Periods ({entries.length})</option>
              {periodCodes.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          )}

          {/* Section Filter */}
          {sections.length > 0 && (
            <select
              value={selectedSection}
              onChange={(e) => setSelectedSection(e.target.value)}
              className="px-3 py-1.5 text-xs bg-[#F9F9FB] border border-[#E5E5EA] rounded-xl text-[#1D1D1F] focus:outline-hidden focus:border-[#007AFF]"
            >
              <option value="ALL">All Sections</option>
              {sections.map((s) => (
                <option key={s} value={s}>
                  {s?.replace(/_/g, ' ')}
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center space-x-2">
          <button
            type="button"
            onClick={handleExportCSV}
            className="inline-flex items-center px-3 py-1.5 text-xs font-semibold text-[#48484A] bg-[#F2F2F7] hover:bg-[#E5E5EA] rounded-xl transition-colors"
            title="Export Records to CSV"
          >
            <Download className="w-3.5 h-3.5 mr-1" /> Export CSV
          </button>

          {isSuperAdmin && (
            <>
              <button
                type="button"
                onClick={() => setIsImportModalOpen(true)}
                className="inline-flex items-center px-3 py-1.5 text-xs font-semibold text-[#007AFF] bg-[#007AFF]/10 hover:bg-[#007AFF]/20 rounded-xl transition-colors"
                title="Intelligent Excel Import & Duplicate Prevention"
              >
                <Upload className="w-3.5 h-3.5 mr-1 text-[#007AFF]" /> Import Excel
              </button>

              <button
                type="button"
                onClick={() => setIsCatModalOpen(true)}
                className="inline-flex items-center px-3 py-1.5 text-xs font-semibold text-[#48484A] bg-[#F2F2F7] hover:bg-[#E5E5EA] rounded-xl transition-colors"
                title="Manage Dynamic Accounting Categories"
              >
                <Tag className="w-3.5 h-3.5 mr-1" /> Categories
              </button>

              <button
                type="button"
                onClick={() => setIsPeriodModalOpen(true)}
                className="inline-flex items-center px-3 py-1.5 text-xs font-semibold text-[#48484A] bg-[#F2F2F7] hover:bg-[#E5E5EA] rounded-xl transition-colors"
              >
                <Calendar className="w-3.5 h-3.5 mr-1" /> Add Period
              </button>

              <button
                type="button"
                onClick={() => setIsAddModalOpen(true)}
                className="inline-flex items-center px-3.5 py-1.5 bg-[#007AFF] text-white text-xs font-semibold rounded-xl hover:bg-[#007AFF]/90 shadow-2xs transition-colors"
              >
                <Plus className="w-3.5 h-3.5 mr-1" /> Add Entry
              </button>
            </>
          )}
        </div>
      </div>

      {/* Main Account Data Table */}
      <div className="bg-[#FFFFFF] rounded-2xl border border-[#E5E5EA] shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-[#E5E5EA] bg-[#F9F9FB] text-[#86868B] font-semibold">
                {columns.showPeriod && <th className="py-2.5 px-4">Period</th>}
                {columns.showDate && <th className="py-2.5 px-4">Date</th>}
                {columns.showParticulars && <th className="py-2.5 px-4">Particulars</th>}
                {columns.showCategory && <th className="py-2.5 px-4">Section / Category</th>}
                <th className="py-2.5 px-4 text-right">Amount (₹)</th>
                {columns.showPaid && <th className="py-2.5 px-4 text-right">Paid (₹)</th>}
                {columns.showReceived && <th className="py-2.5 px-4 text-right">Received (₹)</th>}
                {columns.showNet && <th className="py-2.5 px-4 text-right">Net (₹)</th>}
                {columns.showFormula && <th className="py-2.5 px-4">Formula / Source</th>}
                <th className="py-2.5 px-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E5EA]">
              {loading ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-[#86868B]">
                    <div className="flex items-center justify-center space-x-2">
                      <RefreshCw className="w-4 h-4 animate-spin text-[#007AFF]" />
                      <span>Loading financial records...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredEntries.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-8 text-center text-[#86868B] text-xs">
                    No entries match your search criteria.
                  </td>
                </tr>
              ) : (
                filteredEntries.map((row) => (
                  <tr key={row.id} className="hover:bg-[#F9F9FB]/60 transition-colors">
                    {columns.showPeriod && (
                      <td className="py-2.5 px-4 font-medium text-[#1D1D1F] whitespace-nowrap">
                        {row.periodCode || '-'}
                      </td>
                    )}
                    {columns.showDate && (
                      <td className="py-2.5 px-4 text-[#86868B] whitespace-nowrap">
                        {row.entryDate || '-'}
                      </td>
                    )}
                    {columns.showParticulars && (
                      <td className="py-2.5 px-4 font-medium text-[#1D1D1F]">
                        {row.particulars}
                        {row.comments && (
                          <span className="block text-[11px] text-[#86868B] font-normal">
                            {row.comments}
                          </span>
                        )}
                        {row.invoiceNo && (
                          <span className="block text-[10px] text-[#007AFF] font-mono">
                            Inv: {row.invoiceNo} {row.invoiceDate ? `(${row.invoiceDate})` : ''}
                          </span>
                        )}
                      </td>
                    )}
                    {columns.showCategory && (
                      <td className="py-2.5 px-4">
                        <span className="inline-block px-2 py-0.5 rounded-md text-[10px] font-semibold bg-[#F2F2F7] text-[#48484A]">
                          {row.section?.replace(/_/g, ' ') || row.category || 'General'}
                        </span>
                      </td>
                    )}
                    <td
                      className={`py-2.5 px-4 text-right font-bold tabular-nums whitespace-nowrap ${
                        row.amount < 0 ? 'text-[#FF3B30]' : 'text-[#1D1D1F]'
                      }`}
                    >
                      {row.amount !== undefined
                        ? row.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })
                        : '-'}
                    </td>
                    {columns.showPaid && (
                      <td className="py-2.5 px-4 text-right text-[#FF3B30] tabular-nums whitespace-nowrap">
                        {row.paidAmount
                          ? `₹${row.paidAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`
                          : '-'}
                      </td>
                    )}
                    {columns.showReceived && (
                      <td className="py-2.5 px-4 text-right text-[#34C759] tabular-nums whitespace-nowrap">
                        {row.receivedAmount
                          ? `₹${row.receivedAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`
                          : '-'}
                      </td>
                    )}
                    {columns.showNet && (
                      <td
                        className={`py-2.5 px-4 text-right font-bold tabular-nums whitespace-nowrap ${
                          row.netAmount !== null && row.netAmount !== undefined && row.netAmount < 0
                            ? 'text-[#FF3B30]'
                            : 'text-[#34C759]'
                        }`}
                      >
                        {row.netAmount !== null && row.netAmount !== undefined
                          ? `₹${row.netAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`
                          : '-'}
                      </td>
                    )}
                    {columns.showFormula && (
                      <td className="py-2.5 px-4 text-[#86868B] font-mono text-[11px] truncate max-w-xs">
                        {row.formulaString ? (
                          <span className="text-[#007AFF] bg-[#007AFF]/10 px-1.5 py-0.5 rounded">
                            ={row.formulaString}
                          </span>
                        ) : (
                          row.sourceReference || '-'
                        )}
                      </td>
                    )}
                    <td className="py-2.5 px-4 text-center whitespace-nowrap">
                      <div className="flex items-center justify-center space-x-1.5">
                        <button
                          type="button"
                          onClick={() => setHistoryEntry(row)}
                          className="p-1 rounded-md text-[#86868B] hover:text-[#007AFF] hover:bg-[#007AFF]/10 transition-colors"
                          title="Version History & Audit Log"
                        >
                          <History className="w-3.5 h-3.5" />
                        </button>

                        {isSuperAdmin && (
                          <>
                            <button
                              type="button"
                              onClick={() => {
                                setEditingEntry(row);
                                setEditChangeReason('');
                              }}
                              className="p-1 rounded-md text-[#86868B] hover:text-[#007AFF] hover:bg-[#007AFF]/10 transition-colors"
                              title="Edit Entry"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setDeletingEntry(row)}
                              className="p-1 rounded-md text-[#86868B] hover:text-[#FF3B30] hover:bg-[#FF3B30]/10 transition-colors"
                              title="Void / Soft Delete Entry"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Entry Modal (Super Admin Only) */}
      {isAddModalOpen && isSuperAdmin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-[#FFFFFF] w-full max-w-lg rounded-2xl shadow-xl border border-[#E5E5EA] overflow-hidden">
            <div className="p-4 border-b border-[#E5E5EA] flex items-center justify-between bg-[#FBFBFC]">
              <h3 className="font-bold text-sm text-[#1D1D1F]">Add Financial Entry ({sheetTitle})</h3>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="text-[#86868B] hover:text-[#1D1D1F] p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateEntry} className="p-5 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-medium text-[#1D1D1F] block mb-1">Period Code / Year</label>
                  <input
                    type="text"
                    value={formData.periodCode}
                    onChange={(e) => setFormData({ ...formData, periodCode: e.target.value })}
                    className="w-full px-3 py-1.5 border border-[#E5E5EA] rounded-xl text-xs"
                    placeholder="e.g. 2026, 2027, Nov-26"
                    required
                  />
                </div>
                <div>
                  <label className="font-medium text-[#1D1D1F] block mb-1">Date</label>
                  <input
                    type="date"
                    value={formData.entryDate}
                    onChange={(e) => setFormData({ ...formData, entryDate: e.target.value })}
                    className="w-full px-3 py-1.5 border border-[#E5E5EA] rounded-xl text-xs"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="font-medium text-[#1D1D1F] block mb-1">Particulars / Description</label>
                <input
                  type="text"
                  value={formData.particulars}
                  onChange={(e) => setFormData({ ...formData, particulars: e.target.value })}
                  className="w-full px-3 py-1.5 border border-[#E5E5EA] rounded-xl text-xs"
                  placeholder="Description of item"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-medium text-[#1D1D1F] block mb-1">Section</label>
                  <input
                    type="text"
                    value={formData.section}
                    onChange={(e) => setFormData({ ...formData, section: e.target.value })}
                    className="w-full px-3 py-1.5 border border-[#E5E5EA] rounded-xl text-xs"
                    placeholder="PAYMENTS, EXPENSES, etc."
                  />
                </div>
                <div>
                  <label className="font-medium text-[#1D1D1F] block mb-1">Amount (₹)</label>
                  <input
                    type="number"
                    step="any"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    className="w-full px-3 py-1.5 border border-[#E5E5EA] rounded-xl text-xs"
                    placeholder="0.00 (negative for debit/outflow)"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-medium text-[#1D1D1F] block mb-1">Paid Amount (₹)</label>
                  <input
                    type="number"
                    step="any"
                    value={formData.paidAmount}
                    onChange={(e) => setFormData({ ...formData, paidAmount: e.target.value })}
                    className="w-full px-3 py-1.5 border border-[#E5E5EA] rounded-xl text-xs"
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <label className="font-medium text-[#1D1D1F] block mb-1">Received Amount (₹)</label>
                  <input
                    type="number"
                    step="any"
                    value={formData.receivedAmount}
                    onChange={(e) => setFormData({ ...formData, receivedAmount: e.target.value })}
                    className="w-full px-3 py-1.5 border border-[#E5E5EA] rounded-xl text-xs"
                    placeholder="0.00"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-medium text-[#1D1D1F] block mb-1">
                    Accounting Category
                    <button
                      type="button"
                      onClick={() => setIsCatModalOpen(true)}
                      className="ml-2 text-[#007AFF] hover:underline text-[10px]"
                    >
                      + Manage
                    </button>
                  </label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full px-3 py-1.5 border border-[#E5E5EA] rounded-xl text-xs bg-white"
                  >
                    <option value={sheetTitle}>{sheetTitle} (Default)</option>
                    {availableCategories
                      .filter((c) => c !== sheetTitle)
                      .map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                  </select>
                </div>
                <div>
                  <label className="font-medium text-[#1D1D1F] block mb-1">Payment Status (Cash Flow)</label>
                  <select
                    value={formData.paymentStatus}
                    onChange={(e) => setFormData({ ...formData, paymentStatus: e.target.value })}
                    className="w-full px-3 py-1.5 border border-[#E5E5EA] rounded-xl text-xs bg-white font-medium"
                  >
                    <option value="PAID">PAID (Confirmed Bank Outflow)</option>
                    <option value="RECEIVED">RECEIVED (Confirmed Bank Inflow)</option>
                    <option value="PENDING">PENDING (Liability/Receivable - No Bank Impact)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-medium text-[#1D1D1F] block mb-1">Bank Reference (UTR / Cheque)</label>
                  <input
                    type="text"
                    value={formData.bankTxnReference || ''}
                    onChange={(e) => setFormData({ ...formData, bankTxnReference: e.target.value })}
                    className="w-full px-3 py-1.5 border border-[#E5E5EA] rounded-xl text-xs"
                    placeholder="e.g. UTR12984029"
                  />
                </div>
                <div>
                  <label className="font-medium text-[#1D1D1F] block mb-1">Formula or Source Reference</label>
                  <input
                    type="text"
                    value={formData.formulaString}
                    onChange={(e) => setFormData({ ...formData, formulaString: e.target.value })}
                    className="w-full px-3 py-1.5 border border-[#E5E5EA] rounded-xl text-xs font-mono"
                    placeholder="e.g. SUM(C3:C29)"
                  />
                </div>
              </div>

              <div>
                <label className="font-medium text-[#1D1D1F] block mb-1">Comments / Remarks</label>
                <input
                  type="text"
                  value={formData.comments}
                  onChange={(e) => setFormData({ ...formData, comments: e.target.value })}
                  className="w-full px-3 py-1.5 border border-[#E5E5EA] rounded-xl text-xs"
                  placeholder="Optional notes"
                />
              </div>

              <div className="pt-3 flex items-center justify-end space-x-2 border-t border-[#E5E5EA]">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-3.5 py-1.5 text-xs text-[#86868B] hover:text-[#1D1D1F] font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-semibold text-white bg-[#007AFF] hover:bg-[#007AFF]/90 rounded-xl shadow-2xs"
                >
                  Save Entry
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Entry Modal with Financial Impact Preview */}
      {editingEntry && isSuperAdmin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-[#FFFFFF] w-full max-w-lg rounded-2xl shadow-xl border border-[#E5E5EA] overflow-hidden">
            <div className="p-4 border-b border-[#E5E5EA] flex items-center justify-between bg-[#FBFBFC]">
              <div>
                <h3 className="font-bold text-sm text-[#1D1D1F]">Edit Financial Entry</h3>
                <p className="text-[11px] text-[#86868B]">ID: {editingEntry.id}</p>
              </div>
              <button
                type="button"
                onClick={() => setEditingEntry(null)}
                className="text-[#86868B] hover:text-[#1D1D1F] p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleUpdateEntry} className="p-5 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-medium text-[#1D1D1F] block mb-1">Particulars</label>
                  <input
                    type="text"
                    value={editingEntry.particulars || ''}
                    onChange={(e) => setEditingEntry({ ...editingEntry, particulars: e.target.value })}
                    className="w-full px-3 py-1.5 border border-[#E5E5EA] rounded-xl text-xs"
                    required
                  />
                </div>
                <div>
                  <label className="font-medium text-[#1D1D1F] block mb-1">Category</label>
                  <select
                    value={editingEntry.category || sheetTitle}
                    onChange={(e) => setEditingEntry({ ...editingEntry, category: e.target.value })}
                    className="w-full px-3 py-1.5 border border-[#E5E5EA] rounded-xl text-xs bg-white"
                  >
                    <option value={sheetTitle}>{sheetTitle} (Default)</option>
                    {availableCategories
                      .filter((c) => c !== sheetTitle)
                      .map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-medium text-[#1D1D1F] block mb-1">Amount (₹)</label>
                  <input
                    type="number"
                    step="any"
                    value={editingEntry.amount}
                    onChange={(e) => setEditingEntry({ ...editingEntry, amount: Number(e.target.value) })}
                    className="w-full px-3 py-1.5 border border-[#E5E5EA] rounded-xl text-xs font-bold"
                    required
                  />
                </div>
                <div>
                  <label className="font-medium text-[#1D1D1F] block mb-1">Payment Status (Cash Flow)</label>
                  <select
                    value={(editingEntry as any).paymentStatus || 'PAID'}
                    onChange={(e) => setEditingEntry({ ...editingEntry, paymentStatus: e.target.value } as any)}
                    className="w-full px-3 py-1.5 border border-[#E5E5EA] rounded-xl text-xs bg-white font-medium"
                  >
                    <option value="PAID">PAID (Confirmed Bank Outflow)</option>
                    <option value="RECEIVED">RECEIVED (Confirmed Bank Inflow)</option>
                    <option value="PENDING">PENDING (Liability/Receivable - No Bank Impact)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="font-medium text-[#1D1D1F] block mb-1">Comments</label>
                <input
                  type="text"
                  value={editingEntry.comments || ''}
                  onChange={(e) => setEditingEntry({ ...editingEntry, comments: e.target.value })}
                  className="w-full px-3 py-1.5 border border-[#E5E5EA] rounded-xl text-xs"
                />
              </div>

              {/* Mandatory Change Reason for Audit History */}
              <div className="p-3 bg-[#F9F9FB] border border-[#E5E5EA] rounded-xl space-y-1.5">
                <label className="font-semibold text-[#1D1D1F] flex items-center">
                  <ShieldCheck className="w-3.5 h-3.5 text-[#007AFF] mr-1" /> Reason for Modification (Required)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Corrected invoice total based on vendor receipt"
                  value={editChangeReason}
                  onChange={(e) => setEditChangeReason(e.target.value)}
                  className="w-full px-3 py-1.5 border border-[#E5E5EA] rounded-lg text-xs bg-white"
                  required
                />
              </div>

              <div className="pt-3 flex items-center justify-end space-x-2 border-t border-[#E5E5EA]">
                <button
                  type="button"
                  onClick={() => setEditingEntry(null)}
                  className="px-3.5 py-1.5 text-xs text-[#86868B] hover:text-[#1D1D1F] font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-semibold text-white bg-[#007AFF] hover:bg-[#007AFF]/90 rounded-xl shadow-2xs"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete / Void Confirmation Modal */}
      {deletingEntry && isSuperAdmin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-[#FFFFFF] w-full max-w-md rounded-2xl shadow-xl border border-[#E5E5EA] overflow-hidden">
            <div className="p-4 border-b border-[#E5E5EA] flex items-center justify-between bg-[#FF3B30]/5">
              <div className="flex items-center space-x-2">
                <AlertTriangle className="w-4 h-4 text-[#FF3B30]" />
                <h3 className="font-bold text-sm text-[#FF3B30]">Void / Delete Financial Entry</h3>
              </div>
              <button
                type="button"
                onClick={() => setDeletingEntry(null)}
                className="text-[#86868B] hover:text-[#1D1D1F] p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs">
              <p className="text-[#1D1D1F] leading-relaxed">
                Are you sure you want to void this financial entry?
              </p>
              <div className="p-3 bg-[#F9F9FB] border border-[#E5E5EA] rounded-xl space-y-1">
                <div className="font-bold text-[#1D1D1F]">{deletingEntry.particulars}</div>
                <div className="text-[#86868B]">Period: {deletingEntry.periodCode} | Section: {deletingEntry.section}</div>
                <div className="text-sm font-bold text-[#FF3B30]">
                  Amount: ₹{deletingEntry.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </div>
              </div>
              <p className="text-[11px] text-[#86868B]">
                This entry will be safely soft-deleted and moved to the Recycle Bin. Any deducted or credited bank cash will be automatically reversed in the Central Bank Ledger.
              </p>
            </div>

            <div className="p-4 bg-[#FBFBFC] border-t border-[#E5E5EA] flex items-center justify-end space-x-2">
              <button
                type="button"
                onClick={() => setDeletingEntry(null)}
                className="px-3.5 py-1.5 text-xs text-[#86868B] hover:text-[#1D1D1F] font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="px-4 py-1.5 text-xs font-semibold text-white bg-[#FF3B30] hover:bg-[#FF3B30]/90 rounded-xl shadow-2xs"
              >
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Version History Drawer */}
      {historyEntry && (
        <div className="fixed inset-0 z-50 flex items-center justify-end bg-black/40 backdrop-blur-xs">
          <div className="bg-[#FFFFFF] w-full max-w-md h-full shadow-2xl border-l border-[#E5E5EA] flex flex-col">
            <div className="p-5 border-b border-[#E5E5EA] flex items-center justify-between bg-[#FBFBFC]">
              <div>
                <h3 className="font-bold text-sm text-[#1D1D1F]">Version History & Audit Log</h3>
                <p className="text-[11px] text-[#86868B] truncate max-w-xs">{historyEntry.particulars}</p>
              </div>
              <button
                type="button"
                onClick={() => setHistoryEntry(null)}
                className="text-[#86868B] hover:text-[#1D1D1F] p-1.5 rounded-xl hover:bg-[#F2F2F7]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {(!historyEntry.versions || historyEntry.versions.length === 0) ? (
                <div className="text-center py-12 text-[#86868B] text-xs">
                  No previous versions recorded for this entry.
                </div>
              ) : (
                historyEntry.versions.map((ver) => {
                  let snap: any = {};
                  try {
                    snap = JSON.parse(ver.snapshotData);
                  } catch (e) {}

                  return (
                    <div
                      key={ver.id}
                      className="p-4 rounded-2xl border border-[#E5E5EA] bg-[#F9F9FB] space-y-2 text-xs"
                    >
                      <div className="flex items-center justify-between">
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-[#007AFF]/10 text-[#007AFF]">
                          Version {ver.versionNumber}
                        </span>
                        <span className="text-[10px] text-[#86868B]">
                          {new Date(ver.createdAt).toLocaleString()}
                        </span>
                      </div>

                      <div className="text-[11px] text-[#1D1D1F] font-medium">
                        {ver.changeReason || 'Snapshot recorded'}
                      </div>

                      <div className="text-[10px] text-[#86868B]">
                        By: <span className="text-[#1D1D1F] font-semibold">{ver.createdByEmail || 'System'}</span>
                      </div>

                      <div className="pt-2 border-t border-[#E5E5EA] text-[11px] space-y-1">
                        <div>Amount: <strong className="text-[#1D1D1F]">₹{Number(snap.amount || 0).toLocaleString('en-IN')}</strong></div>
                        <div>Category: {snap.category || '-'}</div>
                      </div>

                      {isSuperAdmin && (
                        <div className="pt-2 flex justify-end">
                          <button
                            type="button"
                            onClick={() => handleRevertVersion(historyEntry.id, ver.versionNumber)}
                            disabled={isReverting}
                            className="inline-flex items-center px-2.5 py-1 text-[11px] font-semibold text-[#007AFF] hover:bg-[#007AFF]/10 rounded-lg transition-colors cursor-pointer"
                          >
                            <RotateCcw className="w-3 h-3 mr-1" /> Revert to V{ver.versionNumber}
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* Create Period Modal */}
      {isPeriodModalOpen && isSuperAdmin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-[#FFFFFF] w-full max-w-md rounded-2xl shadow-xl border border-[#E5E5EA] overflow-hidden">
            <div className="p-4 border-b border-[#E5E5EA] flex items-center justify-between bg-[#FBFBFC]">
              <h3 className="font-bold text-sm text-[#1D1D1F]">Create Future Accounting Period</h3>
              <button
                type="button"
                onClick={() => setIsPeriodModalOpen(false)}
                className="text-[#86868B] hover:text-[#1D1D1F] p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreatePeriod} className="p-5 space-y-4 text-xs">
              <div>
                <label className="font-medium text-[#1D1D1F] block mb-1">Period Code</label>
                <input
                  type="text"
                  placeholder="e.g. 2026-Q3, 2027, 2028-JAN"
                  value={periodFormData.periodCode}
                  onChange={(e) => setPeriodFormData({ ...periodFormData, periodCode: e.target.value })}
                  className="w-full px-3 py-1.5 border border-[#E5E5EA] rounded-xl text-xs"
                  required
                />
              </div>

              <div>
                <label className="font-medium text-[#1D1D1F] block mb-1">Period Label</label>
                <input
                  type="text"
                  placeholder="e.g. Fiscal Year 2027"
                  value={periodFormData.periodLabel}
                  onChange={(e) => setPeriodFormData({ ...periodFormData, periodLabel: e.target.value })}
                  className="w-full px-3 py-1.5 border border-[#E5E5EA] rounded-xl text-xs"
                  required
                />
              </div>

              <div>
                <label className="font-medium text-[#1D1D1F] block mb-1">Carry Forward Previous Balance</label>
                <div className="flex items-center space-x-2 pt-1">
                  <input
                    type="checkbox"
                    id="cf"
                    checked={periodFormData.carryForward}
                    onChange={(e) => setPeriodFormData({ ...periodFormData, carryForward: e.target.checked })}
                    className="rounded border-[#E5E5EA] text-[#007AFF] focus:ring-[#007AFF]"
                  />
                  <label htmlFor="cf" className="text-xs text-[#48484A]">
                    Automatically carry forward closing balance as opening balance
                  </label>
                </div>
              </div>

              <div className="pt-3 flex items-center justify-end space-x-2 border-t border-[#E5E5EA]">
                <button
                  type="button"
                  onClick={() => setIsPeriodModalOpen(false)}
                  className="px-3.5 py-1.5 text-xs text-[#86868B] hover:text-[#1D1D1F] font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-semibold text-white bg-[#007AFF] hover:bg-[#007AFF]/90 rounded-xl shadow-2xs"
                >
                  Create Period
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Intelligent Excel Import Modal */}
      <SmartExcelImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        accountSlug={slug}
        accountName={sheetTitle}
        existingEntries={entries}
        onImportSuccess={fetchData}
      />

      {/* Category Manager Modal */}
      <CategoryManagerModal
        isOpen={isCatModalOpen}
        onClose={() => setIsCatModalOpen(false)}
        onCategoryAdded={fetchCategories}
        currentAccountSlug={slug}
      />
    </div>
  );
}
