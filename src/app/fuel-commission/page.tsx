'use client';

import React, { useState, useEffect } from 'react';
import {
  Fuel,
  Plus,
  Search,
  Filter,
  Download,
  Trash2,
  Edit3,
  History,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  Clock,
  Building2,
  Calendar,
  X,
  ShieldCheck,
  RefreshCw,
  Info,
  Archive,
  ArrowUpRight,
  TrendingUp,
  Receipt,
  DollarSign,
  CarFront,
  SlidersHorizontal,
} from 'lucide-react';

interface FuelCommissionRecord {
  id: string;
  financialYear: string;
  financialMonth: string;
  commissionDate: string;
  siteName: string;
  vehicleNumber?: string | null;
  category: string;
  amount: number;
  accountingType: string;
  status: string;
  receivedAmount: number;
  pendingAmount: number;
  description?: string | null;
  transactionReference?: string | null;
  bankReference?: string | null;
  remarks?: string | null;
  createdAt: string;
  updatedAt: string;
  _count?: { versions: number };
}

interface FuelCommissionVersion {
  id: string;
  versionNumber: number;
  snapshotData: string;
  changeReason?: string | null;
  createdByEmail?: string | null;
  createdAt: string;
}

interface FuelCommissionMetrics {
  totalCommission: number;
  oldCommission: number;
  monthlyTotal: number;
  adjustmentTotal: number;
  commissionEarned: number;
  commissionReceived: number;
  commissionPending: number;
  totalEntries: number;
  filteredTotal: number;
  filteredCount: number;
  siteSummary: Array<{
    siteName: string;
    amount: number;
    count: number;
    received: number;
    pending: number;
    percentage: number;
  }>;
  monthlySummary: Array<{ month: string; amount: number; count: number }>;
  yearSummary: Array<{ year: string; amount: number; count: number }>;
}

