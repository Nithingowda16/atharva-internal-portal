'use client';

import React, { useState, useEffect, useMemo } from 'react';
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
  Receipt,
  Landmark,
  Briefcase,
  HelpCircle,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';
import CategoryManagerModal from '@/components/accounting/CategoryManagerModal';

export interface ExpenseEntry {
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

export default function ExpenseManagementView() {
  const [loading, setLoading] = useState(true);
  const [entries, setEntries] = useState<ExpenseEntry[]>([]);
  const [account, setAccount] = useState<any>(null);
  const [periods, setPeriods] = useState<any[]>([]);
  const [userRole, setUserRole] = useState<'SUPER_ADMIN' | 'VIEWER'>('SUPER_ADMIN');

  // Segmented View: 'ALL' | 'BUSINESS' | 'DRAWINGS' | 'INVESTMENTS'
  const [activeTab, setActiveTab] = useState<'ALL' | 'BUSINESS' | 'DRAWINGS' | 'INVESTMENTS'>('ALL');

  // Dynamic Filters
  const [search, setSearch] = useState('');
  const [selectedYear, setSelectedYear] = useState('ALL');
  const [selectedMonth, setSelectedMonth] = useState('ALL');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [selectedClassification, setSelectedClassification] = useState('ALL');
  const [selectedStatus, setSelectedStatus] = useState('ALL');

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isCatModalOpen, setIsCatModalOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<ExpenseEntry | null>(null);
  const [editReason, setEditReason] = useState('');
  const [isEditSubmitting, setIsEditSubmitting] = useState(false);

  // Version History Drawer
  const [versionDrawerEntry, setVersionDrawerEntry] = useState<ExpenseEntry | null>(null);
  const [isReverting, setIsReverting] = useState(false);

  // Add Entry Form state
  const [formData, setFormData] = useState({
    financialYear: '2026-27',
    financialMonth: 'Nov-26',
    entryDate: '10-11-2026',
    section: 'RENT',
    category: 'Rent',
    accountingClassification: 'Business Operating Expense',
    particulars: 'Rent',
    amount: '8000',
    comments: 'Rent',
    remarks: '',
    paymentStatus: 'PAID',
    paymentMode: 'BANK_TRANSFER',
    bankReference: '',
    vendor: '',
  });

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/bank/expense');
      const data = await res.json();
      if (data.success) {
        setEntries(data.entries || []);
        setAccount(data.account || null);
        setPeriods(data.periods || []);
      }

      // Check user role
      const meRes = await fetch('/api/auth/me');
      if (meRes.ok) {
        const meData = await meRes.json();
        if (meData.user?.role === 'SUPER_ADMIN') setUserRole('SUPER_ADMIN');
        else setUserRole('VIEWER');
      } else {
        const usersRes = await fetch('/api/users');
        if (usersRes.status === 403) setUserRole('VIEWER');
        else setUserRole('SUPER_ADMIN');
      }
    } catch (e) {
      console.error('Failed to fetch expense records:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const isSuperAdmin = userRole === 'SUPER_ADMIN';

  // Helper to extract accounting classification & metadata
  const getEntryMeta = (e: ExpenseEntry) => {
    let metaObj: any = {};
    if (e.meta) {
      try {
        metaObj = JSON.parse(e.meta);
      } catch (_) {}
    }

    let classification = metaObj.accountingClassification;
    if (!classification) {
      const p = (e.particulars || '').toLowerCase();
      const sec = e.section || '';
      const c = (e.comments || '').toLowerCase();

      if (sec === 'PERSONAL_DRAWINGS' || p.includes('personal') || p.includes('profit taken') || c.includes('drawing')) {
        classification = p.includes('profit') ? 'Owner Withdrawal' : 'Personal Drawing';
      } else if (sec === 'EXPENSE_INVESTMENT' || p.includes('eco-br') || p.includes('it return') || c.includes('invest')) {
        classification = 'Expense Investment';
      } else if (sec === 'TAXES' || p.includes('tax')) {
        classification = 'Tax Payment';
      } else if (sec === 'BANK_CHARGES' || p.includes('sms') || p.includes('cheque')) {
        classification = 'Bank Charge';
      } else if (p.includes('domin') || c.includes('adjustment')) {
        classification = 'Non-Cash Adjustment';
      } else {
        classification = 'Business Operating Expense';
      }
    }

    const year = metaObj.financialYear || (e.periodCode?.includes('24') ? '2024-25' : e.periodCode?.includes('25') ? '2025-26' : '2026-27');
    const paymentStatus = metaObj.paymentStatus || (e.paidAmount && e.paidAmount > 0 ? 'PAID' : 'PAID');

    return {
      classification,
      year,
      paymentStatus,
      transactionId: metaObj.transactionId || e.id,
      vendor: metaObj.vendor || e.sourceReference || '',
    };
  };

  // 2026/Visible dataset calculations
  const calculations = useMemo(() => {
    let grossPositive = 0;
    let grossNegative = 0;
    let netTotal = 0;

    let businessTotal = 0;
    let drawingsTotal = 0;
    let investmentsTotal = 0;

    let rentTotal = 0;
    let caTotal = 0;
    let officeTotal = 0;
    let donationTotal = 0;
    let bankChargesTotal = 0;
    let taxTotal = 0;
    let otherTotal = 0;

    let paidTotal = 0;
    let pendingTotal = 0;

    for (const e of entries) {
      const meta = getEntryMeta(e);
      const amt = e.amount;

      if (amt >= 0) grossPositive += amt;
      else grossNegative += amt;
      netTotal += amt;

      if (meta.paymentStatus === 'PAID') paidTotal += amt;
      else pendingTotal += amt;

      const p = (e.particulars || '').toLowerCase();
      const sec = e.section || '';
      const c = (e.comments || '').toLowerCase();

      if (meta.classification === 'Personal Drawing' || meta.classification === 'Owner Withdrawal') {
        drawingsTotal += amt;
      } else if (meta.classification === 'Expense Investment' || amt < 0) {
        investmentsTotal += amt;
      } else {
        // Business operating expense
        businessTotal += amt;
        if (sec === 'RENT' || p.includes('rent')) rentTotal += amt;
        else if (sec === 'PROFESSIONAL_FEES' || p.includes('ca fee')) caTotal += amt;
        else if (sec === 'OFFICE_EXPENSE' || p.includes('printer') || p.includes('table') || p.includes('website')) officeTotal += amt;
        else if (sec === 'DONATIONS' || p.includes('swamy') || p.includes('reddy')) donationTotal += amt;
        else if (sec === 'BANK_CHARGES' || p.includes('sms') || p.includes('cheque')) bankChargesTotal += amt;
        else if (sec === 'TAXES' || p.includes('pt tax')) taxTotal += amt;
        else otherTotal += amt;
      }
    }

    return {
      grossPositive,
      grossNegative,
      netTotal,
      businessTotal,
      drawingsTotal,
      investmentsTotal,
      rentTotal,
      caTotal,
      officeTotal,
      donationTotal,
      bankChargesTotal,
      taxTotal,
      otherTotal,
      paidTotal,
      pendingTotal,
    };
  }, [entries]);

  // Unique filter lists
  const availableYears = useMemo(() => {
    const set = new Set<string>();
    entries.forEach((e) => set.add(getEntryMeta(e).year));
    return Array.from(set).sort();
  }, [entries]);

  const availableMonths = useMemo(() => {
    const set = new Set<string>();
    entries.forEach((e) => {
      if (e.periodCode) set.add(e.periodCode);
    });
    return Array.from(set);
  }, [entries]);

  const availableCategories = useMemo(() => {
    const set = new Set<string>();
    entries.forEach((e) => {
      if (e.category) set.add(e.category);
    });
    return Array.from(set).sort();
  }, [entries]);

  const availableClassifications = useMemo(() => {
    const set = new Set<string>();
    entries.forEach((e) => set.add(getEntryMeta(e).classification));
    return Array.from(set).sort();
  }, [entries]);

  // Filtered rows
  const filteredEntries = useMemo(() => {
    return entries.filter((e) => {
      const meta = getEntryMeta(e);

      // Segmented Tab Filter
      if (activeTab === 'BUSINESS') {
        if (meta.classification === 'Personal Drawing' || meta.classification === 'Owner Withdrawal' || meta.classification === 'Expense Investment' || e.amount < 0) {
          return false;
        }
      } else if (activeTab === 'DRAWINGS') {
        if (meta.classification !== 'Personal Drawing' && meta.classification !== 'Owner Withdrawal') {
          return false;
        }
      } else if (activeTab === 'INVESTMENTS') {
        if (meta.classification !== 'Expense Investment' && e.amount >= 0) {
          return false;
        }
      }

      // Dropdown Filters
      if (selectedYear !== 'ALL' && meta.year !== selectedYear) return false;
      if (selectedMonth !== 'ALL' && e.periodCode !== selectedMonth) return false;
      if (selectedCategory !== 'ALL' && e.category !== selectedCategory) return false;
      if (selectedClassification !== 'ALL' && meta.classification !== selectedClassification) return false;
      if (selectedStatus !== 'ALL' && meta.paymentStatus !== selectedStatus) return false;

      // Text Search
      if (search) {
        const q = search.toLowerCase();
        const pMatch = e.particulars?.toLowerCase().includes(q);
        const cMatch = e.category?.toLowerCase().includes(q);
        const commMatch = e.comments?.toLowerCase().includes(q);
        const dMatch = e.entryDate?.toLowerCase().includes(q);
        const mMatch = e.periodCode?.toLowerCase().includes(q);
        const txnMatch = meta.transactionId?.toLowerCase().includes(q);
        const classMatch = meta.classification?.toLowerCase().includes(q);
        if (!pMatch && !cMatch && !commMatch && !dMatch && !mMatch && !txnMatch && !classMatch) {
          return false;
        }
      }

      return true;
    });
  }, [entries, activeTab, selectedYear, selectedMonth, selectedCategory, selectedClassification, selectedStatus, search]);

  // Clear filters
  const handleClearFilters = () => {
    setSearch('');
    setSelectedYear('ALL');
    setSelectedMonth('ALL');
    setSelectedCategory('ALL');
    setSelectedClassification('ALL');
    setSelectedStatus('ALL');
  };

  // CSV Export
  const handleExportCSV = () => {
    const headers = [
      'Transaction ID',
      'Financial Year',
      'Financial Month',
      'Date / Paid Date',
      'Particulars',
      'Expense Category',
      'Accounting Classification',
      'Amount (INR)',
      'Net Amount (INR)',
      'Payment Status',
      'Comments',
    ];

    const rows = filteredEntries.map((e) => {
      const meta = getEntryMeta(e);
      return [
        `"${meta.transactionId}"`,
        `"${meta.year}"`,
        `"${e.periodCode || ''}"`,
        `"${e.entryDate || ''}"`,
        `"${e.particulars || ''}"`,
        `"${e.category || ''}"`,
        `"${meta.classification}"`,
        e.amount,
        e.netAmount !== null && e.netAmount !== undefined ? e.netAmount : e.amount,
        `"${meta.paymentStatus}"`,
        `"${e.comments || ''}"`,
      ].join(',');
    });

    const csvContent = '\uFEFF' + [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Atharva_Expense_Ledger_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Add Expense Entry
  const handleCreateEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isSuperAdmin) return;

    try {
      const amt = Number(formData.amount);
      const metaObj = {
        transactionId: `EXP-${Date.now()}`,
        financialYear: formData.financialYear,
        financialMonth: formData.financialMonth,
        expenseCategory: formData.category,
        accountingClassification: formData.accountingClassification,
        debitCredit: amt < 0 ? 'CREDIT' : 'DEBIT',
        paymentStatus: formData.paymentStatus,
        paymentMode: formData.paymentMode,
        bankReference: formData.bankReference || null,
        vendor: formData.vendor || null,
        comments: formData.comments,
        isPostedToBank: formData.paymentStatus === 'PAID',
      };

      const res = await fetch('/api/bank/expense', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          periodCode: formData.financialMonth,
          entryDate: formData.entryDate,
          section: formData.section,
          category: formData.category,
          particulars: formData.particulars,
          sourceReference: formData.vendor || formData.comments || null,
          amount: amt,
          paidAmount: formData.paymentStatus === 'PAID' ? amt : 0,
          receivedAmount: 0,
          netAmount: amt,
          formulaString: amt < 0 ? String(amt) : null,
          comments: formData.comments,
          remarks: formData.remarks,
          meta: metaObj,
          paymentStatus: formData.paymentStatus,
          paymentMode: formData.paymentMode,
          bankTxnReference: formData.bankReference,
          changeReason: `Added new ${formData.category}: ${formData.particulars} (₹${amt})`,
        }),
      });

      if (res.ok) {
        setIsAddModalOpen(false);
        setFormData({
          financialYear: '2026-27',
          financialMonth: 'Nov-26',
          entryDate: '10-11-2026',
          section: 'RENT',
          category: 'Rent',
          accountingClassification: 'Business Operating Expense',
          particulars: 'Rent',
          amount: '8000',
          comments: 'Rent',
          remarks: '',
          paymentStatus: 'PAID',
          paymentMode: 'BANK_TRANSFER',
          bankReference: '',
          vendor: '',
        });
        fetchData();
      } else {
        const err = await res.json();
        alert(err.error || 'Failed to add expense entry');
      }
    } catch (err) {
      console.error('Error adding expense:', err);
      alert('An unexpected error occurred.');
    }
  };

  // Edit Expense Entry
  const handleUpdateEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isSuperAdmin || !editingEntry) return;

    if (!editReason.trim()) {
      alert('A modification reason is required for financial audit tracking.');
      return;
    }

    try {
      setIsEditSubmitting(true);
      const res = await fetch('/api/bank/expense', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingEntry.id,
          particulars: editingEntry.particulars,
          entryDate: editingEntry.entryDate,
          periodCode: editingEntry.periodCode,
          section: editingEntry.section,
          category: editingEntry.category,
          amount: editingEntry.amount,
          netAmount: editingEntry.netAmount !== undefined ? editingEntry.netAmount : editingEntry.amount,
          formulaString: editingEntry.formulaString,
          comments: editingEntry.comments,
          remarks: editingEntry.remarks,
          changeReason: editReason.trim(),
        }),
      });

      if (res.ok) {
        setEditingEntry(null);
        setEditReason('');
        fetchData();
      } else {
        const err = await res.json();
        alert(err.error || 'Failed to update entry');
      }
    } catch (err) {
      console.error('Error updating entry:', err);
    } finally {
      setIsEditSubmitting(false);
    }
  };

  // Delete Expense Entry
  const handleDeleteEntry = async (id: string, label: string) => {
    if (!isSuperAdmin) return;
    if (!confirm(`Are you sure you want to delete "${label}"? It will be safely moved to the Recycle Bin.`)) return;

    try {
      const res = await fetch(`/api/bank/expense?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        fetchData();
      } else {
        const err = await res.json();
        alert(err.error || 'Failed to delete entry');
      }
    } catch (err) {
      console.error('Error deleting entry:', err);
    }
  };

  // 1-Click Revert Version
  const handleRevertVersion = async (entryId: string, versionNumber: number) => {
    if (!isSuperAdmin) return;
    if (!confirm(`Revert this expense record to Version ${versionNumber}? A new audit snapshot will be recorded.`)) return;

    try {
      setIsReverting(true);
      const res = await fetch(`/api/bank/expense/${entryId}/revert`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ versionNumber }),
      });

      if (res.ok) {
        setVersionDrawerEntry(null);
        fetchData();
      } else {
        const err = await res.json();
        alert(err.error || 'Failed to revert version');
      }
    } catch (err) {
      console.error('Error reverting version:', err);
    } finally {
      setIsReverting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Account Header Card */}
      <div className="bg-[#FFFFFF] p-6 rounded-2xl border border-[#E5E5EA] shadow-2xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-3">
              <div className="p-2.5 rounded-xl bg-[#007AFF]/10 text-[#007AFF]">
                <Receipt className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <h1 className="text-xl font-bold text-[#1D1D1F] tracking-tight">Expense Management</h1>
                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[#007AFF]/10 text-[#007AFF] border border-[#007AFF]/20">
                    Supporting Account
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[#34C759]/10 text-[#34C759] border border-[#34C759]/20">
                    RENT & OTHER EXP - 2026
                  </span>
                </div>
                <p className="text-xs text-[#86868B] mt-1">
                  Operating expenses, monthly rent, professional CA charges, personal drawings, donations, and expense investments.
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={fetchData}
              disabled={loading}
              className="inline-flex items-center px-3 py-1.5 text-xs font-semibold text-[#1D1D1F] bg-[#F2F2F7] hover:bg-[#E5E5EA] rounded-xl transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
            <button
              type="button"
              onClick={handleExportCSV}
              className="inline-flex items-center px-3 py-1.5 text-xs font-semibold text-[#1D1D1F] bg-[#F2F2F7] hover:bg-[#E5E5EA] rounded-xl transition-colors"
            >
              <Download className="w-3.5 h-3.5 mr-1.5 text-[#86868B]" />
              Export CSV
            </button>
            {isSuperAdmin && (
              <>
                <button
                  type="button"
                  onClick={() => setIsCatModalOpen(true)}
                  className="inline-flex items-center px-3 py-1.5 text-xs font-semibold text-[#007AFF] bg-[#007AFF]/10 hover:bg-[#007AFF]/20 rounded-xl transition-colors"
                >
                  <Tag className="w-3.5 h-3.5 mr-1.5" />
                  Categories
                </button>
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(true)}
                  className="inline-flex items-center px-3.5 py-1.5 bg-[#007AFF] text-white text-xs font-semibold rounded-xl hover:bg-[#007AFF]/90 shadow-2xs transition-colors"
                >
                  <Plus className="w-3.5 h-3.5 mr-1.5" />
                  Add Expense Entry
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* 12 Summary KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3.5">
        {/* Card 1: Total Net Expenses */}
        <div className="bg-[#FFFFFF] p-4 rounded-2xl border border-[#E5E5EA] shadow-2xs">
          <div className="flex items-center justify-between text-[#86868B] mb-1">
            <span className="text-[11px] font-medium">Net Expense Total</span>
            <Wallet className="w-3.5 h-3.5 text-[#007AFF]" />
          </div>
          <div className="text-lg font-bold text-[#FF3B30] tabular-nums">
            ₹{calculations.netTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
          <span className="text-[10px] text-[#86868B] block mt-0.5">
            Debits less Credit Adjustments
          </span>
        </div>

        {/* Card 2: Actual Business Operating Expenses */}
        <div className="bg-emerald-50/40 p-4 rounded-2xl border border-emerald-200/60 shadow-2xs">
          <div className="flex items-center justify-between text-emerald-700 mb-1">
            <span className="text-[11px] font-semibold">Business Operating</span>
            <Briefcase className="w-3.5 h-3.5 text-emerald-600" />
          </div>
          <div className="text-lg font-bold text-emerald-700 tabular-nums">
            ₹{calculations.businessTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
          <span className="text-[10px] text-emerald-600 block mt-0.5 font-medium">
            Rent, CA, Office, Taxes, Bank
          </span>
        </div>

        {/* Card 3: Personal Drawings / Profit Taken */}
        <div className="bg-purple-50/40 p-4 rounded-2xl border border-purple-200/60 shadow-2xs">
          <div className="flex items-center justify-between text-purple-700 mb-1">
            <span className="text-[11px] font-semibold">Personal Drawings</span>
            <Users className="w-3.5 h-3.5 text-purple-600" />
          </div>
          <div className="text-lg font-bold text-purple-700 tabular-nums">
            ₹{calculations.drawingsTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
          <span className="text-[10px] text-purple-600 block mt-0.5 font-medium">
            Drawing A/c & Profit Taken
          </span>
        </div>

        {/* Card 4: Expense Investments & Adjustments */}
        <div className="bg-amber-50/40 p-4 rounded-2xl border border-amber-200/60 shadow-2xs">
          <div className="flex items-center justify-between text-amber-700 mb-1">
            <span className="text-[11px] font-semibold">Investments (Credits)</span>
            <TrendingUp className="w-3.5 h-3.5 text-amber-600" />
          </div>
          <div className="text-lg font-bold text-amber-700 tabular-nums">
            ₹{calculations.investmentsTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
          <span className="text-[10px] text-amber-600 block mt-0.5 font-medium">
            ECO-BR & IT Return Inflows
          </span>
        </div>

        {/* Card 5: Rent Total */}
        <div className="bg-[#FFFFFF] p-4 rounded-2xl border border-[#E5E5EA] shadow-2xs">
          <div className="flex items-center justify-between text-[#86868B] mb-1">
            <span className="text-[11px] font-medium">Rent Payments</span>
            <Building2 className="w-3.5 h-3.5 text-[#007AFF]" />
          </div>
          <div className="text-lg font-bold text-[#1D1D1F] tabular-nums">
            ₹{calculations.rentTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
          <span className="text-[10px] text-[#86868B] block mt-0.5">
            13 Monthly Rent records
          </span>
        </div>

        {/* Card 6: CA Fees */}
        <div className="bg-[#FFFFFF] p-4 rounded-2xl border border-[#E5E5EA] shadow-2xs">
          <div className="flex items-center justify-between text-[#86868B] mb-1">
            <span className="text-[11px] font-medium">CA Fees</span>
            <Receipt className="w-3.5 h-3.5 text-[#5856D6]" />
          </div>
          <div className="text-lg font-bold text-[#1D1D1F] tabular-nums">
            ₹{calculations.caTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
          <span className="text-[10px] text-[#86868B] block mt-0.5">
            Includes both Oct ₹1,250 fees
          </span>
        </div>

        {/* Card 7: Office & Website */}
        <div className="bg-[#FFFFFF] p-4 rounded-2xl border border-[#E5E5EA] shadow-2xs">
          <div className="flex items-center justify-between text-[#86868B] mb-1">
            <span className="text-[11px] font-medium">Office & Website</span>
            <CreditCard className="w-3.5 h-3.5 text-[#34C759]" />
          </div>
          <div className="text-lg font-bold text-[#1D1D1F] tabular-nums">
            ₹{calculations.officeTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
          <span className="text-[10px] text-[#86868B] block mt-0.5">
            Printer, Table, Website
          </span>
        </div>

        {/* Card 8: Donations */}
        <div className="bg-[#FFFFFF] p-4 rounded-2xl border border-[#E5E5EA] shadow-2xs">
          <div className="flex items-center justify-between text-[#86868B] mb-1">
            <span className="text-[11px] font-medium">Donations</span>
            <HelpCircle className="w-3.5 h-3.5 text-[#FF9500]" />
          </div>
          <div className="text-lg font-bold text-[#1D1D1F] tabular-nums">
            ₹{calculations.donationTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
          <span className="text-[10px] text-[#86868B] block mt-0.5">
            Swamy & Reddy
          </span>
        </div>

        {/* Card 9: Bank Charges */}
        <div className="bg-[#FFFFFF] p-4 rounded-2xl border border-[#E5E5EA] shadow-2xs">
          <div className="flex items-center justify-between text-[#86868B] mb-1">
            <span className="text-[11px] font-medium">Bank Charges</span>
            <Landmark className="w-3.5 h-3.5 text-[#86868B]" />
          </div>
          <div className="text-lg font-bold text-[#1D1D1F] tabular-nums">
            ₹{calculations.bankChargesTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
          <span className="text-[10px] text-[#86868B] block mt-0.5">
            SMS & Cheque Charges
          </span>
        </div>

        {/* Card 10: Taxes */}
        <div className="bg-[#FFFFFF] p-4 rounded-2xl border border-[#E5E5EA] shadow-2xs">
          <div className="flex items-center justify-between text-[#86868B] mb-1">
            <span className="text-[11px] font-medium">Taxes (PT Tax)</span>
            <Tag className="w-3.5 h-3.5 text-[#AF52DE]" />
          </div>
          <div className="text-lg font-bold text-[#1D1D1F] tabular-nums">
            ₹{calculations.taxTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
          <span className="text-[10px] text-[#86868B] block mt-0.5">
            Professional Tax
          </span>
        </div>

        {/* Card 11: Paid Outflows */}
        <div className="bg-[#FFFFFF] p-4 rounded-2xl border border-[#E5E5EA] shadow-2xs">
          <div className="flex items-center justify-between text-[#86868B] mb-1">
            <span className="text-[11px] font-medium">Paid Disbursed</span>
            <CheckCircle2 className="w-3.5 h-3.5 text-[#34C759]" />
          </div>
          <div className="text-lg font-bold text-[#34C759] tabular-nums">
            ₹{calculations.paidTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
          <span className="text-[10px] text-[#34C759] block mt-0.5 font-medium">
            Bank Disbursed Outflow
          </span>
        </div>

        {/* Card 12: Pending Obligations */}
        <div className="bg-[#FFFFFF] p-4 rounded-2xl border border-[#E5E5EA] shadow-2xs">
          <div className="flex items-center justify-between text-[#86868B] mb-1">
            <span className="text-[11px] font-medium">Pending Liabilities</span>
            <AlertCircle className="w-3.5 h-3.5 text-[#FF9500]" />
          </div>
          <div className="text-lg font-bold text-[#FF9500] tabular-nums">
            ₹{calculations.pendingTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
          <span className="text-[10px] text-[#FF9500] block mt-0.5 font-medium">
            Zero Bank Cash Impact
          </span>
        </div>
      </div>

      {/* Segmented View Tabs */}
      <div className="flex border-b border-[#E5E5EA] space-x-6 text-xs font-semibold">
        <button
          type="button"
          onClick={() => setActiveTab('ALL')}
          className={`pb-3 transition-colors relative ${
            activeTab === 'ALL' ? 'text-[#007AFF]' : 'text-[#86868B] hover:text-[#1D1D1F]'
          }`}
        >
          All Transactions ({entries.length})
          {activeTab === 'ALL' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#007AFF] rounded-full" />}
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('BUSINESS')}
          className={`pb-3 transition-colors relative flex items-center space-x-1.5 ${
            activeTab === 'BUSINESS' ? 'text-emerald-700' : 'text-[#86868B] hover:text-[#1D1D1F]'
          }`}
        >
          <span>Business Operating Expenses</span>
          <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-emerald-100 text-emerald-800 font-bold">
            ₹{calculations.businessTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </span>
          {activeTab === 'BUSINESS' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-600 rounded-full" />}
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('DRAWINGS')}
          className={`pb-3 transition-colors relative flex items-center space-x-1.5 ${
            activeTab === 'DRAWINGS' ? 'text-purple-700' : 'text-[#86868B] hover:text-[#1D1D1F]'
          }`}
        >
          <span>Personal Drawings & Equity</span>
          <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-purple-100 text-purple-800 font-bold">
            ₹{calculations.drawingsTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </span>
          {activeTab === 'DRAWINGS' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-purple-600 rounded-full" />}
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('INVESTMENTS')}
          className={`pb-3 transition-colors relative flex items-center space-x-1.5 ${
            activeTab === 'INVESTMENTS' ? 'text-amber-700' : 'text-[#86868B] hover:text-[#1D1D1F]'
          }`}
        >
          <span>Expense Investments & Adjustments</span>
          <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-amber-100 text-amber-800 font-bold">
            ₹{calculations.investmentsTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </span>
          {activeTab === 'INVESTMENTS' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-amber-600 rounded-full" />}
        </button>
      </div>

      {/* Multi-Dimensional Filter Toolbar */}
      <div className="bg-[#FFFFFF] p-3.5 rounded-2xl border border-[#E5E5EA] shadow-2xs flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-2">
          {/* Search */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-[#86868B] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search expenses, particulars, notes..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 pr-3 py-1.5 bg-[#F9F9FB] border border-[#E5E5EA] rounded-xl text-[#1D1D1F] focus:outline-hidden focus:border-[#007AFF] w-48 sm:w-56"
            />
          </div>

          {/* Year Filter */}
          <div className="flex items-center space-x-1 bg-[#F9F9FB] border border-[#E5E5EA] rounded-xl px-2.5 py-1">
            <span className="text-[11px] text-[#86868B] font-medium">Year:</span>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              className="bg-transparent font-medium text-[#1D1D1F] focus:outline-hidden text-xs cursor-pointer"
            >
              <option value="ALL">All Years</option>
              {availableYears.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </div>

          {/* Month Filter */}
          <div className="flex items-center space-x-1 bg-[#F9F9FB] border border-[#E5E5EA] rounded-xl px-2.5 py-1">
            <span className="text-[11px] text-[#86868B] font-medium">Month:</span>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="bg-transparent font-medium text-[#1D1D1F] focus:outline-hidden text-xs cursor-pointer"
            >
              <option value="ALL">All Months</option>
              {availableMonths.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </div>

          {/* Category Filter */}
          <div className="flex items-center space-x-1 bg-[#F9F9FB] border border-[#E5E5EA] rounded-xl px-2.5 py-1">
            <span className="text-[11px] text-[#86868B] font-medium">Category:</span>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="bg-transparent font-medium text-[#1D1D1F] focus:outline-hidden text-xs cursor-pointer"
            >
              <option value="ALL">All Categories</option>
              {availableCategories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          {/* Classification Filter */}
          <div className="flex items-center space-x-1 bg-[#F9F9FB] border border-[#E5E5EA] rounded-xl px-2.5 py-1">
            <span className="text-[11px] text-[#86868B] font-medium">Class:</span>
            <select
              value={selectedClassification}
              onChange={(e) => setSelectedClassification(e.target.value)}
              className="bg-transparent font-medium text-[#1D1D1F] focus:outline-hidden text-xs cursor-pointer"
            >
              <option value="ALL">All Classes</option>
              {availableClassifications.map((cl) => (
                <option key={cl} value={cl}>
                  {cl}
                </option>
              ))}
            </select>
          </div>

          {/* Clear Filters */}
          {(search || selectedYear !== 'ALL' || selectedMonth !== 'ALL' || selectedCategory !== 'ALL' || selectedClassification !== 'ALL') && (
            <button
              type="button"
              onClick={handleClearFilters}
              className="px-2.5 py-1 text-xs text-[#007AFF] hover:bg-[#007AFF]/10 rounded-lg transition-colors font-semibold"
            >
              Clear Filters
            </button>
          )}
        </div>

        <div className="text-[11px] text-[#86868B]">
          Showing <span className="font-bold text-[#1D1D1F]">{filteredEntries.length}</span> of {entries.length} entries
        </div>
      </div>

      {/* Main Expense Data Table */}
      <div className="bg-[#FFFFFF] rounded-2xl border border-[#E5E5EA] shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-[#E5E5EA] bg-[#F9F9FB] text-[#86868B] font-semibold">
                <th className="py-2.5 px-4">Period</th>
                <th className="py-2.5 px-4">Paid Date</th>
                <th className="py-2.5 px-4">Particulars & Description</th>
                <th className="py-2.5 px-4">Category</th>
                <th className="py-2.5 px-4">Accounting Classification</th>
                <th className="py-2.5 px-4 text-right">Amount (₹)</th>
                <th className="py-2.5 px-4 text-right">Net (₹)</th>
                <th className="py-2.5 px-4">Comments / Source</th>
                <th className="py-2.5 px-4 text-center">Status</th>
                {isSuperAdmin && <th className="py-2.5 px-4 text-center">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E5EA]">
              {loading ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-[#86868B]">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-[#007AFF]" />
                    Loading Expense account records...
                  </td>
                </tr>
              ) : filteredEntries.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-[#86868B]">
                    No expense records match your search criteria.
                  </td>
                </tr>
              ) : (
                filteredEntries.map((row) => {
                  const meta = getEntryMeta(row);
                  const isDrawing = meta.classification === 'Personal Drawing' || meta.classification === 'Owner Withdrawal';
                  const isInvest = meta.classification === 'Expense Investment' || row.amount < 0;

                  return (
                    <tr
                      key={row.id}
                      className={`hover:bg-[#F9F9FB]/70 transition-colors ${
                        isDrawing ? 'bg-purple-50/15' : isInvest ? 'bg-amber-50/15' : ''
                      }`}
                    >
                      {/* Period */}
                      <td className="py-2.5 px-4 font-medium text-[#1D1D1F] whitespace-nowrap">
                        {row.periodCode || '-'}
                      </td>

                      {/* Paid Date */}
                      <td className="py-2.5 px-4 text-[#86868B] whitespace-nowrap font-medium">
                        {row.entryDate || '-'}
                      </td>

                      {/* Particulars */}
                      <td className="py-2.5 px-4 font-medium text-[#1D1D1F]">
                        <div>{row.particulars}</div>
                        {meta.vendor && (
                          <span className="block text-[10px] text-[#007AFF] font-medium">
                            Party: {meta.vendor}
                          </span>
                        )}
                      </td>

                      {/* Category */}
                      <td className="py-2.5 px-4 whitespace-nowrap">
                        <span className="inline-block px-2 py-0.5 rounded-md text-[10px] font-semibold bg-[#F2F2F7] text-[#48484A]">
                          {row.category || 'General'}
                        </span>
                      </td>

                      {/* Accounting Classification Badge */}
                      <td className="py-2.5 px-4 whitespace-nowrap">
                        {isDrawing ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-purple-100 text-purple-700 border border-purple-200">
                            {meta.classification}
                          </span>
                        ) : isInvest ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-100 text-amber-700 border border-amber-200">
                            {meta.classification}
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-700 border border-emerald-200">
                            {meta.classification}
                          </span>
                        )}
                      </td>

                      {/* Amount */}
                      <td
                        className={`py-2.5 px-4 text-right font-bold tabular-nums whitespace-nowrap ${
                          row.amount < 0 ? 'text-[#34C759]' : 'text-[#FF3B30]'
                        }`}
                      >
                        {row.amount < 0 ? `-₹${Math.abs(row.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : `₹${row.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`}
                      </td>

                      {/* Net Amount */}
                      <td
                        className={`py-2.5 px-4 text-right font-bold tabular-nums whitespace-nowrap ${
                          (row.netAmount !== null && row.netAmount !== undefined ? row.netAmount : row.amount) < 0
                            ? 'text-[#34C759]'
                            : 'text-[#FF3B30]'
                        }`}
                      >
                        ₹{Number(row.netAmount !== null && row.netAmount !== undefined ? row.netAmount : row.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>

                      {/* Comments / Source */}
                      <td className="py-2.5 px-4 text-[#86868B] text-[11px] truncate max-w-xs">
                        {row.comments || row.remarks || '-'}
                      </td>

                      {/* Status */}
                      <td className="py-2.5 px-4 text-center whitespace-nowrap">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-medium bg-[#34C759]/10 text-[#34C759]">
                          <CheckCircle2 className="w-3 h-3 mr-1" />
                          {meta.paymentStatus || 'PAID'}
                        </span>
                      </td>

                      {/* Actions (Super Admin Only) */}
                      {isSuperAdmin && (
                        <td className="py-2.5 px-4 text-center whitespace-nowrap">
                          <div className="flex items-center justify-center space-x-1.5">
                            <button
                              type="button"
                              onClick={() => setVersionDrawerEntry(row)}
                              className="p-1 rounded-md text-[#86868B] hover:text-[#007AFF] hover:bg-[#007AFF]/10 transition-colors"
                              title="Version History & Revert"
                            >
                              <History className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setEditingEntry(row);
                                setEditReason('');
                              }}
                              className="p-1 rounded-md text-[#86868B] hover:text-[#007AFF] hover:bg-[#007AFF]/10 transition-colors"
                              title="Edit Entry"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteEntry(row.id, row.particulars || 'Entry')}
                              className="p-1 rounded-md text-[#86868B] hover:text-[#FF3B30] hover:bg-[#FF3B30]/10 transition-colors"
                              title="Delete to Recycle Bin"
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
            {/* Table Summary Footer */}
            {filteredEntries.length > 0 && (
              <tfoot>
                <tr className="border-t-2 border-[#E5E5EA] bg-[#F9F9FB] font-bold text-xs text-[#1D1D1F]">
                  <td colSpan={5} className="py-3 px-4 text-right">
                    Filtered Subset Total:
                  </td>
                  <td className="py-3 px-4 text-right tabular-nums text-[#FF3B30]">
                    ₹{filteredEntries.reduce((s, e) => s + e.amount, 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="py-3 px-4 text-right tabular-nums text-[#FF3B30]">
                    ₹{filteredEntries.reduce((s, e) => s + (e.netAmount !== null && e.netAmount !== undefined ? e.netAmount : e.amount), 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </td>
                  <td colSpan={isSuperAdmin ? 3 : 2} className="py-3 px-4 text-[#86868B] text-[11px] font-normal">
                    {activeTab === 'BUSINESS' ? 'Total Business Operating Outflows' : activeTab === 'DRAWINGS' ? 'Total Personal Drawings' : 'Reconciled with Central Ledger'}
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      {/* Add Expense Entry Modal (Super Admin Only) */}
      {isAddModalOpen && isSuperAdmin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-[#FFFFFF] w-full max-w-lg rounded-2xl shadow-xl border border-[#E5E5EA] overflow-hidden">
            <div className="p-4 border-b border-[#E5E5EA] flex items-center justify-between bg-[#FBFBFC]">
              <div className="flex items-center space-x-2">
                <Plus className="w-4 h-4 text-[#007AFF]" />
                <h3 className="font-bold text-sm text-[#1D1D1F]">Add Financial Expense Entry</h3>
              </div>
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
                  <label className="font-medium text-[#1D1D1F] block mb-1">Financial Year</label>
                  <input
                    type="text"
                    value={formData.financialYear}
                    onChange={(e) => setFormData({ ...formData, financialYear: e.target.value })}
                    className="w-full px-3 py-1.5 border border-[#E5E5EA] rounded-xl text-xs bg-white"
                    placeholder="2026-27"
                    required
                  />
                </div>
                <div>
                  <label className="font-medium text-[#1D1D1F] block mb-1">Financial Month</label>
                  <input
                    type="text"
                    value={formData.financialMonth}
                    onChange={(e) => setFormData({ ...formData, financialMonth: e.target.value })}
                    className="w-full px-3 py-1.5 border border-[#E5E5EA] rounded-xl text-xs bg-white"
                    placeholder="e.g. Nov-26, Dec-26"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-medium text-[#1D1D1F] block mb-1">Expense Date / Label</label>
                  <input
                    type="text"
                    value={formData.entryDate}
                    onChange={(e) => setFormData({ ...formData, entryDate: e.target.value })}
                    className="w-full px-3 py-1.5 border border-[#E5E5EA] rounded-xl text-xs bg-white"
                    placeholder="e.g. 10-11-2026 or Adjustment"
                    required
                  />
                </div>
                <div>
                  <label className="font-medium text-[#1D1D1F] block mb-1">Amount (₹) (Negative for credits)</label>
                  <input
                    type="number"
                    step="any"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    className="w-full px-3 py-1.5 border border-[#E5E5EA] rounded-xl text-xs bg-white font-bold"
                    placeholder="8000"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-medium text-[#1D1D1F] block mb-1">Expense Category</label>
                  <input
                    type="text"
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full px-3 py-1.5 border border-[#E5E5EA] rounded-xl text-xs bg-white"
                    placeholder="e.g. Rent, CA Fees, Office"
                    required
                  />
                </div>
                <div>
                  <label className="font-medium text-[#1D1D1F] block mb-1">Accounting Classification</label>
                  <select
                    value={formData.accountingClassification}
                    onChange={(e) => setFormData({ ...formData, accountingClassification: e.target.value })}
                    className="w-full px-3 py-1.5 border border-[#E5E5EA] rounded-xl text-xs bg-white font-medium"
                  >
                    <option value="Business Operating Expense">Business Operating Expense</option>
                    <option value="Personal Drawing">Personal Drawing</option>
                    <option value="Owner Withdrawal">Owner Withdrawal</option>
                    <option value="Expense Investment">Expense Investment</option>
                    <option value="Tax Payment">Tax Payment</option>
                    <option value="Bank Charge">Bank Charge</option>
                    <option value="Non-Cash Adjustment">Non-Cash Adjustment</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="font-medium text-[#1D1D1F] block mb-1">Particulars / Description</label>
                <input
                  type="text"
                  value={formData.particulars}
                  onChange={(e) => setFormData({ ...formData, particulars: e.target.value })}
                  className="w-full px-3 py-1.5 border border-[#E5E5EA] rounded-xl text-xs bg-white"
                  placeholder="e.g. Rent, New Printer, CA Charges"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-medium text-[#1D1D1F] block mb-1">Payment Status</label>
                  <select
                    value={formData.paymentStatus}
                    onChange={(e) => setFormData({ ...formData, paymentStatus: e.target.value })}
                    className="w-full px-3 py-1.5 border border-[#E5E5EA] rounded-xl text-xs bg-white"
                  >
                    <option value="PAID">PAID (Disbursed Bank Outflow)</option>
                    <option value="PENDING">PENDING (Liability - No Cash Impact)</option>
                    <option value="ADJUSTMENT">ADJUSTMENT (Non-Cash / Ledger)</option>
                  </select>
                </div>
                <div>
                  <label className="font-medium text-[#1D1D1F] block mb-1">Vendor / Recipient</label>
                  <input
                    type="text"
                    value={formData.vendor}
                    onChange={(e) => setFormData({ ...formData, vendor: e.target.value })}
                    className="w-full px-3 py-1.5 border border-[#E5E5EA] rounded-xl text-xs bg-white"
                    placeholder="e.g. Landlord, CA, Vendor"
                  />
                </div>
              </div>

              <div>
                <label className="font-medium text-[#1D1D1F] block mb-1">Comments / Remarks</label>
                <input
                  type="text"
                  value={formData.comments}
                  onChange={(e) => setFormData({ ...formData, comments: e.target.value })}
                  className="w-full px-3 py-1.5 border border-[#E5E5EA] rounded-xl text-xs bg-white"
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
                  Save Expense Record
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Entry Modal (Super Admin Only) */}
      {editingEntry && isSuperAdmin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-[#FFFFFF] w-full max-w-lg rounded-2xl shadow-xl border border-[#E5E5EA] overflow-hidden">
            <div className="p-4 border-b border-[#E5E5EA] flex items-center justify-between bg-[#FBFBFC]">
              <div className="flex items-center space-x-2">
                <Edit2 className="w-4 h-4 text-[#007AFF]" />
                <h3 className="font-bold text-sm text-[#1D1D1F]">Edit Expense Entry</h3>
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
                  <label className="font-medium text-[#1D1D1F] block mb-1">Date / Period Label</label>
                  <input
                    type="text"
                    value={editingEntry.entryDate || ''}
                    onChange={(e) => setEditingEntry({ ...editingEntry, entryDate: e.target.value })}
                    className="w-full px-3 py-1.5 border border-[#E5E5EA] rounded-xl text-xs"
                    required
                  />
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
                  <label className="font-medium text-[#1D1D1F] block mb-1">Category</label>
                  <input
                    type="text"
                    value={editingEntry.category || ''}
                    onChange={(e) => setEditingEntry({ ...editingEntry, category: e.target.value })}
                    className="w-full px-3 py-1.5 border border-[#E5E5EA] rounded-xl text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="font-medium text-[#1D1D1F] block mb-1">Comments / Notes</label>
                <input
                  type="text"
                  value={editingEntry.comments || ''}
                  onChange={(e) => setEditingEntry({ ...editingEntry, comments: e.target.value })}
                  className="w-full px-3 py-1.5 border border-[#E5E5EA] rounded-xl text-xs"
                />
              </div>

              <div>
                <label className="font-semibold text-[#FF3B30] block mb-1">
                  Reason for Modification *
                </label>
                <input
                  type="text"
                  value={editReason}
                  onChange={(e) => setEditReason(e.target.value)}
                  placeholder="e.g. Corrected invoice amount / Verified bank debit"
                  className="w-full px-3 py-1.5 border border-[#FF3B30]/40 rounded-xl text-xs bg-red-50/20"
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
                  disabled={isEditSubmitting}
                  className="px-4 py-1.5 text-xs font-semibold text-white bg-[#007AFF] hover:bg-[#007AFF]/90 rounded-xl shadow-2xs disabled:opacity-50"
                >
                  {isEditSubmitting ? 'Updating...' : 'Update & Record Snapshot'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Version History Drawer (Super Admin Only) */}
      {versionDrawerEntry && (
        <div className="fixed inset-0 z-50 flex items-center justify-end bg-black/40 backdrop-blur-xs">
          <div className="bg-[#FFFFFF] w-full max-w-md h-full shadow-2xl border-l border-[#E5E5EA] flex flex-col">
            <div className="p-4 border-b border-[#E5E5EA] flex items-center justify-between bg-[#FBFBFC]">
              <div className="flex items-center space-x-2">
                <History className="w-4 h-4 text-[#007AFF]" />
                <h3 className="font-bold text-sm text-[#1D1D1F]">Version Audit History</h3>
              </div>
              <button
                type="button"
                onClick={() => setVersionDrawerEntry(null)}
                className="text-[#86868B] hover:text-[#1D1D1F] p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 bg-[#F9F9FB] border-b border-[#E5E5EA]">
              <span className="text-[10px] text-[#86868B] uppercase tracking-wider font-semibold block">Target Entry</span>
              <div className="text-xs font-bold text-[#1D1D1F] mt-0.5">{versionDrawerEntry.particulars}</div>
              <div className="text-[11px] text-[#86868B]">
                Current Amount: <span className="font-semibold text-[#FF3B30]">₹{versionDrawerEntry.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {(!versionDrawerEntry.versions || versionDrawerEntry.versions.length === 0) ? (
                <div className="text-center py-8 text-xs text-[#86868B]">
                  No past versions recorded for this entry.
                </div>
              ) : (
                versionDrawerEntry.versions.map((ver) => {
                  let snap: any = {};
                  try {
                    snap = JSON.parse(ver.snapshotData);
                  } catch (_) {}

                  return (
                    <div
                      key={ver.id}
                      className="p-3.5 bg-[#FFFFFF] border border-[#E5E5EA] rounded-xl shadow-2xs space-y-2 text-xs"
                    >
                      <div className="flex items-center justify-between">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#007AFF]/10 text-[#007AFF]">
                          Version {ver.versionNumber}
                        </span>
                        <span className="text-[10px] text-[#86868B]">
                          {new Date(ver.createdAt).toLocaleString('en-IN')}
                        </span>
                      </div>

                      <div className="text-[11px] text-[#1D1D1F]">
                        <span className="text-[#86868B]">Amount: </span>
                        <span className="font-bold">
                          ₹{Number(snap.amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </span>
                      </div>

                      {ver.changeReason && (
                        <div className="text-[11px] text-[#86868B] bg-[#F9F9FB] p-2 rounded-lg">
                          <span className="font-semibold text-[#1D1D1F]">Reason: </span>
                          {ver.changeReason}
                        </div>
                      )}

                      {ver.createdByEmail && (
                        <div className="text-[10px] text-[#86868B]">
                          Modified by: <span className="font-medium text-[#1D1D1F]">{ver.createdByEmail}</span>
                        </div>
                      )}

                      {isSuperAdmin && (
                        <div className="pt-2 border-t border-[#E5E5EA] flex justify-end">
                          <button
                            type="button"
                            onClick={() => handleRevertVersion(versionDrawerEntry.id, ver.versionNumber)}
                            disabled={isReverting}
                            className="inline-flex items-center px-2.5 py-1 text-[11px] font-semibold text-[#007AFF] bg-[#007AFF]/10 hover:bg-[#007AFF]/20 rounded-lg transition-colors disabled:opacity-50"
                          >
                            <RotateCcw className="w-3 h-3 mr-1" />
                            Revert to this version
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

      {/* Category Manager Modal */}
      <CategoryManagerModal
        isOpen={isCatModalOpen}
        onClose={() => setIsCatModalOpen(false)}
        onCategoryAdded={fetchData}
        currentAccountSlug="expense"
      />
    </div>
  );
}
