'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Navbar from '@/components/Navbar';
import {
  Scissors,
  Search,
  Filter,
  Download,
  AlertCircle,
  Tag,
  Calendar,
  Plus,
  Truck,
  User,
  Wallet,
  AlertTriangle,
  Fuel,
  TrendingDown,
  TrendingUp,
  Edit2,
  Trash2,
  CheckSquare,
  Square,
  X,
  RefreshCw,
  FileSpreadsheet
} from 'lucide-react';
import { exportToExcel, exportToCSV, exportToPDF } from '@/lib/exportUtils';
import { useSidebar } from '@/contexts/SidebarContext';
import AdjustmentModal from '@/components/AdjustmentModal';

export default function AdjustmentsPage() {
  const { user } = useSidebar();
  const isSuperAdmin = user?.role === 'SUPER_ADMIN';

  const [adjustments, setAdjustments] = useState<any[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [periods, setPeriods] = useState<any[]>([]);
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [periodFilter, setPeriodFilter] = useState('ALL');
  const [quickFilter, setQuickFilter] = useState<'ALL' | 'SALARY_ADVANCE' | 'PENALTY' | 'FUEL' | 'DEDUCTION' | 'ADDITION'>('ALL');

  // Multi-selection state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [editingAdjustment, setEditingAdjustment] = useState<any | null>(null);

  // Delete confirmation modal state
  const [deleteConfirm, setDeleteConfirm] = useState<{
    isOpen: boolean;
    adjustment: any | null;
    isBulk: boolean;
  }>({
    isOpen: false,
    adjustment: null,
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
    fetchAdjustments();
  }, [categoryFilter, periodFilter]);

  // Auto-clear notification after 5 seconds
  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => setNotification(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  const fetchAdjustments = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (categoryFilter !== 'ALL') params.set('category', categoryFilter);
      if (periodFilter !== 'ALL') params.set('periodId', periodFilter);
      if (search.trim()) params.set('search', search.trim());

      const res = await fetch(`/api/adjustments?${params.toString()}`);
      const data = await res.json();

      if (data.success) {
        setAdjustments(data.adjustments || []);
        if (data.categories) setCategories(data.categories);
        if (data.periods) setPeriods(data.periods);
        if (data.vehicles) setVehicles(data.vehicles);
      } else {
        // Fallback to reports endpoint if adjustments route encounters an issue
        const fallbackRes = await fetch('/api/reports?type=vehicle_statement');
        const fallbackData = await fallbackRes.json();
        const flat: any[] = [];
        for (const rec of fallbackData.data || []) {
          for (const adj of rec.adjustments || []) {
            flat.push({
              ...adj,
              record: {
                ...rec,
                vehicle: rec.vehicle,
                period: rec.period,
              },
            });
          }
        }
        setAdjustments(flat);
      }
    } catch (e) {
      console.error('Error fetching adjustments:', e);
      setNotification({ type: 'error', text: 'Failed to load adjustments ledger.' });
    } finally {
      setLoading(false);
    }
  };

  // Filter adjustments locally on quick filter & search
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return adjustments.filter((a) => {
      const catLower = (a.category || '').toLowerCase();
      const notesLower = (a.notes || '').toLowerCase();
      const regLower = (a.record?.vehicle?.registrationNumber || '').toLowerCase();
      const driverLower = (a.record?.vehicle?.assignments?.[0]?.driver?.name || '').toLowerCase();

      // Quick filter tabs
      if (quickFilter === 'SALARY_ADVANCE') {
        const isSalaryAdv =
          catLower.includes('salary') ||
          catLower.includes('early') ||
          (catLower.includes('adv') && !catLower.includes('fuel'));
        if (!isSalaryAdv) return false;
      } else if (quickFilter === 'PENALTY') {
        const isPenalty =
          catLower.includes('penalty') ||
          catLower.includes('fine') ||
          notesLower.includes('penalty') ||
          notesLower.includes('fine');
        if (!isPenalty) return false;
      } else if (quickFilter === 'FUEL') {
        const isFuel = catLower.includes('fuel') || notesLower.includes('fuel');
        if (!isFuel) return false;
      } else if (quickFilter === 'DEDUCTION') {
        const isDed = a.adjustmentType === 'DEDUCTION' || a.amount < 0;
        if (!isDed) return false;
      } else if (quickFilter === 'ADDITION') {
        const isAdd = a.adjustmentType === 'ADDITION' || a.amount > 0;
        if (!isAdd) return false;
      }

      // Dropdown filters
      const matchesCat = categoryFilter === 'ALL' || a.category === categoryFilter;
      const matchesPeriod = periodFilter === 'ALL' || a.record?.periodId === periodFilter;

      // Search
      const matchesSearch =
        !q ||
        catLower.includes(q) ||
        notesLower.includes(q) ||
        regLower.includes(q) ||
        driverLower.includes(q) ||
        String(a.record?.sectionIndex || '').includes(q);

      return matchesCat && matchesPeriod && matchesSearch;
    });
  }, [adjustments, search, categoryFilter, periodFilter, quickFilter]);

  // Totals
  const { totalDeductions, totalAdditions, salaryAdvanceTotal, penaltyTotal } = useMemo(() => {
    let ded = 0;
    let add = 0;
    let salAdv = 0;
    let pen = 0;

    for (const a of filtered) {
      const absAmt = Math.abs(a.amount || 0);
      const isDed = a.adjustmentType === 'DEDUCTION' || a.amount < 0;
      if (isDed) {
        ded += absAmt;
      } else {
        add += absAmt;
      }

      const cat = (a.category || '').toLowerCase();
      if (
        cat.includes('salary') ||
        cat.includes('early') ||
        (cat.includes('adv') && !cat.includes('fuel'))
      ) {
        salAdv += absAmt;
      }
      if (cat.includes('penalty') || cat.includes('fine')) {
        pen += absAmt;
      }
    }
    return {
      totalDeductions: ded,
      totalAdditions: add,
      salaryAdvanceTotal: salAdv,
      penaltyTotal: pen,
    };
  }, [filtered]);

  // Selection helpers
  const isAllSelected = useMemo(() => {
    return filtered.length > 0 && filtered.every((a) => selectedIds.has(a.id));
  }, [filtered, selectedIds]);

  const toggleSelectAll = () => {
    if (isAllSelected) {
      const newSet = new Set(selectedIds);
      filtered.forEach((a) => newSet.delete(a.id));
      setSelectedIds(newSet);
    } else {
      const newSet = new Set(selectedIds);
      filtered.forEach((a) => newSet.add(a.id));
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

  // Open Add modal
  const handleOpenAdd = () => {
    setModalMode('create');
    setEditingAdjustment(null);
    setIsModalOpen(true);
  };

  // Open Edit modal
  const handleOpenEdit = (adj: any) => {
    setModalMode('edit');
    setEditingAdjustment(adj);
    setIsModalOpen(true);
  };

  // Delete Handlers
  const openSingleDelete = (adj: any) => {
    setDeleteReason('Manual deletion of adjustment by Super Admin');
    setDeleteConfirm({
      isOpen: true,
      adjustment: adj,
      isBulk: false,
    });
  };

  const openBulkDelete = () => {
    if (selectedIds.size === 0) return;
    setDeleteReason(`Bulk deletion of ${selectedIds.size} adjustments by Super Admin`);
    setDeleteConfirm({
      isOpen: true,
      adjustment: null,
      isBulk: true,
    });
  };

  const executeDelete = async () => {
    setDeleting(true);
    try {
      if (deleteConfirm.isBulk) {
        // Bulk delete
        const res = await fetch('/api/adjustments', {
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
            text: `Successfully deleted ${data.deletedCount} adjustment(s) and recalculated statements.`,
          });
          clearSelection();
          setDeleteConfirm({ isOpen: false, adjustment: null, isBulk: false });
          fetchAdjustments();
        } else {
          setNotification({
            type: 'error',
            text: data.error || 'Failed to delete selected adjustments.',
          });
        }
      } else if (deleteConfirm.adjustment) {
        // Single delete
        const adjId = deleteConfirm.adjustment.id;
        const res = await fetch(
          `/api/adjustments?id=${adjId}&reason=${encodeURIComponent(deleteReason.trim() || 'Deleted by admin')}`,
          { method: 'DELETE' }
        );
        const data = await res.json();
        if (res.ok && data.success) {
          setNotification({
            type: 'success',
            text: `Adjustment "${deleteConfirm.adjustment.category}" deleted and recalculated.`,
          });
          const newSet = new Set(selectedIds);
          newSet.delete(adjId);
          setSelectedIds(newSet);
          setDeleteConfirm({ isOpen: false, adjustment: null, isBulk: false });
          fetchAdjustments();
        } else {
          setNotification({
            type: 'error',
            text: data.error || 'Failed to delete adjustment.',
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
    const exportData = filtered.map((a) => {
      const isDed = a.adjustmentType === 'DEDUCTION' || a.amount < 0;
      return {
        Period: a.record?.period?.periodName || 'N/A',
        Section: a.record?.sectionIndex ?? 'N/A',
        'Vehicle Registration': a.record?.vehicle?.registrationNumber || 'N/A',
        Driver: a.record?.vehicle?.assignments?.[0]?.driver?.name || 'Unassigned',
        Category: a.category,
        Type: isDed ? 'Deduction' : 'Addition',
        'Amount (₹)': Math.abs(a.amount || 0),
        Formula: a.formulaString || 'N/A',
        Notes: a.notes || '',
      };
    });

    if (format === 'xlsx') {
      exportToExcel(exportData, 'Adjustments', 'Atharva_Financial_Adjustments');
    } else if (format === 'csv') {
      exportToCSV(exportData, 'Atharva_Financial_Adjustments');
    } else {
      exportToPDF({
        title: 'Financial Adjustments & Deductions Statement',
        subtitle: `ATHARVA TRAVELS • Filter: ${categoryFilter} • Period: ${periodFilter} • Records: ${filtered.length}`,
        headers: ['Period', 'Vehicle', 'Driver', 'Category', 'Type', 'Amount (₹)', 'Notes / Reason'],
        rows: filtered.map((a) => {
          const isDed = a.adjustmentType === 'DEDUCTION' || a.amount < 0;
          return [
            a.record?.period?.periodName || '-',
            a.record?.vehicle?.registrationNumber || '-',
            a.record?.vehicle?.assignments?.[0]?.driver?.name || '-',
            a.category,
            isDed ? 'Deduction (-)' : 'Addition (+)',
            `₹${Math.abs(a.amount || 0).toFixed(2)}`,
            a.notes || a.formulaString || '-',
          ];
        }),
        filename: 'Atharva_Adjustments_Report',
      });
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto selection:bg-[#B3D7FF] pb-24">
      <Navbar
        title="Adjustments & Deductions Ledger"
        subtitle="Manage Early Salary Advances, Driver Penalties, Fuel Advances & Fleet Deductions"
        onRefresh={fetchAdjustments}
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
              <span className="w-2 h-2 rounded-full bg-[#34C759]" />
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

      {/* KPI Cards: Salary Advances, Penalties, Total Deductions, Additions */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Early Salary Advances */}
        <div className="bg-[#FFFFFF] p-4 rounded-[22px] border border-[#E5E5EA] shadow-apple-card flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-[#86868B]">
              Driver Salary Advances
            </p>
            <p className="text-2xl font-bold text-[#FF9F0A] mt-1 tabular-nums">
              ₹{salaryAdvanceTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </p>
            <span className="text-[10px] text-[#86868B] mt-0.5 block">
              Adjusted from monthly salary
            </span>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-[#FF9F0A]/10 flex items-center justify-center text-[#FF9F0A]">
            <Wallet className="w-5 h-5" />
          </div>
        </div>

        {/* Card 2: Driver Penalties */}
        <div className="bg-[#FFFFFF] p-4 rounded-[22px] border border-[#E5E5EA] shadow-apple-card flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-[#86868B]">
              Driver Penalties & Fines
            </p>
            <p className="text-2xl font-bold text-[#FF3B30] mt-1 tabular-nums">
              ₹{penaltyTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </p>
            <span className="text-[10px] text-[#86868B] mt-0.5 block">
              Client complaints / violations
            </span>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-[#FF3B30]/10 flex items-center justify-center text-[#FF3B30]">
            <AlertTriangle className="w-5 h-5" />
          </div>
        </div>

        {/* Card 3: Total Deductions */}
        <div className="bg-[#FFFFFF] p-4 rounded-[22px] border border-[#E5E5EA] shadow-apple-card flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-[#86868B]">
              Gross Deductions Total
            </p>
            <p className="text-2xl font-bold text-[#1D1D1F] mt-1 tabular-nums">
              ₹{totalDeductions.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </p>
            <span className="text-[10px] text-[#FF3B30] mt-0.5 block">
              Subtracted from monthly payouts
            </span>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-[#FF3B30]/10 flex items-center justify-center text-[#FF3B30]">
            <TrendingDown className="w-5 h-5" />
          </div>
        </div>

        {/* Card 4: Total Additions / Bonus */}
        <div className="bg-[#FFFFFF] p-4 rounded-[22px] border border-[#E5E5EA] shadow-apple-card flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-[#86868B]">
              Additions & Incentives
            </p>
            <p className="text-2xl font-bold text-[#34C759] mt-1 tabular-nums">
              ₹{totalAdditions.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </p>
            <span className="text-[10px] text-[#34C759] mt-0.5 block">
              Added to net earnings
            </span>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-[#34C759]/10 flex items-center justify-center text-[#34C759]">
            <TrendingUp className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Quick Filter Pill Buttons */}
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setQuickFilter('ALL')}
          className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer ${
            quickFilter === 'ALL'
              ? 'bg-[#1D1D1F] text-white shadow-sm'
              : 'bg-[#FFFFFF] text-[#86868B] border border-[#E5E5EA] hover:bg-[#F2F2F7]'
          }`}
        >
          All Adjustments ({adjustments.length})
        </button>

        <button
          type="button"
          onClick={() => setQuickFilter('SALARY_ADVANCE')}
          className={`px-3.5 py-1.5 rounded-full text-xs font-semibold flex items-center space-x-1.5 transition-all cursor-pointer ${
            quickFilter === 'SALARY_ADVANCE'
              ? 'bg-[#FF9F0A] text-white shadow-sm'
              : 'bg-[#FFFFFF] text-[#FF9F0A] border border-[#FF9F0A]/30 hover:bg-[#FF9F0A]/10'
          }`}
        >
          <Wallet className="w-3.5 h-3.5" />
          <span>Early Salary Advances</span>
        </button>

        <button
          type="button"
          onClick={() => setQuickFilter('PENALTY')}
          className={`px-3.5 py-1.5 rounded-full text-xs font-semibold flex items-center space-x-1.5 transition-all cursor-pointer ${
            quickFilter === 'PENALTY'
              ? 'bg-[#FF3B30] text-white shadow-sm'
              : 'bg-[#FFFFFF] text-[#FF3B30] border border-[#FF3B30]/30 hover:bg-[#FF3B30]/10'
          }`}
        >
          <AlertTriangle className="w-3.5 h-3.5" />
          <span>Driver Penalties</span>
        </button>

        <button
          type="button"
          onClick={() => setQuickFilter('FUEL')}
          className={`px-3.5 py-1.5 rounded-full text-xs font-semibold flex items-center space-x-1.5 transition-all cursor-pointer ${
            quickFilter === 'FUEL'
              ? 'bg-[#FF9500] text-white shadow-sm'
              : 'bg-[#FFFFFF] text-[#FF9500] border border-[#FF9500]/30 hover:bg-[#FF9500]/10'
          }`}
        >
          <Fuel className="w-3.5 h-3.5" />
          <span>Fuel Advances</span>
        </button>

        <button
          type="button"
          onClick={() => setQuickFilter('DEDUCTION')}
          className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer ${
            quickFilter === 'DEDUCTION'
              ? 'bg-[#FF3B30] text-white shadow-sm'
              : 'bg-[#FFFFFF] text-[#86868B] border border-[#E5E5EA] hover:bg-[#F2F2F7]'
          }`}
        >
          All Deductions (-)
        </button>

        <button
          type="button"
          onClick={() => setQuickFilter('ADDITION')}
          className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer ${
            quickFilter === 'ADDITION'
              ? 'bg-[#34C759] text-white shadow-sm'
              : 'bg-[#FFFFFF] text-[#34C759] border border-[#34C759]/30 hover:bg-[#34C759]/10'
          }`}
        >
          Additions / Bonus (+)
        </button>
      </div>

      {/* Apple Styled Filter & Action Toolbar */}
      <div className="bg-[#FFFFFF] p-4 rounded-[22px] border border-[#E5E5EA] shadow-apple-card flex flex-col lg:flex-row items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
          {/* Search bar */}
          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 text-[#86868B] absolute left-3.5 top-3" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search category, vehicle, driver..."
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

          {/* Category Filter Dropdown */}
          <div className="flex items-center space-x-1.5">
            <Tag className="w-3.5 h-3.5 text-[#86868B]" />
            <span className="text-xs text-[#86868B] font-medium">Category:</span>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="px-3 py-2 bg-[#F2F2F7] border border-[#E5E5EA] rounded-full text-xs font-medium text-[#1D1D1F] focus:outline-hidden focus:ring-2 focus:ring-[#007AFF] transition-all cursor-pointer"
            >
              <option value="ALL">All Categories ({categories.length})</option>
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          {/* Reset Filters Button */}
          {(categoryFilter !== 'ALL' || periodFilter !== 'ALL' || quickFilter !== 'ALL' || search) && (
            <button
              onClick={() => {
                setCategoryFilter('ALL');
                setPeriodFilter('ALL');
                setQuickFilter('ALL');
                setSearch('');
              }}
              className="px-3 py-1.5 rounded-full border border-[#E5E5EA] bg-[#F2F2F7] hover:bg-[#E5E5EA] text-[#86868B] hover:text-[#1D1D1F] text-xs font-medium transition-colors"
            >
              Reset Filters
            </button>
          )}
        </div>

        {/* Action Toolbar */}
        <div className="flex items-center space-x-2 self-end lg:self-auto">
          {/* Add Adjustment / Deduction Button (Super Admin) */}
          {isSuperAdmin && (
            <button
              onClick={handleOpenAdd}
              className="px-4 py-2 rounded-full bg-[#007AFF] hover:bg-[#0062CC] text-white text-xs font-semibold flex items-center space-x-1.5 shadow-sm transition-all cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Adjustment / Deduction</span>
            </button>
          )}

          {/* Export Buttons */}
          <button
            onClick={() => handleExport('xlsx')}
            className="px-3 py-2 rounded-full border border-[#E5E5EA] bg-[#F2F2F7] hover:bg-[#E5E5EA] text-[#1D1D1F] text-xs font-medium flex items-center space-x-1.5 transition-colors cursor-pointer"
            title="Export filtered records to Microsoft Excel"
          >
            <Download className="w-3.5 h-3.5 text-[#34C759]" />
            <span>Excel</span>
          </button>
          <button
            onClick={() => handleExport('csv')}
            className="px-3 py-2 rounded-full border border-[#E5E5EA] bg-[#F2F2F7] hover:bg-[#E5E5EA] text-[#1D1D1F] text-xs font-medium flex items-center space-x-1.5 transition-colors cursor-pointer"
            title="Export filtered records to CSV"
          >
            <Download className="w-3.5 h-3.5 text-[#007AFF]" />
            <span>CSV</span>
          </button>
          <button
            onClick={() => handleExport('pdf')}
            className="px-3 py-2 rounded-full border border-[#E5E5EA] bg-[#F2F2F7] hover:bg-[#E5E5EA] text-[#1D1D1F] text-xs font-medium flex items-center space-x-1.5 transition-colors cursor-pointer"
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
                <th className="py-3 px-4">Assigned Driver</th>
                <th className="py-3 px-4">Adjustment Category</th>
                <th className="py-3 px-3 text-center">Type</th>
                <th className="py-3 px-4 text-right">Adjustment Amount (₹)</th>
                <th className="py-3 px-4">Reason / Notes</th>
                {isSuperAdmin && (
                  <th className="py-3 px-4 text-center w-24">Actions</th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E5EA]">
              {loading ? (
                <tr>
                  <td colSpan={isSuperAdmin ? 10 : 9} className="py-12 text-center text-[#86868B]">
                    <div className="flex flex-col items-center justify-center space-y-2">
                      <RefreshCw className="w-5 h-5 animate-spin text-[#007AFF]" />
                      <span>Loading adjustments ledger...</span>
                    </div>
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={isSuperAdmin ? 10 : 9} className="py-12 text-center text-[#86868B]">
                    <div className="flex flex-col items-center justify-center space-y-1">
                      <Scissors className="w-8 h-8 text-[#86868B]/40 stroke-1" />
                      <p className="font-medium text-[#1D1D1F]">No adjustments found</p>
                      <p className="text-[11px]">Try adjusting your search query, period, or category filter.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filtered.map((a) => {
                  const isSelected = selectedIds.has(a.id);
                  const isDeduction = a.adjustmentType === 'DEDUCTION' || a.amount < 0;
                  const driverName = a.record?.vehicle?.assignments?.[0]?.driver?.name;

                  return (
                    <tr
                      key={a.id}
                      className={`transition-colors ${
                        isSelected ? 'bg-[#007AFF]/5' : 'hover:bg-[#F2F2F7]/50'
                      }`}
                    >
                      {isSuperAdmin && (
                        <td className="py-3 px-3 text-center">
                          <button
                            type="button"
                            onClick={() => toggleSelectRow(a.id)}
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
                        {a.record?.period?.periodName || 'N/A'}
                      </td>
                      <td className="py-3 px-3 text-center font-mono text-[#86868B]">
                        {a.record?.sectionIndex ?? '-'}
                      </td>
                      <td className="py-3 px-4 font-bold text-[#1D1D1F] font-mono">
                        {a.record?.vehicle?.registrationNumber || 'N/A'}
                      </td>
                      <td className="py-3 px-4 text-[#1D1D1F]">
                        {driverName ? (
                          <div className="flex items-center space-x-1.5 font-medium">
                            <User className="w-3 h-3 text-[#007AFF]" />
                            <span>{driverName}</span>
                          </div>
                        ) : (
                          <span className="text-[#86868B] italic">Unassigned</span>
                        )}
                      </td>
                      <td className="py-3 px-4 font-semibold text-[#1D1D1F]">
                        <span className="flex items-center space-x-1.5">
                          {a.category.toLowerCase().includes('salary') || a.category.toLowerCase().includes('early') ? (
                            <Wallet className="w-3.5 h-3.5 text-[#FF9F0A]" />
                          ) : a.category.toLowerCase().includes('penalty') ? (
                            <AlertTriangle className="w-3.5 h-3.5 text-[#FF3B30]" />
                          ) : a.category.toLowerCase().includes('fuel') ? (
                            <Fuel className="w-3.5 h-3.5 text-[#FF9500]" />
                          ) : null}
                          <span>{a.category}</span>
                        </span>
                      </td>
                      <td className="py-3 px-3 text-center">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-semibold border ${
                            isDeduction
                              ? 'bg-[#FFF0EF] text-[#FF3B30] border-[#FFD0CE]'
                              : 'bg-[#EAF9EE] text-[#34C759] border-[#D2F4DA]'
                          }`}
                        >
                          {isDeduction ? 'Deduction (-)' : 'Addition (+)'}
                        </span>
                      </td>
                      <td
                        className={`py-3 px-4 text-right font-bold tabular-nums ${
                          isDeduction ? 'text-[#FF3B30]' : 'text-[#34C759]'
                        }`}
                      >
                        ₹{Math.abs(a.amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3 px-4 text-[#86868B] text-[11px] truncate max-w-xs">
                        {a.notes || a.formulaString || '-'}
                      </td>
                      {isSuperAdmin && (
                        <td className="py-3 px-4 text-center">
                          <div className="flex items-center justify-center space-x-1.5">
                            <button
                              onClick={() => handleOpenEdit(a)}
                              className="p-1.5 rounded-full hover:bg-[#007AFF]/10 text-[#86868B] hover:text-[#007AFF] transition-colors cursor-pointer"
                              title="Edit adjustment"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => openSingleDelete(a)}
                              className="p-1.5 rounded-full hover:bg-[#FF3B30]/10 text-[#86868B] hover:text-[#FF3B30] transition-colors cursor-pointer"
                              title="Delete adjustment"
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

        {/* Table Footer */}
        <div className="px-4 py-3 bg-[#F2F2F7] border-t border-[#E5E5EA] flex flex-col sm:flex-row items-center justify-between text-[11px] text-[#86868B] gap-2">
          <div>
            Showing <span className="font-semibold text-[#1D1D1F]">{filtered.length}</span> of{' '}
            <span className="font-semibold text-[#1D1D1F]">{adjustments.length}</span> total adjustments
          </div>
          <div className="flex items-center space-x-4">
            <span>
              Total Deductions:{' '}
              <span className="font-semibold text-[#FF3B30] font-mono">
                ₹{totalDeductions.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </span>
            </span>
            <span>
              Total Additions:{' '}
              <span className="font-semibold text-[#34C759] font-mono">
                ₹{totalAdditions.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </span>
            </span>
          </div>
        </div>
      </div>

      {/* Floating Multi-Select Batch Action Bar */}
      {isSuperAdmin && selectedIds.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-[#1D1D1F]/95 backdrop-blur-md text-white px-5 py-3 rounded-full shadow-2xl border border-white/10 flex items-center space-x-4 animate-in slide-in-from-bottom-4 duration-200">
          <div className="flex items-center space-x-2">
            <span className="w-2 h-2 rounded-full bg-[#FF3B30] animate-pulse" />
            <span className="text-xs font-semibold">
              {selectedIds.size} adjustment{selectedIds.size > 1 ? 's' : ''} selected
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

      {/* Add / Edit Adjustment Modal */}
      <AdjustmentModal
        isOpen={isModalOpen}
        mode={modalMode}
        adjustmentToEdit={editingAdjustment}
        periods={periods}
        vehicles={vehicles}
        onClose={() => {
          setIsModalOpen(false);
          setEditingAdjustment(null);
        }}
        onSuccess={() => {
          setIsModalOpen(false);
          setEditingAdjustment(null);
          setNotification({
            type: 'success',
            text:
              modalMode === 'edit'
                ? 'Adjustment updated and vehicle ledger recalculated successfully.'
                : 'Adjustment recorded and vehicle monthly ledger recalculated successfully.',
          });
          fetchAdjustments();
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
                      ? `Delete ${selectedIds.size} Adjustments`
                      : 'Delete Adjustment'}
                  </h3>
                  <p className="text-[11px] text-[#86868B]">
                    Super Admin authorization required
                  </p>
                </div>
              </div>
              <button
                onClick={() => setDeleteConfirm({ isOpen: false, adjustment: null, isBulk: false })}
                className="p-1 rounded-full text-[#86868B] hover:text-[#1D1D1F] hover:bg-[#F2F2F7] transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 space-y-4">
              {deleteConfirm.isBulk ? (
                <div className="p-3.5 rounded-2xl bg-[#FF3B30]/5 border border-[#FF3B30]/20 text-xs text-[#1D1D1F] space-y-1.5">
                  <p className="font-semibold text-[#D70015]">
                    Are you sure you want to delete these {selectedIds.size} adjustments?
                  </p>
                  <p className="text-[11px] text-[#86868B] leading-relaxed">
                    All associated vehicle monthly net statements and financial period totals will be automatically recalculated in real time.
                  </p>
                </div>
              ) : (
                deleteConfirm.adjustment && (
                  <div className="p-3.5 rounded-2xl bg-[#F2F2F7] border border-[#E5E5EA] text-xs space-y-1.5">
                    <div className="flex justify-between">
                      <span className="text-[#86868B]">Category:</span>
                      <span className="font-bold text-[#1D1D1F]">{deleteConfirm.adjustment.category}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#86868B]">Vehicle Registration:</span>
                      <span className="font-mono font-bold text-[#1D1D1F]">
                        {deleteConfirm.adjustment.record?.vehicle?.registrationNumber || 'N/A'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#86868B]">Period:</span>
                      <span className="font-medium text-[#1D1D1F]">
                        {deleteConfirm.adjustment.record?.period?.periodName || 'N/A'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#86868B]">Amount:</span>
                      <span className="font-bold font-mono text-[#FF3B30]">
                        ₹{Math.abs(deleteConfirm.adjustment.amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
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
                  placeholder="e.g. Erroneous advance entry, cancelled penalty..."
                  className="w-full px-3.5 py-2.5 bg-[#F2F2F7] border border-[#E5E5EA] rounded-[14px] text-xs text-[#1D1D1F] focus:bg-[#FFFFFF] focus:outline-hidden focus:ring-2 focus:ring-[#FF3B30] transition-all"
                />
              </div>

              <p className="text-[11px] text-[#86868B] italic">
                * Note: Historical data integrity is preserved via safe soft-deletion and immutable audit logs.
              </p>
            </div>

            {/* Footer Buttons */}
            <div className="p-4 bg-[#F2F2F7] border-t border-[#E5E5EA] flex items-center justify-end space-x-2.5">
              <button
                type="button"
                onClick={() => setDeleteConfirm({ isOpen: false, adjustment: null, isBulk: false })}
                disabled={deleting}
                className="px-4 py-2 rounded-full border border-[#E5E5EA] bg-[#FFFFFF] hover:bg-[#E5E5EA] text-[#1D1D1F] text-xs font-semibold transition-colors disabled:opacity-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={executeDelete}
                disabled={deleting}
                className="px-5 py-2 rounded-full bg-[#FF3B30] hover:bg-[#D70015] text-white text-xs font-semibold flex items-center space-x-1.5 shadow-sm transition-all disabled:opacity-50 cursor-pointer"
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
                      {deleteConfirm.isBulk
                        ? `Delete ${selectedIds.size} Adjustments`
                        : 'Delete Adjustment'}
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
