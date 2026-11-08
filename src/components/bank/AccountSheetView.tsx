'use client';

import React, { useState, useEffect } from 'react';
import {
  Search,
  Filter,
  Plus,
  Edit2,
  Trash2,
  Calendar,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  X,
  RefreshCw,
  ArrowUpRight,
  ArrowDownRight,
  Save,
} from 'lucide-react';

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
  const [userRole, setUserRole] = useState<'SUPER_ADMIN' | 'VIEWER'>('SUPER_ADMIN');

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<SheetEntry | null>(null);
  const [isPeriodModalOpen, setIsPeriodModalOpen] = useState(false);

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

  useEffect(() => {
    fetchData();
  }, [slug]);

  const isSuperAdmin = userRole === 'SUPER_ADMIN';

  // Available unique sections
  const sections = Array.from(new Set(entries.map((e) => e.section).filter(Boolean)));

  const filteredEntries = entries.filter((e) => {
    if (selectedSection !== 'ALL' && e.section !== selectedSection) return false;
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
        });
        fetchData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Handle Edit Entry
  const handleUpdateEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isSuperAdmin || !editingEntry) return;
    try {
      const res = await fetch(`/api/bank/${slug}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingEntry),
      });
      if (res.ok) {
        setEditingEntry(null);
        fetchData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Handle Delete Entry
  const handleDeleteEntry = async (id: string) => {
    if (!isSuperAdmin) return;
    if (!confirm('Are you sure you want to delete this financial entry? It will be moved to the Recycle Bin.')) return;
    try {
      const res = await fetch(`/api/bank/${slug}?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        fetchData();
      }
    } catch (err) {
      console.error(err);
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
              className="pl-8 pr-3 py-1.5 text-xs bg-[#F9F9FB] border border-[#E5E5EA] rounded-xl focus:outline-hidden focus:border-[#007AFF] w-48 sm:w-64"
            />
          </div>

          {/* Section Filter */}
          {sections.length > 0 && (
            <select
              value={selectedSection}
              onChange={(e) => setSelectedSection(e.target.value)}
              className="px-3 py-1.5 text-xs bg-[#F9F9FB] border border-[#E5E5EA] rounded-xl text-[#1D1D1F] focus:outline-hidden focus:border-[#007AFF]"
            >
              <option value="ALL">All Sections ({entries.length})</option>
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
          {isSuperAdmin && (
            <>
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
                {isSuperAdmin && <th className="py-2.5 px-4 text-center">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E5EA]">
              {filteredEntries.length === 0 ? (
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
                    <td className={`py-2.5 px-4 text-right font-bold tabular-nums whitespace-nowrap ${row.amount < 0 ? 'text-[#FF3B30]' : 'text-[#1D1D1F]'}`}>
                      {row.amount !== undefined ? row.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 }) : '-'}
                    </td>
                    {columns.showPaid && (
                      <td className="py-2.5 px-4 text-right text-[#FF3B30] tabular-nums whitespace-nowrap">
                        {row.paidAmount ? `₹${row.paidAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '-'}
                      </td>
                    )}
                    {columns.showReceived && (
                      <td className="py-2.5 px-4 text-right text-[#34C759] tabular-nums whitespace-nowrap">
                        {row.receivedAmount ? `₹${row.receivedAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '-'}
                      </td>
                    )}
                    {columns.showNet && (
                      <td className={`py-2.5 px-4 text-right font-bold tabular-nums whitespace-nowrap ${row.netAmount !== null && row.netAmount !== undefined && row.netAmount < 0 ? 'text-[#FF3B30]' : 'text-[#34C759]'}`}>
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
                    {isSuperAdmin && (
                      <td className="py-2.5 px-4 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center space-x-1.5">
                          <button
                            type="button"
                            onClick={() => setEditingEntry(row)}
                            className="p-1 rounded-md text-[#86868B] hover:text-[#007AFF] hover:bg-[#007AFF]/10 transition-colors"
                            title="Edit entry"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteEntry(row.id)}
                            className="p-1 rounded-md text-[#86868B] hover:text-[#FF3B30] hover:bg-[#FF3B30]/10 transition-colors"
                            title="Delete entry"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    )}
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
                  <label className="font-medium text-[#1D1D1F] block mb-1">Period Code</label>
                  <input
                    type="text"
                    value={formData.periodCode}
                    onChange={(e) => setFormData({ ...formData, periodCode: e.target.value })}
                    className="w-full px-3 py-1.5 border border-[#E5E5EA] rounded-xl text-xs"
                    placeholder="e.g. 2026-MAY"
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
                    placeholder="PAYMENT, EXPENSE, etc."
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
                    placeholder="0.00"
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

      {/* Edit Entry Modal */}
      {editingEntry && isSuperAdmin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-[#FFFFFF] w-full max-w-lg rounded-2xl shadow-xl border border-[#E5E5EA] overflow-hidden">
            <div className="p-4 border-b border-[#E5E5EA] flex items-center justify-between bg-[#FBFBFC]">
              <h3 className="font-bold text-sm text-[#1D1D1F]">Edit Financial Entry</h3>
              <button
                type="button"
                onClick={() => setEditingEntry(null)}
                className="text-[#86868B] hover:text-[#1D1D1F] p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleUpdateEntry} className="p-5 space-y-4 text-xs">
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

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-medium text-[#1D1D1F] block mb-1">Amount (₹)</label>
                  <input
                    type="number"
                    step="any"
                    value={editingEntry.amount}
                    onChange={(e) => setEditingEntry({ ...editingEntry, amount: Number(e.target.value) })}
                    className="w-full px-3 py-1.5 border border-[#E5E5EA] rounded-xl text-xs"
                    required
                  />
                </div>
                <div>
                  <label className="font-medium text-[#1D1D1F] block mb-1">Net (₹)</label>
                  <input
                    type="number"
                    step="any"
                    value={editingEntry.netAmount || ''}
                    onChange={(e) => setEditingEntry({ ...editingEntry, netAmount: Number(e.target.value) })}
                    className="w-full px-3 py-1.5 border border-[#E5E5EA] rounded-xl text-xs"
                  />
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
                  Update Entry
                </button>
              </div>
            </form>
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
                  placeholder="e.g. 2026-Q3, 2026-NOV"
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
                  placeholder="e.g. November 2026 Accounting"
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
    </div>
  );
}

