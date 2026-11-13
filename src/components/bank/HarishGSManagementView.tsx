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
  Fuel,
  Car,
  Receipt,
  UserCheck,
} from 'lucide-react';

export interface HarishGSEntry {
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

export default function HarishGSManagementView() {
  const [loading, setLoading] = useState(true);
  const [entries, setEntries] = useState<HarishGSEntry[]>([]);
  const [account, setAccount] = useState<any>(null);
  const [periods, setPeriods] = useState<any[]>([]);
  const [userRole, setUserRole] = useState<'SUPER_ADMIN' | 'VIEWER'>('SUPER_ADMIN');

  // Active view tab: 'ALL' | 'HEMARAJ' | 'HARISH_FUEL' | 'VEHICLES'
  const [activeTab, setActiveTab] = useState<'ALL' | 'HEMARAJ' | 'HARISH_FUEL' | 'VEHICLES'>('ALL');

  // Filter states
  const [search, setSearch] = useState('');
  const [selectedParty, setSelectedParty] = useState('ALL');
  const [selectedSection, setSelectedSection] = useState('ALL');
  const [selectedPeriod, setSelectedPeriod] = useState('ALL');

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<HarishGSEntry | null>(null);
  const [editReason, setEditReason] = useState('');
  const [isEditSubmitting, setIsEditSubmitting] = useState(false);

  // Version History Drawer
  const [versionDrawerEntry, setVersionDrawerEntry] = useState<HarishGSEntry | null>(null);
  const [isReverting, setIsReverting] = useState(false);

  // Add Entry Form state
  const [formData, setFormData] = useState({
    employeeName: 'Hemaraj',
    periodCode: '2026-OCT',
    financialMonth: 'Oct-26',
    entryDate: '25-10-2026',
    section: 'EMPLOYEE_ADVANCE',
    category: 'Employee Advance',
    particulars: 'Hemaraj',
    amount: '-5000',
    description: 'Employee Advance - Hemaraj',
    remarks: 'Preserved from source workbook / screenshot',
    paymentStatus: 'PAID',
    isLinkedToBankBalance: true,
  });

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/bank/harish-gs');
      const data = await res.json();
      if (data.success) {
        setEntries(data.entries || []);
        setAccount(data.account || null);
        setPeriods(data.periods || []);
      }

      // Check current user role
      const meRes = await fetch('/api/auth/me');
      if (meRes.ok) {
        const meData = await meRes.json();
        if (meData.user?.role === 'SUPER_ADMIN') {
          setUserRole('SUPER_ADMIN');
        } else {
          setUserRole('VIEWER');
        }
      } else {
        const usersRes = await fetch('/api/users');
        if (usersRes.status === 403) {
          setUserRole('VIEWER');
        } else {
          setUserRole('SUPER_ADMIN');
        }
      }
    } catch (e) {
      console.error('Failed to fetch Harish GS data:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const isSuperAdmin = userRole === 'SUPER_ADMIN';

  // Helper to extract employee / party name
  const getPartyInfo = (e: HarishGSEntry) => {
    let emp = '';
    if (e.meta) {
      try {
        const parsed = JSON.parse(e.meta);
        if (parsed.employeeName) emp = parsed.employeeName;
      } catch (_) {}
    }
    if (!emp) {
      if (e.particulars?.toLowerCase().includes('hemaraj')) emp = 'Hemaraj';
      else if (e.category?.toLowerCase().includes('harish') || e.section === 'FUEL_PAYMENT') emp = 'Harish GS';
      else if (e.section === 'VEHICLE_BALANCE' || e.particulars?.includes('KA')) emp = 'Vehicles';
      else emp = 'General';
    }
    return emp;
  };

  // Calculations
  const calculations = useMemo(() => {
    let hemarajTotal = 0;
    let hemarajCount = 0;
    let harishFuelTotal = 0;
    let harishFuelCount = 0;
    let ka03apTotal = 0;
    let ka41dTotal = 0;
    let commissionKa03ap = 0;

    for (const e of entries) {
      const party = getPartyInfo(e);
      if (party === 'Hemaraj' || e.section === 'EMPLOYEE_ADVANCE') {
        hemarajTotal += e.amount;
        hemarajCount++;
      } else if (e.section === 'FUEL_PAYMENT' || party === 'Harish GS') {
        harishFuelTotal += e.amount;
        harishFuelCount++;
      } else if (e.section === 'VEHICLE_BALANCE') {
        if (e.particulars?.includes('6182') || e.category?.includes('6182')) {
          ka03apTotal += e.amount;
          if (e.netAmount) commissionKa03ap = e.netAmount; // -5250
        } else if (e.particulars?.includes('6174') || e.category?.includes('6174')) {
          ka41dTotal += e.amount;
        }
      }
    }

    // Consolidated Fuel Settlement matching Bank Balance Row 74:
    // C1 = C17 (KA03AP: -1,75,000) + C32 (Harish Fuel: -95,000) + I1 (Hemaraj: -46,000) = -3,16,000
    const consolidatedSettlement = ka03apTotal + harishFuelTotal + hemarajTotal;

    return {
      hemarajTotal,
      hemarajCount,
      harishFuelTotal,
      harishFuelCount,
      ka03apTotal,
      ka41dTotal,
      vehicleBalancesTotal: ka03apTotal + ka41dTotal,
      commissionKa03ap,
      consolidatedSettlement,
    };
  }, [entries]);

  // Dynamic filter options
  const parties = useMemo(() => {
    const pSet = new Set<string>();
    entries.forEach((e) => pSet.add(getPartyInfo(e)));
    return Array.from(pSet);
  }, [entries]);

  const sections = useMemo(() => {
    const sSet = new Set<string>();
    entries.forEach((e) => {
      if (e.section) sSet.add(e.section);
    });
    return Array.from(sSet);
  }, [entries]);

  const periodCodes = useMemo(() => {
    const pSet = new Set<string>();
    entries.forEach((e) => {
      if (e.periodCode) pSet.add(e.periodCode);
    });
    return Array.from(pSet);
  }, [entries]);

  // Filtered entries
  const filteredEntries = useMemo(() => {
    return entries.filter((e) => {
      const party = getPartyInfo(e);

      // Tab filter
      if (activeTab === 'HEMARAJ' && party !== 'Hemaraj' && e.section !== 'EMPLOYEE_ADVANCE') return false;
      if (activeTab === 'HARISH_FUEL' && e.section !== 'FUEL_PAYMENT') return false;
      if (activeTab === 'VEHICLES' && e.section !== 'VEHICLE_BALANCE') return false;

      // Dropdown filters
      if (selectedParty !== 'ALL' && party !== selectedParty) return false;
      if (selectedSection !== 'ALL' && e.section !== selectedSection) return false;
      if (selectedPeriod !== 'ALL' && e.periodCode !== selectedPeriod) return false;

      // Text search
      if (search) {
        const q = search.toLowerCase();
        const particularsMatch = e.particulars?.toLowerCase().includes(q);
        const partyMatch = party.toLowerCase().includes(q);
        const categoryMatch = e.category?.toLowerCase().includes(q);
        const dateMatch = e.entryDate?.toLowerCase().includes(q);
        const commentsMatch = e.comments?.toLowerCase().includes(q);
        const formulaMatch = e.formulaString?.toLowerCase().includes(q);
        if (!particularsMatch && !partyMatch && !categoryMatch && !dateMatch && !commentsMatch && !formulaMatch) {
          return false;
        }
      }

      return true;
    });
  }, [entries, activeTab, selectedParty, selectedSection, selectedPeriod, search]);

  // CSV Export
  const handleExportCSV = () => {
    const headers = [
      'Transaction ID / Ref',
      'Period',
      'Date',
      'Employee / Party',
      'Particulars',
      'Section',
      'Category',
      'Amount (INR)',
      'Net Amount (INR)',
      'Formula / Source',
      'Comments',
    ];

    const rows = filteredEntries.map((e) => {
      const party = getPartyInfo(e);
      let txnId = e.id;
      if (e.meta) {
        try {
          const parsed = JSON.parse(e.meta);
          if (parsed.transactionId) txnId = parsed.transactionId;
        } catch (_) {}
      }
      return [
        `"${txnId}"`,
        `"${e.periodCode || ''}"`,
        `"${e.entryDate || ''}"`,
        `"${party}"`,
        `"${e.particulars || ''}"`,
        `"${e.section || ''}"`,
        `"${e.category || ''}"`,
        e.amount,
        e.netAmount !== null && e.netAmount !== undefined ? e.netAmount : e.amount,
        `"${e.formulaString || ''}"`,
        `"${e.comments || ''}"`,
      ].join(',');
    });

    const csvContent = '\uFEFF' + [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Atharva_Harish_GS_Account_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Add Entry handler
  const handleCreateEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isSuperAdmin) return;

    try {
      const amt = Number(formData.amount);
      const isHemaraj = formData.employeeName.toLowerCase().includes('hemaraj');

      const metaObj = {
        employeeName: formData.employeeName.trim(),
        transactionId: `HMR-ADV-${Date.now()}`,
        financialYear: '2026-27',
        financialMonth: formData.financialMonth,
        category: formData.category,
        debitCredit: amt < 0 ? 'DEBIT' : 'CREDIT',
        paymentStatus: formData.paymentStatus,
        isPostedToBank: formData.isLinkedToBankBalance,
        bankReference: formData.isLinkedToBankBalance
          ? "Consolidated Main Bank Row 74 ('Harish GS'!C1)"
          : null,
        reconciliationNote: formData.isLinkedToBankBalance
          ? 'Represented in Main Bank Balance Row 74 (-₹3,16,000.00). Zero duplicate bank debit.'
          : 'Direct payment record',
      };

      const res = await fetch('/api/bank/harish-gs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          periodCode: formData.periodCode,
          entryDate: formData.entryDate,
          section: formData.section,
          category: formData.category,
          particulars: formData.particulars || formData.employeeName,
          sourceReference: formData.employeeName,
          amount: amt,
          paidAmount: 0,
          receivedAmount: 0,
          netAmount: amt,
          formulaString: String(amt),
          comments: formData.description,
          remarks: formData.remarks,
          meta: metaObj,
          changeReason: `Added new ${formData.category} for ${formData.employeeName}: ₹${amt}`,
        }),
      });

      if (res.ok) {
        setIsAddModalOpen(false);
        setFormData({
          employeeName: 'Hemaraj',
          periodCode: '2026-OCT',
          financialMonth: 'Oct-26',
          entryDate: '25-10-2026',
          section: 'EMPLOYEE_ADVANCE',
          category: 'Employee Advance',
          particulars: 'Hemaraj',
          amount: '-5000',
          description: 'Employee Advance - Hemaraj',
          remarks: 'Preserved from source workbook / screenshot',
          paymentStatus: 'PAID',
          isLinkedToBankBalance: true,
        });
        fetchData();
      } else {
        const errData = await res.json();
        alert(errData.error || 'Failed to add entry');
      }
    } catch (err) {
      console.error('Error adding entry:', err);
      alert('An unexpected error occurred.');
    }
  };

  // Edit Entry handler
  const handleUpdateEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isSuperAdmin || !editingEntry) return;

    if (!editReason.trim()) {
      alert('A modification reason is required for financial audit tracking.');
      return;
    }

    try {
      setIsEditSubmitting(true);
      const res = await fetch('/api/bank/harish-gs', {
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
        const errData = await res.json();
        alert(errData.error || 'Failed to update entry');
      }
    } catch (err) {
      console.error('Error updating entry:', err);
    } finally {
      setIsEditSubmitting(false);
    }
  };

  // Delete Entry handler
  const handleDeleteEntry = async (id: string, label: string) => {
    if (!isSuperAdmin) return;
    if (!confirm(`Are you sure you want to delete "${label}"? It will be safely moved to the Recycle Bin.`)) return;

    try {
      const res = await fetch(`/api/bank/harish-gs?id=${id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        fetchData();
      } else {
        const errData = await res.json();
        alert(errData.error || 'Failed to delete entry');
      }
    } catch (err) {
      console.error('Error deleting entry:', err);
    }
  };

  // 1-Click Revert Version handler
  const handleRevertVersion = async (entryId: string, versionNumber: number) => {
    if (!isSuperAdmin) return;
    if (!confirm(`Revert this record to Version ${versionNumber}? A new audit snapshot will be preserved.`)) return;

    try {
      setIsReverting(true);
      const res = await fetch(`/api/bank/harish-gs/${entryId}/revert`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ versionNumber }),
      });

      if (res.ok) {
        setVersionDrawerEntry(null);
        fetchData();
      } else {
        const errData = await res.json();
        alert(errData.error || 'Failed to revert version');
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
                <Fuel className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <h1 className="text-xl font-bold text-[#1D1D1F] tracking-tight">Harish GS Account</h1>
                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[#007AFF]/10 text-[#007AFF] border border-[#007AFF]/20">
                    Supporting Account
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[#34C759]/10 text-[#34C759] border border-[#34C759]/20">
                    Bank Row 74: -₹3,16,000.00
                  </span>
                </div>
                <p className="text-xs text-[#86868B] mt-1">
                  Vehicle fuel balances (KA03AP 6182, KA41D 6174), 3% commission fees, direct fuel settlements, and Hemaraj employee advances.
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
              <button
                type="button"
                onClick={() => setIsAddModalOpen(true)}
                className="inline-flex items-center px-3.5 py-1.5 bg-[#007AFF] text-white text-xs font-semibold rounded-xl hover:bg-[#007AFF]/90 shadow-2xs transition-colors"
              >
                <Plus className="w-3.5 h-3.5 mr-1.5" />
                Add Advance / Entry
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 6 Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3.5">
        {/* Card 1: Consolidated Fuel Settlement (Row 74) */}
        <div className="bg-[#FFFFFF] p-4 rounded-2xl border border-[#E5E5EA] shadow-2xs">
          <div className="flex items-center justify-between text-[#86868B] mb-1">
            <span className="text-[11px] font-medium">Consolidated Settlement</span>
            <Wallet className="w-3.5 h-3.5 text-[#007AFF]" />
          </div>
          <div className="text-lg font-bold text-[#FF3B30] tabular-nums">
            ₹{calculations.consolidatedSettlement.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
          <span className="text-[10px] text-[#007AFF] font-medium block mt-0.5">
            Bank Row 74: C17 + I1 + C32
          </span>
        </div>

        {/* Card 2: Hemaraj Employee Advances (Distinct Display) */}
        <div className="bg-purple-50/40 p-4 rounded-2xl border border-purple-200/60 shadow-2xs">
          <div className="flex items-center justify-between text-purple-700 mb-1">
            <span className="text-[11px] font-semibold">Hemaraj Advances</span>
            <UserCheck className="w-3.5 h-3.5 text-purple-600" />
          </div>
          <div className="text-lg font-bold text-[#FF3B30] tabular-nums">
            ₹{calculations.hemarajTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
          <span className="text-[10px] text-purple-600 font-medium block mt-0.5">
            {calculations.hemarajCount} entries (July, Aug, Oct)
          </span>
        </div>

        {/* Card 3: Harish GS Direct Fuel */}
        <div className="bg-[#FFFFFF] p-4 rounded-2xl border border-[#E5E5EA] shadow-2xs">
          <div className="flex items-center justify-between text-[#86868B] mb-1">
            <span className="text-[11px] font-medium">Harish GS Direct Fuel</span>
            <Fuel className="w-3.5 h-3.5 text-[#FF9500]" />
          </div>
          <div className="text-lg font-bold text-[#FF3B30] tabular-nums">
            ₹{calculations.harishFuelTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
          <span className="text-[10px] text-[#86868B] font-medium block mt-0.5">
            {calculations.harishFuelCount} fuel payments
          </span>
        </div>

        {/* Card 4: Vehicle KA03AP 6182 */}
        <div className="bg-[#FFFFFF] p-4 rounded-2xl border border-[#E5E5EA] shadow-2xs">
          <div className="flex items-center justify-between text-[#86868B] mb-1">
            <span className="text-[11px] font-medium">KA03AP 6182 Balance</span>
            <Car className="w-3.5 h-3.5 text-[#34C759]" />
          </div>
          <div className="text-lg font-bold text-[#FF3B30] tabular-nums">
            ₹{calculations.ka03apTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
          <span className="text-[10px] text-[#34C759] font-medium block mt-0.5">
            Commission: ₹{calculations.commissionKa03ap.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </span>
        </div>

        {/* Card 5: Vehicle KA41D 6174 */}
        <div className="bg-[#FFFFFF] p-4 rounded-2xl border border-[#E5E5EA] shadow-2xs">
          <div className="flex items-center justify-between text-[#86868B] mb-1">
            <span className="text-[11px] font-medium">KA41D 6174 Balance</span>
            <Car className="w-3.5 h-3.5 text-[#34C759]" />
          </div>
          <div className="text-lg font-bold text-[#FF3B30] tabular-nums">
            ₹{calculations.ka41dTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
          <span className="text-[10px] text-[#86868B] font-medium block mt-0.5">
            Preserved Vehicle Balance
          </span>
        </div>

        {/* Card 6: 3% Commission Fees */}
        <div className="bg-[#FFFFFF] p-4 rounded-2xl border border-[#E5E5EA] shadow-2xs">
          <div className="flex items-center justify-between text-[#86868B] mb-1">
            <span className="text-[11px] font-medium">3% Commission Fee</span>
            <Receipt className="w-3.5 h-3.5 text-[#5856D6]" />
          </div>
          <div className="text-lg font-bold text-[#FF3B30] tabular-nums">
            ₹{calculations.commissionKa03ap.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
          <span className="text-[10px] text-[#5856D6] font-medium block mt-0.5">
            Formula: C6*3%
          </span>
        </div>
      </div>

      {/* Segmented Section Tabs */}
      <div className="flex border-b border-[#E5E5EA] space-x-6 text-xs font-semibold">
        <button
          type="button"
          onClick={() => setActiveTab('ALL')}
          className={`pb-3 transition-colors relative ${
            activeTab === 'ALL' ? 'text-[#007AFF]' : 'text-[#86868B] hover:text-[#1D1D1F]'
          }`}
        >
          All Entries ({entries.length})
          {activeTab === 'ALL' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#007AFF] rounded-full" />}
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('HEMARAJ')}
          className={`pb-3 transition-colors relative flex items-center space-x-1.5 ${
            activeTab === 'HEMARAJ' ? 'text-purple-600' : 'text-[#86868B] hover:text-[#1D1D1F]'
          }`}
        >
          <span>Hemaraj Employee Advances ({calculations.hemarajCount})</span>
          <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-purple-100 text-purple-700 font-bold">
            -₹46,000.00
          </span>
          {activeTab === 'HEMARAJ' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-purple-600 rounded-full" />}
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('HARISH_FUEL')}
          className={`pb-3 transition-colors relative flex items-center space-x-1.5 ${
            activeTab === 'HARISH_FUEL' ? 'text-[#007AFF]' : 'text-[#86868B] hover:text-[#1D1D1F]'
          }`}
        >
          <span>Harish GS Direct Fuel ({calculations.harishFuelCount})</span>
          <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-blue-100 text-blue-700 font-bold">
            -₹95,000.00
          </span>
          {activeTab === 'HARISH_FUEL' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#007AFF] rounded-full" />}
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('VEHICLES')}
          className={`pb-3 transition-colors relative flex items-center space-x-1.5 ${
            activeTab === 'VEHICLES' ? 'text-[#34C759]' : 'text-[#86868B] hover:text-[#1D1D1F]'
          }`}
        >
          <span>Vehicle Balances (2)</span>
          <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-emerald-100 text-emerald-700 font-bold">
            -₹4,25,000.00
          </span>
          {activeTab === 'VEHICLES' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#34C759] rounded-full" />}
        </button>
      </div>

      {/* Dynamic Filters Bar */}
      <div className="bg-[#FFFFFF] p-3.5 rounded-2xl border border-[#E5E5EA] shadow-2xs flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Search */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-[#86868B] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search employee, date, amount, ref..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 pr-3 py-1.5 bg-[#F9F9FB] border border-[#E5E5EA] rounded-xl text-[#1D1D1F] focus:outline-hidden focus:border-[#007AFF] w-52 sm:w-64"
            />
          </div>

          {/* Party / Employee Filter */}
          <div className="flex items-center space-x-1 bg-[#F9F9FB] border border-[#E5E5EA] rounded-xl px-2.5 py-1">
            <span className="text-[11px] text-[#86868B] font-medium">Party:</span>
            <select
              value={selectedParty}
              onChange={(e) => setSelectedParty(e.target.value)}
              className="bg-transparent font-medium text-[#1D1D1F] focus:outline-hidden text-xs cursor-pointer"
            >
              <option value="ALL">All Parties</option>
              {parties.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>

          {/* Section Filter */}
          {sections.length > 0 && (
            <div className="flex items-center space-x-1 bg-[#F9F9FB] border border-[#E5E5EA] rounded-xl px-2.5 py-1">
              <span className="text-[11px] text-[#86868B] font-medium">Section:</span>
              <select
                value={selectedSection}
                onChange={(e) => setSelectedSection(e.target.value)}
                className="bg-transparent font-medium text-[#1D1D1F] focus:outline-hidden text-xs cursor-pointer"
              >
                <option value="ALL">All Sections</option>
                {sections.map((s) => (
                  <option key={s} value={s}>
                    {s.replace(/_/g, ' ')}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Period Filter */}
          {periodCodes.length > 0 && (
            <div className="flex items-center space-x-1 bg-[#F9F9FB] border border-[#E5E5EA] rounded-xl px-2.5 py-1">
              <span className="text-[11px] text-[#86868B] font-medium">Period:</span>
              <select
                value={selectedPeriod}
                onChange={(e) => setSelectedPeriod(e.target.value)}
                className="bg-transparent font-medium text-[#1D1D1F] focus:outline-hidden text-xs cursor-pointer"
              >
                <option value="ALL">All Periods</option>
                {periodCodes.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        <div className="text-[11px] text-[#86868B]">
          Showing <span className="font-bold text-[#1D1D1F]">{filteredEntries.length}</span> of {entries.length} entries
        </div>
      </div>

      {/* Main Data Table */}
      <div className="bg-[#FFFFFF] rounded-2xl border border-[#E5E5EA] shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-[#E5E5EA] bg-[#F9F9FB] text-[#86868B] font-semibold">
                <th className="py-2.5 px-4">Period</th>
                <th className="py-2.5 px-4">Date</th>
                <th className="py-2.5 px-4">Employee / Party</th>
                <th className="py-2.5 px-4">Particulars & Description</th>
                <th className="py-2.5 px-4">Section / Category</th>
                <th className="py-2.5 px-4 text-right">Amount (₹)</th>
                <th className="py-2.5 px-4 text-right">Net (₹)</th>
                <th className="py-2.5 px-4">Formula / Ref</th>
                <th className="py-2.5 px-4 text-center">Status</th>
                {isSuperAdmin && <th className="py-2.5 px-4 text-center">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E5EA]">
              {loading ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-[#86868B]">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-[#007AFF]" />
                    Loading Harish GS account records...
                  </td>
                </tr>
              ) : filteredEntries.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-[#86868B]">
                    No entries match your search criteria.
                  </td>
                </tr>
              ) : (
                filteredEntries.map((row) => {
                  const party = getPartyInfo(row);
                  const isHemaraj = party === 'Hemaraj';
                  const isHarish = party === 'Harish GS';
                  const isVeh = party === 'Vehicles';

                  return (
                    <tr
                      key={row.id}
                      className={`hover:bg-[#F9F9FB]/70 transition-colors ${
                        isHemaraj ? 'bg-purple-50/20' : ''
                      }`}
                    >
                      {/* Period */}
                      <td className="py-2.5 px-4 font-medium text-[#1D1D1F] whitespace-nowrap">
                        {row.periodCode || '-'}
                      </td>

                      {/* Date */}
                      <td className="py-2.5 px-4 text-[#86868B] whitespace-nowrap font-medium">
                        {row.entryDate || '-'}
                      </td>

                      {/* Employee / Party Badge */}
                      <td className="py-2.5 px-4 whitespace-nowrap">
                        {isHemaraj ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-purple-100 text-purple-700 border border-purple-200">
                            <UserCheck className="w-3 h-3 mr-1 text-purple-600" />
                            Hemaraj
                          </span>
                        ) : isHarish ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-blue-100 text-blue-700 border border-blue-200">
                            <Fuel className="w-3 h-3 mr-1 text-blue-600" />
                            Harish GS
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-700 border border-emerald-200">
                            <Car className="w-3 h-3 mr-1 text-emerald-600" />
                            {row.category || 'Vehicle'}
                          </span>
                        )}
                      </td>

                      {/* Particulars */}
                      <td className="py-2.5 px-4 font-medium text-[#1D1D1F]">
                        <div>{row.particulars}</div>
                        {row.comments && (
                          <span className="block text-[11px] text-[#86868B] font-normal truncate max-w-sm">
                            {row.comments}
                          </span>
                        )}
                      </td>

                      {/* Section / Category */}
                      <td className="py-2.5 px-4">
                        <span className="inline-block px-2 py-0.5 rounded-md text-[10px] font-semibold bg-[#F2F2F7] text-[#48484A]">
                          {row.section?.replace(/_/g, ' ') || row.category || 'General'}
                        </span>
                      </td>

                      {/* Amount */}
                      <td
                        className={`py-2.5 px-4 text-right font-bold tabular-nums whitespace-nowrap ${
                          row.amount < 0 ? 'text-[#FF3B30]' : 'text-[#34C759]'
                        }`}
                      >
                        ₹{row.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>

                      {/* Net Amount */}
                      <td
                        className={`py-2.5 px-4 text-right font-bold tabular-nums whitespace-nowrap ${
                          (row.netAmount !== null && row.netAmount !== undefined ? row.netAmount : row.amount) < 0
                            ? 'text-[#FF3B30]'
                            : 'text-[#34C759]'
                        }`}
                      >
                        {row.netAmount !== null && row.netAmount !== undefined
                          ? `₹${row.netAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`
                          : `₹${row.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`}
                      </td>

                      {/* Formula / Source */}
                      <td className="py-2.5 px-4 text-[#86868B] font-mono text-[11px] truncate max-w-xs">
                        {row.formulaString ? (
                          <span className="text-[#007AFF] bg-[#007AFF]/10 px-1.5 py-0.5 rounded font-mono">
                            ={row.formulaString}
                          </span>
                        ) : (
                          row.sourceReference || '-'
                        )}
                      </td>

                      {/* Status */}
                      <td className="py-2.5 px-4 text-center whitespace-nowrap">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-medium bg-[#34C759]/10 text-[#34C759]">
                          <CheckCircle2 className="w-3 h-3 mr-1" />
                          Reconciled
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
                    {activeTab === 'HEMARAJ' ? 'Hemaraj Employee Advances total: -₹46,000.00' : 'Reconciled with Main Bank Balance Row 74'}
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      {/* Add Entry Modal (Super Admin Only) */}
      {isAddModalOpen && isSuperAdmin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-[#FFFFFF] w-full max-w-lg rounded-2xl shadow-xl border border-[#E5E5EA] overflow-hidden">
            <div className="p-4 border-b border-[#E5E5EA] flex items-center justify-between bg-[#FBFBFC]">
              <div className="flex items-center space-x-2">
                <Plus className="w-4 h-4 text-[#007AFF]" />
                <h3 className="font-bold text-sm text-[#1D1D1F]">Add Employee Advance / Fuel Entry</h3>
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
                  <label className="font-medium text-[#1D1D1F] block mb-1">Employee / Party Name</label>
                  <input
                    type="text"
                    value={formData.employeeName}
                    onChange={(e) => setFormData({ ...formData, employeeName: e.target.value })}
                    className="w-full px-3 py-1.5 border border-[#E5E5EA] rounded-xl text-xs bg-white"
                    placeholder="e.g. Hemaraj, Harish GS"
                    required
                  />
                </div>
                <div>
                  <label className="font-medium text-[#1D1D1F] block mb-1">Period / Month Code</label>
                  <input
                    type="text"
                    value={formData.periodCode}
                    onChange={(e) => setFormData({ ...formData, periodCode: e.target.value })}
                    className="w-full px-3 py-1.5 border border-[#E5E5EA] rounded-xl text-xs bg-white"
                    placeholder="e.g. 2026-OCT, 2026-NOV"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-medium text-[#1D1D1F] block mb-1">Transaction Date / Label</label>
                  <input
                    type="text"
                    value={formData.entryDate}
                    onChange={(e) => setFormData({ ...formData, entryDate: e.target.value })}
                    className="w-full px-3 py-1.5 border border-[#E5E5EA] rounded-xl text-xs bg-white"
                    placeholder="e.g. July, Aug, 25-10-2026"
                    required
                  />
                </div>
                <div>
                  <label className="font-medium text-[#1D1D1F] block mb-1">Amount (₹) (Negative for Advance)</label>
                  <input
                    type="number"
                    step="any"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    className="w-full px-3 py-1.5 border border-[#E5E5EA] rounded-xl text-xs bg-white font-bold"
                    placeholder="-5000"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-medium text-[#1D1D1F] block mb-1">Section</label>
                  <select
                    value={formData.section}
                    onChange={(e) => setFormData({ ...formData, section: e.target.value })}
                    className="w-full px-3 py-1.5 border border-[#E5E5EA] rounded-xl text-xs bg-white"
                  >
                    <option value="EMPLOYEE_ADVANCE">EMPLOYEE ADVANCE</option>
                    <option value="FUEL_PAYMENT">FUEL PAYMENT</option>
                    <option value="VEHICLE_BALANCE">VEHICLE BALANCE</option>
                    <option value="GENERAL">GENERAL</option>
                  </select>
                </div>
                <div>
                  <label className="font-medium text-[#1D1D1F] block mb-1">Category</label>
                  <input
                    type="text"
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full px-3 py-1.5 border border-[#E5E5EA] rounded-xl text-xs bg-white"
                    placeholder="Employee Advance"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="font-medium text-[#1D1D1F] block mb-1">Particulars / Description</label>
                <input
                  type="text"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-1.5 border border-[#E5E5EA] rounded-xl text-xs bg-white"
                  placeholder="e.g. Employee Advance - Hemaraj"
                  required
                />
              </div>

              <div>
                <label className="font-medium text-[#1D1D1F] block mb-1">Remarks / Source Note</label>
                <input
                  type="text"
                  value={formData.remarks}
                  onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                  className="w-full px-3 py-1.5 border border-[#E5E5EA] rounded-xl text-xs bg-white"
                  placeholder="Optional audit notes"
                />
              </div>

              {/* Zero Duplicate Bank Cash Movement Checkbox */}
              <div className="bg-[#F9F9FB] p-3 rounded-xl border border-[#E5E5EA] space-y-1">
                <label className="flex items-start space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.isLinkedToBankBalance}
                    onChange={(e) => setFormData({ ...formData, isLinkedToBankBalance: e.target.checked })}
                    className="mt-0.5 rounded border-[#E5E5EA] text-[#007AFF] focus:ring-[#007AFF]"
                  />
                  <div>
                    <span className="font-semibold text-xs text-[#1D1D1F] block">
                      Represented in Main Bank Balance Row 74 (-₹3,16,000.00)
                    </span>
                    <span className="text-[11px] text-[#86868B] block">
                      Guarantees zero duplicate bank debits. Mathematically links this advance to the existing consolidated settlement.
                    </span>
                  </div>
                </label>
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
                  Save Advance Record
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
                <h3 className="font-bold text-sm text-[#1D1D1F]">Edit Financial Entry</h3>
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
                <label className="font-medium text-[#1D1D1F] block mb-1">Formula or Source Reference</label>
                <input
                  type="text"
                  value={editingEntry.formulaString || ''}
                  onChange={(e) => setEditingEntry({ ...editingEntry, formulaString: e.target.value })}
                  className="w-full px-3 py-1.5 border border-[#E5E5EA] rounded-xl text-xs font-mono"
                  placeholder="e.g. C6*3%"
                />
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
                  placeholder="e.g. Verified with bank statement / Adjusted employee advance amount"
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
    </div>
  );
}

