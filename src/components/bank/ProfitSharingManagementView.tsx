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
  Users,
  Building2,
  Tag,
  CreditCard,
  ShieldCheck,
  ChevronDown,
  Wallet,
  PieChart,
  DollarSign,
} from 'lucide-react';

export interface ProfitSharingEntry {
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

export default function ProfitSharingManagementView() {
  const [loading, setLoading] = useState(true);
  const [entries, setEntries] = useState<ProfitSharingEntry[]>([]);
  const [account, setAccount] = useState<any>(null);
  const [periods, setPeriods] = useState<any[]>([]);
  const [userRole, setUserRole] = useState<'SUPER_ADMIN' | 'VIEWER'>('SUPER_ADMIN');

  // Internal Tabs: 'MONTHLY' | 'DISTRIBUTION' | 'CASH_HEMARAJ' | 'HEMARAJ_DRAWINGS'
  const [activeTab, setActiveTab] = useState<'MONTHLY' | 'DISTRIBUTION' | 'CASH_HEMARAJ' | 'HEMARAJ_DRAWINGS'>('MONTHLY');

  // Filter States
  const [search, setSearch] = useState('');
  const [selectedYear, setSelectedYear] = useState('ALL');
  const [selectedMonth, setSelectedMonth] = useState('ALL');
  const [selectedCompany, setSelectedCompany] = useState('ALL');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [selectedStatus, setSelectedStatus] = useState('ALL');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<ProfitSharingEntry | null>(null);
  const [versionModalEntry, setVersionModalEntry] = useState<ProfitSharingEntry | null>(null);
  const [changeReason, setChangeReason] = useState('');

  // Form State
  const [formData, setFormData] = useState({
    financialYear: '2026-27',
    financialMonth: 'Nov-26',
    transactionDate: new Date().toISOString().split('T')[0],
    company: 'ECO Travels',
    section: 'MONTHLY_PROFIT', // 'MONTHLY_PROFIT', 'PROFIT_ADJUSTMENT', 'CASH_WITH_HEMARAJ', 'PARTNER_DRAWING'
    category: 'ECO Contribution',
    particulars: '',
    amount: '',
    debitCredit: 'CREDIT', // 'CREDIT' for profit inflow, 'DEBIT' for adjustment deduction
    shareCount: 3,
    beneficiary: '',
    paymentStatus: 'ALLOCATED', // 'ALLOCATED', 'PAID'
    paymentMode: 'BANK_TRANSFER',
    bankTxnReference: '',
    remarks: '',
  });

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/bank/profit-sharing');
      const data = await res.json();
      if (data.success) {
        setEntries(data.entries || []);
        setAccount(data.account || null);
        setPeriods(data.periods || []);
      }
      const authRes = await fetch('/api/users');
      if (authRes.status === 403) {
        setUserRole('VIEWER');
      } else {
        setUserRole('SUPER_ADMIN');
      }
    } catch (e) {
      console.error('Failed to fetch Profit Sharing data:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const isSuperAdmin = userRole === 'SUPER_ADMIN';

  // Helper to parse meta
  const getEntryMeta = (entry: ProfitSharingEntry) => {
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
    const months = new Set<string>(['Jul-26', 'Aug-26', 'Sep-26', 'Oct-26', 'Nov-26', 'Dec-26', 'Jan-27']);
    entries.forEach((e) => {
      if (e.periodCode) months.add(e.periodCode);
      const meta = getEntryMeta(e);
      if (meta.financialMonth) months.add(meta.financialMonth);
    });
    return Array.from(months).sort();
  }, [entries]);

  const availableCompanies = useMemo(() => {
    const comps = new Set<string>(['ECO Travels', 'EURO-Amz', 'SST', 'Black Rock', 'Davis', 'BR', 'Sweet', 'Epsilon', 'Ravi']);
    entries.forEach((e) => {
      if (e.sourceReference) comps.add(e.sourceReference);
      const meta = getEntryMeta(e);
      if (meta.company) comps.add(meta.company);
    });
    return Array.from(comps).sort();
  }, [entries]);

  // Filtering Logic
  const filteredEntries = useMemo(() => {
    return entries.filter((e) => {
      const meta = getEntryMeta(e);
      const fYear = meta.financialYear || '2026-27';
      const fMonth = e.periodCode || meta.financialMonth || '';
      const comp = e.sourceReference || meta.company || '';
      const pStatus = meta.paymentStatus || (Number(e.paidAmount) > 0 ? 'PAID' : 'ALLOCATED');

      if (selectedYear !== 'ALL' && fYear !== selectedYear) return false;
      if (selectedMonth !== 'ALL' && fMonth !== selectedMonth) return false;
      if (selectedCompany !== 'ALL' && !comp.toLowerCase().includes(selectedCompany.toLowerCase())) return false;
      if (selectedCategory !== 'ALL' && e.category !== selectedCategory) return false;
      if (selectedStatus !== 'ALL' && pStatus !== selectedStatus) return false;

      if (startDate && e.entryDate && e.entryDate < startDate) return false;
      if (endDate && e.entryDate && e.entryDate > endDate) return false;

      if (search) {
        const q = search.toLowerCase();
        const txnId = meta.transactionId?.toLowerCase() || '';
        const bankRef = meta.bankTxnReference?.toLowerCase() || '';
        return (
          e.particulars?.toLowerCase().includes(q) ||
          e.category?.toLowerCase().includes(q) ||
          comp.toLowerCase().includes(q) ||
          e.comments?.toLowerCase().includes(q) ||
          e.remarks?.toLowerCase().includes(q) ||
          txnId.includes(q) ||
          bankRef.includes(q)
        );
      }
      return true;
    });
  }, [entries, search, selectedYear, selectedMonth, selectedCompany, selectedCategory, selectedStatus, startDate, endDate]);

  // 10 Summary KPI Counters (dynamically computed from PostgreSQL records)
  const metrics = useMemo(() => {
    let totalMonthlyProfit = 0;
    let totalEcoContribution = 0;
    let totalEuroContribution = 0;
    let totalSstContribution = 0;
    let totalAdjustments = 0;
    let netDistributableProfit = 0;
    let individualShareAmount = 0;
    let totalAmountDistributed = 0;
    let pendingDistributions = 0;
    let cashWithHemaraj = 0;

    entries.forEach((e) => {
      const amt = Number(e.amount) || 0;
      const meta = getEntryMeta(e);
      const isCash = e.section === 'CASH_HOLDING' || e.category === 'Cash With Hemaraj' || meta.profitType === 'CASH_HOLDING';

      if (isCash) {
        cashWithHemaraj += amt;
      }
    });

    filteredEntries.forEach((e) => {
      const amt = Number(e.amount) || 0;
      const meta = getEntryMeta(e);
      const isAdj = e.section === 'PROFIT_ADJUSTMENT' || amt < 0 || meta.profitType === 'ADJUSTMENT';
      const isContrib = e.section === 'MONTHLY_PROFIT' || meta.profitType === 'CONTRIBUTION';
      const comp = (e.sourceReference || e.category || meta.company || '').toUpperCase();
      const pStatus = meta.paymentStatus || (Number(e.paidAmount) > 0 ? 'PAID' : 'ALLOCATED');

      if (isContrib) {
        totalMonthlyProfit += amt;
        if (comp.includes('ECO')) totalEcoContribution += amt;
        if (comp.includes('EURO')) totalEuroContribution += amt;
        if (comp.includes('SST')) totalSstContribution += amt;
      }

      if (isAdj && e.section !== 'CASH_HOLDING' && e.section !== 'PARTNER_DRAWING') {
        totalAdjustments += amt;
      }

      if (pStatus === 'PAID') {
        totalAmountDistributed += Math.abs(amt);
      } else {
        pendingDistributions += Math.abs(amt);
      }
    });

    netDistributableProfit = totalMonthlyProfit + totalAdjustments;
    individualShareAmount = netDistributableProfit !== 0 ? netDistributableProfit / 3 : 0;

    return {
      totalMonthlyProfit,
      totalEcoContribution,
      totalEuroContribution,
      totalSstContribution,
      totalAdjustments,
      netDistributableProfit,
      individualShareAmount,
      totalAmountDistributed,
      pendingDistributions,
      cashWithHemaraj,
    };
  }, [entries, filteredEntries]);

  // Tab Filtering
  const monthlyEntries = useMemo(() => {
    return filteredEntries.filter((e) => e.section === 'MONTHLY_PROFIT' || e.section === 'PROFIT_ADJUSTMENT');
  }, [filteredEntries]);

  const cashWithHemarajEntries = useMemo(() => {
    return filteredEntries.filter((e) => e.section === 'CASH_HOLDING' || e.category === 'Cash With Hemaraj');
  }, [filteredEntries]);

  const hemarajDrawingsEntries = useMemo(() => {
    return filteredEntries.filter((e) => e.section === 'PARTNER_DRAWING' || e.category === 'Hemaraj');
  }, [filteredEntries]);

  // Handle Add Entry
  const handleAddEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isSuperAdmin) return;

