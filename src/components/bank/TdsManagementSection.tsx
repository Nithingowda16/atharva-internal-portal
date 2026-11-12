'use client';

import React, { useState, useEffect } from 'react';
import {
  FileText,
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
} from 'lucide-react';

interface TdsRecord {
  id: string;
  financialYear: string;
  financialMonth: string;
  companyName: string;
  tdsCategory: string;
  amount: number;
  transactionDate: string;
  tdsReferenceNo?: string | null;
  invoiceReference?: string | null;
  accountingType: string;
  status: string;
  remarks?: string | null;
  createdAt: string;
  updatedAt: string;
  _count?: { versions: number };
}

interface TdsVersion {
  id: string;
  versionNumber: number;
  snapshotData: string;
  changeReason?: string | null;
  createdByEmail?: string | null;
  createdAt: string;
}

interface TdsMetrics {
  totalAmount: number;
  totalEntries: number;
  receivableAmount: number;
  paidAmount: number;
  pendingAmount: number;
  companySummary: Array<{ companyName: string; amount: number; count: number; percentage: number }>;
  monthlySummary: Array<{ month: string; amount: number; count: number }>;
  yearSummary: Array<{ year: string; amount: number; count: number }>;
}

interface Props {
  userRole: 'SUPER_ADMIN' | 'VIEWER';
}