export default function FuelCommissionPage() {
  const [userRole, setUserRole] = useState<'SUPER_ADMIN' | 'VIEWER'>('SUPER_ADMIN');
  const isSuperAdmin = userRole === 'SUPER_ADMIN';

  const [records, setRecords] = useState<FuelCommissionRecord[]>([]);
  const [metrics, setMetrics] = useState<FuelCommissionMetrics>({
    totalCommission: 200890.06,
    oldCommission: 64472.64,
    monthlyTotal: 161378.06,
    adjustmentTotal: -24960.64,
    commissionEarned: 225850.70,
    commissionReceived: 0,
    commissionPending: 200890.06,
    totalEntries: 35,
    filteredTotal: 200890.06,
    filteredCount: 35,
    siteSummary: [],
    monthlySummary: [],
    yearSummary: [],
  });

  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterFY, setFilterFY] = useState('ALL');
  const [filterMonth, setFilterMonth] = useState('ALL');
  const [filterSite, setFilterSite] = useState('ALL');
  const [filterCategory, setFilterCategory] = useState('ALL');
  const [filterStatus, setFilterStatus] = useState('ALL');

  const [filterOptions, setFilterOptions] = useState<{
    sites: string[];
    categories: string[];
    years: string[];
    months: string[];
  }>({
    sites: [],
    categories: [],
    years: [],
    months: [],
  });

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isVersionModalOpen, setIsVersionModalOpen] = useState(false);
  const [isRecycleBinOpen, setIsRecycleBinOpen] = useState(false);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);

  // Selected item state
  const [selectedRecord, setSelectedRecord] = useState<FuelCommissionRecord | null>(null);
  const [versions, setVersions] = useState<FuelCommissionVersion[]>([]);
  const [deletedRecords, setDeletedRecords] = useState<FuelCommissionRecord[]>([]);

  // Form states
  const [formData, setFormData] = useState({
    financialYear: '2026-27',
    financialMonth: 'Nov-26',
    commissionDate: new Date().toISOString().slice(0, 10),
    siteName: '',
    vehicleNumber: '',
    category: 'MONTHLY',
    amount: '',
    accountingType: 'EARNED',
    status: 'PENDING',
    description: '',
    transactionReference: '',
    remarks: '',
    changeReason: '',
  });

  // Receipt form state
  const [receiptForm, setReceiptForm] = useState({
    receiptAmount: '',
    bankReference: '',
    receiptDate: new Date().toISOString().slice(0, 10),
  });

  const [submitting, setSubmitting] = useState(false);
  const [actionMessage, setActionMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const fetchRecords = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (filterFY !== 'ALL') params.set('financialYear', filterFY);
      if (filterMonth !== 'ALL') params.set('financialMonth', filterMonth);
      if (filterSite !== 'ALL') params.set('siteName', filterSite);
      if (filterCategory !== 'ALL') params.set('category', filterCategory);
      if (filterStatus !== 'ALL') params.set('status', filterStatus);

      const res = await fetch(`/api/fuel-commission?${params.toString()}`);
      const data = await res.json();
      if (data.success) {
        setRecords(data.records);
        setMetrics(data.metrics);
        setFilterOptions(data.filterOptions);
      }

      // Detect role
      const authRes = await fetch('/api/users');
      if (authRes.status === 403) {
        setUserRole('VIEWER');
      } else {
        setUserRole('SUPER_ADMIN');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecords();
  }, [search, filterFY, filterMonth, filterSite, filterCategory, filterStatus]);

  const handleClearFilters = () => {
    setSearch('');
    setFilterFY('ALL');
    setFilterMonth('ALL');
    setFilterSite('ALL');
    setFilterCategory('ALL');
    setFilterStatus('ALL');
  };

  // Open Add Modal
  const openAddModal = () => {
    setFormData({
      financialYear: '2026-27',
      financialMonth: 'Nov-26',
      commissionDate: new Date().toISOString().slice(0, 10),
      siteName: '',
      vehicleNumber: '',
      category: 'MONTHLY',
      amount: '',
      accountingType: 'EARNED',
      status: 'PENDING',
      description: '',
      transactionReference: '',
      remarks: '',
      changeReason: '',
    });
    setIsAddModalOpen(true);
  };

  // Open Edit Modal
  const openEditModal = (rec: FuelCommissionRecord) => {
    setSelectedRecord(rec);
    setFormData({
      financialYear: rec.financialYear,
      financialMonth: rec.financialMonth,
      commissionDate: rec.commissionDate,
      siteName: rec.siteName,
      vehicleNumber: rec.vehicleNumber || '',
      category: rec.category,
      amount: String(rec.amount),
      accountingType: rec.accountingType,
      status: rec.status,
      description: rec.description || '',
      transactionReference: rec.transactionReference || '',
      remarks: rec.remarks || '',
      changeReason: '',
    });
    setIsEditModalOpen(true);
  };

  // Open Receipt Modal
  const openReceiptModal = (rec: FuelCommissionRecord) => {
    setSelectedRecord(rec);
    setReceiptForm({
      receiptAmount: String(rec.pendingAmount > 0 ? rec.pendingAmount : rec.amount),
      bankReference: '',
      receiptDate: new Date().toISOString().slice(0, 10),
    });
    setIsReceiptModalOpen(true);
  };

  // Open Version History Modal
  const openVersionModal = async (rec: FuelCommissionRecord) => {
    setSelectedRecord(rec);
    setIsVersionModalOpen(true);
    try {
      const res = await fetch(`/api/fuel-commission/${rec.id}`);
      const data = await res.json();
      if (data.success && data.record) {
        setVersions(data.record.versions || []);
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Open Recycle Bin Modal
  const openRecycleBin = async () => {
    setIsRecycleBinOpen(true);
    try {
      const res = await fetch('/api/fuel-commission/recycle-bin');
      const data = await res.json();
      if (data.success) {
        setDeletedRecords(data.records);
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Submit Add
  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch('/api/fuel-commission', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setIsAddModalOpen(false);
        setActionMessage({ text: `Commission entry for "${formData.siteName}" created successfully!`, type: 'success' });
        fetchRecords();
      } else {
        setActionMessage({ text: data.error || 'Failed to add entry', type: 'error' });
      }
    } catch (err) {
      console.error(err);
      setActionMessage({ text: 'Error connecting to server', type: 'error' });
    } finally {
      setSubmitting(false);
    }
  };

  // Submit Edit
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRecord) return;
    if (!formData.changeReason.trim()) {
      alert('Audit change reason is required.');
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(`/api/fuel-commission/${selectedRecord.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setIsEditModalOpen(false);
        setActionMessage({ text: `Commission entry updated with audit snapshot!`, type: 'success' });
        fetchRecords();
      } else {
        setActionMessage({ text: data.error || 'Failed to update entry', type: 'error' });
      }
    } catch (err) {
      console.error(err);
      setActionMessage({ text: 'Error connecting to server', type: 'error' });
    } finally {
      setSubmitting(false);
    }
  };

  // Submit Bank Receipt
  const handleReceiptSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRecord) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/fuel-commission/${selectedRecord.id}/receipt`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(receiptForm),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setIsReceiptModalOpen(false);
        setActionMessage({ text: `Bank deposit receipt recorded successfully!`, type: 'success' });
        fetchRecords();
      } else {
        setActionMessage({ text: data.error || 'Failed to record receipt', type: 'error' });
      }
    } catch (err) {
      console.error(err);
      setActionMessage({ text: 'Error connecting to server', type: 'error' });
    } finally {
      setSubmitting(false);
    }
  };

  // Soft Delete
  const handleDelete = async (id: string, siteName: string, amt: number) => {
    if (!confirm(`Are you sure you want to move Fuel Commission entry for ${siteName} (₹${amt}) to the Recycle Bin?`)) {
      return;
    }
    try {
      const res = await fetch(`/api/fuel-commission/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (res.ok && data.success) {
        setActionMessage({ text: `Entry moved to Recycle Bin.`, type: 'success' });
        fetchRecords();
      } else {
        alert(data.error || 'Failed to delete record');
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Revert Version
  const handleRevert = async (versionId: string, verNum: number) => {
    if (!selectedRecord) return;
    if (!confirm(`Revert this record to version #${verNum}?`)) return;
    try {
      const res = await fetch(`/api/fuel-commission/${selectedRecord.id}/revert`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ versionId }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setIsVersionModalOpen(false);
        setActionMessage({ text: `Reverted record to snapshot #${verNum}!`, type: 'success' });
        fetchRecords();
      } else {
        alert(data.error || 'Failed to revert version');
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Restore Record
  const handleRestore = async (id: string) => {
    try {
      const res = await fetch(`/api/fuel-commission/${id}/restore`, { method: 'POST' });
      const data = await res.json();
      if (res.ok && data.success) {
        setActionMessage({ text: `Record successfully restored!`, type: 'success' });
        openRecycleBin();
        fetchRecords();
      } else {
        alert(data.error || 'Failed to restore record');
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Export CSV
  const handleExport = () => {
    const params = new URLSearchParams();
    if (filterFY !== 'ALL') params.set('financialYear', filterFY);
    if (filterMonth !== 'ALL') params.set('financialMonth', filterMonth);
    if (filterSite !== 'ALL') params.set('siteName', filterSite);
    window.open(`/api/fuel-commission/export?${params.toString()}`, '_blank');
  };

  // Separate monthly vs adjustment records
  const adjustmentRecords = records.filter((r) => r.category === 'ADJUSTMENT');
  const mainRecords = records.filter((r) => r.category !== 'ADJUSTMENT');

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {actionMessage && (
        <div
          className={`p-4 rounded-2xl flex items-center justify-between text-xs font-semibold shadow-sm transition-all ${
            actionMessage.type === 'success'
              ? 'bg-[#34C759]/10 text-[#34C759] border border-[#34C759]/20'
              : 'bg-[#FF3B30]/10 text-[#FF3B30] border border-[#FF3B30]/20'
          }`}
        >
          <div className="flex items-center space-x-2">
            {actionMessage.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-[#34C759]" />
            ) : (
              <AlertCircle className="w-4 h-4 text-[#FF3B30]" />
            )}
            <span>{actionMessage.text}</span>
          </div>
          <button type="button" onClick={() => setActionMessage(null)} className="text-[#86868B] hover:text-[#1D1D1F]">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Top Banner & Title */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-[#E5E5EA]">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-2xl bg-[#007AFF]/10 border border-[#007AFF]/20 flex items-center justify-center text-[#007AFF] shadow-2xs">
            <Fuel className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-xl md:text-2xl font-bold tracking-tight text-[#1D1D1F]">
                Fuel Commission Management
              </h1>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[#34C759]/10 text-[#34C759] border border-[#34C759]/20">
                <ShieldCheck className="w-3 h-3 mr-1" /> Reconciled: ₹2,00,890.06
              </span>
            </div>
            <p className="text-xs text-[#86868B] mt-0.5">
              Comprehensive Fuel Commission Tracking, Site Summaries & Bank Reconciliation
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          {isSuperAdmin && (
            <>
              <button
                type="button"
                onClick={openRecycleBin}
                className="inline-flex items-center px-3 py-1.5 text-xs font-semibold text-[#86868B] hover:text-[#1D1D1F] bg-[#FFFFFF] border border-[#E5E5EA] rounded-xl hover:bg-[#F2F2F7] shadow-2xs transition-colors"
              >
                <Archive className="w-3.5 h-3.5 mr-1.5" /> Recycle Bin
              </button>
              <button
                type="button"
                onClick={handleExport}
                className="inline-flex items-center px-3 py-1.5 text-xs font-semibold text-[#1D1D1F] bg-[#FFFFFF] border border-[#E5E5EA] rounded-xl hover:bg-[#F2F2F7] shadow-2xs transition-colors"
              >
                <Download className="w-3.5 h-3.5 mr-1.5 text-[#007AFF]" /> Export CSV
              </button>
              <button
                type="button"
                onClick={openAddModal}
                className="inline-flex items-center px-3.5 py-1.5 text-xs font-bold text-white bg-[#007AFF] hover:bg-[#007AFF]/90 rounded-xl shadow-2xs transition-colors"
              >
                <Plus className="w-3.5 h-3.5 mr-1.5" /> Add Commission Entry
              </button>
            </>
          )}
        </div>
      </div>

      {/* KPI Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Commission */}
        <div className="bg-[#FFFFFF] p-5 rounded-2xl border border-[#E5E5EA] shadow-2xs relative overflow-hidden">
          <div className="flex items-center justify-between text-xs text-[#86868B] font-medium mb-1">
            <span>Total Fuel Commission</span>
            <span className="text-[10px] bg-[#007AFF]/10 text-[#007AFF] px-1.5 py-0.5 rounded font-semibold">
              Master Total
            </span>
          </div>
          <div className="text-2xl font-bold text-[#007AFF] tracking-tight">
            ₹{metrics.totalCommission.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
          <div className="text-[11px] text-[#34C759] font-medium mt-1 flex items-center">
            <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Old (₹64.4k) + 2026 (₹1.61L) - Adj (₹24.9k)
          </div>
        </div>

        {/* Old Commission */}
        <div className="bg-[#FFFFFF] p-5 rounded-2xl border border-[#E5E5EA] shadow-2xs">
          <div className="flex items-center justify-between text-xs text-[#86868B] font-medium mb-1">
            <span>Old Commission / Opening</span>
            <span className="text-[10px] bg-[#F2F2F7] text-[#86868B] px-1.5 py-0.5 rounded font-semibold">
              Brought Forward
            </span>
          </div>
          <div className="text-2xl font-bold text-[#1D1D1F] tracking-tight">
            ₹{metrics.oldCommission.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
          <div className="text-[11px] text-[#86868B] font-medium mt-1">
            Opening commission balance (Excel Row 3)
          </div>
        </div>

        {/* 2026 Monthly Commission */}
        <div className="bg-[#FFFFFF] p-5 rounded-2xl border border-[#E5E5EA] shadow-2xs">
          <div className="flex items-center justify-between text-xs text-[#86868B] font-medium mb-1">
            <span>2026 Monthly Commission</span>
            <span className="text-[10px] bg-[#34C759]/10 text-[#34C759] px-1.5 py-0.5 rounded font-semibold">
              Jan–Sep 2026
            </span>
          </div>
          <div className="text-2xl font-bold text-[#1D1D1F] tracking-tight">
            ₹{metrics.monthlyTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
          <div className="text-[11px] text-[#86868B] font-medium mt-1">
            Sum of 33 granular monthly entries
          </div>
        </div>

        {/* Adjustments */}
        <div className="bg-[#FFFFFF] p-5 rounded-2xl border border-[#E5E5EA] shadow-2xs">
          <div className="flex items-center justify-between text-xs text-[#86868B] font-medium mb-1">
            <span>Total Adjustments</span>
            <span className="text-[10px] bg-[#FF3B30]/10 text-[#FF3B30] px-1.5 py-0.5 rounded font-semibold">
              Deductive
            </span>
          </div>
          <div className="text-2xl font-bold text-[#FF3B30] tracking-tight">
            ₹{metrics.adjustmentTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
          <div className="text-[11px] text-[#FF3B30] font-medium mt-1">
            Original reconciliation adjustment (Row 41)
          </div>
        </div>
      </div>

      {/* Earned vs Received vs Pending Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-[#FFFFFF] p-4 rounded-2xl border border-[#E5E5EA] shadow-2xs">
          <div className="flex items-center justify-between text-xs text-[#86868B] font-medium mb-1">
            <span>Commission Earned (Accrued)</span>
            <TrendingUp className="w-4 h-4 text-[#007AFF]" />
          </div>
          <div className="text-xl font-bold text-[#1D1D1F]">
            ₹{metrics.commissionEarned.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
          <p className="text-[11px] text-[#86868B] mt-0.5">Total service revenue billed/earned</p>
        </div>

        <div className="bg-[#FFFFFF] p-4 rounded-2xl border border-[#E5E5EA] shadow-2xs">
          <div className="flex items-center justify-between text-xs text-[#86868B] font-medium mb-1">
            <span>Commission Received (In Bank)</span>
            <CheckCircle2 className="w-4 h-4 text-[#34C759]" />
          </div>
          <div className="text-xl font-bold text-[#34C759]">
            ₹{metrics.commissionReceived.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
          <p className="text-[11px] text-[#34C759] mt-0.5">Deposited directly into bank account</p>
        </div>

        <div className="bg-[#FFFFFF] p-4 rounded-2xl border border-[#E5E5EA] shadow-2xs">
          <div className="flex items-center justify-between text-xs text-[#86868B] font-medium mb-1">
            <span>Commission Yet to Receive</span>
            <Clock className="w-4 h-4 text-[#FF9500]" />
          </div>
          <div className="text-xl font-bold text-[#FF9500]">
            ₹{metrics.commissionPending.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
          <p className="text-[11px] text-[#86868B] mt-0.5">Outstanding commission receivables</p>
        </div>
      </div>

      {/* Site-Wise Distribution Bar */}
      <div className="bg-[#FFFFFF] rounded-2xl border border-[#E5E5EA] p-4 shadow-2xs space-y-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Building2 className="w-4 h-4 text-[#007AFF]" />
            <h3 className="font-semibold text-xs text-[#1D1D1F]">
              Site & Client Commission Distribution (Click to Filter)
            </h3>
          </div>
          <span className="text-[11px] text-[#86868B]">
            {metrics.siteSummary.length} Active Sites
          </span>
        </div>

        <div className="flex flex-wrap gap-2 pt-1">
          {metrics.siteSummary.map((item) => {
            const isSelected = filterSite === item.siteName;
            return (
              <button
                key={item.siteName}
                type="button"
                onClick={() => setFilterSite(isSelected ? 'ALL' : item.siteName)}
                className={`inline-flex items-center px-3 py-1.5 rounded-xl text-xs transition-all ${
                  isSelected
                    ? 'bg-[#007AFF] text-white shadow-2xs font-bold'
                    : 'bg-[#F9F9FB] border border-[#E5E5EA] hover:border-[#007AFF] text-[#1D1D1F]'
                }`}
              >
                <span className="font-semibold mr-1.5">{item.siteName}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-md ${
                    isSelected ? 'bg-white/20 text-white' : 'bg-[#E5E5EA] text-[#86868B]'
                  }`}
                >
                  ₹{item.amount.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                </span>
                <span
                  className={`ml-1.5 text-[10px] font-bold ${
                    isSelected ? 'text-white/80' : 'text-[#86868B]'
                  }`}
                >
                  ({item.count})
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Advanced Filter Toolbar */}
      <div className="bg-[#FFFFFF] rounded-2xl border border-[#E5E5EA] p-4 shadow-2xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center space-x-2">
            <SlidersHorizontal className="w-4 h-4 text-[#007AFF]" />
            <h3 className="font-semibold text-xs text-[#1D1D1F]">
              Advanced Filter Toolbar
            </h3>
            <span className="text-[11px] text-[#007AFF] bg-[#007AFF]/10 px-2 py-0.5 rounded-full font-semibold">
              Showing {metrics.filteredCount} entries (₹{metrics.filteredTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })})
            </span>
          </div>

          <div className="flex items-center space-x-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-[#86868B] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search site, ref, vehicle..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8 pr-3 py-1.5 text-xs bg-[#FFFFFF] border border-[#E5E5EA] rounded-xl focus:outline-hidden focus:border-[#007AFF] w-48 sm:w-64"
              />
            </div>
            <button
              type="button"
              onClick={handleClearFilters}
              className="px-3 py-1.5 text-xs font-semibold text-[#86868B] hover:text-[#1D1D1F] bg-[#F2F2F7] hover:bg-[#E5E5EA] rounded-xl transition-colors"
            >
              Clear Filters
            </button>
          </div>
        </div>

        {/* Filter Dropdowns */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 pt-1 text-xs">
          <div>
            <label className="block text-[11px] font-semibold text-[#86868B] mb-1">Financial Year</label>
            <select
              value={filterFY}
              onChange={(e) => setFilterFY(e.target.value)}
              className="w-full px-2.5 py-1.5 bg-[#FFFFFF] border border-[#E5E5EA] rounded-xl text-[#1D1D1F] focus:outline-hidden focus:border-[#007AFF]"
            >
              <option value="ALL">All Years</option>
              {filterOptions.years.map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-[#86868B] mb-1">Month</label>
            <select
              value={filterMonth}
              onChange={(e) => setFilterMonth(e.target.value)}
              className="w-full px-2.5 py-1.5 bg-[#FFFFFF] border border-[#E5E5EA] rounded-xl text-[#1D1D1F] focus:outline-hidden focus:border-[#007AFF]"
            >
              <option value="ALL">All Months</option>
              {filterOptions.months.map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-[#86868B] mb-1">Site / Client</label>
            <select
              value={filterSite}
              onChange={(e) => setFilterSite(e.target.value)}
              className="w-full px-2.5 py-1.5 bg-[#FFFFFF] border border-[#E5E5EA] rounded-xl text-[#1D1D1F] focus:outline-hidden focus:border-[#007AFF]"
            >
              <option value="ALL">All Sites</option>
              {filterOptions.sites.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-[#86868B] mb-1">Category</label>
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="w-full px-2.5 py-1.5 bg-[#FFFFFF] border border-[#E5E5EA] rounded-xl text-[#1D1D1F] focus:outline-hidden focus:border-[#007AFF]"
            >
              <option value="ALL">All Categories</option>
              <option value="MONTHLY">Monthly Commission</option>
              <option value="OPENING">Old Commission / Opening</option>
              <option value="ADJUSTMENT">Adjustments</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-[#86868B] mb-1">Status</label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full px-2.5 py-1.5 bg-[#FFFFFF] border border-[#E5E5EA] rounded-xl text-[#1D1D1F] focus:outline-hidden focus:border-[#007AFF]"
            >
              <option value="ALL">All Statuses</option>
              <option value="PENDING">Pending</option>
              <option value="RECEIVED">Received</option>
              <option value="PARTIALLY_RECEIVED">Partially Received</option>
              <option value="CONFIRMED">Confirmed</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Ledger Table */}
      <div className="bg-[#FFFFFF] rounded-2xl border border-[#E5E5EA] shadow-2xs overflow-hidden">
        <div className="p-4 border-b border-[#E5E5EA] flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#FBFBFC]">
          <div>
            <h2 className="font-semibold text-sm text-[#1D1D1F]">
              Fuel Commission Ledger ({mainRecords.length} Entries)
            </h2>
            <p className="text-xs text-[#86868B]">
              Granular earned and received commission records with version history
            </p>
          </div>
          <div className="text-xs font-mono text-[#86868B]">
            Subtotal: <span className="font-bold text-[#1D1D1F]">₹{mainRecords.reduce((s, r) => s + r.amount, 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-[#E5E5EA] bg-[#F9F9FB] text-[#86868B] font-semibold">
                <th className="py-2.5 px-4">Period / Month</th>
                <th className="py-2.5 px-4">Date</th>
                <th className="py-2.5 px-4">Site / Company</th>
                <th className="py-2.5 px-4">Vehicle #</th>
                <th className="py-2.5 px-4">Category</th>
                <th className="py-2.5 px-4 text-right">Earned (₹)</th>
                <th className="py-2.5 px-4 text-right">Received (₹)</th>
                <th className="py-2.5 px-4 text-right">Pending (₹)</th>
                <th className="py-2.5 px-4 text-center">Status</th>
                <th className="py-2.5 px-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E5EA]">
              {loading ? (
                <tr>
                  <td colSpan={10} className="py-8 text-center text-[#86868B]">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-[#007AFF]" />
                    Loading fuel commission records...
                  </td>
                </tr>
              ) : mainRecords.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-8 text-center text-[#86868B]">
                    No commission entries match the selected filters.
                  </td>
                </tr>
              ) : (
                mainRecords.map((item) => (
                  <tr key={item.id} className="hover:bg-[#F9F9FB]/60 transition-colors">
                    <td className="py-2.5 px-4 font-semibold text-[#1D1D1F] whitespace-nowrap">
                      {item.financialMonth}
                      <span className="block text-[10px] text-[#86868B] font-normal">{item.financialYear}</span>
                    </td>
                    <td className="py-2.5 px-4 text-[#86868B] whitespace-nowrap">
                      {item.commissionDate}
                    </td>
                    <td className="py-2.5 px-4 font-medium text-[#1D1D1F]">
                      <span className="font-bold text-[#007AFF]">{item.siteName}</span>
                      {item.description && (
                        <span className="block text-[11px] text-[#86868B] font-normal">
                          {item.description}
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 px-4 text-[#86868B] font-mono text-[11px]">
                      {item.vehicleNumber || '-'}
                    </td>
                    <td className="py-2.5 px-4">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-md text-[10px] font-semibold ${
                          item.category === 'OPENING'
                            ? 'bg-[#34C759]/10 text-[#34C759]'
                            : 'bg-[#007AFF]/10 text-[#007AFF]'
                        }`}
                      >
                        {item.category}
                      </span>
                    </td>
                    <td className="py-2.5 px-4 text-right font-bold text-[#1D1D1F] tabular-nums whitespace-nowrap">
                      ₹{item.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-2.5 px-4 text-right font-medium text-[#34C759] tabular-nums whitespace-nowrap">
                      {item.receivedAmount > 0
                        ? `₹${item.receivedAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`
                        : '-'}
                    </td>
                    <td className="py-2.5 px-4 text-right font-medium text-[#FF9500] tabular-nums whitespace-nowrap">
                      ₹{item.pendingAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-2.5 px-4 text-center">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-md text-[10px] font-semibold ${
                          item.status === 'RECEIVED'
                            ? 'bg-[#34C759]/10 text-[#34C759]'
                            : item.status === 'PARTIALLY_RECEIVED'
                            ? 'bg-[#FF9500]/10 text-[#FF9500]'
                            : 'bg-[#86868B]/10 text-[#86868B]'
                        }`}
                      >
                        {item.status}
                      </span>
                    </td>
                    <td className="py-2.5 px-4 text-center">
                      <div className="flex items-center justify-center space-x-1.5">
                        {isSuperAdmin && (
                          <>
                            <button
                              type="button"
                              onClick={() => openReceiptModal(item)}
                              title="Record Bank Receipt"
                              className="p-1 text-[#34C759] hover:bg-[#34C759]/10 rounded-lg transition-colors"
                            >
                              <Receipt className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => openEditModal(item)}
                              title="Edit Entry"
                              className="p-1 text-[#007AFF] hover:bg-[#007AFF]/10 rounded-lg transition-colors"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDelete(item.id, item.siteName, item.amount)}
                              title="Move to Recycle Bin"
                              className="p-1 text-[#FF3B30] hover:bg-[#FF3B30]/10 rounded-lg transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </>
                        )}
                        <button
                          type="button"
                          onClick={() => openVersionModal(item)}
                          title="Version History & Revert"
                          className="p-1 text-[#86868B] hover:bg-[#F2F2F7] rounded-lg transition-colors"
                        >
                          <History className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Separate Adjustments Section */}
      <div className="bg-[#FFFFFF] rounded-2xl border border-[#E5E5EA] shadow-2xs overflow-hidden">
        <div className="p-4 border-b border-[#E5E5EA] flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#FBFBFC]">
          <div>
            <h2 className="font-semibold text-sm text-[#1D1D1F]">
              Fuel Commission Adjustments & Corrections
            </h2>
            <p className="text-xs text-[#86868B]">
              Independent adjustment ledger preserving historical corrections
            </p>
          </div>
          <div className="text-xs font-mono text-[#FF3B30] font-bold">
            Total Adjustment: ₹{adjustmentRecords.reduce((s, r) => s + r.amount, 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-[#E5E5EA] bg-[#F9F9FB] text-[#86868B] font-semibold">
                <th className="py-2.5 px-4">Period</th>
                <th className="py-2.5 px-4">Date</th>
                <th className="py-2.5 px-4">Adjustment Name</th>
                <th className="py-2.5 px-4">Description / Reference</th>
                <th className="py-2.5 px-4 text-right">Adjustment Amount (₹)</th>
                <th className="py-2.5 px-4 text-center">Status</th>
                <th className="py-2.5 px-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E5EA]">
              {adjustmentRecords.map((item) => (
                <tr key={item.id} className="hover:bg-[#F9F9FB]/60 transition-colors">
                  <td className="py-2.5 px-4 font-semibold text-[#1D1D1F]">
                    {item.financialMonth}
                  </td>
                  <td className="py-2.5 px-4 text-[#86868B]">
                    {item.commissionDate}
                  </td>
                  <td className="py-2.5 px-4 font-bold text-[#FF3B30]">
                    {item.siteName}
                  </td>
                  <td className="py-2.5 px-4 text-[#86868B]">
                    {item.description || item.remarks || 'Reconciliation Adjustment'}
                    {item.transactionReference && (
                      <span className="block font-mono text-[10px] text-[#86868B]">{item.transactionReference}</span>
                    )}
                  </td>
                  <td className="py-2.5 px-4 text-right font-bold text-[#FF3B30] tabular-nums whitespace-nowrap">
                    ₹{item.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="py-2.5 px-4 text-center">
                    <span className="inline-block px-2 py-0.5 rounded-md text-[10px] font-semibold bg-[#FF3B30]/10 text-[#FF3B30]">
                      {item.status}
                    </span>
                  </td>
                  <td className="py-2.5 px-4 text-center">
                    <div className="flex items-center justify-center space-x-1.5">
                      {isSuperAdmin && (
                        <>
                          <button
                            type="button"
                            onClick={() => openEditModal(item)}
                            title="Edit Adjustment"
                            className="p-1 text-[#007AFF] hover:bg-[#007AFF]/10 rounded-lg transition-colors"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                        </>
                      )}
                      <button
                        type="button"
                        onClick={() => openVersionModal(item)}
                        title="Version History"
                        className="p-1 text-[#86868B] hover:bg-[#F2F2F7] rounded-lg transition-colors"
                      >
                        <History className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL: ADD ENTRY */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#FFFFFF] w-full max-w-lg rounded-2xl shadow-xl border border-[#E5E5EA] overflow-hidden">
            <div className="p-4 border-b border-[#E5E5EA] flex items-center justify-between bg-[#FBFBFC]">
              <h3 className="font-bold text-sm text-[#1D1D1F] flex items-center">
                <Plus className="w-4 h-4 mr-2 text-[#007AFF]" /> Add Fuel Commission Entry
              </h3>
              <button type="button" onClick={() => setIsAddModalOpen(false)} className="text-[#86868B] hover:text-[#1D1D1F]">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddSubmit} className="p-4 space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-[#86868B] mb-1">Financial Year *</label>
                  <input
                    type="text"
                    required
                    value={formData.financialYear}
                    onChange={(e) => setFormData({ ...formData, financialYear: e.target.value })}
                    className="w-full px-3 py-1.5 bg-[#FFFFFF] border border-[#E5E5EA] rounded-xl focus:border-[#007AFF] focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-[#86868B] mb-1">Financial Month *</label>
                  <input
                    type="text"
                    required
                    value={formData.financialMonth}
                    onChange={(e) => setFormData({ ...formData, financialMonth: e.target.value })}
                    placeholder="e.g. Nov-26"
                    className="w-full px-3 py-1.5 bg-[#FFFFFF] border border-[#E5E5EA] rounded-xl focus:border-[#007AFF] focus:outline-hidden"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-[#86868B] mb-1">Site / Client Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.siteName}
                    onChange={(e) => setFormData({ ...formData, siteName: e.target.value })}
                    placeholder="e.g. AMZ, Hari, ECO, WF, New Site"
                    className="w-full px-3 py-1.5 bg-[#FFFFFF] border border-[#E5E5EA] rounded-xl focus:border-[#007AFF] focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-[#86868B] mb-1">Vehicle # (Optional)</label>
                  <input
                    type="text"
                    value={formData.vehicleNumber}
                    onChange={(e) => setFormData({ ...formData, vehicleNumber: e.target.value })}
                    placeholder="e.g. KA41D 6188"
                    className="w-full px-3 py-1.5 bg-[#FFFFFF] border border-[#E5E5EA] rounded-xl focus:border-[#007AFF] focus:outline-hidden"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-[#86868B] mb-1">Commission Amount (₹) *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    placeholder="e.g. 5200.00 (negative for adjustment)"
                    className="w-full px-3 py-1.5 bg-[#FFFFFF] border border-[#E5E5EA] rounded-xl focus:border-[#007AFF] focus:outline-hidden font-bold"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-[#86868B] mb-1">Category</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full px-3 py-1.5 bg-[#FFFFFF] border border-[#E5E5EA] rounded-xl focus:border-[#007AFF] focus:outline-hidden"
                  >
                    <option value="MONTHLY">Monthly Commission</option>
                    <option value="ADJUSTMENT">Adjustment / Deduction</option>
                    <option value="OPENING">Old Commission / Opening</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-[#86868B] mb-1">Commission Date</label>
                  <input
                    type="date"
                    value={formData.commissionDate}
                    onChange={(e) => setFormData({ ...formData, commissionDate: e.target.value })}
                    className="w-full px-3 py-1.5 bg-[#FFFFFF] border border-[#E5E5EA] rounded-xl focus:border-[#007AFF] focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-[#86868B] mb-1">Status</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="w-full px-3 py-1.5 bg-[#FFFFFF] border border-[#E5E5EA] rounded-xl focus:border-[#007AFF] focus:outline-hidden"
                  >
                    <option value="PENDING">Pending (Yet to Receive)</option>
                    <option value="RECEIVED">Received in Bank</option>
                    <option value="PARTIALLY_RECEIVED">Partially Received</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-[#86868B] mb-1">Description / Route Reference</label>
                <input
                  type="text"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="e.g. Fuel Commission - Route 1606"
                  className="w-full px-3 py-1.5 bg-[#FFFFFF] border border-[#E5E5EA] rounded-xl focus:border-[#007AFF] focus:outline-hidden"
                />
              </div>

              <div className="flex items-center justify-end space-x-2 pt-3 border-t border-[#E5E5EA]">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-1.5 bg-[#F2F2F7] hover:bg-[#E5E5EA] text-[#1D1D1F] font-semibold rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-1.5 bg-[#007AFF] hover:bg-[#007AFF]/90 text-white font-bold rounded-xl shadow-2xs transition-colors disabled:opacity-50"
                >
                  {submitting ? 'Saving...' : 'Create Entry'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: EDIT ENTRY */}
      {isEditModalOpen && selectedRecord && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#FFFFFF] w-full max-w-lg rounded-2xl shadow-xl border border-[#E5E5EA] overflow-hidden">
            <div className="p-4 border-b border-[#E5E5EA] flex items-center justify-between bg-[#FBFBFC]">
              <h3 className="font-bold text-sm text-[#1D1D1F] flex items-center">
                <Edit3 className="w-4 h-4 mr-2 text-[#007AFF]" /> Edit Commission Record: {selectedRecord.siteName}
              </h3>
              <button type="button" onClick={() => setIsEditModalOpen(false)} className="text-[#86868B] hover:text-[#1D1D1F]">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="p-4 space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-[#86868B] mb-1">Financial Month</label>
                  <input
                    type="text"
                    required
                    value={formData.financialMonth}
                    onChange={(e) => setFormData({ ...formData, financialMonth: e.target.value })}
                    className="w-full px-3 py-1.5 bg-[#FFFFFF] border border-[#E5E5EA] rounded-xl focus:border-[#007AFF] focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-[#86868B] mb-1">Site / Client Name</label>
                  <input
                    type="text"
                    required
                    value={formData.siteName}
                    onChange={(e) => setFormData({ ...formData, siteName: e.target.value })}
                    className="w-full px-3 py-1.5 bg-[#FFFFFF] border border-[#E5E5EA] rounded-xl focus:border-[#007AFF] focus:outline-hidden"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-[#86868B] mb-1">Amount (₹)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    className="w-full px-3 py-1.5 bg-[#FFFFFF] border border-[#E5E5EA] rounded-xl focus:border-[#007AFF] focus:outline-hidden font-bold"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-[#86868B] mb-1">Status</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="w-full px-3 py-1.5 bg-[#FFFFFF] border border-[#E5E5EA] rounded-xl focus:border-[#007AFF] focus:outline-hidden"
                  >
                    <option value="PENDING">Pending</option>
                    <option value="RECEIVED">Received</option>
                    <option value="PARTIALLY_RECEIVED">Partially Received</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-[#86868B] mb-1">Description / Notes</label>
                <input
                  type="text"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-1.5 bg-[#FFFFFF] border border-[#E5E5EA] rounded-xl focus:border-[#007AFF] focus:outline-hidden"
                />
              </div>

              <div className="p-3 bg-[#FF9500]/10 border border-[#FF9500]/20 rounded-xl space-y-1">
                <label className="block font-bold text-[#FF9500]">Mandatory Audit Change Reason *</label>
                <input
                  type="text"
                  required
                  placeholder="Explain why this historical entry is being modified..."
                  value={formData.changeReason}
                  onChange={(e) => setFormData({ ...formData, changeReason: e.target.value })}
                  className="w-full px-3 py-1.5 bg-[#FFFFFF] border border-[#FF9500]/40 rounded-xl focus:outline-hidden text-xs"
                />
              </div>

              <div className="flex items-center justify-end space-x-2 pt-3 border-t border-[#E5E5EA]">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-1.5 bg-[#F2F2F7] hover:bg-[#E5E5EA] text-[#1D1D1F] font-semibold rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-1.5 bg-[#007AFF] hover:bg-[#007AFF]/90 text-white font-bold rounded-xl shadow-2xs transition-colors disabled:opacity-50"
                >
                  {submitting ? 'Updating...' : 'Save & Create Snapshot'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: RECORD BANK RECEIPT */}
      {isReceiptModalOpen && selectedRecord && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#FFFFFF] w-full max-w-md rounded-2xl shadow-xl border border-[#E5E5EA] overflow-hidden">
            <div className="p-4 border-b border-[#E5E5EA] flex items-center justify-between bg-[#FBFBFC]">
              <h3 className="font-bold text-sm text-[#1D1D1F] flex items-center">
                <Receipt className="w-4 h-4 mr-2 text-[#34C759]" /> Record Bank Deposit Receipt
              </h3>
              <button type="button" onClick={() => setIsReceiptModalOpen(false)} className="text-[#86868B] hover:text-[#1D1D1F]">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleReceiptSubmit} className="p-4 space-y-3 text-xs">
              <div className="p-3 bg-[#F9F9FB] rounded-xl border border-[#E5E5EA] space-y-1">
                <div className="flex justify-between">
                  <span className="text-[#86868B]">Site / Client:</span>
                  <span className="font-bold text-[#1D1D1F]">{selectedRecord.siteName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#86868B]">Total Earned:</span>
                  <span className="font-bold text-[#1D1D1F]">₹{selectedRecord.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#86868B]">Already Received:</span>
                  <span className="font-bold text-[#34C759]">₹{selectedRecord.receivedAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#86868B]">Pending Amount:</span>
                  <span className="font-bold text-[#FF9500]">₹{selectedRecord.pendingAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-[#86868B] mb-1">Received Deposit Amount (₹) *</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={receiptForm.receiptAmount}
                  onChange={(e) => setReceiptForm({ ...receiptForm, receiptAmount: e.target.value })}
                  className="w-full px-3 py-1.5 bg-[#FFFFFF] border border-[#E5E5EA] rounded-xl focus:border-[#34C759] focus:outline-hidden font-bold text-sm text-[#34C759]"
                />
              </div>

              <div>
                <label className="block font-semibold text-[#86868B] mb-1">Bank Transaction Reference / Cheque #</label>
                <input
                  type="text"
                  placeholder="e.g. NEFT-ATH-202611, UTR123456"
                  value={receiptForm.bankReference}
                  onChange={(e) => setReceiptForm({ ...receiptForm, bankReference: e.target.value })}
                  className="w-full px-3 py-1.5 bg-[#FFFFFF] border border-[#E5E5EA] rounded-xl focus:border-[#007AFF] focus:outline-hidden font-mono"
                />
              </div>

              <div>
                <label className="block font-semibold text-[#86868B] mb-1">Deposit Date</label>
                <input
                  type="date"
                  value={receiptForm.receiptDate}
                  onChange={(e) => setReceiptForm({ ...receiptForm, receiptDate: e.target.value })}
                  className="w-full px-3 py-1.5 bg-[#FFFFFF] border border-[#E5E5EA] rounded-xl focus:border-[#007AFF] focus:outline-hidden"
                />
              </div>

              <div className="flex items-center justify-end space-x-2 pt-3 border-t border-[#E5E5EA]">
                <button
                  type="button"
                  onClick={() => setIsReceiptModalOpen(false)}
                  className="px-4 py-1.5 bg-[#F2F2F7] hover:bg-[#E5E5EA] text-[#1D1D1F] font-semibold rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-1.5 bg-[#34C759] hover:bg-[#34C759]/90 text-white font-bold rounded-xl shadow-2xs transition-colors disabled:opacity-50"
                >
                  {submitting ? 'Recording...' : 'Record Deposit'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: VERSION HISTORY & REVERT */}
      {isVersionModalOpen && selectedRecord && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#FFFFFF] w-full max-w-xl rounded-2xl shadow-xl border border-[#E5E5EA] overflow-hidden">
            <div className="p-4 border-b border-[#E5E5EA] flex items-center justify-between bg-[#FBFBFC]">
              <h3 className="font-bold text-sm text-[#1D1D1F] flex items-center">
                <History className="w-4 h-4 mr-2 text-[#007AFF]" /> Version History: {selectedRecord.siteName}
              </h3>
              <button type="button" onClick={() => setIsVersionModalOpen(false)} className="text-[#86868B] hover:text-[#1D1D1F]">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 max-h-96 overflow-y-auto space-y-3">
              {versions.length === 0 ? (
                <p className="text-center text-xs text-[#86868B] py-6">No previous versions found.</p>
              ) : (
                versions.map((ver) => {
                  const snap = JSON.parse(ver.snapshotData);
                  return (
                    <div key={ver.id} className="p-3 bg-[#F9F9FB] rounded-xl border border-[#E5E5EA] text-xs space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-[#1D1D1F]">Version #{ver.versionNumber}</span>
                        <span className="text-[10px] text-[#86868B]">{ver.createdAt.slice(0, 19).replace('T', ' ')}</span>
                      </div>
                      <p className="text-[11px] text-[#86868B]">
                        Reason: <span className="font-medium text-[#1D1D1F]">{ver.changeReason || 'No reason specified'}</span>
                      </p>
                      <div className="grid grid-cols-2 gap-2 text-[11px] bg-white p-2 rounded-lg border border-[#E5E5EA]">
                        <div>Amount: <span className="font-bold text-[#1D1D1F]">₹{snap.amount?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span></div>
                        <div>Month: <span className="font-semibold text-[#1D1D1F]">{snap.financialMonth}</span></div>
                        <div>Site: <span className="font-semibold text-[#1D1D1F]">{snap.siteName}</span></div>
                        <div>Status: <span className="font-semibold text-[#1D1D1F]">{snap.status}</span></div>
                      </div>
                      {isSuperAdmin && (
                        <div className="flex justify-end pt-1">
                          <button
                            type="button"
                            onClick={() => handleRevert(ver.id, ver.versionNumber)}
                            className="inline-flex items-center px-2.5 py-1 text-[11px] font-bold text-[#007AFF] bg-[#007AFF]/10 hover:bg-[#007AFF]/20 rounded-lg transition-colors"
                          >
                            <RotateCcw className="w-3 h-3 mr-1" /> Revert to this Version
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

      {/* MODAL: RECYCLE BIN */}
      {isRecycleBinOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#FFFFFF] w-full max-w-xl rounded-2xl shadow-xl border border-[#E5E5EA] overflow-hidden">
            <div className="p-4 border-b border-[#E5E5EA] flex items-center justify-between bg-[#FBFBFC]">
              <h3 className="font-bold text-sm text-[#1D1D1F] flex items-center">
                <Archive className="w-4 h-4 mr-2 text-[#FF3B30]" /> Fuel Commission Recycle Bin
              </h3>
              <button type="button" onClick={() => setIsRecycleBinOpen(false)} className="text-[#86868B] hover:text-[#1D1D1F]">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 max-h-96 overflow-y-auto space-y-3">
              {deletedRecords.length === 0 ? (
                <p className="text-center text-xs text-[#86868B] py-6">Recycle bin is empty.</p>
              ) : (
                deletedRecords.map((item) => (
                  <div key={item.id} className="p-3 bg-[#F9F9FB] rounded-xl border border-[#E5E5EA] text-xs flex items-center justify-between">
                    <div>
                      <div className="font-bold text-[#1D1D1F]">{item.siteName} — ₹{item.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
                      <div className="text-[10px] text-[#86868B]">{item.financialMonth} | {item.category}</div>
                    </div>
                    {isSuperAdmin && (
                      <button
                        type="button"
                        onClick={() => handleRestore(item.id)}
                        className="inline-flex items-center px-3 py-1.5 text-xs font-bold text-[#34C759] bg-[#34C759]/10 hover:bg-[#34C759]/20 rounded-xl transition-colors"
                      >
                        <RotateCcw className="w-3.5 h-3.5 mr-1" /> Restore
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

