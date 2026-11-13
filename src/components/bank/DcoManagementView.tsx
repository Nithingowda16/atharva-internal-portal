'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
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
  History,
  RotateCcw,
  Download,
  Building2,
  Tag,
  CreditCard,
  ShieldCheck,
  ChevronDown,
} from 'lucide-react';

export interface DcoEntry {
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
  comments?: string;
  remarks?: string;
  meta?: string;
  rowIndex?: number;
  isDeleted?: boolean;
  createdAt?: string;
  versions?: {
    id: string;
    versionNumber: number;
    snapshotData: string;
    changeReason?: string;
    createdByEmail?: string;
    createdAt: string;
  }[];
}

export default function DcoManagementView() {
  const [loading, setLoading] = useState(true);
  const [entries, setEntries] = useState<DcoEntry[]>([]);
  const [account, setAccount] = useState<any>(null);
  const [userRole, setUserRole] = useState<'SUPER_ADMIN' | 'VIEWER'>('SUPER_ADMIN');

  // Filter States
  const [search, setSearch] = useState('');
  const [selectedYear, setSelectedYear] = useState('ALL');
  const [selectedMonth, setSelectedMonth] = useState('ALL');
  const [selectedStatus, setSelectedStatus] = useState('ALL');
  const [selectedType, setSelectedType] = useState('ALL');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<DcoEntry | null>(null);
  const [versionModalEntry, setVersionModalEntry] = useState<DcoEntry | null>(null);
  const [changeReason, setChangeReason] = useState('');

  // Form State
  const [formData, setFormData] = useState({
    financialYear: '2026-27',
    financialMonth: 'Nov-26',
    transactionDate: new Date().toISOString().split('T')[0],
    particulars: 'Booking amount',
    category: 'Booking amount',
    amount: '-5000',
    debitCredit: 'DEBIT',
    paymentStatus: 'PAID',
    paymentMode: 'BANK_TRANSFER',
    bankTxnReference: 'REF-BANK-D11-DCO',
    companyOrRelated: 'DCO Operations',
    remarks: '',
  });

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/bank/dco');
      const data = await res.json();
      if (data.success) {
        setEntries(data.entries || []);
        setAccount(data.account || null);
      }
      const authRes = await fetch('/api/users');
      if (authRes.status === 403) {
        setUserRole('VIEWER');
      } else {
        setUserRole('SUPER_ADMIN');
      }
    } catch (e) {
      console.error('Failed to fetch DCO data:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const isSuperAdmin = userRole === 'SUPER_ADMIN';

  // Helper to parse meta
  const getEntryMeta = (entry: DcoEntry) => {
    if (!entry.meta) return {};
    try {
      return typeof entry.meta === 'string' ? JSON.parse(entry.meta) : entry.meta;
    } catch {
      return {};
    }
  };

  // Extract unique available years and months dynamically
  const availableYears = useMemo(() => {
    const years = new Set<string>(['2026-27', '2027-28']);
    entries.forEach((e) => {
      const meta = getEntryMeta(e);
      if (meta.financialYear) years.add(meta.financialYear);
    });
    return Array.from(years).sort();
  }, [entries]);

  const availableMonths = useMemo(() => {
    const months = new Set<string>(['Nov-26', 'Dec-26', 'Jan-27']);
    entries.forEach((e) => {
      const meta = getEntryMeta(e);
      if (meta.financialMonth) months.add(meta.financialMonth);
      if (e.periodCode && e.periodCode.includes('-')) months.add(e.periodCode);
    });
    return Array.from(months).sort();
  }, [entries]);

  const availableCategories = useMemo(() => {
    const cats = new Set<string>(['Booking amount', 'Driver Advance', 'Vehicle Booking', 'Cancellation Fee', 'Refund']);
    entries.forEach((e) => {
      if (e.category) cats.add(e.category);
    });
    return Array.from(cats).sort();
  }, [entries]);

  // Filtering Logic
  const filteredEntries = useMemo(() => {
    return entries.filter((e) => {
      const meta = getEntryMeta(e);
      const fYear = meta.financialYear || (e.periodCode?.startsWith('2026') ? '2026-27' : '2026-27');
      const fMonth = meta.financialMonth || e.periodCode || '';
      const pStatus = meta.paymentStatus || (Number(e.paidAmount) > 0 ? 'PAID' : 'PENDING');
      const dType = meta.debitCredit || (e.amount < 0 ? 'DEBIT' : 'CREDIT');

      if (selectedYear !== 'ALL' && fYear !== selectedYear) return false;
      if (selectedMonth !== 'ALL' && fMonth !== selectedMonth && e.periodCode !== selectedMonth) return false;
      if (selectedStatus !== 'ALL' && pStatus !== selectedStatus) return false;
      if (selectedType !== 'ALL' && dType !== selectedType) return false;
      if (selectedCategory !== 'ALL' && e.category !== selectedCategory) return false;

      if (startDate && e.entryDate && e.entryDate < startDate) return false;
      if (endDate && e.entryDate && e.entryDate > endDate) return false;

      if (search) {
        const q = search.toLowerCase();
        const txnId = meta.transactionId?.toLowerCase() || '';
        const bankRef = meta.bankTxnReference?.toLowerCase() || '';
        return (
          e.particulars?.toLowerCase().includes(q) ||
          e.category?.toLowerCase().includes(q) ||
          e.comments?.toLowerCase().includes(q) ||
          e.remarks?.toLowerCase().includes(q) ||
          txnId.includes(q) ||
          bankRef.includes(q)
        );
      }
      return true;
    });
  }, [entries, search, selectedYear, selectedMonth, selectedStatus, selectedType, selectedCategory, startDate, endDate]);

  // 8 Real-time Summary KPI Counters (calculated dynamically)
  const metrics = useMemo(() => {
    let totalEntries = filteredEntries.length;
    let totalBookingAmount = 0;
    let totalDebitAmount = 0;
    let totalCreditAmount = 0;
    let paidAmount = 0;
    let pendingAmount = 0;
    let currentMonthTotal = 0;
    let historicalTotal = 0;

    // Current month identifier
    const currentMonthKey = 'Nov-26';

    entries.forEach((e) => {
      const amt = Number(e.amount) || 0;
      historicalTotal += amt;
    });

    filteredEntries.forEach((e) => {
      const amt = Number(e.amount) || 0;
      const meta = getEntryMeta(e);
      const pStatus = meta.paymentStatus || (Number(e.paidAmount) > 0 ? 'PAID' : 'PENDING');
      const fMonth = meta.financialMonth || e.periodCode || '';

      totalBookingAmount += amt;

      if (amt < 0) {
        totalDebitAmount += Math.abs(amt);
      } else {
        totalCreditAmount += amt;
      }

      if (pStatus === 'PAID') {
        paidAmount += Math.abs(amt);
      } else {
        pendingAmount += Math.abs(amt);
      }

      if (fMonth === currentMonthKey || e.periodCode === '2026-NOV') {
        currentMonthTotal += amt;
      }
    });

    return {
      totalEntries,
      totalBookingAmount,
      totalDebitAmount,
      totalCreditAmount,
      paidAmount,
      pendingAmount,
      currentMonthTotal,
      historicalTotal,
    };
  }, [entries, filteredEntries]);

  // Handle Add Entry
  const handleAddEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isSuperAdmin) return;

    try {
      const numAmount = Number(formData.amount);
      const finalAmount = formData.debitCredit === 'DEBIT' ? -Math.abs(numAmount) : Math.abs(numAmount);

      const payload = {
        periodCode: formData.financialMonth || '2026-NOV',
        entryDate: formData.transactionDate,
        section: 'BOOKING',
        category: formData.category,
        particulars: formData.particulars,
        sourceReference: formData.companyOrRelated,
        amount: finalAmount,
        paidAmount: formData.paymentStatus === 'PAID' ? Math.abs(finalAmount) : 0,
        receivedAmount: formData.paymentStatus === 'RECEIVED' ? Math.abs(finalAmount) : 0,
        netAmount: finalAmount,
        comments: formData.particulars,
        remarks: formData.remarks,
        paymentStatus: formData.paymentStatus,
        paymentMode: formData.paymentMode,
        bankTxnReference: formData.bankTxnReference,
        meta: {
          transactionId: `DCO-${Date.now().toString().slice(-6)}`,
          financialYear: formData.financialYear,
          financialMonth: formData.financialMonth,
          debitCredit: formData.debitCredit,
          paymentStatus: formData.paymentStatus,
          paymentMode: formData.paymentMode,
          bankTxnReference: formData.bankTxnReference,
          companyOrRelated: formData.companyOrRelated,
        },
      };

      const res = await fetch('/api/bank/dco', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        setIsAddModalOpen(false);
        setFormData({
          financialYear: '2026-27',
          financialMonth: 'Nov-26',
          transactionDate: new Date().toISOString().split('T')[0],
          particulars: 'Booking amount',
          category: 'Booking amount',
          amount: '-5000',
          debitCredit: 'DEBIT',
          paymentStatus: 'PAID',
          paymentMode: 'BANK_TRANSFER',
          bankTxnReference: 'REF-BANK-D11-DCO',
          companyOrRelated: 'DCO Operations',
          remarks: '',
        });
        fetchData();
      }
    } catch (err) {
      console.error('Failed to create DCO entry:', err);
    }
  };

  // Handle Edit Entry
  const handleUpdateEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isSuperAdmin || !editingEntry) return;

    try {
      const meta = getEntryMeta(editingEntry);
      const res = await fetch('/api/bank/dco', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingEntry.id,
          particulars: editingEntry.particulars,
          category: editingEntry.category,
          entryDate: editingEntry.entryDate,
          amount: editingEntry.amount,
          netAmount: editingEntry.amount,
          paidAmount: meta.paymentStatus === 'PAID' ? Math.abs(editingEntry.amount) : 0,
          changeReason: changeReason || 'Modified DCO entry details',
          meta: {
            ...meta,
            paymentStatus: meta.paymentStatus || 'PAID',
            bankTxnReference: meta.bankTxnReference || '',
          },
        }),
      });

      if (res.ok) {
        setEditingEntry(null);
        setChangeReason('');
        fetchData();
      }
    } catch (err) {
      console.error('Failed to update DCO entry:', err);
    }
  };

  // Handle Soft-Delete
  const handleDeleteEntry = async (id: string, particulars: string) => {
    if (!isSuperAdmin) return;
    if (!confirm(`Are you sure you want to delete "${particulars}"? It will be safely moved to the Recycle Bin.`)) return;

    try {
      const res = await fetch(`/api/bank/dco?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        fetchData();
      }
    } catch (err) {
      console.error('Failed to delete entry:', err);
    }
  };

  // Handle Revert Version
  const handleRevertVersion = async (entryId: string, versionNumber: number) => {
    if (!isSuperAdmin) return;
    if (!confirm(`Are you sure you want to revert this entry to Version ${versionNumber}?`)) return;

    try {
      const res = await fetch(`/api/bank/dco/${entryId}/revert`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ versionNumber }),
      });

      if (res.ok) {
        setVersionModalEntry(null);
        fetchData();
      }
    } catch (err) {
      console.error('Failed to revert version:', err);
    }
  };

  // Export to CSV
  const handleExportCSV = () => {
    const headers = ['Txn ID', 'Date', 'Financial Year', 'Month', 'Particulars', 'Category', 'Amount (INR)', 'Type', 'Status', 'Bank Ref', 'Remarks'];
    const rows = filteredEntries.map((e) => {
      const meta = getEntryMeta(e);
      return [
        `"${meta.transactionId || e.id}"`,
        `"${e.entryDate || ''}"`,
        `"${meta.financialYear || '2026-27'}"`,
        `"${meta.financialMonth || e.periodCode || ''}"`,
        `"${e.particulars || ''}"`,
        `"${e.category || ''}"`,
        e.amount,
        `"${meta.debitCredit || (e.amount < 0 ? 'DEBIT' : 'CREDIT')}"`,
        `"${meta.paymentStatus || 'PAID'}"`,
        `"${meta.bankTxnReference || ''}"`,
        `"${e.remarks || ''}"`,
      ];
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Atharva_DCO_Report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-[#FFFFFF] p-6 rounded-2xl border border-[#E5E5EA] shadow-2xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2.5">
              <div className="w-10 h-10 rounded-xl bg-[#007AFF]/10 flex items-center justify-center text-[#007AFF]">
                <Building2 className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <h1 className="text-xl font-bold text-[#1D1D1F] tracking-tight">DCO Management</h1>
                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[#34C759]/10 text-[#34C759] border border-[#34C759]/20 flex items-center">
                    <ShieldCheck className="w-3 h-3 mr-1" /> Reconciled with Bank
                  </span>
                </div>
                <p className="text-xs text-[#86868B] mt-0.5">
                  DCO Booking & Operational Transactions • Linked to Master Bank Balance Row 11 (D11 = DCO!C1)
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={handleExportCSV}
              className="inline-flex items-center px-3.5 py-1.5 text-xs font-semibold text-[#1D1D1F] bg-[#F2F2F7] hover:bg-[#E5E5EA] rounded-xl transition-colors"
            >
              <Download className="w-3.5 h-3.5 mr-1" /> Export CSV
            </button>

            {isSuperAdmin && (
              <button
                type="button"
                onClick={() => setIsAddModalOpen(true)}
                className="inline-flex items-center px-4 py-1.5 bg-[#007AFF] text-white text-xs font-semibold rounded-xl hover:bg-[#007AFF]/90 shadow-2xs transition-colors"
              >
                <Plus className="w-3.5 h-3.5 mr-1" /> Add DCO Entry
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 8 Real-Time Summary KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
        {/* Card 1: Total DCO Entries */}
        <div className="bg-[#FFFFFF] p-3.5 rounded-2xl border border-[#E5E5EA] shadow-2xs">
          <span className="text-[10px] text-[#86868B] font-medium block">Total Entries</span>
          <span className="text-lg font-bold text-[#1D1D1F] tracking-tight mt-0.5 block">{metrics.totalEntries}</span>
          <span className="text-[10px] text-[#86868B]">Valid Records</span>
        </div>

        {/* Card 2: Total Booking Amount */}
        <div className="bg-[#FFFFFF] p-3.5 rounded-2xl border border-[#E5E5EA] shadow-2xs">
          <span className="text-[10px] text-[#86868B] font-medium block">Total Booking</span>
          <span className="text-lg font-bold text-[#FF3B30] tracking-tight mt-0.5 block">
            ₹{metrics.totalBookingAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </span>
          <span className="text-[10px] text-[#34C759] font-medium">Cell C1 Net</span>
        </div>

        {/* Card 3: Total Debit Amount */}
        <div className="bg-[#FFFFFF] p-3.5 rounded-2xl border border-[#E5E5EA] shadow-2xs">
          <span className="text-[10px] text-[#86868B] font-medium block">Total Debit (Dr)</span>
          <span className="text-lg font-bold text-[#FF3B30] tracking-tight mt-0.5 block">
            ₹{metrics.totalDebitAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </span>
          <span className="text-[10px] text-[#86868B]">Gross Outflows</span>
        </div>

        {/* Card 4: Total Credit Amount */}
        <div className="bg-[#FFFFFF] p-3.5 rounded-2xl border border-[#E5E5EA] shadow-2xs">
          <span className="text-[10px] text-[#86868B] font-medium block">Total Credit (Cr)</span>
          <span className="text-lg font-bold text-[#34C759] tracking-tight mt-0.5 block">
            ₹{metrics.totalCreditAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </span>
          <span className="text-[10px] text-[#86868B]">Inflows / Refunds</span>
        </div>

        {/* Card 5: Paid Amount */}
        <div className="bg-[#FFFFFF] p-3.5 rounded-2xl border border-[#E5E5EA] shadow-2xs">
          <span className="text-[10px] text-[#86868B] font-medium block">Paid Amount</span>
          <span className="text-lg font-bold text-[#007AFF] tracking-tight mt-0.5 block">
            ₹{metrics.paidAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </span>
          <span className="text-[10px] text-[#34C759]">Confirmed Cash</span>
        </div>

        {/* Card 6: Pending Amount */}
        <div className="bg-[#FFFFFF] p-3.5 rounded-2xl border border-[#E5E5EA] shadow-2xs">
          <span className="text-[10px] text-[#86868B] font-medium block">Pending Amount</span>
          <span className="text-lg font-bold text-[#FF9500] tracking-tight mt-0.5 block">
            ₹{metrics.pendingAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </span>
          <span className="text-[10px] text-[#86868B]">No Bank Impact</span>
        </div>

        {/* Card 7: Current Month Total */}
        <div className="bg-[#FFFFFF] p-3.5 rounded-2xl border border-[#E5E5EA] shadow-2xs">
          <span className="text-[10px] text-[#86868B] font-medium block">Nov-26 Total</span>
          <span className="text-lg font-bold text-[#FF3B30] tracking-tight mt-0.5 block">
            ₹{metrics.currentMonthTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </span>
          <span className="text-[10px] text-[#86868B]">Active Period</span>
        </div>

        {/* Card 8: Historical DCO Total */}
        <div className="bg-[#FFFFFF] p-3.5 rounded-2xl border border-[#E5E5EA] shadow-2xs">
          <span className="text-[10px] text-[#86868B] font-medium block">Historical Total</span>
          <span className="text-lg font-bold text-[#1D1D1F] tracking-tight mt-0.5 block">
            ₹{metrics.historicalTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </span>
          <span className="text-[10px] text-[#86868B]">All-Time Net</span>
        </div>
      </div>

      {/* Dynamic Filter Toolbar */}
      <div className="bg-[#FFFFFF] p-4 rounded-2xl border border-[#E5E5EA] shadow-2xs space-y-3">
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Search */}
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-3.5 h-3.5 text-[#86868B] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search description, reference, category..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-[#F9F9FB] border border-[#E5E5EA] rounded-xl focus:outline-hidden focus:border-[#007AFF]"
            />
          </div>

          {/* Financial Year Filter */}
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(e.target.value)}
            className="px-3 py-1.5 text-xs bg-[#F9F9FB] border border-[#E5E5EA] rounded-xl text-[#1D1D1F] focus:outline-hidden focus:border-[#007AFF]"
          >
            <option value="ALL">All Years</option>
            {availableYears.map((y) => (
              <option key={y} value={y}>
                FY {y}
              </option>
            ))}
          </select>

          {/* Month Filter */}
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="px-3 py-1.5 text-xs bg-[#F9F9FB] border border-[#E5E5EA] rounded-xl text-[#1D1D1F] focus:outline-hidden focus:border-[#007AFF]"
          >
            <option value="ALL">All Months</option>
            {availableMonths.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>

          {/* Payment Status Filter */}
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="px-3 py-1.5 text-xs bg-[#F9F9FB] border border-[#E5E5EA] rounded-xl text-[#1D1D1F] focus:outline-hidden focus:border-[#007AFF]"
          >
            <option value="ALL">All Statuses</option>
            <option value="PAID">PAID</option>
            <option value="PENDING">PENDING</option>
          </select>

          {/* Transaction Type Filter */}
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="px-3 py-1.5 text-xs bg-[#F9F9FB] border border-[#E5E5EA] rounded-xl text-[#1D1D1F] focus:outline-hidden focus:border-[#007AFF]"
          >
            <option value="ALL">All Types</option>
            <option value="DEBIT">DEBIT (Outflow)</option>
            <option value="CREDIT">CREDIT (Inflow)</option>
          </select>

          {/* Category Filter */}
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-3 py-1.5 text-xs bg-[#F9F9FB] border border-[#E5E5EA] rounded-xl text-[#1D1D1F] focus:outline-hidden focus:border-[#007AFF]"
          >
            <option value="ALL">All Categories</option>
            {availableCategories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>

          {/* Clear Filters */}
          <button
            type="button"
            onClick={() => {
              setSearch('');
              setSelectedYear('ALL');
              setSelectedMonth('ALL');
              setSelectedStatus('ALL');
              setSelectedType('ALL');
              setSelectedCategory('ALL');
              setStartDate('');
              setEndDate('');
            }}
            className="px-3 py-1.5 text-xs text-[#86868B] hover:text-[#1D1D1F] bg-[#F2F2F7] hover:bg-[#E5E5EA] rounded-xl transition-colors font-medium"
          >
            Clear Filters
          </button>
        </div>
      </div>

      {/* Main DCO Ledger Table */}
      <div className="bg-[#FFFFFF] rounded-2xl border border-[#E5E5EA] shadow-2xs overflow-hidden">
        <div className="p-4 border-b border-[#E5E5EA] flex items-center justify-between bg-[#FBFBFC]">
          <div>
            <h2 className="font-bold text-sm text-[#1D1D1F]">DCO Booking Transactions Ledger</h2>
            <p className="text-[11px] text-[#86868B]">
              Showing {filteredEntries.length} of {entries.length} recorded entries
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-xs text-[#86868B]">Filtered Net:</span>
            <span
              className={`text-sm font-bold tabular-nums ${
                metrics.totalBookingAmount < 0 ? 'text-[#FF3B30]' : 'text-[#34C759]'
              }`}
            >
              ₹{metrics.totalBookingAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-[#E5E5EA] bg-[#F9F9FB] text-[#86868B] font-semibold">
                <th className="py-2.5 px-4">Txn ID</th>
                <th className="py-2.5 px-4">Date</th>
                <th className="py-2.5 px-4">Period</th>
                <th className="py-2.5 px-4">Particulars / Description</th>
                <th className="py-2.5 px-4">Category</th>
                <th className="py-2.5 px-4">Status</th>
                <th className="py-2.5 px-4">Bank Ref</th>
                <th className="py-2.5 px-4 text-right">Amount (₹)</th>
                {isSuperAdmin && <th className="py-2.5 px-4 text-center">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E5EA]">
              {loading ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-[#86868B]">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-[#007AFF]" />
                    Loading DCO entries...
                  </td>
                </tr>
              ) : filteredEntries.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-[#86868B]">
                    No DCO transactions found matching the selected filters.
                  </td>
                </tr>
              ) : (
                filteredEntries.map((row) => {
                  const meta = getEntryMeta(row);
                  const txnId = meta.transactionId || `DCO-${row.id.slice(-6).toUpperCase()}`;
                  const pStatus = meta.paymentStatus || (Number(row.paidAmount) > 0 ? 'PAID' : 'PENDING');
                  const bankRef = meta.bankTxnReference || 'Row 11';
                  const versionCount = row.versions?.length || 1;

                  return (
                    <tr key={row.id} className="hover:bg-[#F9F9FB]/60 transition-colors">
                      <td className="py-2.5 px-4 font-mono font-medium text-[#1D1D1F]">{txnId}</td>
                      <td className="py-2.5 px-4 text-[#48484A] whitespace-nowrap">
                        {row.entryDate || meta.originalDateString || '10-11-2026'}
                      </td>
                      <td className="py-2.5 px-4">
                        <span className="px-2 py-0.5 rounded-md text-[10px] bg-[#F2F2F7] font-semibold text-[#48484A]">
                          {meta.financialMonth || row.periodCode || 'Nov-26'}
                        </span>
                      </td>
                      <td className="py-2.5 px-4 font-semibold text-[#1D1D1F]">
                        <div className="flex items-center space-x-1.5">
                          <span>{row.particulars}</span>
                          {versionCount > 1 && (
                            <button
                              type="button"
                              onClick={() => setVersionModalEntry(row)}
                              className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-[#007AFF]/10 text-[#007AFF] hover:bg-[#007AFF]/20"
                              title="View version history"
                            >
                              v{versionCount}
                            </button>
                          )}
                        </div>
                      </td>
                      <td className="py-2.5 px-4 text-[#86868B]">
                        <span className="px-2 py-0.5 rounded-md text-[10px] bg-[#007AFF]/10 text-[#007AFF] font-medium">
                          {row.category || 'Booking amount'}
                        </span>
                      </td>
                      <td className="py-2.5 px-4">
                        <span
                          className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                            pStatus === 'PAID'
                              ? 'bg-[#34C759]/10 text-[#34C759] border border-[#34C759]/20'
                              : 'bg-[#FF9500]/10 text-[#FF9500] border border-[#FF9500]/20'
                          }`}
                        >
                          {pStatus}
                        </span>
                      </td>
                      <td className="py-2.5 px-4 text-[#86868B] font-mono text-[11px]">{bankRef}</td>
                      <td className="py-2.5 px-4 text-right font-bold tabular-nums">
                        <span className={row.amount < 0 ? 'text-[#FF3B30]' : 'text-[#34C759]'}>
                          ₹{Number(row.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </span>
                      </td>
                      {isSuperAdmin && (
                        <td className="py-2.5 px-4 text-center">
                          <div className="flex items-center justify-center space-x-1">
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
                              onClick={() => setVersionModalEntry(row)}
                              className="p-1 rounded-md text-[#86868B] hover:text-[#34C759] hover:bg-[#34C759]/10 transition-colors"
                              title="Version History & Revert"
                            >
                              <History className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteEntry(row.id, row.particulars || 'Booking amount')}
                              className="p-1 rounded-md text-[#86868B] hover:text-[#FF3B30] hover:bg-[#FF3B30]/10 transition-colors"
                              title="Delete entry"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add DCO Entry Modal (Super Admin Only) */}
      {isAddModalOpen && isSuperAdmin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-[#FFFFFF] w-full max-w-lg rounded-2xl shadow-xl border border-[#E5E5EA] overflow-hidden">
            <div className="p-4 border-b border-[#E5E5EA] flex items-center justify-between bg-[#FBFBFC]">
              <h3 className="font-bold text-sm text-[#1D1D1F]">Add Dynamic DCO Entry</h3>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="text-[#86868B] hover:text-[#1D1D1F] p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddEntry} className="p-5 space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-medium text-[#1D1D1F] block mb-1">Financial Year</label>
                  <input
                    type="text"
                    value={formData.financialYear}
                    onChange={(e) => setFormData({ ...formData, financialYear: e.target.value })}
                    className="w-full px-3 py-1.5 border border-[#E5E5EA] rounded-xl text-xs"
                    placeholder="e.g. 2026-27"
                    required
                  />
                </div>
                <div>
                  <label className="font-medium text-[#1D1D1F] block mb-1">Financial Month</label>
                  <input
                    type="text"
                    value={formData.financialMonth}
                    onChange={(e) => setFormData({ ...formData, financialMonth: e.target.value })}
                    className="w-full px-3 py-1.5 border border-[#E5E5EA] rounded-xl text-xs"
                    placeholder="e.g. Nov-26, Dec-26, Jan-27"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-medium text-[#1D1D1F] block mb-1">Transaction Date</label>
                  <input
                    type="date"
                    value={formData.transactionDate}
                    onChange={(e) => setFormData({ ...formData, transactionDate: e.target.value })}
                    className="w-full px-3 py-1.5 border border-[#E5E5EA] rounded-xl text-xs"
                    required
                  />
                </div>
                <div>
                  <label className="font-medium text-[#1D1D1F] block mb-1">Type (Dr/Cr)</label>
                  <select
                    value={formData.debitCredit}
                    onChange={(e) => setFormData({ ...formData, debitCredit: e.target.value })}
                    className="w-full px-3 py-1.5 border border-[#E5E5EA] rounded-xl text-xs bg-white font-medium"
                  >
                    <option value="DEBIT">DEBIT (Outflow / Booking Deduction)</option>
                    <option value="CREDIT">CREDIT (Inflow / Refund / Addition)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="font-medium text-[#1D1D1F] block mb-1">Item / Particulars</label>
                <input
                  type="text"
                  value={formData.particulars}
                  onChange={(e) => setFormData({ ...formData, particulars: e.target.value })}
                  className="w-full px-3 py-1.5 border border-[#E5E5EA] rounded-xl text-xs"
                  placeholder="e.g. Booking amount, Driver advance"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-medium text-[#1D1D1F] block mb-1">Category</label>
                  <input
                    type="text"
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full px-3 py-1.5 border border-[#E5E5EA] rounded-xl text-xs"
                    placeholder="e.g. Booking amount"
                    required
                  />
                </div>
                <div>
                  <label className="font-medium text-[#1D1D1F] block mb-1">Amount (₹)</label>
                  <input
                    type="number"
                    step="any"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    className="w-full px-3 py-1.5 border border-[#E5E5EA] rounded-xl text-xs font-mono font-bold"
                    placeholder="-5000"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-medium text-[#1D1D1F] block mb-1">Payment Status</label>
                  <select
                    value={formData.paymentStatus}
                    onChange={(e) => setFormData({ ...formData, paymentStatus: e.target.value })}
                    className="w-full px-3 py-1.5 border border-[#E5E5EA] rounded-xl text-xs bg-white"
                  >
                    <option value="PAID">PAID (Confirmed Bank Cash Movement)</option>
                    <option value="PENDING">PENDING (Liability - No Bank Cash Distortion)</option>
                  </select>
                </div>
                <div>
                  <label className="font-medium text-[#1D1D1F] block mb-1">Payment Mode</label>
                  <select
                    value={formData.paymentMode}
                    onChange={(e) => setFormData({ ...formData, paymentMode: e.target.value })}
                    className="w-full px-3 py-1.5 border border-[#E5E5EA] rounded-xl text-xs bg-white"
                  >
                    <option value="BANK_TRANSFER">Bank Transfer / NEFT</option>
                    <option value="UPI">UPI / IMPS</option>
                    <option value="CHEQUE">Cheque</option>
                    <option value="CASH">Cash</option>
                    <option value="INTERNAL">Internal Adjustment</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-medium text-[#1D1D1F] block mb-1">Bank Reference (UTR / Cheque)</label>
                  <input
                    type="text"
                    value={formData.bankTxnReference}
                    onChange={(e) => setFormData({ ...formData, bankTxnReference: e.target.value })}
                    className="w-full px-3 py-1.5 border border-[#E5E5EA] rounded-xl text-xs"
                    placeholder="e.g. UTR1029302"
                  />
                </div>
                <div>
                  <label className="font-medium text-[#1D1D1F] block mb-1">Company / Related Account</label>
                  <input
                    type="text"
                    value={formData.companyOrRelated}
                    onChange={(e) => setFormData({ ...formData, companyOrRelated: e.target.value })}
                    className="w-full px-3 py-1.5 border border-[#E5E5EA] rounded-xl text-xs"
                    placeholder="DCO Operations"
                  />
                </div>
              </div>

              <div>
                <label className="font-medium text-[#1D1D1F] block mb-1">Remarks</label>
                <input
                  type="text"
                  value={formData.remarks}
                  onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                  className="w-full px-3 py-1.5 border border-[#E5E5EA] rounded-xl text-xs"
                  placeholder="Optional audit notes"
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
                  Save DCO Entry
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit DCO Entry Modal */}
      {editingEntry && isSuperAdmin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-[#FFFFFF] w-full max-w-lg rounded-2xl shadow-xl border border-[#E5E5EA] overflow-hidden">
            <div className="p-4 border-b border-[#E5E5EA] flex items-center justify-between bg-[#FBFBFC]">
              <h3 className="font-bold text-sm text-[#1D1D1F]">Edit DCO Transaction</h3>
              <button
                type="button"
                onClick={() => setEditingEntry(null)}
                className="text-[#86868B] hover:text-[#1D1D1F] p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleUpdateEntry} className="p-5 space-y-3.5 text-xs">
              <div>
                <label className="font-medium text-[#1D1D1F] block mb-1">Particulars / Description</label>
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
                  <label className="font-medium text-[#1D1D1F] block mb-1">Date</label>
                  <input
                    type="date"
                    value={editingEntry.entryDate || ''}
                    onChange={(e) => setEditingEntry({ ...editingEntry, entryDate: e.target.value })}
                    className="w-full px-3 py-1.5 border border-[#E5E5EA] rounded-xl text-xs"
                    required
                  />
                </div>
                <div>
                  <label className="font-medium text-[#1D1D1F] block mb-1">Amount (₹)</label>
                  <input
                    type="number"
                    step="any"
                    value={editingEntry.amount}
                    onChange={(e) => setEditingEntry({ ...editingEntry, amount: Number(e.target.value) })}
                    className="w-full px-3 py-1.5 border border-[#E5E5EA] rounded-xl text-xs font-mono font-bold"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="font-medium text-[#1D1D1F] block mb-1">Category</label>
                <input
                  type="text"
                  value={editingEntry.category || ''}
                  onChange={(e) => setEditingEntry({ ...editingEntry, category: e.target.value })}
                  className="w-full px-3 py-1.5 border border-[#E5E5EA] rounded-xl text-xs"
                  required
                />
              </div>

              <div>
                <label className="font-medium text-[#1D1D1F] block mb-1">
                  Reason for Modification <span className="text-[#FF3B30]">*</span>
                </label>
                <input
                  type="text"
                  value={changeReason}
                  onChange={(e) => setChangeReason(e.target.value)}
                  className="w-full px-3 py-1.5 border border-[#E5E5EA] rounded-xl text-xs"
                  placeholder="Mandatory reason for audit history & version snapshot"
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
                  Update & Save Version
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Version History & Revert Modal */}
      {versionModalEntry && isSuperAdmin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-[#FFFFFF] w-full max-w-lg rounded-2xl shadow-xl border border-[#E5E5EA] overflow-hidden">
            <div className="p-4 border-b border-[#E5E5EA] flex items-center justify-between bg-[#FBFBFC]">
              <div>
                <h3 className="font-bold text-sm text-[#1D1D1F]">Version History & Revert</h3>
                <p className="text-[11px] text-[#86868B]">{versionModalEntry.particulars}</p>
              </div>
              <button
                type="button"
                onClick={() => setVersionModalEntry(null)}
                className="text-[#86868B] hover:text-[#1D1D1F] p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 space-y-3 max-h-96 overflow-y-auto text-xs">
              {(!versionModalEntry.versions || versionModalEntry.versions.length === 0) ? (
                <p className="text-center text-[#86868B] py-4">No previous versions captured for this entry.</p>
              ) : (
                versionModalEntry.versions.map((v) => {
                  let snap: any = {};
                  try {
                    snap = JSON.parse(v.snapshotData);
                  } catch {
                    snap = {};
                  }

                  return (
                    <div
                      key={v.id}
                      className="p-3 bg-[#F9F9FB] rounded-xl border border-[#E5E5EA] flex items-center justify-between gap-3"
                    >
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="font-bold text-[#1D1D1F]">Version {v.versionNumber}</span>
                          <span className="text-[10px] text-[#86868B]">
                            {new Date(v.createdAt).toLocaleString()}
                          </span>
                        </div>
                        <p className="text-[11px] text-[#48484A] mt-0.5">{v.changeReason || 'Snapshot'}</p>
                        <p className="text-[11px] font-mono text-[#007AFF] mt-0.5">
                          Amount: ₹{Number(snap.amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleRevertVersion(versionModalEntry.id, v.versionNumber)}
                        className="inline-flex items-center px-3 py-1.5 text-xs font-semibold text-white bg-[#007AFF] hover:bg-[#007AFF]/90 rounded-xl transition-colors shrink-0"
                      >
                        <RotateCcw className="w-3 h-3 mr-1" /> Revert
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