export default function TdsManagementSection({ userRole }: Props) {
  const isSuperAdmin = userRole === 'SUPER_ADMIN';

  const [records, setRecords] = useState<TdsRecord[]>([]);
  const [metrics, setMetrics] = useState<TdsMetrics>({
    totalAmount: 20205.30,
    totalEntries: 2,
    receivableAmount: 20205.30,
    paidAmount: 0,
    pendingAmount: 0,
    companySummary: [],
    monthlySummary: [],
    yearSummary: [],
  });

  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterFY, setFilterFY] = useState('ALL');
  const [filterMonth, setFilterMonth] = useState('ALL');
  const [filterCompany, setFilterCompany] = useState('ALL');
  const [filterType, setFilterType] = useState('ALL');
  const [filterStatus, setFilterStatus] = useState('ALL');

  // Available filter options from server
  const [filterOptions, setFilterOptions] = useState<{
    companies: string[];
    categories: string[];
    years: string[];
    months: string[];
  }>({
    companies: ['ECO Travels'],
    categories: ['194C - Cab Transport'],
    years: ['2026-27', '2025-26'],
    months: ['Aug-26', 'Sep-26', 'Nov-26'],
  });

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isVersionModalOpen, setIsVersionModalOpen] = useState(false);
  const [isRecycleBinOpen, setIsRecycleBinOpen] = useState(false);

  // Active records for modals
  const [selectedRecord, setSelectedRecord] = useState<TdsRecord | null>(null);
  const [recordVersions, setRecordVersions] = useState<TdsVersion[]>([]);
  const [deletedRecords, setDeletedRecords] = useState<any[]>([]);
  const [actionLoading, setActionLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Form state
  const [formData, setFormData] = useState({
    financialYear: '2026-27',
    financialMonth: 'Nov-26',
    companyName: 'ECO Travels',
    tdsCategory: '194C - Cab Transport',
    amount: '',
    transactionDate: new Date().toISOString().split('T')[0],
    tdsReferenceNo: '',
    invoiceReference: '',
    accountingType: 'RECEIVABLE',
    status: 'CONFIRMED',
    remarks: '',
    changeReason: '',
  });

  const fetchTdsData = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (filterFY !== 'ALL') params.append('financialYear', filterFY);
      if (filterMonth !== 'ALL') params.append('financialMonth', filterMonth);
      if (filterCompany !== 'ALL') params.append('companyName', filterCompany);
      if (filterType !== 'ALL') params.append('accountingType', filterType);
      if (filterStatus !== 'ALL') params.append('status', filterStatus);

      const res = await fetch(`/api/bank/tds?${params.toString()}`);
      const data = await res.json();
      if (data.success) {
        setRecords(data.records || []);
        if (data.metrics) setMetrics(data.metrics);
        if (data.filters) {
          setFilterOptions({
            companies: Array.from(new Set([...filterOptions.companies, ...(data.filters.companies || [])])),
            categories: Array.from(new Set([...filterOptions.categories, ...(data.filters.categories || [])])),
            years: Array.from(new Set([...filterOptions.years, ...(data.filters.years || [])])),
            months: Array.from(new Set([...filterOptions.months, ...(data.filters.months || [])])),
          });
        }
      }
    } catch (e: any) {
      console.error('Failed to load TDS data:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTdsData();
  }, [search, filterFY, filterMonth, filterCompany, filterType, filterStatus]);

  // Open Edit Modal
  const openEditModal = (rec: TdsRecord) => {
    setSelectedRecord(rec);
    setFormData({
      financialYear: rec.financialYear,
      financialMonth: rec.financialMonth,
      companyName: rec.companyName,
      tdsCategory: rec.tdsCategory,
      amount: String(rec.amount),
      transactionDate: rec.transactionDate,
      tdsReferenceNo: rec.tdsReferenceNo || '',
      invoiceReference: rec.invoiceReference || '',
      accountingType: rec.accountingType,
      status: rec.status,
      remarks: rec.remarks || '',
      changeReason: '',
    });
    setErrorMsg('');
    setIsEditModalOpen(true);
  };

  // Open Version History Modal
  const openVersionModal = async (rec: TdsRecord) => {
    setSelectedRecord(rec);
    setIsVersionModalOpen(true);
    try {
      const res = await fetch(`/api/bank/tds/${rec.id}`);
      const data = await res.json();
      if (data.success && data.record) {
        setRecordVersions(data.record.versions || []);
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Open Recycle Bin Modal
  const openRecycleBin = async () => {
    setIsRecycleBinOpen(true);
    try {
      const res = await fetch('/api/bank/tds/recycle-bin');
      const data = await res.json();
      if (data.success) {
        setDeletedRecords(data.records || []);
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Handle Create TDS Record
  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.amount || Number(formData.amount) <= 0) {
      setErrorMsg('Please enter a valid positive TDS amount.');
      return;
    }
    setActionLoading(true);
    setErrorMsg('');
    try {
      const res = await fetch('/api/bank/tds', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create TDS record');

      setSuccessMsg(`TDS entry for ${formData.companyName} created successfully.`);
      setIsAddModalOpen(false);
      fetchTdsData();
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  // Handle Edit TDS Record
  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRecord) return;
    if (!formData.changeReason || formData.changeReason.trim() === '') {
      setErrorMsg('Mandatory reason for modification must be provided for audit tracking.');
      return;
    }
    setActionLoading(true);
    setErrorMsg('');
    try {
      const res = await fetch(`/api/bank/tds/${selectedRecord.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update TDS record');

      setSuccessMsg(`TDS entry updated and version snapshot saved.`);
      setIsEditModalOpen(false);
      fetchTdsData();
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  // Handle Soft Delete
  const handleDelete = async (rec: TdsRecord) => {
    if (!confirm(`Are you sure you want to move TDS record for ${rec.companyName} (₹${rec.amount.toLocaleString('en-IN')}) to the Recycle Bin?`)) {
      return;
    }
    try {
      const res = await fetch(`/api/bank/tds/${rec.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to delete record');

      setSuccessMsg(`TDS record moved to Recycle Bin.`);
      fetchTdsData();
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Handle Revert Version
  const handleRevert = async (versionNumber: number) => {
    if (!selectedRecord) return;
    if (!confirm(`Revert this record to version ${versionNumber}? Current values will be safely snapshotted.`)) {
      return;
    }
    setActionLoading(true);
    try {
      const res = await fetch(`/api/bank/tds/${selectedRecord.id}/revert`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ versionNumber }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to revert version');

      setSuccessMsg(`Record successfully reverted to version ${versionNumber}.`);
      setIsVersionModalOpen(false);
      fetchTdsData();
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  // Handle Restore Deleted Record
  const handleRestore = async (id: string) => {
    try {
      const res = await fetch(`/api/bank/tds/${id}/restore`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to restore record');

      setSuccessMsg('Record restored from Recycle Bin.');
      openRecycleBin();
      fetchTdsData();
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Export CSV
  const handleExport = () => {
    const params = new URLSearchParams();
    if (filterFY !== 'ALL') params.append('financialYear', filterFY);
    if (filterCompany !== 'ALL') params.append('companyName', filterCompany);
    window.open(`/api/bank/tds/export?${params.toString()}`, '_blank');
  };

  return (
    <div className="space-y-6">
      {/* Alert Messages */}
      {successMsg && (
        <div className="p-3.5 bg-[#34C759]/10 border border-[#34C759]/20 rounded-xl text-xs text-[#34C759] font-medium flex items-center justify-between">
          <div className="flex items-center">
            <CheckCircle2 className="w-4 h-4 mr-2" />
            {successMsg}
          </div>
          <button type="button" onClick={() => setSuccessMsg('')}><X className="w-3.5 h-3.5" /></button>
        </div>
      )}

      {/* Summary KPI Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total TDS */}
        <div className="bg-[#FFFFFF] p-5 rounded-2xl border border-[#E5E5EA] shadow-2xs relative overflow-hidden">
          <div className="flex items-center justify-between text-xs text-[#86868B] font-medium mb-1">
            <span>Total TDS Amount</span>
            <span className="text-[10px] bg-[#007AFF]/10 text-[#007AFF] px-2 py-0.5 rounded-full font-semibold">
              {metrics.totalEntries} Entries
            </span>
          </div>
          <div className="text-2xl font-bold text-[#1D1D1F] tracking-tight">
            ₹{metrics.totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
          <div className="text-[11px] text-[#86868B] font-medium mt-1">
            Reconciled with Row 72 (GST & TDS)
          </div>
        </div>

        {/* TDS Receivable */}
        <div className="bg-[#FFFFFF] p-5 rounded-2xl border border-[#E5E5EA] shadow-2xs">
          <div className="flex items-center justify-between text-xs text-[#86868B] font-medium mb-1">
            <span>TDS Receivable</span>
            <span className="text-[10px] bg-[#34C759]/10 text-[#34C759] px-2 py-0.5 rounded-full font-semibold">
              Asset
            </span>
          </div>
          <div className="text-2xl font-bold text-[#34C759] tracking-tight">
            ₹{metrics.receivableAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
          <div className="text-[11px] text-[#86868B] font-medium mt-1">
            Deducted by clients (e.g. ECO)
          </div>
        </div>

        {/* TDS Paid to Govt */}
        <div className="bg-[#FFFFFF] p-5 rounded-2xl border border-[#E5E5EA] shadow-2xs">
          <div className="flex items-center justify-between text-xs text-[#86868B] font-medium mb-1">
            <span>TDS Paid to Govt</span>
            <span className="text-[10px] bg-[#86868B]/10 text-[#86868B] px-2 py-0.5 rounded-full font-semibold">
              Bank Cash
            </span>
          </div>
          <div className="text-2xl font-bold text-[#1D1D1F] tracking-tight">
            ₹{metrics.paidAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
          <div className="text-[11px] text-[#86868B] font-medium mt-1">
            Direct government challans
          </div>
        </div>

        {/* Pending TDS Payments */}
        <div className="bg-[#FFFFFF] p-5 rounded-2xl border border-[#E5E5EA] shadow-2xs">
          <div className="flex items-center justify-between text-xs text-[#86868B] font-medium mb-1">
            <span>Pending TDS</span>
            <span className="text-[10px] bg-[#FF9500]/10 text-[#FF9500] px-2 py-0.5 rounded-full font-semibold">
              Pending
            </span>
          </div>
          <div className="text-2xl font-bold text-[#FF9500] tracking-tight">
            ₹{metrics.pendingAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
          <div className="text-[11px] text-[#86868B] font-medium mt-1">
            Unconfirmed / Pending settlement
          </div>
        </div>
      </div>

      {/* Company Distribution & Accounting Logic Pill Row */}
      <div className="bg-[#FFFFFF] p-4 rounded-2xl border border-[#E5E5EA] shadow-2xs flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center space-x-2">
          <Info className="w-4 h-4 text-[#007AFF]" />
          <span className="font-semibold text-[#1D1D1F]">Company-wise TDS Distribution:</span>
          {metrics.companySummary.length > 0 ? (
            metrics.companySummary.map((cs) => (
              <span key={cs.companyName} className="inline-flex items-center px-2.5 py-1 bg-[#F2F2F7] rounded-lg font-medium text-[#1D1D1F]">
                {cs.companyName}: <strong className="ml-1 text-[#007AFF]">₹{cs.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</strong>
                <span className="ml-1 text-[10px] text-[#86868B]">({cs.percentage.toFixed(0)}%)</span>
              </span>
            ))
          ) : (
            <span className="text-[#86868B]">No company records</span>
          )}
        </div>

        <div className="flex items-center space-x-2">
          <span className="text-[#86868B]">Accounting Treatment:</span>
          <span className="px-2 py-0.5 bg-[#34C759]/10 text-[#34C759] rounded-md font-medium text-[11px]">
            Receivable (Does not reduce Bank Cash)
          </span>
        </div>
      </div>

      {/* Main Ledger Table Card */}
      <div className="bg-[#FFFFFF] rounded-2xl border border-[#E5E5EA] shadow-2xs overflow-hidden">
        {/* Controls Toolbar */}
        <div className="p-4 border-b border-[#E5E5EA] flex flex-col md:flex-row md:items-center justify-between gap-3 bg-[#FBFBFC]">
          {/* Search Input */}
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#86868B]" />
            <input
              type="text"
              placeholder="Search company, reference, remarks..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-[#FFFFFF] border border-[#E5E5EA] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#007AFF] text-[#1D1D1F]"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex items-center space-x-2">
            {isSuperAdmin && (
              <>
                <button
                  type="button"
                  onClick={openRecycleBin}
                  className="inline-flex items-center px-3 py-1.5 text-xs font-semibold text-[#86868B] bg-[#F2F2F7] hover:bg-[#E5E5EA] rounded-xl transition-colors"
                  title="View Recycle Bin"
                >
                  <Archive className="w-3.5 h-3.5 mr-1.5" />
                  Recycle Bin
                </button>
                <button
                  type="button"
                  onClick={handleExport}
                  className="inline-flex items-center px-3 py-1.5 text-xs font-semibold text-[#1D1D1F] bg-[#F2F2F7] hover:bg-[#E5E5EA] rounded-xl transition-colors"
                >
                  <Download className="w-3.5 h-3.5 mr-1.5" />
                  Export
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setFormData({
                      financialYear: '2026-27',
                      financialMonth: 'Nov-26',
                      companyName: 'ECO Travels',
                      tdsCategory: '194C - Cab Transport',
                      amount: '',
                      transactionDate: new Date().toISOString().split('T')[0],
                      tdsReferenceNo: '',
                      invoiceReference: '',
                      accountingType: 'RECEIVABLE',
                      status: 'CONFIRMED',
                      remarks: '',
                      changeReason: '',
                    });
                    setErrorMsg('');
                    setIsAddModalOpen(true);
                  }}
                  className="inline-flex items-center px-3.5 py-1.5 text-xs font-semibold text-white bg-[#007AFF] hover:bg-[#0062CC] rounded-xl shadow-xs transition-colors"
                >
                  <Plus className="w-3.5 h-3.5 mr-1.5" />
                  + Add TDS
                </button>
              </>
            )}
          </div>
        </div>

        {/* Filters Row */}
        <div className="p-3 border-b border-[#E5E5EA] bg-[#FFFFFF] flex flex-wrap items-center gap-2 text-xs">
          <div className="flex items-center text-[#86868B] mr-2">
            <Filter className="w-3.5 h-3.5 mr-1" />
            <span>Filters:</span>
          </div>

          {/* FY Filter */}
          <select
            value={filterFY}
            onChange={(e) => setFilterFY(e.target.value)}
            className="px-2.5 py-1 bg-[#F2F2F7] border-0 rounded-lg text-xs font-medium text-[#1D1D1F] focus:ring-1 focus:ring-[#007AFF]"
          >
            <option value="ALL">All FY</option>
            {filterOptions.years.map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>

          {/* Month Filter */}
          <select
            value={filterMonth}
            onChange={(e) => setFilterMonth(e.target.value)}
            className="px-2.5 py-1 bg-[#F2F2F7] border-0 rounded-lg text-xs font-medium text-[#1D1D1F] focus:ring-1 focus:ring-[#007AFF]"
          >
            <option value="ALL">All Months</option>
            {filterOptions.months.map((m) => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>

          {/* Company Filter */}
          <select
            value={filterCompany}
            onChange={(e) => setFilterCompany(e.target.value)}
            className="px-2.5 py-1 bg-[#F2F2F7] border-0 rounded-lg text-xs font-medium text-[#1D1D1F] focus:ring-1 focus:ring-[#007AFF]"
          >
            <option value="ALL">All Companies</option>
            {filterOptions.companies.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>

          {/* Accounting Type */}
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="px-2.5 py-1 bg-[#F2F2F7] border-0 rounded-lg text-xs font-medium text-[#1D1D1F] focus:ring-1 focus:ring-[#007AFF]"
          >
            <option value="ALL">All Types</option>
            <option value="RECEIVABLE">Receivable (Client Deducted)</option>
            <option value="PAID_GOVERNMENT">Paid to Govt</option>
            <option value="WITHHELD">Withheld</option>
            <option value="ADJUSTMENT">Adjustment</option>
          </select>

          {/* Status */}
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-2.5 py-1 bg-[#F2F2F7] border-0 rounded-lg text-xs font-medium text-[#1D1D1F] focus:ring-1 focus:ring-[#007AFF]"
          >
            <option value="ALL">All Status</option>
            <option value="CONFIRMED">Confirmed</option>
            <option value="PENDING">Pending</option>
            <option value="RECONCILED">Reconciled</option>
          </select>

          {(filterFY !== 'ALL' || filterMonth !== 'ALL' || filterCompany !== 'ALL' || filterType !== 'ALL' || filterStatus !== 'ALL') && (
            <button
              type="button"
              onClick={() => {
                setFilterFY('ALL');
                setFilterMonth('ALL');
                setFilterCompany('ALL');
                setFilterType('ALL');
                setFilterStatus('ALL');
              }}
              className="text-[#007AFF] hover:underline text-[11px] ml-2"
            >
              Reset Filters
            </button>
          )}
        </div>

        {/* Ledger Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[#E5E5EA] bg-[#FBFBFC] text-[11px] font-semibold text-[#86868B] uppercase tracking-wider">
                <th className="py-3 px-4">Period / Month</th>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Company</th>
                <th className="py-3 px-4">TDS Category</th>
                <th className="py-3 px-4">Accounting Type</th>
                <th className="py-3 px-4 text-right">TDS Amount (₹)</th>
                <th className="py-3 px-4">Ref / Invoice</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4">Remarks</th>
                {isSuperAdmin && <th className="py-3 px-4 text-right">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E5EA] text-xs">
              {loading ? (
                <tr>
                  <td colSpan={10} className="py-8 text-center text-[#86868B]">
                    <RefreshCw className="w-5 h-5 mx-auto animate-spin mb-2 text-[#007AFF]" />
                    Loading TDS transactions...
                  </td>
                </tr>
              ) : records.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-8 text-center text-[#86868B]">
                    No TDS records match the selected filters.
                  </td>
                </tr>
              ) : (
                records.map((r) => (
                  <tr key={r.id} className="hover:bg-[#F9F9FB] transition-colors">
                    {/* Period / Month */}
                    <td className="py-3 px-4">
                      <span className="font-semibold text-[#1D1D1F]">{r.financialMonth}</span>
                      <span className="text-[10px] text-[#86868B] block">{r.financialYear}</span>
                    </td>

                    {/* Date */}
                    <td className="py-3 px-4 font-mono text-[#1D1D1F]">
                      {r.transactionDate}
                    </td>

                    {/* Company */}
                    <td className="py-3 px-4 font-semibold text-[#1D1D1F]">
                      <div className="flex items-center space-x-1.5">
                        <Building2 className="w-3.5 h-3.5 text-[#007AFF]" />
                        <span>{r.companyName}</span>
                      </div>
                    </td>

                    {/* Category */}
                    <td className="py-3 px-4 text-[#86868B]">
                      {r.tdsCategory}
                    </td>

                    {/* Accounting Type */}
                    <td className="py-3 px-4">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold ${
                          r.accountingType === 'RECEIVABLE'
                            ? 'bg-[#34C759]/10 text-[#34C759]'
                            : r.accountingType === 'PAID_GOVERNMENT'
                            ? 'bg-[#007AFF]/10 text-[#007AFF]'
                            : 'bg-[#FF9500]/10 text-[#FF9500]'
                        }`}
                      >
                        {r.accountingType}
                      </span>
                    </td>

                    {/* Amount */}
                    <td className="py-3 px-4 text-right font-mono font-bold text-[#1D1D1F]">
                      ₹{r.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>

                    {/* Ref / Invoice */}
                    <td className="py-3 px-4 text-[#86868B] font-mono text-[11px]">
                      {r.tdsReferenceNo || r.invoiceReference || '—'}
                    </td>

                    {/* Status */}
                    <td className="py-3 px-4 text-center">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                          r.status === 'CONFIRMED'
                            ? 'bg-[#34C759]/10 text-[#34C759]'
                            : r.status === 'PENDING'
                            ? 'bg-[#FF9500]/10 text-[#FF9500]'
                            : 'bg-[#007AFF]/10 text-[#007AFF]'
                        }`}
                      >
                        {r.status}
                      </span>
                    </td>

                    {/* Remarks */}
                    <td className="py-3 px-4 text-[#86868B] max-w-xs truncate" title={r.remarks || ''}>
                      {r.remarks || '—'}
                    </td>

                    {/* Actions */}
                    {isSuperAdmin && (
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end space-x-1.5">
                          <button
                            type="button"
                            onClick={() => openVersionModal(r)}
                            className="p-1 text-[#86868B] hover:text-[#007AFF] hover:bg-[#007AFF]/10 rounded-lg transition-colors"
                            title={`Version History (${r._count?.versions || 1})`}
                          >
                            <History className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => openEditModal(r)}
                            className="p-1 text-[#86868B] hover:text-[#007AFF] hover:bg-[#007AFF]/10 rounded-lg transition-colors"
                            title="Edit Record"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(r)}
                            className="p-1 text-[#86868B] hover:text-[#FF3B30] hover:bg-[#FF3B30]/10 rounded-lg transition-colors"
                            title="Delete Record"
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

      {/* Add TDS Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-[#FFFFFF] rounded-2xl border border-[#E5E5EA] shadow-xl max-w-lg w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-4 border-b border-[#E5E5EA] flex items-center justify-between bg-[#FBFBFC]">
              <div className="flex items-center space-x-2">
                <Plus className="w-4 h-4 text-[#007AFF]" />
                <h3 className="font-semibold text-sm text-[#1D1D1F]">Add Future TDS Entry</h3>
              </div>
              <button type="button" onClick={() => setIsAddModalOpen(false)}><X className="w-4 h-4 text-[#86868B]" /></button>
            </div>

            <form onSubmit={handleCreate} className="p-5 space-y-4 text-xs">
              {errorMsg && (
                <div className="p-2.5 bg-[#FF3B30]/10 border border-[#FF3B30]/20 rounded-xl text-[#FF3B30] flex items-center">
                  <AlertCircle className="w-4 h-4 mr-1.5 shrink-0" />
                  {errorMsg}
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-[#1D1D1F] block mb-1">Financial Year *</label>
                  <input
                    type="text"
                    required
                    placeholder="2026-27"
                    value={formData.financialYear}
                    onChange={(e) => setFormData({ ...formData, financialYear: e.target.value })}
                    className="w-full px-3 py-1.5 bg-[#FFFFFF] border border-[#E5E5EA] rounded-xl focus:ring-2 focus:ring-[#007AFF] text-[#1D1D1F]"
                  />
                </div>
                <div>
                  <label className="font-semibold text-[#1D1D1F] block mb-1">Month *</label>
                  <input
                    type="text"
                    required
                    placeholder="Nov-26"
                    value={formData.financialMonth}
                    onChange={(e) => setFormData({ ...formData, financialMonth: e.target.value })}
                    className="w-full px-3 py-1.5 bg-[#FFFFFF] border border-[#E5E5EA] rounded-xl focus:ring-2 focus:ring-[#007AFF] text-[#1D1D1F]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-[#1D1D1F] block mb-1">Company Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. ECO Travels, ORIX, HCL"
                    value={formData.companyName}
                    onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                    className="w-full px-3 py-1.5 bg-[#FFFFFF] border border-[#E5E5EA] rounded-xl focus:ring-2 focus:ring-[#007AFF] text-[#1D1D1F]"
                  />
                </div>
                <div>
                  <label className="font-semibold text-[#1D1D1F] block mb-1">TDS Category *</label>
                  <input
                    type="text"
                    required
                    placeholder="194C - Cab Transport"
                    value={formData.tdsCategory}
                    onChange={(e) => setFormData({ ...formData, tdsCategory: e.target.value })}
                    className="w-full px-3 py-1.5 bg-[#FFFFFF] border border-[#E5E5EA] rounded-xl focus:ring-2 focus:ring-[#007AFF] text-[#1D1D1F]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-[#1D1D1F] block mb-1">TDS Amount (₹) *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="0.00"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    className="w-full px-3 py-1.5 bg-[#FFFFFF] border border-[#E5E5EA] rounded-xl focus:ring-2 focus:ring-[#007AFF] font-mono font-bold text-[#1D1D1F]"
                  />
                </div>
                <div>
                  <label className="font-semibold text-[#1D1D1F] block mb-1">Transaction Date *</label>
                  <input
                    type="date"
                    required
                    value={formData.transactionDate}
                    onChange={(e) => setFormData({ ...formData, transactionDate: e.target.value })}
                    className="w-full px-3 py-1.5 bg-[#FFFFFF] border border-[#E5E5EA] rounded-xl focus:ring-2 focus:ring-[#007AFF] text-[#1D1D1F]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-[#1D1D1F] block mb-1">Accounting Type</label>
                  <select
                    value={formData.accountingType}
                    onChange={(e) => setFormData({ ...formData, accountingType: e.target.value })}
                    className="w-full px-3 py-1.5 bg-[#FFFFFF] border border-[#E5E5EA] rounded-xl text-[#1D1D1F]"
                  >
                    <option value="RECEIVABLE">TDS Receivable (Client Deducted)</option>
                    <option value="PAID_GOVERNMENT">TDS Paid to Govt</option>
                    <option value="WITHHELD">Withheld from P/L</option>
                    <option value="ADJUSTMENT">Adjustment</option>
                  </select>
                </div>
                <div>
                  <label className="font-semibold text-[#1D1D1F] block mb-1">Status</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="w-full px-3 py-1.5 bg-[#FFFFFF] border border-[#E5E5EA] rounded-xl text-[#1D1D1F]"
                  >
                    <option value="CONFIRMED">CONFIRMED</option>
                    <option value="PENDING">PENDING</option>
                    <option value="RECONCILED">RECONCILED</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-[#1D1D1F] block mb-1">TDS Reference / Challan No</label>
                  <input
                    type="text"
                    placeholder="Optional"
                    value={formData.tdsReferenceNo}
                    onChange={(e) => setFormData({ ...formData, tdsReferenceNo: e.target.value })}
                    className="w-full px-3 py-1.5 bg-[#FFFFFF] border border-[#E5E5EA] rounded-xl text-[#1D1D1F]"
                  />
                </div>
                <div>
                  <label className="font-semibold text-[#1D1D1F] block mb-1">Invoice / Trip Ref</label>
                  <input
                    type="text"
                    placeholder="Optional"
                    value={formData.invoiceReference}
                    onChange={(e) => setFormData({ ...formData, invoiceReference: e.target.value })}
                    className="w-full px-3 py-1.5 bg-[#FFFFFF] border border-[#E5E5EA] rounded-xl text-[#1D1D1F]"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold text-[#1D1D1F] block mb-1">Remarks</label>
                <input
                  type="text"
                  placeholder="Optional notes or calculation details"
                  value={formData.remarks}
                  onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                  className="w-full px-3 py-1.5 bg-[#FFFFFF] border border-[#E5E5EA] rounded-xl text-[#1D1D1F]"
                />
              </div>

              <div className="pt-2 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-3 py-1.5 bg-[#F2F2F7] hover:bg-[#E5E5EA] text-[#1D1D1F] rounded-xl font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-4 py-1.5 bg-[#007AFF] hover:bg-[#0062CC] text-white rounded-xl font-semibold shadow-xs disabled:opacity-50"
                >
                  {actionLoading ? 'Saving...' : 'Save TDS Record'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit TDS Modal with Mandatory Reason */}
      {isEditModalOpen && selectedRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-[#FFFFFF] rounded-2xl border border-[#E5E5EA] shadow-xl max-w-lg w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-4 border-b border-[#E5E5EA] flex items-center justify-between bg-[#FBFBFC]">
              <div className="flex items-center space-x-2">
                <Edit3 className="w-4 h-4 text-[#007AFF]" />
                <h3 className="font-semibold text-sm text-[#1D1D1F]">
                  Edit TDS Entry – {selectedRecord.companyName}
                </h3>
              </div>
              <button type="button" onClick={() => setIsEditModalOpen(false)}><X className="w-4 h-4 text-[#86868B]" /></button>
            </div>

            <form onSubmit={handleUpdate} className="p-5 space-y-4 text-xs">
              {errorMsg && (
                <div className="p-2.5 bg-[#FF3B30]/10 border border-[#FF3B30]/20 rounded-xl text-[#FF3B30] flex items-center">
                  <AlertCircle className="w-4 h-4 mr-1.5 shrink-0" />
                  {errorMsg}
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-[#1D1D1F] block mb-1">Financial Year</label>
                  <input
                    type="text"
                    required
                    value={formData.financialYear}
                    onChange={(e) => setFormData({ ...formData, financialYear: e.target.value })}
                    className="w-full px-3 py-1.5 bg-[#FFFFFF] border border-[#E5E5EA] rounded-xl text-[#1D1D1F]"
                  />
                </div>
                <div>
                  <label className="font-semibold text-[#1D1D1F] block mb-1">Month</label>
                  <input
                    type="text"
                    required
                    value={formData.financialMonth}
                    onChange={(e) => setFormData({ ...formData, financialMonth: e.target.value })}
                    className="w-full px-3 py-1.5 bg-[#FFFFFF] border border-[#E5E5EA] rounded-xl text-[#1D1D1F]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-[#1D1D1F] block mb-1">Company</label>
                  <input
                    type="text"
                    required
                    value={formData.companyName}
                    onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                    className="w-full px-3 py-1.5 bg-[#FFFFFF] border border-[#E5E5EA] rounded-xl text-[#1D1D1F]"
                  />
                </div>
                <div>
                  <label className="font-semibold text-[#1D1D1F] block mb-1">Amount (₹)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    className="w-full px-3 py-1.5 bg-[#FFFFFF] border border-[#E5E5EA] rounded-xl font-mono font-bold text-[#1D1D1F]"
                  />
                </div>
              </div>

              {/* Mandatory Reason for Modification */}
              <div className="p-3 bg-[#FFF9E6] border border-[#FFE082] rounded-xl space-y-1">
                <label className="font-bold text-[#996500] flex items-center">
                  <ShieldCheck className="w-3.5 h-3.5 mr-1" />
                  Mandatory Modification Reason (Required for Audit History) *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Rate adjustment per revised invoice, Form 26AS reconciliation"
                  value={formData.changeReason}
                  onChange={(e) => setFormData({ ...formData, changeReason: e.target.value })}
                  className="w-full px-3 py-1.5 bg-white border border-[#FFE082] rounded-lg text-[#1D1D1F] font-medium"
                />
              </div>

              <div className="pt-2 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-3 py-1.5 bg-[#F2F2F7] hover:bg-[#E5E5EA] text-[#1D1D1F] rounded-xl font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-4 py-1.5 bg-[#007AFF] hover:bg-[#0062CC] text-white rounded-xl font-semibold shadow-xs disabled:opacity-50"
                >
                  {actionLoading ? 'Saving...' : 'Save & Snapshot Version'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Version History & Revert Modal */}
      {isVersionModalOpen && selectedRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-[#FFFFFF] rounded-2xl border border-[#E5E5EA] shadow-xl max-w-lg w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-4 border-b border-[#E5E5EA] flex items-center justify-between bg-[#FBFBFC]">
              <div className="flex items-center space-x-2">
                <History className="w-4 h-4 text-[#007AFF]" />
                <h3 className="font-semibold text-sm text-[#1D1D1F]">
                  Version History & Snapshot Revert
                </h3>
              </div>
              <button type="button" onClick={() => setIsVersionModalOpen(false)}><X className="w-4 h-4 text-[#86868B]" /></button>
            </div>

            <div className="p-5 space-y-3 max-h-96 overflow-y-auto text-xs">
              <div className="text-[#86868B] text-[11px] mb-2">
                Select any previous version snapshot to safely restore its financial amounts and attributes:
              </div>

              {recordVersions.length === 0 ? (
                <div className="text-center py-6 text-[#86868B]">No previous version history recorded.</div>
              ) : (
                recordVersions.map((v) => {
                  let snap: any = {};
                  try { snap = JSON.parse(v.snapshotData); } catch {}
                  return (
                    <div key={v.id} className="p-3 bg-[#F9F9FB] rounded-xl border border-[#E5E5EA] space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-[#1D1D1F] bg-[#E5E5EA] px-2 py-0.5 rounded text-[10px]">
                          Version {v.versionNumber}
                        </span>
                        <span className="text-[10px] text-[#86868B]">
                          {new Date(v.createdAt).toLocaleString()}
                        </span>
                      </div>
                      <div className="text-[11px] text-[#1D1D1F] font-mono pt-1">
                        Amount: <strong>₹{Number(snap.amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</strong> | {snap.companyName} ({snap.financialMonth})
                      </div>
                      <div className="text-[11px] text-[#86868B]">
                        Reason: <span className="italic">{v.changeReason || 'No reason provided'}</span>
                      </div>
                      {v.createdByEmail && (
                        <div className="text-[10px] text-[#86868B]">Saved by: {v.createdByEmail}</div>
                      )}
                      <div className="pt-2 text-right">
                        <button
                          type="button"
                          onClick={() => handleRevert(v.versionNumber)}
                          disabled={actionLoading}
                          className="inline-flex items-center px-2.5 py-1 text-[11px] font-semibold text-[#007AFF] bg-[#007AFF]/10 hover:bg-[#007AFF]/20 rounded-lg transition-colors"
                        >
                          <RotateCcw className="w-3 h-3 mr-1" />
                          Revert to Version {v.versionNumber}
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* Recycle Bin Modal */}
      {isRecycleBinOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-[#FFFFFF] rounded-2xl border border-[#E5E5EA] shadow-xl max-w-lg w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-4 border-b border-[#E5E5EA] flex items-center justify-between bg-[#FBFBFC]">
              <div className="flex items-center space-x-2">
                <Archive className="w-4 h-4 text-[#86868B]" />
                <h3 className="font-semibold text-sm text-[#1D1D1F]">TDS Recycle Bin (Soft-Deleted Records)</h3>
              </div>
              <button type="button" onClick={() => setIsRecycleBinOpen(false)}><X className="w-4 h-4 text-[#86868B]" /></button>
            </div>

            <div className="p-5 space-y-3 max-h-96 overflow-y-auto text-xs">
              {deletedRecords.length === 0 ? (
                <div className="text-center py-6 text-[#86868B]">Recycle Bin is empty.</div>
              ) : (
                deletedRecords.map((dr) => (
                  <div key={dr.id} className="p-3 bg-[#F9F9FB] rounded-xl border border-[#E5E5EA] flex items-center justify-between">
                    <div>
                      <span className="font-semibold text-[#1D1D1F] block">{dr.companyName} ({dr.financialMonth})</span>
                      <span className="text-[11px] text-[#86868B] font-mono">₹{dr.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                      <span className="text-[10px] text-[#86868B] block">Deleted on: {new Date(dr.deletedAt).toLocaleDateString()}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRestore(dr.id)}
                      className="inline-flex items-center px-2.5 py-1 text-[11px] font-semibold text-[#34C759] bg-[#34C759]/10 hover:bg-[#34C759]/20 rounded-lg transition-colors"
                    >
                      <RotateCcw className="w-3 h-3 mr-1" />
                      Restore
                    </button>
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

