'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Navbar from '@/components/Navbar';
import {
  Receipt,
  Search,
  Filter,
  Download,
  Building2,
  Calendar,
  CheckCircle,
  FileSpreadsheet,
  Edit2,
  Trash2,
  CheckSquare,
  Square,
  AlertCircle,
  AlertTriangle,
  X,
  RefreshCw,
  SlidersHorizontal,
  ChevronDown
} from 'lucide-react';
import { exportToExcel, exportToCSV, exportToPDF } from '@/lib/exportUtils';
import { useSidebar } from '@/contexts/SidebarContext';
import EditBillingLineModal from '@/components/EditBillingLineModal';

export default function BillingPage() {
  const { user } = useSidebar();
  const isSuperAdmin = user?.role === 'SUPER_ADMIN';

  const [lines, setLines] = useState<any[]>([]);
  const [periods, setPeriods] = useState<Array<{ id: string; periodName: string; monthCode: string; financialYear: string }>>([]);
  const [companies, setCompanies] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [companyFilter, setCompanyFilter] = useState('ALL');
  const [periodFilter, setPeriodFilter] = useState('ALL');

  // Multi-selection state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Edit modal state
  const [editingLine, setEditingLine] = useState<any | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  // Delete confirmation modal state
  const [deleteConfirm, setDeleteConfirm] = useState<{
    isOpen: boolean;
    line: any | null;
    isBulk: boolean;
  }>({
    isOpen: false,
    line: null,
    isBulk: false,
  });
  const [deleteReason, setDeleteReason] = useState('');
  const [deleting, setDeleting] = useState(false);

  // Notification toast
  const [notification, setNotification] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  useEffect(() => {
    fetchBilling();
  }, [companyFilter, periodFilter]);

  // Auto-clear notification after 5 seconds
  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => setNotification(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  const fetchBilling = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (companyFilter !== 'ALL') params.set('company', companyFilter);
      if (periodFilter !== 'ALL') params.set('periodId', periodFilter);
      if (search.trim()) params.set('search', search.trim());

      const res = await fetch(`/api/billing?${params.toString()}`);
      const data = await res.json();

      if (data.success) {
        setLines(data.lines || []);
        if (data.periods) setPeriods(data.periods);
        if (data.companies) setCompanies(data.companies);
      } else {
        // Fallback to reports endpoint if billing API fails
        const fallbackRes = await fetch('/api/reports?type=company_billing');
        const fallbackData = await fallbackRes.json();
        setLines(fallbackData.data || []);
      }
    } catch (e) {
      console.error('Error fetching billing data:', e);
      setNotification({ type: 'error', text: 'Failed to load billing lines.' });
    } finally {
      setLoading(false);
    }
  };

  // Filter lines locally on search text for snappy typing feedback
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return lines.filter((l) => {
      const matchesComp = companyFilter === 'ALL' || l.companyName === companyFilter;
      const matchesPeriod = periodFilter === 'ALL' || l.record?.periodId === periodFilter;
      const matchesSearch =
        !q ||
        l.companyName?.toLowerCase().includes(q) ||
        l.record?.vehicle?.registrationNumber?.toLowerCase().includes(q) ||
        l.amountFormula?.toLowerCase().includes(q) ||
        String(l.record?.sectionIndex || '').includes(q);

      return matchesComp && matchesPeriod && matchesSearch;
    });
  }, [lines, search, companyFilter, periodFilter]);

  // Multi-selection helpers
  const isAllSelected = useMemo(() => {
    return filtered.length > 0 && filtered.every((l) => selectedIds.has(l.id));
  }, [filtered, selectedIds]);

  const toggleSelectAll = () => {
    if (isAllSelected) {
      // Unselect all visible
      const newSet = new Set(selectedIds);
      filtered.forEach((l) => newSet.delete(l.id));
      setSelectedIds(newSet);
    } else {
      // Select all visible
      const newSet = new Set(selectedIds);
      filtered.forEach((l) => newSet.add(l.id));
      setSelectedIds(newSet);
    }
  };

  const toggleSelectRow = (id: string) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedIds(newSet);
  };

  const clearSelection = () => {
    setSelectedIds(new Set());
  };

  // Delete Handlers
  const openSingleDelete = (line: any) => {
    setDeleteReason('Manual deletion by Super Admin');
    setDeleteConfirm({
      isOpen: true,
      line,
      isBulk: false,
    });
  };

  const openBulkDelete = () => {
    if (selectedIds.size === 0) return;
    setDeleteReason(`Bulk deletion of ${selectedIds.size} transactions by Super Admin`);
    setDeleteConfirm({
      isOpen: true,
      line: null,
      isBulk: true,
    });
  };

  const executeDelete = async () => {
    setDeleting(true);
    try {
      if (deleteConfirm.isBulk) {
        // Bulk delete
        const res = await fetch('/api/billing', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ids: Array.from(selectedIds),
            reason: deleteReason.trim() || 'Bulk deletion',
          }),
        });
        const data = await res.json();
        if (res.ok && data.success) {
          setNotification({
            type: 'success',
            text: `Successfully deleted ${data.deletedCount} billing transaction(s) and recalculated monthly statements.`,
          });
          clearSelection();
          setDeleteConfirm({ isOpen: false, line: null, isBulk: false });
          fetchBilling();
        } else {
          setNotification({
            type: 'error',
            text: data.error || 'Failed to delete selected billing transactions.',
          });
        }
      } else if (deleteConfirm.line) {
        // Single delete
        const lineId = deleteConfirm.line.id;
        const res = await fetch(`/api/billing?id=${lineId}&reason=${encodeURIComponent(deleteReason.trim() || 'Deleted by admin')}`, {
          method: 'DELETE',
        });
        const data = await res.json();
        if (res.ok && data.success) {
          setNotification({
            type: 'success',
            text: `Billing line for "${deleteConfirm.line.companyName}" (${deleteConfirm.line.record?.vehicle?.registrationNumber}) deleted and recalculated.`,
          });
          const newSet = new Set(selectedIds);
          newSet.delete(lineId);
          setSelectedIds(newSet);
          setDeleteConfirm({ isOpen: false, line: null, isBulk: false });
          fetchBilling();
        } else {
          setNotification({
            type: 'error',
            text: data.error || 'Failed to delete billing transaction.',
          });
        }
      }
    } catch (err: any) {
      console.error('Delete error:', err);
      setNotification({
        type: 'error',
        text: err.message || 'An unexpected error occurred during deletion.',
      });
    } finally {
      setDeleting(false);
    }
  };

  // Export handler
  const handleExport = (format: 'xlsx' | 'csv' | 'pdf') => {
    const exportData = filtered.map((l) => ({
      Period: l.record?.period?.periodName || 'N/A',
      Section: l.record?.sectionIndex ?? 'N/A',
      'Vehicle Registration': l.record?.vehicle?.registrationNumber || 'N/A',
      'Company / Client': l.companyName,
      'KM / Trips': l.kmOrTrips !== null && l.kmOrTrips !== undefined ? l.kmOrTrips : 'N/A',
      'Rate (₹)': l.applicableRate !== null && l.applicableRate !== undefined ? l.applicableRate : 'N/A',
      'Billing Total (₹)': l.billingAmount,
      'Formula / Expression': l.amountFormula || 'KM * Rate',
    }));

    if (format === 'xlsx') {
      exportToExcel(exportData, 'Billing Transactions', 'Atharva_Billing_Transactions');
    } else if (format === 'csv') {
      exportToCSV(exportData, 'Atharva_Billing_Transactions');
    } else {
      exportToPDF({
        title: 'Billing & Trip Calculations Report',
        subtitle: `ATHARVA TRAVELS • Filter: ${companyFilter} • Period: ${periodFilter} • Total Records: ${filtered.length}`,
        headers: ['Period', 'Vehicle', 'Company', 'KM/Trips', 'Rate', 'Billing (₹)', 'Formula'],
        rows: filtered.map((l) => [
          l.record?.period?.periodName || '-',
          l.record?.vehicle?.registrationNumber || '-',
          l.companyName,
          l.kmOrTrips !== null && l.kmOrTrips !== undefined ? l.kmOrTrips : '-',
          l.applicableRate !== null && l.applicableRate !== undefined ? `₹${l.applicableRate}` : '-',
          `₹${l.billingAmount.toFixed(2)}`,
          l.amountFormula || 'Calculated',
        ]),
        filename: 'Atharva_Billing_Report',
      });
    }
  };

  // Compute active totals
  const totalBillingAmount = useMemo(() => {
    return filtered.reduce((sum, l) => sum + (l.billingAmount || 0), 0);
  }, [filtered]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto selection:bg-[#B3D7FF] pb-24">
      <Navbar
        title="Billing & Trips Ledger"
        subtitle="Individual Client Billing Lines, Trip Calculations & Kilometre Rates"
        onRefresh={fetchBilling}
      />

      {/* Notification Banner */}
      {notification && (
        <div
          className={`flex items-center justify-between p-4 rounded-[18px] border text-xs font-medium animate-fadeIn transition-all ${
            notification.type === 'success'
              ? 'bg-[#34C759]/10 border-[#34C759]/30 text-[#248A3D]'
              : 'bg-[#FF3B30]/10 border-[#FF3B30]/30 text-[#D70015]'
          }`}
        >
          <div className="flex items-center space-x-2">
            {notification.type === 'success' ? (
              <CheckCircle className="w-4 h-4 text-[#34C759] shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-[#FF3B30] shrink-0" />
            )}
            <span>{notification.text}</span>
          </div>
          <button
            onClick={() => setNotification(null)}
            className="p-1 rounded-full hover:bg-black/5 transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-[#FFFFFF] p-4 rounded-[20px] border border-[#E5E5EA] shadow-apple-card flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-[#86868B]">Total Transactions</p>
            <p className="text-2xl font-bold text-[#1D1D1F] mt-1 tabular-nums">{filtered.length}</p>
          </div>
          <div className="w-10 h-10 rounded-full bg-[#007AFF]/10 flex items-center justify-center text-[#007AFF]">
            <Receipt className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-[#FFFFFF] p-4 rounded-[20px] border border-[#E5E5EA] shadow-apple-card flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-[#86868B]">Calculated Gross Billing</p>
            <p className="text-2xl font-bold text-[#007AFF] mt-1 tabular-nums">
              ₹{totalBillingAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
          </div>
          <div className="w-10 h-10 rounded-full bg-[#34C759]/10 flex items-center justify-center text-[#34C759]">
            <FileSpreadsheet className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-[#FFFFFF] p-4 rounded-[20px] border border-[#E5E5EA] shadow-apple-card flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-[#86868B]">Client Companies</p>
            <p className="text-2xl font-bold text-[#1D1D1F] mt-1 tabular-nums">
              {companies.length > 0 ? companies.length : Array.from(new Set(lines.map((l) => l.companyName))).length}
            </p>
          </div>
          <div className="w-10 h-10 rounded-full bg-[#5856D6]/10 flex items-center justify-center text-[#5856D6]">
            <Building2 className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Apple Filter & Action Toolbar */}
      <div className="bg-[#FFFFFF] p-4 rounded-[22px] border border-[#E5E5EA] shadow-apple-card flex flex-col lg:flex-row items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
          {/* Search bar */}
          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 text-[#86868B] absolute left-3.5 top-3" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search vehicle, client, sec #..."
              className="w-full pl-9 pr-4 py-2 bg-[#F2F2F7] border border-[#E5E5EA] rounded-full text-xs text-[#1D1D1F] focus:bg-[#FFFFFF] focus:outline-hidden focus:ring-2 focus:ring-[#007AFF] transition-all"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-3 top-2.5 text-[#86868B] hover:text-[#1D1D1F]"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Period Filter Dropdown */}
          <div className="flex items-center space-x-1.5">
            <Calendar className="w-3.5 h-3.5 text-[#86868B]" />
            <span className="text-xs text-[#86868B] font-medium">Period:</span>
            <select
              value={periodFilter}
              onChange={(e) => setPeriodFilter(e.target.value)}
              className="px-3 py-2 bg-[#F2F2F7] border border-[#E5E5EA] rounded-full text-xs font-medium text-[#1D1D1F] focus:outline-hidden focus:ring-2 focus:ring-[#007AFF] transition-all cursor-pointer"
            >
              <option value="ALL">All Periods ({periods.length})</option>
              {periods.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.periodName} ({p.monthCode})
                </option>
              ))}
            </select>
          </div>

          {/* Company Filter Dropdown */}
          <div className="flex items-center space-x-1.5">
            <Building2 className="w-3.5 h-3.5 text-[#86868B]" />
            <span className="text-xs text-[#86868B] font-medium">Company:</span>
            <select
              value={companyFilter}
              onChange={(e) => setCompanyFilter(e.target.value)}
              className="px-3 py-2 bg-[#F2F2F7] border border-[#E5E5EA] rounded-full text-xs font-medium text-[#1D1D1F] focus:outline-hidden focus:ring-2 focus:ring-[#007AFF] transition-all cursor-pointer"
            >
              <option value="ALL">All Companies ({companies.length})</option>
              {companies.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          {/* Reset Filters Button */}
          {(companyFilter !== 'ALL' || periodFilter !== 'ALL' || search) && (
            <button
              onClick={() => {
                setCompanyFilter('ALL');
                setPeriodFilter('ALL');
                setSearch('');
              }}
              className="px-3 py-1.5 rounded-full border border-[#E5E5EA] bg-[#F2F2F7] hover:bg-[#E5E5EA] text-[#86868B] hover:text-[#1D1D1F] text-xs font-medium transition-colors"
            >
              Reset Filters
            </button>
          )}
        </div>

        {/* Export Toolbar */}
        <div className="flex items-center space-x-2 self-end lg:self-auto">
          <button
            onClick={() => handleExport('xlsx')}
            className="px-3.5 py-2 rounded-full border border-[#E5E5EA] bg-[#F2F2F7] hover:bg-[#E5E5EA] text-[#1D1D1F] text-xs font-medium flex items-center space-x-1.5 transition-colors cursor-pointer"
            title="Export filtered records to Microsoft Excel"
          >
            <Download className="w-3.5 h-3.5 text-[#34C759]" />
            <span>Excel</span>
          </button>
          <button
            onClick={() => handleExport('csv')}
            className="px-3.5 py-2 rounded-full border border-[#E5E5EA] bg-[#F2F2F7] hover:bg-[#E5E5EA] text-[#1D1D1F] text-xs font-medium flex items-center space-x-1.5 transition-colors cursor-pointer"
            title="Export filtered records to CSV"
          >
            <Download className="w-3.5 h-3.5 text-[#007AFF]" />
            <span>CSV</span>
          </button>
          <button
            onClick={() => handleExport('pdf')}
            className="px-3.5 py-2 rounded-full border border-[#E5E5EA] bg-[#F2F2F7] hover:bg-[#E5E5EA] text-[#1D1D1F] text-xs font-medium flex items-center space-x-1.5 transition-colors cursor-pointer"
            title="Generate print-ready PDF statement"
          >
            <Download className="w-3.5 h-3.5 text-[#FF3B30]" />
            <span>PDF</span>
          </button>
        </div>
      </div>

      {/* Apple Styled Table Card */}
      <div className="bg-[#FFFFFF] rounded-[24px] border border-[#E5E5EA] shadow-apple-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse">
            <thead className="bg-[#F2F2F7] text-[#1D1D1F] font-semibold border-b border-[#E5E5EA] select-none">
              <tr>
                {isSuperAdmin && (
                  <th className="py-3 px-3 w-10 text-center">
                    <button
                      type="button"
                      onClick={toggleSelectAll}
                      disabled={filtered.length === 0}
                      className="p-1 rounded text-[#86868B] hover:text-[#007AFF] transition-colors disabled:opacity-30 cursor-pointer"
                      title={isAllSelected ? 'Deselect all visible rows' : 'Select all visible rows'}
                    >
                      {isAllSelected ? (
                        <CheckSquare className="w-4 h-4 text-[#007AFF]" />
                      ) : (
                        <Square className="w-4 h-4" />
                      )}
                    </button>
                  </th>
                )}
                <th className="py-3 px-3">Period</th>
                <th className="py-3 px-3 w-14 text-center">Sec #</th>
                <th className="py-3 px-4">Vehicle Registration</th>
                <th className="py-3 px-4">Client Company</th>
                <th className="py-3 px-3 text-right">KM / Trips</th>
                <th className="py-3 px-3 text-right">Applicable Rate (₹)</th>
                <th className="py-3 px-4 text-right">Calculated Billing (₹)</th>
                <th className="py-3 px-4">Formula / Source Calculation</th>
                {isSuperAdmin && (
                  <th className="py-3 px-4 text-center w-28">Actions</th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E5EA]">
              {loading ? (
                <tr>
                  <td colSpan={isSuperAdmin ? 10 : 8} className="py-12 text-center text-[#86868B]">
                    <div className="flex flex-col items-center justify-center space-y-2">
                      <RefreshCw className="w-5 h-5 animate-spin text-[#007AFF]" />
                      <span>Loading billing transactions...</span>
                    </div>
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={isSuperAdmin ? 10 : 8} className="py-12 text-center text-[#86868B]">
                    <div className="flex flex-col items-center justify-center space-y-1">
                      <Receipt className="w-8 h-8 text-[#86868B]/40 stroke-1" />
                      <p className="font-medium text-[#1D1D1F]">No billing transactions found</p>
                      <p className="text-[11px]">Try adjusting your search query, period, or company filter.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filtered.map((l) => {
                  const isSelected = selectedIds.has(l.id);
                  return (
                    <tr
                      key={l.id}
                      className={`transition-colors ${
                        isSelected ? 'bg-[#007AFF]/5' : 'hover:bg-[#F2F2F7]/50'
                      }`}
                    >
                      {isSuperAdmin && (
                        <td className="py-3 px-3 text-center">
                          <button
                            type="button"
                            onClick={() => toggleSelectRow(l.id)}
                            className="p-1 rounded text-[#86868B] hover:text-[#007AFF] transition-colors cursor-pointer"
                          >
                            {isSelected ? (
                              <CheckSquare className="w-4 h-4 text-[#007AFF]" />
                            ) : (
                              <Square className="w-4 h-4" />
                            )}
                          </button>
                        </td>
                      )}
                      <td className="py-3 px-3 font-semibold text-[#1D1D1F]">
                        {l.record?.period?.periodName || 'N/A'}
                      </td>
                      <td className="py-3 px-3 text-center font-mono text-[#86868B]">
                        {l.record?.sectionIndex ?? '-'}
                      </td>
                      <td className="py-3 px-4 font-bold text-[#1D1D1F] font-mono">
                        {l.record?.vehicle?.registrationNumber || 'N/A'}
                      </td>
                      <td className="py-3 px-4 font-semibold text-[#007AFF]">
                        {l.companyName}
                      </td>
                      <td className="py-3 px-3 text-right font-mono font-medium text-[#1D1D1F] tabular-nums">
                        {l.kmOrTrips !== null && l.kmOrTrips !== undefined ? l.kmOrTrips : '-'}
                      </td>
                      <td className="py-3 px-3 text-right font-mono font-medium text-[#1D1D1F] tabular-nums">
                        {l.applicableRate !== null && l.applicableRate !== undefined
                          ? `₹${l.applicableRate.toLocaleString('en-IN')}`
                          : '-'}
                      </td>
                      <td className="py-3 px-4 text-right font-bold text-[#1D1D1F] tabular-nums">
                        ₹{l.billingAmount?.toLocaleString('en-IN', { minimumFractionDigits: 2 }) || '0.00'}
                      </td>
                      <td className="py-3 px-4 text-[#86868B] font-mono text-[11px] truncate max-w-xs">
                        {l.amountFormula || 'KM × Rate'}
                      </td>
                      {isSuperAdmin && (
                        <td className="py-3 px-4 text-center">
                          <div className="flex items-center justify-center space-x-1.5">
                            {/* Edit Button */}
                            <button
                              onClick={() => {
                                setEditingLine(l);
                                setIsEditModalOpen(true);
                              }}
                              className="p-1.5 rounded-full hover:bg-[#007AFF]/10 text-[#86868B] hover:text-[#007AFF] transition-colors cursor-pointer"
                              title="Edit Section, Company, KM, Rate, Vehicle, Period, or Billing Total"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>

                            {/* Delete Button */}
                            <button
                              onClick={() => openSingleDelete(l)}
                              className="p-1.5 rounded-full hover:bg-[#FF3B30]/10 text-[#86868B] hover:text-[#FF3B30] transition-colors cursor-pointer"
                              title="Delete this billing line"
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

        {/* Table Footer info */}
        <div className="px-4 py-3 bg-[#F2F2F7] border-t border-[#E5E5EA] flex flex-col sm:flex-row items-center justify-between text-[11px] text-[#86868B] gap-2">
          <div>
            Showing <span className="font-semibold text-[#1D1D1F]">{filtered.length}</span> of{' '}
            <span className="font-semibold text-[#1D1D1F]">{lines.length}</span> total transactions
          </div>
          <div className="flex items-center space-x-3">
            <span>
              Total Visible Billing:{' '}
              <span className="font-semibold text-[#1D1D1F] font-mono">
                ₹{totalBillingAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </span>
            </span>
          </div>
        </div>
      </div>

      {/* Floating Multi-Select Batch Action Bar */}
      {isSuperAdmin && selectedIds.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-[#1D1D1F]/95 backdrop-blur-md text-white px-5 py-3 rounded-full shadow-2xl border border-white/10 flex items-center space-x-4 animate-in slide-in-from-bottom-4 duration-200">
          <div className="flex items-center space-x-2">
            <span className="w-2 h-2 rounded-full bg-[#34C759] animate-pulse" />
            <span className="text-xs font-semibold">
              {selectedIds.size} transaction{selectedIds.size > 1 ? 's' : ''} selected
            </span>
          </div>

          <div className="h-4 w-[1px] bg-white/20" />

          <button
            onClick={clearSelection}
            className="text-xs font-medium text-white/70 hover:text-white transition-colors cursor-pointer"
          >
            Clear Selection
          </button>

          <button
            onClick={openBulkDelete}
            className="px-4 py-1.5 rounded-full bg-[#FF3B30] hover:bg-[#D70015] text-white text-xs font-semibold flex items-center space-x-1.5 shadow-sm transition-all transform active:scale-95 cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Delete Selected ({selectedIds.size})</span>
          </button>
        </div>
      )}

      {/* Edit Billing Line Modal */}
      <EditBillingLineModal
        isOpen={isEditModalOpen}
        line={editingLine}
        periods={periods}
        companies={companies}
        onClose={() => {
          setIsEditModalOpen(false);
          setEditingLine(null);
        }}
        onSuccess={() => {
          setIsEditModalOpen(false);
          setEditingLine(null);
          setNotification({
            type: 'success',
            text: 'Billing line and parent vehicle statement successfully updated and recalculated.',
          });
          fetchBilling();
        }}
      />

      {/* Delete Confirmation Modal (Single & Bulk) */}
      {deleteConfirm.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="bg-[#FFFFFF] w-full max-w-md rounded-[28px] border border-[#E5E5EA] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="p-5 border-b border-[#E5E5EA] flex items-center justify-between">
              <div className="flex items-center space-x-2.5">
                <div className="w-9 h-9 rounded-full bg-[#FF3B30]/10 flex items-center justify-center text-[#FF3B30]">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[#1D1D1F]">
                    {deleteConfirm.isBulk
                      ? `Delete ${selectedIds.size} Billing Transactions`
                      : 'Delete Billing Transaction'}
                  </h3>
                  <p className="text-[11px] text-[#86868B]">
                    Super Admin authorization required
                  </p>
                </div>
              </div>
              <button
                onClick={() => setDeleteConfirm({ isOpen: false, line: null, isBulk: false })}
                className="p-1 rounded-full text-[#86868B] hover:text-[#1D1D1F] hover:bg-[#F2F2F7] transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 space-y-4">
              {deleteConfirm.isBulk ? (
                <div className="p-3.5 rounded-2xl bg-[#FF3B30]/5 border border-[#FF3B30]/20 text-xs text-[#1D1D1F] space-y-1.5">
                  <p className="font-semibold text-[#D70015]">
                    Are you sure you want to delete these {selectedIds.size} transactions?
                  </p>
                  <p className="text-[11px] text-[#86868B] leading-relaxed">
                    All associated vehicle monthly gross statements, advance deductions, and financial period totals will be automatically recalculated in real time.
                  </p>
                </div>
              ) : (
                deleteConfirm.line && (
                  <div className="p-3.5 rounded-2xl bg-[#F2F2F7] border border-[#E5E5EA] text-xs space-y-1.5">
                    <div className="flex justify-between">
                      <span className="text-[#86868B]">Client Company:</span>
                      <span className="font-bold text-[#007AFF]">{deleteConfirm.line.companyName}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#86868B]">Vehicle Registration:</span>
                      <span className="font-mono font-bold text-[#1D1D1F]">
                        {deleteConfirm.line.record?.vehicle?.registrationNumber || 'N/A'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#86868B]">Financial Period:</span>
                      <span className="font-medium text-[#1D1D1F]">
                        {deleteConfirm.line.record?.period?.periodName || 'N/A'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#86868B]">Calculated Billing:</span>
                      <span className="font-bold font-mono text-[#1D1D1F]">
                        ₹{deleteConfirm.line.billingAmount?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>
                )
              )}

              {/* Audit Reason Input */}
              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-[#86868B] mb-1.5">
                  Reason for Deletion (Logged in Audit Trail)
                </label>
                <input
                  type="text"
                  value={deleteReason}
                  onChange={(e) => setDeleteReason(e.target.value)}
                  placeholder="e.g. Inadvertent duplicate entry, incorrect contract billing..."
                  className="w-full px-3.5 py-2.5 bg-[#F2F2F7] border border-[#E5E5EA] rounded-[14px] text-xs text-[#1D1D1F] focus:bg-[#FFFFFF] focus:outline-hidden focus:ring-2 focus:ring-[#FF3B30] transition-all"
                />
              </div>

              <p className="text-[11px] text-[#86868B] italic">
                * Note: Historical data integrity is preserved via safe soft-deletion and comprehensive immutable audit logs.
              </p>
            </div>

            {/* Footer Buttons */}
            <div className="p-4 bg-[#F2F2F7] border-t border-[#E5E5EA] flex items-center justify-end space-x-2.5">
              <button
                type="button"
                onClick={() => setDeleteConfirm({ isOpen: false, line: null, isBulk: false })}
                disabled={deleting}
                className="px-4 py-2 rounded-full border border-[#E5E5EA] bg-[#FFFFFF] hover:bg-[#E5E5EA] text-[#1D1D1F] text-xs font-semibold transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={executeDelete}
                disabled={deleting}
                className="px-5 py-2 rounded-full bg-[#FF3B30] hover:bg-[#D70015] text-white text-xs font-semibold flex items-center space-x-1.5 shadow-sm transition-all disabled:opacity-50"
              >
                {deleting ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Deleting & Recalculating...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>
                      {deleteConfirm.isBulk ? `Delete ${selectedIds.size} Lines` : 'Delete Line'}
                    </span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