    try {
      const numAmount = Number(formData.amount);
      const finalAmount = formData.debitCredit === 'DEBIT' ? -Math.abs(numAmount) : Math.abs(numAmount);

      const payload = {
        periodCode: formData.financialMonth,
        entryDate: formData.transactionDate,
        section: formData.section,
        category: formData.category,
        particulars: formData.particulars || `${formData.company} ${formData.category}`,
        sourceReference: formData.company,
        amount: finalAmount,
        paidAmount: formData.paymentStatus === 'PAID' ? Math.abs(finalAmount) : 0,
        receivedAmount: formData.paymentStatus === 'RECEIVED' ? Math.abs(finalAmount) : 0,
        netAmount: finalAmount,
        comments: formData.remarks || formData.particulars,
        remarks: formData.remarks,
        paymentStatus: formData.paymentStatus,
        paymentMode: formData.paymentMode,
        bankTxnReference: formData.bankTxnReference,
        meta: {
          transactionId: `PS-${Date.now().toString().slice(-6)}`,
          financialYear: formData.financialYear,
          financialMonth: formData.financialMonth,
          company: formData.company,
          profitType: formData.section === 'PROFIT_ADJUSTMENT' ? 'ADJUSTMENT' : 'CONTRIBUTION',
          debitCredit: formData.debitCredit,
          applicableShares: Number(formData.shareCount) || 3,
          beneficiary: formData.beneficiary || null,
          paymentStatus: formData.paymentStatus,
          paymentMode: formData.paymentMode,
          bankTxnReference: formData.bankTxnReference || null,
        },
      };

      const res = await fetch('/api/bank/profit-sharing', {
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
          company: 'ECO Travels',
          section: 'MONTHLY_PROFIT',
          category: 'ECO Contribution',
          particulars: '',
          amount: '',
          debitCredit: 'CREDIT',
          shareCount: 3,
          beneficiary: '',
          paymentStatus: 'ALLOCATED',
          paymentMode: 'BANK_TRANSFER',
          bankTxnReference: '',
          remarks: '',
        });
        fetchData();
      }
    } catch (err) {
      console.error('Failed to create Profit Sharing entry:', err);
    }
  };

  // Handle Edit Entry
  const handleUpdateEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isSuperAdmin || !editingEntry) return;

    try {
      const meta = getEntryMeta(editingEntry);
      const res = await fetch('/api/bank/profit-sharing', {
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
          changeReason: changeReason || 'Modified Profit Sharing entry details',
          meta: {
            ...meta,
            paymentStatus: meta.paymentStatus || 'ALLOCATED',
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
      console.error('Failed to update entry:', err);
    }
  };

  // Handle Soft-Delete
  const handleDeleteEntry = async (id: string, particulars: string) => {
    if (!isSuperAdmin) return;
    if (!confirm(`Are you sure you want to delete "${particulars}"? It will be safely moved to the Recycle Bin.`)) return;

    try {
      const res = await fetch(`/api/bank/profit-sharing?id=${id}`, { method: 'DELETE' });
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
      const res = await fetch(`/api/bank/profit-sharing/${entryId}/revert`, {
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
    const headers = ['Txn ID', 'Period', 'Date', 'Section', 'Company', 'Category', 'Particulars', 'Amount (INR)', 'Status', 'Bank Ref'];
    const rows = filteredEntries.map((e) => {
      const meta = getEntryMeta(e);
      return [
        `"${meta.transactionId || e.id}"`,
        `"${e.periodCode || ''}"`,
        `"${e.entryDate || ''}"`,
        `"${e.section || ''}"`,
        `"${e.sourceReference || meta.company || ''}"`,
        `"${e.category || ''}"`,
        `"${e.particulars || ''}"`,
        e.amount,
        `"${meta.paymentStatus || 'ALLOCATED'}"`,
        `"${meta.bankTxnReference || ''}"`,
      ];
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Atharva_Profit_Sharing_${new Date().toISOString().split('T')[0]}.csv`);
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
                <Users className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <h1 className="text-xl font-bold text-[#1D1D1F] tracking-tight">Profit Sharing Management</h1>
                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[#34C759]/10 text-[#34C759] border border-[#34C759]/20 flex items-center">
                    <ShieldCheck className="w-3 h-3 mr-1" /> Reconciled with Bank Row 62
                  </span>
                </div>
                <p className="text-xs text-[#86868B] mt-0.5">
                  Monthly ECO & EURO Distributions • Individual Partner Shares • Dedicated Cash With Hemaraj Ledger
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
                <Plus className="w-3.5 h-3.5 mr-1" /> Add Entry
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 10 Summary KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 lg:grid-cols-10 gap-2.5">
        <div className="bg-[#FFFFFF] p-3 rounded-2xl border border-[#E5E5EA] shadow-2xs">
          <span className="text-[10px] text-[#86868B] font-medium block">Total Monthly Profit</span>
          <span className="text-sm font-bold text-[#34C759] tracking-tight mt-0.5 block truncate">
            ₹{metrics.totalMonthlyProfit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </span>
          <span className="text-[9px] text-[#86868B]">Gross Operating</span>
        </div>

        <div className="bg-[#FFFFFF] p-3 rounded-2xl border border-[#E5E5EA] shadow-2xs">
          <span className="text-[10px] text-[#86868B] font-medium block">ECO Contribution</span>
          <span className="text-sm font-bold text-[#007AFF] tracking-tight mt-0.5 block truncate">
            ₹{metrics.totalEcoContribution.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </span>
          <span className="text-[9px] text-[#86868B]">ECO Travels</span>
        </div>

        <div className="bg-[#FFFFFF] p-3 rounded-2xl border border-[#E5E5EA] shadow-2xs">
          <span className="text-[10px] text-[#86868B] font-medium block">EURO Contribution</span>
          <span className="text-sm font-bold text-[#5856D6] tracking-tight mt-0.5 block truncate">
            ₹{metrics.totalEuroContribution.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </span>
          <span className="text-[9px] text-[#86868B]">EURO-Amz</span>
        </div>

        <div className="bg-[#FFFFFF] p-3 rounded-2xl border border-[#E5E5EA] shadow-2xs">
          <span className="text-[10px] text-[#86868B] font-medium block">SST Contribution</span>
          <span className="text-sm font-bold text-[#86868B] tracking-tight mt-0.5 block truncate">
            ₹{metrics.totalSstContribution.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </span>
          <span className="text-[9px] text-[#86868B]">SST Account</span>
        </div>

        <div className="bg-[#FFFFFF] p-3 rounded-2xl border border-[#E5E5EA] shadow-2xs">
          <span className="text-[10px] text-[#86868B] font-medium block">Total Adjustments</span>
          <span className="text-sm font-bold text-[#FF3B30] tracking-tight mt-0.5 block truncate">
            ₹{metrics.totalAdjustments.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </span>
          <span className="text-[9px] text-[#86868B]">Signed Deductions</span>
        </div>

        <div className="bg-[#FFFFFF] p-3 rounded-2xl border border-[#E5E5EA] shadow-2xs">
          <span className="text-[10px] text-[#86868B] font-medium block">Net Distributable</span>
          <span
            className={`text-sm font-bold tracking-tight mt-0.5 block truncate ${
              metrics.netDistributableProfit >= 0 ? 'text-[#34C759]' : 'text-[#FF3B30]'
            }`}
          >
            ₹{metrics.netDistributableProfit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </span>
          <span className="text-[9px] text-[#86868B]">Profit + Less</span>
        </div>

        <div className="bg-[#FFFFFF] p-3 rounded-2xl border border-[#E5E5EA] shadow-2xs">
          <span className="text-[10px] text-[#86868B] font-medium block">Each Share (÷3)</span>
          <span
            className={`text-sm font-bold tracking-tight mt-0.5 block truncate ${
              metrics.individualShareAmount >= 0 ? 'text-[#007AFF]' : 'text-[#FF3B30]'
            }`}
          >
            ₹{metrics.individualShareAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </span>
          <span className="text-[9px] text-[#86868B]">Per Partner</span>
        </div>

        <div className="bg-[#FFFFFF] p-3 rounded-2xl border border-[#E5E5EA] shadow-2xs">
          <span className="text-[10px] text-[#86868B] font-medium block">Total Distributed</span>
          <span className="text-sm font-bold text-[#34C759] tracking-tight mt-0.5 block truncate">
            ₹{metrics.totalAmountDistributed.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </span>
          <span className="text-[9px] text-[#86868B]">Confirmed Paid</span>
        </div>

        <div className="bg-[#FFFFFF] p-3 rounded-2xl border border-[#E5E5EA] shadow-2xs">
          <span className="text-[10px] text-[#86868B] font-medium block">Pending Distribution</span>
          <span className="text-sm font-bold text-[#FF9500] tracking-tight mt-0.5 block truncate">
            ₹{metrics.pendingDistributions.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </span>
          <span className="text-[9px] text-[#86868B]">Allocated Balance</span>
        </div>

        <div className="bg-[#FFFFFF] p-3 rounded-2xl border border-[#E5E5EA] shadow-2xs">
          <span className="text-[10px] text-[#86868B] font-medium block">Cash With Hemaraj</span>
          <span className="text-sm font-bold text-[#AF52DE] tracking-tight mt-0.5 block truncate">
            ₹{metrics.cashWithHemaraj.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </span>
          <span className="text-[9px] text-[#86868B]">Net Cash Total</span>
        </div>
      </div>

      {/* Internal Tabs Navigation */}
      <div className="flex items-center justify-between border-b border-[#E5E5EA] pb-3">
        <div className="flex items-center space-x-1.5 bg-[#F2F2F7] p-1 rounded-xl">
          <button
            type="button"
            onClick={() => setActiveTab('MONTHLY')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'MONTHLY' ? 'bg-[#FFFFFF] text-[#1D1D1F] shadow-xs font-bold' : 'text-[#86868B] hover:text-[#1D1D1F]'
            }`}
          >
            Monthly Profit Sharing
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('DISTRIBUTION')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'DISTRIBUTION' ? 'bg-[#FFFFFF] text-[#1D1D1F] shadow-xs font-bold' : 'text-[#86868B] hover:text-[#1D1D1F]'
            }`}
          >
            Partner Distribution Tracker
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('CASH_HEMARAJ')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center space-x-1.5 ${
              activeTab === 'CASH_HEMARAJ' ? 'bg-[#FFFFFF] text-[#AF52DE] shadow-xs font-bold' : 'text-[#86868B] hover:text-[#AF52DE]'
            }`}
          >
            <Wallet className="w-3.5 h-3.5 text-[#AF52DE]" />
            <span>Cash With Hemaraj</span>
            <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-[#AF52DE]/10 text-[#AF52DE]">
              ₹4,719.00
            </span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('HEMARAJ_DRAWINGS')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'HEMARAJ_DRAWINGS' ? 'bg-[#FFFFFF] text-[#1D1D1F] shadow-xs font-bold' : 'text-[#86868B] hover:text-[#1D1D1F]'
            }`}
          >
            Hemaraj Records (3)
          </button>
        </div>

        <div className="text-xs text-[#86868B]">
          Sub-section: <span className="font-semibold text-[#1D1D1F]">
            {activeTab === 'MONTHLY' && 'Monthly Contributions & Adjustments'}
            {activeTab === 'DISTRIBUTION' && 'Partner Beneficiary Allocations'}
            {activeTab === 'CASH_HEMARAJ' && 'Dedicated Cash Holdings Ledger'}
            {activeTab === 'HEMARAJ_DRAWINGS' && 'Individual Recorded Withdrawals'}
          </span>
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
              placeholder="Search description, company, reference..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-[#F9F9FB] border border-[#E5E5EA] rounded-xl focus:outline-hidden focus:border-[#007AFF]"
            />
          </div>

          {/* Financial Year */}
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

          {/* Month */}
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

          {/* Company */}
          <select
            value={selectedCompany}
            onChange={(e) => setSelectedCompany(e.target.value)}
            className="px-3 py-1.5 text-xs bg-[#F9F9FB] border border-[#E5E5EA] rounded-xl text-[#1D1D1F] focus:outline-hidden focus:border-[#007AFF]"
          >
            <option value="ALL">All Companies</option>
            {availableCompanies.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>

          {/* Payment Status */}
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="px-3 py-1.5 text-xs bg-[#F9F9FB] border border-[#E5E5EA] rounded-xl text-[#1D1D1F] focus:outline-hidden focus:border-[#007AFF]"
          >
            <option value="ALL">All Statuses</option>
            <option value="ALLOCATED">ALLOCATED</option>
            <option value="PAID">PAID</option>
          </select>

          {/* Clear Filters */}
          <button
            type="button"
            onClick={() => {
              setSearch('');
              setSelectedYear('ALL');
              setSelectedMonth('ALL');
              setSelectedCompany('ALL');
              setSelectedCategory('ALL');
              setSelectedStatus('ALL');
              setStartDate('');
              setEndDate('');
            }}
            className="px-3 py-1.5 text-xs text-[#86868B] hover:text-[#1D1D1F] bg-[#F2F2F7] hover:bg-[#E5E5EA] rounded-xl transition-colors font-medium"
          >
            Clear Filters
          </button>
        </div>
      </div>

      {/* TAB 1: MONTHLY PROFIT SHARING */}
      {activeTab === 'MONTHLY' && (
        <div className="space-y-6">
          {/* Monthly Periods Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* July 2026 Card */}
            <div className="bg-[#FFFFFF] p-5 rounded-2xl border border-[#E5E5EA] shadow-2xs space-y-3">
              <div className="flex items-center justify-between border-b border-[#E5E5EA] pb-2.5">
                <div className="flex items-center space-x-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#007AFF]" />
                  <h3 className="font-bold text-sm text-[#1D1D1F]">July 2026 Profit Sharing</h3>
                </div>
                <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-[#34C759]/10 text-[#34C759]">
                  Reconciled
                </span>
              </div>
              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between text-[#86868B]">
                  <span>ECO Contribution:</span>
                  <span className="font-semibold text-[#1D1D1F]">₹47,794.99</span>
                </div>
                <div className="flex justify-between text-[#86868B]">
                  <span>EURO Contribution:</span>
                  <span className="font-semibold text-[#1D1D1F]">₹27,945.35</span>
                </div>
                <div className="flex justify-between text-[#86868B]">
                  <span>SST Contribution:</span>
                  <span className="font-semibold text-[#86868B]">-</span>
                </div>
                <div className="flex justify-between font-bold text-[#1D1D1F] pt-1 border-t border-[#E5E5EA]">
                  <span>Total Profit:</span>
                  <span>₹75,740.34</span>
                </div>
                <div className="flex justify-between text-[#FF3B30]">
                  <span>Less Black Rock:</span>
                  <span>-₹3,750.00</span>
                </div>
                <div className="flex justify-between font-bold text-[#34C759] pt-1 border-t border-[#E5E5EA]">
                  <span>Net Distributable:</span>
                  <span>₹71,990.34</span>
                </div>
                <div className="flex justify-between font-bold text-[#007AFF] bg-[#007AFF]/5 p-2 rounded-xl">
                  <span>Each Partner Share (÷3):</span>
                  <span>₹23,996.78</span>
                </div>
              </div>
            </div>

            {/* August 2026 Card */}
            <div className="bg-[#FFFFFF] p-5 rounded-2xl border border-[#E5E5EA] shadow-2xs space-y-3">
              <div className="flex items-center justify-between border-b border-[#E5E5EA] pb-2.5">
                <div className="flex items-center space-x-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#34C759]" />
                  <h3 className="font-bold text-sm text-[#1D1D1F]">August 2026 Profit Sharing</h3>
                </div>
                <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-[#34C759]/10 text-[#34C759]">
                  Reconciled
                </span>
              </div>
              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between text-[#86868B]">
                  <span>ECO Contribution:</span>
                  <span className="font-semibold text-[#1D1D1F]">₹82,574.50</span>
                </div>
                <div className="flex justify-between text-[#86868B]">
                  <span>EURO Contribution:</span>
                  <span className="font-semibold text-[#1D1D1F]">₹21,143.70</span>
                </div>
                <div className="flex justify-between text-[#86868B]">
                  <span>SST Contribution:</span>
                  <span className="font-semibold text-[#86868B]">-</span>
                </div>
                <div className="flex justify-between font-bold text-[#1D1D1F] pt-1 border-t border-[#E5E5EA]">
                  <span>Total Profit:</span>
                  <span>₹1,03,718.20</span>
                </div>
                <div className="flex justify-between text-[#86868B]">
                  <span>Less Adjustments:</span>
                  <span>₹0.00</span>
                </div>
                <div className="flex justify-between font-bold text-[#34C759] pt-1 border-t border-[#E5E5EA]">
                  <span>Net Distributable:</span>
                  <span>₹1,03,718.20</span>
                </div>
                <div className="flex justify-between font-bold text-[#007AFF] bg-[#007AFF]/5 p-2 rounded-xl">
                  <span>Each Partner Share (÷3):</span>
                  <span>₹34,572.73</span>
                </div>
              </div>
            </div>

            {/* September 2026 Card */}
            <div className="bg-[#FFFFFF] p-5 rounded-2xl border border-[#E5E5EA] shadow-2xs space-y-3">
              <div className="flex items-center justify-between border-b border-[#E5E5EA] pb-2.5">
                <div className="flex items-center space-x-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#FF3B30]" />
                  <h3 className="font-bold text-sm text-[#1D1D1F]">September 2026 Adjustments</h3>
                </div>
                <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-[#FF3B30]/10 text-[#FF3B30]">
                  Row 62 Bank Match
                </span>
              </div>
              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between text-[#86868B]">
                  <span>Operating Contributions:</span>
                  <span className="font-semibold text-[#86868B]">₹0.00</span>
                </div>
                <div className="flex justify-between text-[#FF3B30]">
                  <span>Davis Adjustment:</span>
                  <span className="font-semibold text-[#FF3B30]">-₹30,000.00</span>
                </div>
                <div className="flex justify-between text-[#FF3B30]">
                  <span>BR Adjustment:</span>
                  <span className="font-semibold text-[#FF3B30]">-₹6,000.00</span>
                </div>
                <div className="flex justify-between text-[#FF3B30]">
                  <span>Sweet-9-11-26 Adjustment:</span>
                  <span className="font-semibold text-[#FF3B30]">-₹5,000.00</span>
                </div>
                <div className="flex justify-between font-bold text-[#FF3B30] pt-1 border-t border-[#E5E5EA]">
                  <span>Total Adjustments:</span>
                  <span>-₹41,000.00</span>
                </div>
                <div className="flex justify-between font-bold text-[#FF3B30] pt-1 border-t border-[#E5E5EA]">
                  <span>Net Amount:</span>
                  <span>-₹41,000.00</span>
                </div>
                <div className="flex justify-between font-bold text-[#FF3B30] bg-[#FF3B30]/5 p-2 rounded-xl">
                  <span>Each Partner Share (÷3):</span>
                  <span>-₹13,666.67</span>
                </div>
              </div>
            </div>
          </div>

          {/* Granular Transactions Table */}
          <div className="bg-[#FFFFFF] rounded-2xl border border-[#E5E5EA] shadow-2xs overflow-hidden">
            <div className="p-4 border-b border-[#E5E5EA] flex items-center justify-between bg-[#FBFBFC]">
              <div>
                <h2 className="font-bold text-sm text-[#1D1D1F]">Granular Profit Sharing Transactions</h2>
                <p className="text-[11px] text-[#86868B]">
                  Showing {monthlyEntries.length} granular contribution and adjustment lines
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-[#E5E5EA] bg-[#F9F9FB] text-[#86868B] font-semibold">
                    <th className="py-2.5 px-4">Period</th>
                    <th className="py-2.5 px-4">Date</th>
                    <th className="py-2.5 px-4">Company / Site</th>
                    <th className="py-2.5 px-4">Category</th>
                    <th className="py-2.5 px-4">Particulars</th>
                    <th className="py-2.5 px-4">Status</th>
                    <th className="py-2.5 px-4 text-right">Amount (₹)</th>
                    {isSuperAdmin && <th className="py-2.5 px-4 text-center">Actions</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5E5EA]">
                  {loading ? (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-[#86868B]">
                        <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-[#007AFF]" />
                        Loading Profit Sharing transactions...
                      </td>
                    </tr>
                  ) : monthlyEntries.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-[#86868B]">
                        No monthly transactions found matching the selected filters.
                      </td>
                    </tr>
                  ) : (
                    monthlyEntries.map((row) => {
                      const meta = getEntryMeta(row);
                      const isAdj = row.amount < 0;
                      const versionCount = row.versions?.length || 1;

                      return (
                        <tr key={row.id} className="hover:bg-[#F9F9FB]/60 transition-colors">
                          <td className="py-2.5 px-4 font-semibold text-[#1D1D1F] whitespace-nowrap">
                            <span className="px-2 py-0.5 rounded-md text-[10px] bg-[#F2F2F7]">
                              {row.periodCode || 'Nov-26'}
                            </span>
                          </td>
                          <td className="py-2.5 px-4 text-[#48484A] whitespace-nowrap">{row.entryDate || '-'}</td>
                          <td className="py-2.5 px-4 font-semibold text-[#1D1D1F]">
                            {row.sourceReference || meta.company || '-'}
                          </td>
                          <td className="py-2.5 px-4">
                            <span
                              className={`px-2 py-0.5 rounded-md text-[10px] font-medium ${
                                isAdj ? 'bg-[#FF3B30]/10 text-[#FF3B30]' : 'bg-[#007AFF]/10 text-[#007AFF]'
                              }`}
                            >
                              {row.category}
                            </span>
                          </td>
                          <td className="py-2.5 px-4 text-[#48484A]">
                            <div className="flex items-center space-x-1.5">
                              <span>{row.particulars}</span>
                              {versionCount > 1 && (
                                <button
                                  type="button"
                                  onClick={() => setVersionModalEntry(row)}
                                  className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-[#007AFF]/10 text-[#007AFF]"
                                >
                                  v{versionCount}
                                </button>
                              )}
                            </div>
                          </td>
                          <td className="py-2.5 px-4">
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-[#34C759]/10 text-[#34C759]">
                              {meta.paymentStatus || 'ALLOCATED'}
                            </span>
                          </td>
                          <td className="py-2.5 px-4 text-right font-bold tabular-nums">
                            <span className={isAdj ? 'text-[#FF3B30]' : 'text-[#34C759]'}>
                              {isAdj ? '' : '+'}₹{Number(row.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                            </span>
                          </td>
                          {isSuperAdmin && (
                            <td className="py-2.5 px-4 text-center">
                              <div className="flex items-center justify-center space-x-1">
                                <button
                                  type="button"
                                  onClick={() => setEditingEntry(row)}
                                  className="p-1 rounded-md text-[#86868B] hover:text-[#007AFF] hover:bg-[#007AFF]/10"
                                  title="Edit entry"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setVersionModalEntry(row)}
                                  className="p-1 rounded-md text-[#86868B] hover:text-[#34C759] hover:bg-[#34C759]/10"
                                  title="Version history"
                                >
                                  <History className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteEntry(row.id, row.particulars || 'Profit Sharing Entry')}
                                  className="p-1 rounded-md text-[#86868B] hover:text-[#FF3B30] hover:bg-[#FF3B30]/10"
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
        </div>
      )}

      {/* TAB 2: PARTNER DISTRIBUTION TRACKER */}
      {activeTab === 'DISTRIBUTION' && (
        <div className="bg-[#FFFFFF] rounded-2xl border border-[#E5E5EA] shadow-2xs overflow-hidden">
          <div className="p-4 border-b border-[#E5E5EA] flex items-center justify-between bg-[#FBFBFC]">
            <div>
              <h2 className="font-bold text-sm text-[#1D1D1F]">Partner Distribution & Payment Breakdown</h2>
              <p className="text-[11px] text-[#86868B]">
                Track per-share allocation, confirmed bank payouts, and outstanding distribution liabilities
              </p>
            </div>
          </div>

          <div className="p-5">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="p-4 rounded-xl bg-[#F9F9FB] border border-[#E5E5EA]">
                <span className="text-xs text-[#86868B] block">July 2026 Distribution</span>
                <span className="text-lg font-bold text-[#1D1D1F] block mt-1">₹23,996.78 / share</span>
                <span className="text-[11px] text-[#34C759] mt-0.5 block">Net Profit: ₹71,990.34 (3 Shares)</span>
              </div>
              <div className="p-4 rounded-xl bg-[#F9F9FB] border border-[#E5E5EA]">
                <span className="text-xs text-[#86868B] block">August 2026 Distribution</span>
                <span className="text-lg font-bold text-[#1D1D1F] block mt-1">₹34,572.73 / share</span>
                <span className="text-[11px] text-[#34C759] mt-0.5 block">Net Profit: ₹1,03,718.20 (3 Shares)</span>
              </div>
              <div className="p-4 rounded-xl bg-[#F9F9FB] border border-[#E5E5EA]">
                <span className="text-xs text-[#86868B] block">September 2026 Net Adjustment</span>
                <span className="text-lg font-bold text-[#FF3B30] block mt-1">-₹13,666.67 / share</span>
                <span className="text-[11px] text-[#FF3B30] mt-0.5 block">Net Adjustments: -₹41,000.00 (3 Shares)</span>
              </div>
            </div>

            <div className="p-4 bg-[#F2F2F7] rounded-xl text-xs text-[#48484A] flex items-start space-x-2">
              <CheckCircle2 className="w-4 h-4 text-[#34C759] shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold text-[#1D1D1F]">Double-Entry Cash Flow Rule:</span> Profit allocated remains a bookkeeping liability and does not deduct bank cash. When a distribution is confirmed and marked <strong>PAID</strong>, exactly 1 cash debit is posted to the Main Bank Balance with complete audit trail.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: CASH WITH HEMARAJ (Dedicated Subsection) */}
      {activeTab === 'CASH_HEMARAJ' && (
        <div className="space-y-4">
          <div className="bg-[#FFFFFF] p-5 rounded-2xl border border-[#E5E5EA] shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-[#AF52DE]/10 flex items-center justify-center text-[#AF52DE]">
                <Wallet className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-[#1D1D1F]">Cash With Hemaraj Dedicated Ledger</h3>
                <p className="text-xs text-[#86868B]">
                  Operational cash holdings tracked separately • Formula: 4,783 + 2,036 - 2,100 = ₹4,719.00
                </p>
              </div>
            </div>

            <div className="px-4 py-2 bg-[#AF52DE]/10 rounded-xl border border-[#AF52DE]/20 text-right">
              <span className="text-[10px] text-[#AF52DE] font-semibold block">Calculated Net Cash</span>
              <span className="text-xl font-bold text-[#AF52DE]">
                ₹{metrics.cashWithHemaraj.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>

          <div className="bg-[#FFFFFF] rounded-2xl border border-[#E5E5EA] shadow-2xs overflow-hidden">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-[#E5E5EA] bg-[#F9F9FB] text-[#86868B] font-semibold">
                  <th className="py-2.5 px-4">Line</th>
                  <th className="py-2.5 px-4">Particulars / Source</th>
                  <th className="py-2.5 px-4">Category</th>
                  <th className="py-2.5 px-4">Type</th>
                  <th className="py-2.5 px-4 text-right">Amount (₹)</th>
                  {isSuperAdmin && <th className="py-2.5 px-4 text-center">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E5EA]">
                {cashWithHemarajEntries.map((item, idx) => (
                  <tr key={item.id} className="hover:bg-[#F9F9FB]/60">
                    <td className="py-2.5 px-4 font-mono text-[#86868B]">{idx + 1}</td>
                    <td className="py-2.5 px-4 font-bold text-[#1D1D1F]">{item.particulars}</td>
                    <td className="py-2.5 px-4 text-[#86868B]">{item.category}</td>
                    <td className="py-2.5 px-4">
                      <span
                        className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                          item.amount >= 0 ? 'bg-[#34C759]/10 text-[#34C759]' : 'bg-[#FF3B30]/10 text-[#FF3B30]'
                        }`}
                      >
                        {item.amount >= 0 ? 'INFLOW / HOLDING' : 'OUTFLOW / ADJUSTMENT'}
                      </span>
                    </td>
                    <td className="py-2.5 px-4 text-right font-bold tabular-nums">
                      <span className={item.amount >= 0 ? 'text-[#34C759]' : 'text-[#FF3B30]'}>
                        ₹{item.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </span>
                    </td>
                    {isSuperAdmin && (
                      <td className="py-2.5 px-4 text-center">
                        <div className="flex items-center justify-center space-x-1">
                          <button
                            type="button"
                            onClick={() => setEditingEntry(item)}
                            className="p-1 rounded-md text-[#86868B] hover:text-[#007AFF] hover:bg-[#007AFF]/10"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteEntry(item.id, item.particulars || 'Cash entry')}
                            className="p-1 rounded-md text-[#86868B] hover:text-[#FF3B30] hover:bg-[#FF3B30]/10"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: HEMARAJ INDIVIDUAL RECORDS */}
      {activeTab === 'HEMARAJ_DRAWINGS' && (
        <div className="space-y-4">
          <div className="bg-[#FFFFFF] p-5 rounded-2xl border border-[#E5E5EA] shadow-2xs flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-[#1D1D1F]">Individual Hemaraj Withdrawal Records</h3>
              <p className="text-xs text-[#86868B]">
                Preserved from source spreadsheet (Columns A-C) • Total: ₹46,000.00
              </p>
            </div>
            <span className="px-3 py-1 rounded-xl text-xs font-bold bg-[#007AFF]/10 text-[#007AFF]">
              Total: ₹46,000.00
            </span>
          </div>

          <div className="bg-[#FFFFFF] rounded-2xl border border-[#E5E5EA] shadow-2xs overflow-hidden">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-[#E5E5EA] bg-[#F9F9FB] text-[#86868B] font-semibold">
                  <th className="py-2.5 px-4">Name</th>
                  <th className="py-2.5 px-4">Month / Date</th>
                  <th className="py-2.5 px-4">Description</th>
                  <th className="py-2.5 px-4 text-right">Amount (₹)</th>
                  {isSuperAdmin && <th className="py-2.5 px-4 text-center">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E5EA]">
                {hemarajDrawingsEntries.map((row) => (
                  <tr key={row.id} className="hover:bg-[#F9F9FB]/60">
                    <td className="py-2.5 px-4 font-bold text-[#1D1D1F]">{row.category || 'Hemaraj'}</td>
                    <td className="py-2.5 px-4 text-[#48484A] font-semibold">{row.entryDate || row.periodCode}</td>
                    <td className="py-2.5 px-4 text-[#86868B]">{row.particulars}</td>
                    <td className="py-2.5 px-4 text-right font-bold text-[#1D1D1F] tabular-nums">
                      ₹{row.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                    {isSuperAdmin && (
                      <td className="py-2.5 px-4 text-center">
                        <button
                          type="button"
                          onClick={() => setEditingEntry(row)}
                          className="p-1 rounded-md text-[#86868B] hover:text-[#007AFF]"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add Profit Sharing Entry Modal (Super Admin Only) */}
      {isAddModalOpen && isSuperAdmin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-[#FFFFFF] w-full max-w-lg rounded-2xl shadow-xl border border-[#E5E5EA] overflow-hidden">
            <div className="p-4 border-b border-[#E5E5EA] flex items-center justify-between bg-[#FBFBFC]">
              <h3 className="font-bold text-sm text-[#1D1D1F]">Add Dynamic Profit Sharing Entry</h3>
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
                    placeholder="2026-27"
                    required
                  />
                </div>
                <div>
                  <label className="font-medium text-[#1D1D1F] block mb-1">Financial Month / Period</label>
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
                  <label className="font-medium text-[#1D1D1F] block mb-1">Type (Inflow / Deduction)</label>
                  <select
                    value={formData.debitCredit}
                    onChange={(e) => setFormData({ ...formData, debitCredit: e.target.value })}
                    className="w-full px-3 py-1.5 border border-[#E5E5EA] rounded-xl text-xs bg-white font-medium"
                  >
                    <option value="CREDIT">CREDIT (Profit Inflow / Contribution)</option>
                    <option value="DEBIT">DEBIT (Partner Adjustment / Less Deduction)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-medium text-[#1D1D1F] block mb-1">Company / Site</label>
                  <input
                    type="text"
                    value={formData.company}
                    onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                    className="w-full px-3 py-1.5 border border-[#E5E5EA] rounded-xl text-xs"
                    placeholder="e.g. ECO Travels, EURO-Amz, SST"
                    required
                  />
                </div>
                <div>
                  <label className="font-medium text-[#1D1D1F] block mb-1">Profit Category</label>
                  <input
                    type="text"
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full px-3 py-1.5 border border-[#E5E5EA] rounded-xl text-xs"
                    placeholder="e.g. Contribution, Adjustment"
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
                  placeholder="e.g. Monthly Profit, Partner Adjustment"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-medium text-[#1D1D1F] block mb-1">Amount (₹)</label>
                  <input
                    type="number"
                    step="any"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    className="w-full px-3 py-1.5 border border-[#E5E5EA] rounded-xl text-xs font-mono font-bold"
                    placeholder="50000"
                    required
                  />
                </div>
                <div>
                  <label className="font-medium text-[#1D1D1F] block mb-1">Share Count (Default 3)</label>
                  <input
                    type="number"
                    value={formData.shareCount}
                    onChange={(e) => setFormData({ ...formData, shareCount: Number(e.target.value) })}
                    className="w-full px-3 py-1.5 border border-[#E5E5EA] rounded-xl text-xs font-mono"
                    min="1"
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
                    <option value="ALLOCATED">ALLOCATED (Bookkeeping - Zero Bank Cash Movement)</option>
                    <option value="PAID">PAID (Confirmed Bank Distribution)</option>
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
                    <option value="INTERNAL">Internal Allocation</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="font-medium text-[#1D1D1F] block mb-1">Bank Reference (UTR / Cheque)</label>
                <input
                  type="text"
                  value={formData.bankTxnReference}
                  onChange={(e) => setFormData({ ...formData, bankTxnReference: e.target.value })}
                  className="w-full px-3 py-1.5 border border-[#E5E5EA] rounded-xl text-xs"
                  placeholder="Optional reference"
                />
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
              <h3 className="font-bold text-sm text-[#1D1D1F]">Edit Profit Sharing Entry</h3>
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
                  placeholder="Required for version history & audit trail"
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
                  Save & Archive Version
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

