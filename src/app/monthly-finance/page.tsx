'use client';

import React, { useState, useEffect } from 'react';
import Navbar from '@/components/Navbar';
import CreateMonthModal from '@/components/CreateMonthModal';
import VehicleRecordModal from '@/components/VehicleRecordModal';
import PaymentSettlementModal from '@/components/PaymentSettlementModal';
import AdjustmentModal from '@/components/AdjustmentModal';
import { useSidebar } from '@/contexts/SidebarContext';
import {
  Calendar,
  Plus,
  Search,
  Filter,
  Download,
  Edit3,
  Trash2,
  CreditCard,
  AlertTriangle,
  Lock,
  Unlock,
  ChevronDown,
  ChevronRight,
  Clock,
  RotateCcw,
  Receipt,
  FileSpreadsheet,
  Truck,
  User,
  Phone,
  Banknote,
  Building2,
  HelpCircle,
  CheckCircle2,
  AlertCircle,
  Info,
  ExternalLink,
  ShieldCheck,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';
import { exportToExcel, exportToCSV } from '@/lib/exportUtils';

export default function MonthlyFinancePage() {
  const { user } = useSidebar();
  const isSuperAdmin = user?.role === 'SUPER_ADMIN';

  const [periods, setPeriods] = useState<any[]>([]);
  const [selectedPeriodId, setSelectedPeriodId] = useState<string>('');
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Accordion state: set of expanded record IDs
  const [expandedRecordIds, setExpandedRecordIds] = useState<Set<string>>(new Set());

  // Modals state
  const [isCreateMonthOpen, setIsCreateMonthOpen] = useState(false);
  const [isMonthActionsOpen, setIsMonthActionsOpen] = useState(false);
  const [editingRecordId, setEditingRecordId] = useState<string | null>(null);
  const [settlingRecord, setSettlingRecord] = useState<any | null>(null);
  const [isAdjustmentModalOpen, setIsAdjustmentModalOpen] = useState(false);
  const [targetAdjustmentRecord, setTargetAdjustmentRecord] = useState<any | null>(null);

  const handleOpenAddAdjustment = (record?: any) => {
    setTargetAdjustmentRecord(record || null);
    setIsAdjustmentModalOpen(true);
  };

  const toggleExpand = (recordId: string) => {
    setExpandedRecordIds((prev) => {
      const next = new Set(prev);
      if (next.has(recordId)) {
        next.delete(recordId);
      } else {
        next.add(recordId);
      }
      return next;
    });
  };

  const expandAll = () => {
    setExpandedRecordIds(new Set(records.map((r) => r.id)));
  };

  const collapseAll = () => {
    setExpandedRecordIds(new Set());
  };

  useEffect(() => {
    fetchPeriods();
  }, []);

  useEffect(() => {
    if (selectedPeriodId) {
      fetchRecords(selectedPeriodId);
      setIsMonthActionsOpen(false);
    }
  }, [selectedPeriodId, statusFilter, search]);

  const fetchPeriods = async () => {
    try {
      const res = await fetch('/api/months', { cache: 'no-store' });
      const data = await res.json();
      const list = data.periods || [];
      setPeriods(list);
      if (list.length > 0) {
        setSelectedPeriodId((prev) => {
          if (prev && list.some((p: any) => p.id === prev)) return prev;
          return list[0].id;
        });
      } else {
        setSelectedPeriodId('');
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchRecords = async (periodId: string) => {
    setLoading(true);
    try {
      let url = `/api/records?periodId=${periodId}`;
      if (statusFilter !== 'ALL') url += `&status=${statusFilter}`;
      if (search) url += `&search=${encodeURIComponent(search)}`;

      const res = await fetch(url, { cache: 'no-store' });
      const data = await res.json();
      setRecords(data.records || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const activePeriod = periods.find((p) => p.id === selectedPeriodId);

  const handleToggleMonthStatus = async () => {
    if (!activePeriod || !isSuperAdmin) return;
    const newStatus = activePeriod.status === 'Locked' ? 'In Progress' : 'Locked';
    const reason = prompt(`Enter reason to change month status to ${newStatus}:`);
    if (!reason) return;

    try {
      await fetch(`/api/months/${activePeriod.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        cache: 'no-store',
        body: JSON.stringify({ status: newStatus, reason }),
      });
      fetchPeriods();
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteMonth = async () => {
    if (!activePeriod || !isSuperAdmin) return;
    if (activePeriod.monthCode === '2026-08' || activePeriod.monthCode === '2026-09') {
      alert('Strict Immutability: Baseline historical months (August & September 2026) cannot be deleted.');
      return;
    }
    if (
      !confirm(
        `Are you sure you want to delete ${activePeriod.periodName}? All associated draft records for this month will be deleted.`
      )
    )
      return;

    try {
      const res = await fetch(`/api/months/${activePeriod.id}`, { method: 'DELETE', cache: 'no-store' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to delete month');
      setSelectedPeriodId('');
      await fetchPeriods();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleDeleteRecord = async (recordId: string, regNo: string) => {
    if (!isSuperAdmin) return;
    const reason = prompt(`Reason for deleting record for ${regNo} (soft-deleted to Recycle Bin):`);
    if (!reason) return;

    try {
      const res = await fetch(`/api/records/${recordId}?reason=${encodeURIComponent(reason)}`, {
        method: 'DELETE',
        cache: 'no-store',
      });
      if (res.ok) {
        fetchRecords(selectedPeriodId);
        fetchPeriods();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleExport = (format: 'xlsx' | 'csv') => {
    const exportData = records.map((r) => ({
      Section: r.sectionIndex,
      'Registration Number': r.vehicle.registrationNumber,
      'Vehicle Category': r.vehicle.vehicleType,
      'Gross Billing (₹)': r.grossBilling,
      'Total Deductions (₹)': r.totalDeductions,
      'Net Payable (₹)': r.netPayable,
      'Amount Paid (₹)': r.amountPaid,
      'Payment Status': r.paymentStatus,
      'Payment Date': r.paymentDate || 'N/A',
      Bank: r.bankDetails || 'OTHER Bank',
      Remarks: r.remarks || '',
      'Has #REF! Error': r.hasRefErrors ? 'YES' : 'NO',
    }));

    const filename = `Atharva_${activePeriod?.periodName.replace(' ', '_')}_Records`;
    if (format === 'xlsx') {
      exportToExcel(exportData, activePeriod?.periodName || 'Records', filename);
    } else {
      exportToCSV(exportData, filename);
    }
  };

  const formatCurrency = (amount?: number) => {
    if (amount === undefined || amount === null) return '₹0.00';
    return `₹${amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto selection:bg-[#B3D7FF]">
      <Navbar
        title="Monthly Fleet Finance & Settlements"
        subtitle="Vehicle-wise Billing, Deductions, Payments & Full Immutability"
        onRefresh={() => {
          fetchPeriods();
          if (selectedPeriodId) fetchRecords(selectedPeriodId);
        }}
      />

      {/* Month Selector Dropdown & Action Toolbar */}
      <div className="bg-[#FFFFFF] p-4 sm:p-5 rounded-[24px] border border-[#E5E5EA] shadow-apple-card flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Left: Financial Period Dropdown (No sideways clutter) */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 w-full md:w-auto">
          <div className="flex items-center space-x-2 shrink-0">
            <div className="w-8 h-8 rounded-full bg-[#007AFF]/10 text-[#007AFF] flex items-center justify-center">
              <Calendar className="w-4 h-4" />
            </div>
            <label htmlFor="period-dropdown" className="text-xs font-bold text-[#1D1D1F] uppercase tracking-wider">
              Financial Month:
            </label>
          </div>

          <div className="relative min-w-[260px] sm:w-80">
            <select
              id="period-dropdown"
              value={selectedPeriodId}
              onChange={(e) => setSelectedPeriodId(e.target.value)}
              className="w-full appearance-none pl-4 pr-10 py-2.5 bg-[#F2F2F7] hover:bg-[#E5E5EA] border border-[#E5E5EA] rounded-full text-xs sm:text-sm font-semibold text-[#1D1D1F] focus:outline-hidden focus:ring-2 focus:ring-[#007AFF] focus:bg-[#FFFFFF] transition-all cursor-pointer shadow-2xs"
            >
              {periods.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.periodName} ({p.monthCode}) — {p._count?.monthlyRecords !== undefined ? p._count.monthlyRecords : 0} Vehicles {p.status === 'Locked' ? '🔒' : ''}
                </option>
              ))}
            </select>
            <ChevronDown className="w-4 h-4 text-[#86868B] absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {activePeriod && (
            <div className="hidden lg:flex items-center space-x-2">
              <span
                className={`px-2.5 py-1 rounded-full text-[11px] font-semibold flex items-center space-x-1.5 border ${
                  activePeriod.status === 'Locked'
                    ? 'bg-[#F2F2F7] text-[#86868B] border-[#E5E5EA]'
                    : 'bg-[#EAF9EE] text-[#34C759] border-[#D2F4DA]'
                }`}
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    activePeriod.status === 'Locked' ? 'bg-[#86868B]' : 'bg-[#34C759] animate-pulse'
                  }`}
                />
                <span>{activePeriod.status}</span>
              </span>
              <span className="text-[11px] text-[#86868B] font-mono">
                FY {activePeriod.financialYear}
              </span>
            </div>
          )}
        </div>

        {/* Right: Actions (Month Actions Dropdown, Add Advance, Create Month for Super Admin) */}
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {activePeriod && isSuperAdmin && (
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsMonthActionsOpen((prev) => !prev)}
                className="px-4 py-2 rounded-full border border-[#E5E5EA] bg-[#FFFFFF] hover:bg-[#F2F2F7] text-[#1D1D1F] text-xs font-semibold flex items-center space-x-1.5 transition-colors shadow-2xs cursor-pointer"
                title="Manage Month status and actions"
              >
                {activePeriod.status === 'Locked' ? (
                  <Unlock className="w-3.5 h-3.5 text-[#FF9F0A]" />
                ) : (
                  <Lock className="w-3.5 h-3.5 text-[#86868B]" />
                )}
                <span>Month Actions</span>
                <ChevronDown
                  className={`w-3.5 h-3.5 text-[#86868B] transition-transform duration-200 ${
                    isMonthActionsOpen ? 'rotate-180' : ''
                  }`}
                />
              </button>

              {isMonthActionsOpen && (
                <>
                  <div
                    className="fixed inset-0 z-30"
                    onClick={() => setIsMonthActionsOpen(false)}
                  />
                  <div className="absolute right-0 mt-1.5 w-48 bg-[#FFFFFF] rounded-2xl shadow-apple-modal border border-[#E5E5EA] py-1.5 z-40 animate-in fade-in zoom-in-95 duration-150">
                    <button
                      type="button"
                      onClick={() => {
                        setIsMonthActionsOpen(false);
                        handleToggleMonthStatus();
                      }}
                      className="w-full px-3.5 py-2 text-left text-xs font-medium text-[#1D1D1F] hover:bg-[#F2F2F7] flex items-center space-x-2 transition-colors cursor-pointer"
                    >
                      {activePeriod.status === 'Locked' ? (
                        <>
                          <Unlock className="w-3.5 h-3.5 text-[#FF9F0A]" />
                          <span>Reopen Month</span>
                        </>
                      ) : (
                        <>
                          <Lock className="w-3.5 h-3.5 text-[#86868B]" />
                          <span>Lock Month</span>
                        </>
                      )}
                    </button>

                    {activePeriod.monthCode !== '2026-08' && activePeriod.monthCode !== '2026-09' && (
                      <>
                        <div className="my-1 border-t border-[#E5E5EA]" />
                        <button
                          type="button"
                          onClick={() => {
                            setIsMonthActionsOpen(false);
                            handleDeleteMonth();
                          }}
                          className="w-full px-3.5 py-2 text-left text-xs font-semibold text-[#FF3B30] hover:bg-[#FEECEB] flex items-center space-x-2 transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5 text-[#FF3B30]" />
                          <span>Delete Month</span>
                        </button>
                      </>
                    )}
                  </div>
                </>
              )}
            </div>
          )}

          {isSuperAdmin && (
            <>
              <button
                type="button"
                onClick={() => handleOpenAddAdjustment()}
                className="px-4 py-2 rounded-full border border-[#007AFF]/30 bg-[#EBF5FF] hover:bg-[#D0E2FF] text-[#007AFF] text-xs font-semibold transition-all duration-150 flex items-center space-x-1.5 shadow-2xs cursor-pointer"
                title="Record Driver Salary Advance or Penalty"
              >
                <Plus className="w-4 h-4" />
                <span>Add Advance / Deduction</span>
              </button>

              <button
                type="button"
                onClick={() => setIsCreateMonthOpen(true)}
                className="px-4 py-2 rounded-full bg-[#007AFF] hover:bg-[#0062CC] text-white text-xs font-semibold transition-all duration-150 flex items-center space-x-1.5 shadow-apple-btn active:scale-[0.98] cursor-pointer"
                title="Create future financial month"
              >
                <Plus className="w-4 h-4" />
                <span>Create New Month</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Active Period Financial Summary Card */}
      {activePeriod && (
        <div className="bg-[#FFFFFF] border border-[#E5E5EA] rounded-[24px] p-6 shadow-apple-card space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-[#E5E5EA] gap-2">
            <div className="flex items-center space-x-2.5">
              <h3 className="text-base font-bold text-[#1D1D1F] tracking-tight">
                {activePeriod.periodName} Statement Overview
              </h3>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-[#EAF9EE] text-[#34C759] border border-[#D2F4DA]">
                {activePeriod.status}
              </span>
            </div>
            <p className="text-xs text-[#86868B] font-mono">
              Period Duration: {activePeriod.startDate} to {activePeriod.endDate}
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 pt-1">
            <div className="p-4 rounded-2xl bg-[#F2F2F7]/60 border border-[#E5E5EA]">
              <p className="text-xs text-[#86868B] font-medium">Gross Billing</p>
              <p className="text-xl font-bold text-[#1D1D1F] mt-0.5 tabular-nums">
                {formatCurrency(activePeriod.grossBilling)}
              </p>
            </div>
            <div className="p-4 rounded-2xl bg-[#F2F2F7]/60 border border-[#E5E5EA]">
              <p className="text-xs text-[#86868B] font-medium">Total Deductions</p>
              <p className="text-xl font-bold text-[#FF3B30] mt-0.5 tabular-nums">
                {formatCurrency(activePeriod.totalDeductions)}
              </p>
            </div>
            <div className="p-4 rounded-2xl bg-[#F2F2F7]/60 border border-[#E5E5EA]">
              <p className="text-xs text-[#86868B] font-medium">Net Payable</p>
              <p className="text-xl font-bold text-[#007AFF] mt-0.5 tabular-nums">
                {formatCurrency(activePeriod.netPayable)}
              </p>
            </div>
            <div className="p-4 rounded-2xl bg-[#F2F2F7]/60 border border-[#E5E5EA]">
              <p className="text-xs text-[#86868B] font-medium">Recorded Settlements</p>
              <p className="text-xl font-bold text-[#34C759] mt-0.5 tabular-nums">
                {formatCurrency(activePeriod.totalPaid)}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Filter & Search Toolbar */}
      <div className="bg-[#FFFFFF] p-4 rounded-[22px] border border-[#E5E5EA] shadow-apple-card flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-[#86868B] absolute left-3.5 top-2.5" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search car number, driver or remarks..."
              className="w-full pl-10 pr-3 py-2 bg-[#F2F2F7] border border-[#E5E5EA] rounded-full text-xs text-[#1D1D1F] focus:bg-[#FFFFFF] focus:ring-2 focus:ring-[#007AFF] focus:outline-hidden transition-all"
            />
          </div>

          <div className="flex items-center space-x-1.5">
            <span className="text-xs text-[#86868B] font-medium">Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 border border-[#E5E5EA] rounded-full text-xs font-semibold text-[#1D1D1F] bg-[#F2F2F7] focus:outline-hidden cursor-pointer"
            >
              <option value="ALL">All Statuses</option>
              <option value="Paid">Paid</option>
              <option value="Partially Paid">Partially Paid</option>
              <option value="HOLD">HOLD</option>
              <option value="WF">WF (Wait Followup)</option>
              <option value="No Account">No Account</option>
              <option value="Draft">Draft</option>
            </select>
          </div>
        </div>

        <div className="flex items-center space-x-2 self-end md:self-auto">
          {/* Quick Accordion Collapse/Expand All */}
          {records.length > 0 && (
            <div className="flex items-center space-x-1 border-r border-[#E5E5EA] pr-2 mr-1">
              <button
                type="button"
                onClick={expandAll}
                className="px-2.5 py-1.5 rounded-full text-[11px] font-medium text-[#86868B] hover:text-[#007AFF] hover:bg-[#F2F2F7] transition-colors"
                title="Expand all vehicle breakdown dropdowns"
              >
                Expand All
              </button>
              <button
                type="button"
                onClick={collapseAll}
                className="px-2.5 py-1.5 rounded-full text-[11px] font-medium text-[#86868B] hover:text-[#007AFF] hover:bg-[#F2F2F7] transition-colors"
                title="Collapse all vehicle breakdown dropdowns"
              >
                Collapse All
              </button>
            </div>
          )}

          <button
            type="button"
            onClick={() => handleExport('xlsx')}
            className="px-3.5 py-2 rounded-full border border-[#E5E5EA] bg-[#FFFFFF] hover:bg-[#F2F2F7] text-[#1D1D1F] text-xs font-semibold flex items-center space-x-1.5 transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-[#34C759]" />
            <span>Excel</span>
          </button>
          <button
            type="button"
            onClick={() => handleExport('csv')}
            className="px-3.5 py-2 rounded-full border border-[#E5E5EA] bg-[#FFFFFF] hover:bg-[#F2F2F7] text-[#1D1D1F] text-xs font-semibold flex items-center space-x-1.5 transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-[#007AFF]" />
            <span>CSV</span>
          </button>
        </div>
      </div>

      {/* Main Vehicle Records Table with Expandable Dropdown Breakdown Rows */}
      <div className="bg-[#FFFFFF] rounded-[24px] border border-[#E5E5EA] shadow-apple-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse">
            <thead className="bg-[#FBFBFC] text-[#86868B] font-semibold border-b border-[#E5E5EA]">
              <tr>
                <th className="py-3 px-2 w-8 text-center"></th>
                <th className="py-3 px-2 w-12 text-center">Sec #</th>
                <th className="py-3 px-4">Car Number & Assigned Driver</th>
                <th className="py-3 px-3">Vehicle Type</th>
                <th className="py-3 px-4 text-right">Gross Billing (₹)</th>
                <th className="py-3 px-4 text-right">Deductions (₹)</th>
                <th className="py-3 px-4 text-right">Net Payable (₹)</th>
                <th className="py-3 px-4 text-right">Disbursed (₹)</th>
                <th className="py-3 px-3 text-center">Status</th>
                <th className="py-3 px-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E5EA]">
              {loading ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-[#86868B]">
                    <div className="flex items-center justify-center space-x-2">
                      <span className="w-2 h-2 rounded-full bg-[#007AFF] animate-ping" />
                      <span>Loading vehicle records and statements from database...</span>
                    </div>
                  </td>
                </tr>
              ) : records.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center">
                    <div className="max-w-xs mx-auto space-y-2">
                      <div className="w-10 h-10 rounded-full bg-[#F2F2F7] flex items-center justify-center mx-auto text-[#86868B]">
                        <Truck className="w-5 h-5" />
                      </div>
                      <p className="text-sm font-semibold text-[#1D1D1F]">
                        No vehicle records found for {activePeriod?.periodName || 'this month'}
                      </p>
                      <p className="text-xs text-[#86868B]">
                        Try choosing another month from the dropdown above or check your search query.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                records.map((r) => {
                  const isExpanded = expandedRecordIds.has(r.id);
                  const isHold = r.paymentStatus === 'HOLD';
                  const isWF = r.paymentStatus === 'WF';
                  const isNoAcc = r.paymentStatus.includes('No Acc');
                  const isPaid = r.paymentStatus === 'Paid';

                  const assignedDriver = r.vehicle?.assignments?.[0]?.driver || null;
                  const adjustments = r.adjustments || [];
                  const billingLines = r.billingLines || [];
                  const payments = r.payments || [];

                  // Categorize adjustments for the accountant's detailed breakdown
                  const fuelAdvances = adjustments.filter(
                    (a: any) =>
                      a.category.toLowerCase().includes('fuel') ||
                      (a.notes && a.notes.toLowerCase().includes('fuel'))
                  );
                  const fuelAdvTotal = fuelAdvances.reduce((sum: number, a: any) => sum + Math.abs(a.amount || 0), 0);

                  const salaryAdvances = adjustments.filter(
                    (a: any) =>
                      (a.category.toLowerCase().includes('salary') ||
                        a.category.toLowerCase().includes('early') ||
                        a.category.toLowerCase().includes('adv')) &&
                      !a.category.toLowerCase().includes('fuel')
                  );
                  const salaryAdvTotal = salaryAdvances.reduce((sum: number, a: any) => sum + Math.abs(a.amount || 0), 0);

                  const otherDeductions = adjustments.filter(
                    (a: any) =>
                      !a.category.toLowerCase().includes('adv') &&
                      !a.category.toLowerCase().includes('salary') &&
                      !a.category.toLowerCase().includes('fuel')
                  );
                  const otherDeductionsTotal = otherDeductions.reduce(
                    (sum: number, a: any) => sum + Math.abs(a.amount || 0),
                    0
                  );

                  const outstandingDue = (r.netPayable || 0) - (r.amountPaid || 0);

                  return (
                    <React.Fragment key={r.id}>
                      {/* Main Vehicle Row – Click anywhere or on car number to toggle dropdown */}
                      <tr
                        className={`transition-colors ${
                          isExpanded ? 'bg-[#F2F7FF]/70' : 'hover:bg-[#F2F2F7]/50'
                        }`}
                      >
                        {/* Dropdown Chevron Toggle Column */}
                        <td className="py-3 px-2 text-center">
                          <button
                            type="button"
                            onClick={() => toggleExpand(r.id)}
                            className="p-1 rounded-md text-[#86868B] hover:text-[#007AFF] hover:bg-white transition-all cursor-pointer"
                            title={isExpanded ? 'Collapse breakdown' : 'Click to drop down detailed salary & advance breakdown'}
                          >
                            <ChevronDown
                              className={`w-4 h-4 transition-transform duration-200 ${
                                isExpanded ? 'rotate-180 text-[#007AFF]' : ''
                              }`}
                            />
                          </button>
                        </td>

                        {/* Section Number */}
                        <td className="py-3 px-2 text-center font-mono text-[#86868B] text-[11px]">
                          {r.sectionIndex}
                        </td>

                        {/* Car Number (Interactive Link with Dropdown) & Assigned Driver */}
                        <td className="py-3 px-4 font-semibold text-[#1D1D1F]">
                          <button
                            type="button"
                            onClick={() => toggleExpand(r.id)}
                            className="text-left group/car flex items-center space-x-1.5 focus:outline-hidden cursor-pointer"
                            title="Click to view month-wise salary given, advances & deductions"
                          >
                            <span className="group-hover/car:text-[#007AFF] group-hover/car:underline font-bold text-xs sm:text-sm">
                              {r.vehicle.registrationNumber}
                            </span>
                            <span className="text-[10px] px-1.5 py-0.2 rounded-md bg-[#007AFF]/10 text-[#007AFF] font-medium opacity-0 group-hover/car:opacity-100 transition-opacity">
                              View Breakdown
                            </span>
                            {r.hasRefErrors && (
                              <span
                                title={`Contains ${r.refErrorCount} original #REF! error(s) in source workbook`}
                                className="text-[#FF9F0A] cursor-help"
                              >
                                <AlertTriangle className="w-3.5 h-3.5 text-[#FF9F0A]" />
                              </span>
                            )}
                          </button>

                          {/* Driver Name & Subtext */}
                          <div className="flex items-center space-x-2 text-[11px] text-[#86868B] font-normal mt-0.5">
                            {assignedDriver ? (
                              <span className="flex items-center space-x-1 text-[#1D1D1F] font-medium">
                                <User className="w-3 h-3 text-[#007AFF]" />
                                <span>{assignedDriver.name}</span>
                              </span>
                            ) : (
                              <span className="text-[#86868B]">No Assigned Driver</span>
                            )}
                            {r.vehicle.carName && <span>· {r.vehicle.carName}</span>}
                          </div>
                        </td>

                        {/* Category */}
                        <td className="py-3 px-3 text-[#86868B]">
                          <span className="px-2 py-0.5 rounded-full text-[10px] bg-[#F2F2F7] border border-[#E5E5EA]">
                            {r.vehicle.vehicleType.replace('Vehicle - ', '')}
                          </span>
                        </td>

                        {/* Gross Billing */}
                        <td className="py-3 px-4 text-right font-semibold text-[#1D1D1F] tabular-nums">
                          {formatCurrency(r.grossBilling)}
                        </td>

                        {/* Total Deductions */}
                        <td className="py-3 px-4 text-right font-semibold text-[#FF3B30] tabular-nums">
                          {formatCurrency(r.totalDeductions)}
                        </td>

                        {/* Net Payable */}
                        <td className="py-3 px-4 text-right font-bold text-[#007AFF] tabular-nums">
                          {formatCurrency(r.netPayable)}
                        </td>

                        {/* Amount Disbursed */}
                        <td className="py-3 px-4 text-right font-semibold text-[#34C759] tabular-nums">
                          {formatCurrency(r.amountPaid)}
                        </td>

                        {/* Status */}
                        <td className="py-3 px-3 text-center">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[10px] font-semibold border ${
                              isPaid
                                ? 'bg-[#EAF9EE] text-[#34C759] border-[#D2F4DA]'
                                : isHold
                                ? 'bg-[#FEECEB] text-[#FF3B30] border-[#FCD3D1]'
                                : isWF
                                ? 'bg-[#FFF5E5] text-[#FF9F0A] border-[#FFE4B8]'
                                : isNoAcc
                                ? 'bg-[#F2F2F7] text-[#86868B] border-[#E5E5EA]'
                                : 'bg-[#EBF5FF] text-[#007AFF] border-[#D0E2FF]'
                            }`}
                          >
                            {r.paymentStatus}
                          </span>
                        </td>

                        {/* Action Buttons for Super Admin */}
                        <td className="py-3 px-4 text-center">
                          <div className="flex items-center justify-center space-x-1">
                            {isSuperAdmin && (
                              <>
                                <button
                                  type="button"
                                  onClick={() => setEditingRecordId(r.id)}
                                  className="p-1.5 rounded-full text-[#86868B] hover:text-[#007AFF] hover:bg-[#EBF5FF] transition-colors cursor-pointer"
                                  title="Edit Billing Lines & Deductions (Super Admin)"
                                >
                                  <Edit3 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setSettlingRecord(r)}
                                  className="p-1.5 rounded-full text-[#86868B] hover:text-[#34C759] hover:bg-[#EAF9EE] transition-colors cursor-pointer"
                                  title="Record Payment Settlement (Super Admin)"
                                >
                                  <CreditCard className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteRecord(r.id, r.vehicle.registrationNumber)}
                                  className="p-1.5 rounded-full text-[#86868B] hover:text-[#FF3B30] hover:bg-[#FEECEB] transition-colors cursor-pointer"
                                  title="Soft Delete to Recycle Bin (Super Admin)"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>

                      {/* =========================================================================
                          DETAILED DROPDOWN VIEW: Month-Wise Salary Given, Advances, Deductions & Explanation
                          Directly solves the accountant's need when a driver asks why salary was less
                          ========================================================================= */}
                      {isExpanded && (
                        <tr className="bg-[#F8F9FB] border-b-2 border-[#007AFF]/20">
                          <td colSpan={10} className="p-4 sm:p-6 space-y-5 animate-in fade-in duration-200">
                            {/* 1. Header Lockup: Car Specs & Driver Profile */}
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-[#E5E5EA] gap-3">
                              <div className="flex items-center space-x-3">
                                <div className="w-10 h-10 rounded-2xl bg-[#007AFF]/10 text-[#007AFF] flex items-center justify-center shrink-0">
                                  <Truck className="w-5 h-5" />
                                </div>
                                <div>
                                  <div className="flex items-center space-x-2">
                                    <h4 className="font-bold text-sm sm:text-base text-[#1D1D1F]">
                                      {r.vehicle.registrationNumber}
                                    </h4>
                                    <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-[#E5E5EA] text-[#48484A]">
                                      {r.vehicle.vehicleType}
                                    </span>
                                    <span className="text-xs text-[#86868B]">
                                      {activePeriod?.periodName} Statement
                                    </span>
                                  </div>
                                  <p className="text-xs text-[#86868B] mt-0.5">
                                    Owner: <strong className="text-[#1D1D1F]">{r.vehicle.ownerName || 'ATHARVA Fleet'}</strong> · Bank Details:{' '}
                                    <span className="font-mono text-[#007AFF]">{r.bankDetails || 'Registered Bank Account'}</span>
                                  </p>
                                </div>
                              </div>

                              {/* Driver Info Card */}
                              <div className="flex items-center space-x-3 px-3.5 py-2 rounded-2xl bg-[#FFFFFF] border border-[#E5E5EA] shadow-2xs">
                                <div className="w-8 h-8 rounded-full bg-[#007AFF] text-white flex items-center justify-center font-bold text-xs shrink-0">
                                  {assignedDriver?.name ? assignedDriver.name[0] : 'D'}
                                </div>
                                <div className="text-xs">
                                  <p className="font-semibold text-[#1D1D1F]">
                                    {assignedDriver?.name || 'Driver Not Assigned'}
                                  </p>
                                  <p className="text-[11px] text-[#86868B] flex items-center space-x-1">
                                    <Phone className="w-2.5 h-2.5" />
                                    <span>{assignedDriver?.phone || 'Contact not on file'}</span>
                                  </p>
                                </div>
                              </div>
                            </div>

                            {/* 2. THE ACCOUNTANT'S SALARY EXPLANATION BOX (Highlights why salary was less) */}
                            <div className="p-4 sm:p-5 rounded-[20px] bg-[#FFFFFF] border border-[#007AFF]/30 shadow-apple-card space-y-3">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-2">
                                  <div className="w-7 h-7 rounded-full bg-[#007AFF] text-white flex items-center justify-center">
                                    <HelpCircle className="w-4 h-4" />
                                  </div>
                                  <div>
                                    <h5 className="font-bold text-xs sm:text-sm text-[#1D1D1F]">
                                      Accountant&apos;s Salary & Deduction Breakdown for {activePeriod?.periodName}
                                    </h5>
                                    <p className="text-[11px] text-[#86868B]">
                                      Transparent explanation of how net monthly salary payable was derived from gross earnings.
                                    </p>
                                  </div>
                                </div>
                                <div className="flex items-center space-x-3 text-right">
                                  <div>
                                    <span className="text-[10px] text-[#86868B] font-semibold uppercase block">Net Payable</span>
                                    <p className="text-base sm:text-lg font-bold text-[#007AFF] tabular-nums">
                                      {formatCurrency(r.netPayable)}
                                    </p>
                                  </div>
                                  {isSuperAdmin && (
                                    <button
                                      type="button"
                                      onClick={() => handleOpenAddAdjustment(r)}
                                      className="px-3 py-1.5 rounded-full bg-[#007AFF] hover:bg-[#0062CC] text-white text-[11px] font-semibold flex items-center space-x-1 transition-all cursor-pointer shadow-2xs shrink-0"
                                      title="Record driver salary advance or penalty for this vehicle"
                                    >
                                      <Plus className="w-3.5 h-3.5" />
                                      <span>Add Advance / Deduction</span>
                                    </button>
                                  )}
                                </div>
                              </div>

                              {/* Step-by-Step Mathematical Formula Pill Bar */}
                              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 pt-2 text-center text-xs">
                                <div className="p-2.5 rounded-xl bg-[#F2F2F7] border border-[#E5E5EA]">
                                  <span className="text-[10px] text-[#86868B] font-semibold block">1. Gross Trips</span>
                                  <span className="font-bold text-[#1D1D1F] tabular-nums">{formatCurrency(r.grossBilling)}</span>
                                </div>
                                <div className="p-2.5 rounded-xl bg-[#FEECEB] border border-[#FCD3D1]">
                                  <span className="text-[10px] text-[#FF3B30] font-semibold block">2. Fuel Advances</span>
                                  <span className="font-bold text-[#FF3B30] tabular-nums">- {formatCurrency(fuelAdvTotal)}</span>
                                </div>
                                <div className="p-2.5 rounded-xl bg-[#FFF5E5] border border-[#FFE4B8]">
                                  <span className="text-[10px] text-[#FF9F0A] font-semibold block">3. Salary Advances</span>
                                  <span className="font-bold text-[#FF9F0A] tabular-nums">- {formatCurrency(salaryAdvTotal)}</span>
                                </div>
                                <div className="p-2.5 rounded-xl bg-[#F2F2F7] border border-[#E5E5EA]">
                                  <span className="text-[10px] text-[#86868B] font-semibold block">4. Other Deductions</span>
                                  <span className="font-bold text-[#FF3B30] tabular-nums">- {formatCurrency(otherDeductionsTotal)}</span>
                                </div>
                                <div className="p-2.5 rounded-xl bg-[#EAF9EE] border border-[#D2F4DA] col-span-2 sm:col-span-1">
                                  <span className="text-[10px] text-[#34C759] font-semibold block">5. Net Salary Due</span>
                                  <span className="font-bold text-[#34C759] tabular-nums">= {formatCurrency(r.netPayable)}</span>
                                </div>
                              </div>

                              {/* Settlement Status Note for Accountant */}
                              <div className="p-3 rounded-xl bg-[#F8F9FA] border border-[#E5E5EA] flex flex-col sm:flex-row sm:items-center justify-between text-xs gap-2">
                                <div className="flex items-center space-x-2">
                                  <Info className="w-4 h-4 text-[#007AFF] shrink-0" />
                                  <p className="text-[#48484A]">
                                    <strong>Accountant Response Note:</strong> If driver {assignedDriver?.name || 'for this vehicle'} asks why salary is less:
                                    {' '}Gross billing was {formatCurrency(r.grossBilling)}, minus {formatCurrency(fuelAdvTotal)} for fuel advances, minus {formatCurrency(salaryAdvTotal)} for early salary advances, and minus {formatCurrency(otherDeductionsTotal)} in other deductions.
                                  </p>
                                </div>
                                <div className="shrink-0 flex items-center space-x-3">
                                  <span>Disbursed: <strong className="text-[#34C759]">{formatCurrency(r.amountPaid)}</strong></span>
                                  <span>Balance: <strong className="text-[#FF9F0A]">{formatCurrency(outstandingDue)}</strong></span>
                                </div>
                              </div>
                            </div>

                            {/* 3. FOUR DETAILED TABLES: Settlements, Advances, Other Deductions & Client Billings */}
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                              {/* Table A: Salary Given / Disbursed Payments */}
                              <div className="p-4 rounded-[20px] bg-[#FFFFFF] border border-[#E5E5EA] space-y-3">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center space-x-2">
                                    <Banknote className="w-4 h-4 text-[#34C759]" />
                                    <h5 className="font-bold text-xs text-[#1D1D1F]">
                                      Salary Disbursed / Payments Given ({payments.length})
                                    </h5>
                                  </div>
                                  <span className="font-bold text-xs text-[#34C759]">
                                    Total Paid: {formatCurrency(r.amountPaid)}
                                  </span>
                                </div>

                                {payments.length === 0 ? (
                                  <div className="p-4 rounded-xl bg-[#F2F2F7]/50 text-center text-xs text-[#86868B]">
                                    No payment settlements recorded yet for this month.
                                  </div>
                                ) : (
                                  <div className="overflow-x-auto">
                                    <table className="w-full text-[11px] text-left">
                                      <thead className="text-[#86868B] border-b border-[#E5E5EA]">
                                        <tr>
                                          <th className="py-1.5 px-2">Date</th>
                                          <th className="py-1.5 px-2">Mode</th>
                                          <th className="py-1.5 px-2">Bank / UTR</th>
                                          <th className="py-1.5 px-2 text-right">Amount (₹)</th>
                                        </tr>
                                      </thead>
                                      <tbody className="divide-y divide-[#E5E5EA]/60">
                                        {payments.map((p: any) => (
                                          <tr key={p.id}>
                                            <td className="py-2 px-2 text-[#1D1D1F] font-medium">{p.paymentDate}</td>
                                            <td className="py-2 px-2 text-[#86868B]">{p.paymentMode}</td>
                                            <td className="py-2 px-2 text-[#86868B] font-mono text-[10px]">
                                              {p.bankName} {p.referenceNumber ? `· Ref: ${p.referenceNumber}` : ''}
                                            </td>
                                            <td className="py-2 px-2 text-right font-bold text-[#34C759]">
                                              {formatCurrency(p.amount)}
                                            </td>
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                  </div>
                                )}
                              </div>

                              {/* Table B: Salary & Fuel Advances Taken */}
                              <div className="p-4 rounded-[20px] bg-[#FFFFFF] border border-[#E5E5EA] space-y-3">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center space-x-2">
                                    <TrendingDown className="w-4 h-4 text-[#FF9F0A]" />
                                    <h5 className="font-bold text-xs text-[#1D1D1F]">
                                      Advances Taken by Driver ({fuelAdvances.length + salaryAdvances.length})
                                    </h5>
                                  </div>
                                  <div className="flex items-center space-x-2">
                                    <span className="font-bold text-xs text-[#FF9F0A]">
                                      Advances Total: {formatCurrency(fuelAdvTotal + salaryAdvTotal)}
                                    </span>
                                    {isSuperAdmin && (
                                      <button
                                        type="button"
                                        onClick={() => handleOpenAddAdjustment(r)}
                                        className="px-2.5 py-1 rounded-full bg-[#FF9F0A]/10 hover:bg-[#FF9F0A]/20 text-[#FF9F0A] text-[10px] font-bold flex items-center space-x-1 transition-colors cursor-pointer"
                                        title="Record early salary advance or fuel advance"
                                      >
                                        <Plus className="w-3 h-3" />
                                        <span>Add Advance</span>
                                      </button>
                                    )}
                                  </div>
                                </div>

                                {fuelAdvances.length === 0 && salaryAdvances.length === 0 ? (
                                  <div className="p-4 rounded-xl bg-[#F2F2F7]/50 text-center text-xs text-[#86868B]">
                                    No salary or fuel advances were taken during this month.
                                  </div>
                                ) : (
                                  <div className="overflow-x-auto">
                                    <table className="w-full text-[11px] text-left">
                                      <thead className="text-[#86868B] border-b border-[#E5E5EA]">
                                        <tr>
                                          <th className="py-1.5 px-2">Type / Category</th>
                                          <th className="py-1.5 px-2">Notes & Remarks</th>
                                          <th className="py-1.5 px-2 text-right">Amount Taken (₹)</th>
                                        </tr>
                                      </thead>
                                      <tbody className="divide-y divide-[#E5E5EA]/60">
                                        {[...fuelAdvances, ...salaryAdvances].map((adv: any, idx: number) => (
                                          <tr key={adv.id || idx}>
                                            <td className="py-2 px-2 text-[#1D1D1F] font-semibold">
                                              <span
                                                className={`px-2 py-0.5 rounded-full text-[10px] ${
                                                  adv.category.toLowerCase().includes('fuel')
                                                    ? 'bg-[#FEECEB] text-[#FF3B30]'
                                                    : 'bg-[#FFF5E5] text-[#FF9F0A]'
                                                }`}
                                              >
                                                {adv.category}
                                              </span>
                                            </td>
                                            <td className="py-2 px-2 text-[#86868B]">
                                              {adv.notes || adv.formulaString || 'Disbursed during operation'}
                                            </td>
                                            <td className="py-2 px-2 text-right font-bold text-[#FF3B30]">
                                              {formatCurrency(Math.abs(adv.amount))}
                                            </td>
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                  </div>
                                )}
                              </div>

                              {/* Table C: Other Deductions (Toll, Fastag, EMI, Penalties) */}
                              <div className="p-4 rounded-[20px] bg-[#FFFFFF] border border-[#E5E5EA] space-y-3">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center space-x-2">
                                    <CreditCard className="w-4 h-4 text-[#FF3B30]" />
                                    <h5 className="font-bold text-xs text-[#1D1D1F]">
                                      Other Deductions & Adjustments ({otherDeductions.length})
                                    </h5>
                                  </div>
                                  <div className="flex items-center space-x-2">
                                    <span className="font-bold text-xs text-[#FF3B30]">
                                      Other Deductions: {formatCurrency(otherDeductionsTotal)}
                                    </span>
                                    {isSuperAdmin && (
                                      <button
                                        type="button"
                                        onClick={() => handleOpenAddAdjustment(r)}
                                        className="px-2.5 py-1 rounded-full bg-[#FF3B30]/10 hover:bg-[#FF3B30]/20 text-[#FF3B30] text-[10px] font-bold flex items-center space-x-1 transition-colors cursor-pointer"
                                        title="Record driver penalty or miscellaneous deduction"
                                      >
                                        <Plus className="w-3 h-3" />
                                        <span>Add Penalty / Deduction</span>
                                      </button>
                                    )}
                                  </div>
                                </div>

                                {otherDeductions.length === 0 ? (
                                  <div className="p-4 rounded-xl bg-[#F2F2F7]/50 text-center text-xs text-[#86868B]">
                                    No additional penalties, toll, or miscellaneous deductions.
                                  </div>
                                ) : (
                                  <div className="overflow-x-auto">
                                    <table className="w-full text-[11px] text-left">
                                      <thead className="text-[#86868B] border-b border-[#E5E5EA]">
                                        <tr>
                                          <th className="py-1.5 px-2">Category</th>
                                          <th className="py-1.5 px-2">Description</th>
                                          <th className="py-1.5 px-2 text-right">Amount (₹)</th>
                                        </tr>
                                      </thead>
                                      <tbody className="divide-y divide-[#E5E5EA]/60">
                                        {otherDeductions.map((d: any, idx: number) => (
                                          <tr key={d.id || idx}>
                                            <td className="py-2 px-2 text-[#1D1D1F] font-semibold">{d.category}</td>
                                            <td className="py-2 px-2 text-[#86868B]">{d.notes || 'Monthly deduction'}</td>
                                            <td className="py-2 px-2 text-right font-bold text-[#FF3B30]">
                                              {formatCurrency(Math.abs(d.amount))}
                                            </td>
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                  </div>
                                )}
                              </div>

                              {/* Table D: Corporate Client Trips & Billings */}
                              <div className="p-4 rounded-[20px] bg-[#FFFFFF] border border-[#E5E5EA] space-y-3">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center space-x-2">
                                    <Building2 className="w-4 h-4 text-[#007AFF]" />
                                    <h5 className="font-bold text-xs text-[#1D1D1F]">
                                      Corporate Client Billing Lines ({billingLines.length})
                                    </h5>
                                  </div>
                                  <span className="font-bold text-xs text-[#007AFF]">
                                    Total Billing: {formatCurrency(r.grossBilling)}
                                  </span>
                                </div>

                                {billingLines.length === 0 ? (
                                  <div className="p-4 rounded-xl bg-[#F2F2F7]/50 text-center text-xs text-[#86868B]">
                                    No client billing lines recorded for this vehicle.
                                  </div>
                                ) : (
                                  <div className="overflow-x-auto">
                                    <table className="w-full text-[11px] text-left">
                                      <thead className="text-[#86868B] border-b border-[#E5E5EA]">
                                        <tr>
                                          <th className="py-1.5 px-2">Company Name</th>
                                          <th className="py-1.5 px-2 text-center">Trips / Km</th>
                                          <th className="py-1.5 px-2 text-right">Rate</th>
                                          <th className="py-1.5 px-2 text-right">Amount (₹)</th>
                                        </tr>
                                      </thead>
                                      <tbody className="divide-y divide-[#E5E5EA]/60">
                                        {billingLines.map((bl: any) => (
                                          <tr key={bl.id}>
                                            <td className="py-2 px-2 text-[#1D1D1F] font-semibold">{bl.companyName}</td>
                                            <td className="py-2 px-2 text-center text-[#86868B] font-mono">
                                              {bl.kmOrTrips || '—'}
                                            </td>
                                            <td className="py-2 px-2 text-right text-[#86868B]">
                                              {bl.ratePerUnit ? formatCurrency(bl.ratePerUnit) : '—'}
                                            </td>
                                            <td className="py-2 px-2 text-right font-bold text-[#1D1D1F]">
                                              {formatCurrency(bl.billingAmount)}
                                            </td>
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* 4. Super Admin Action Controls */}
                            {isSuperAdmin && (
                              <div className="pt-2 flex flex-wrap items-center justify-between gap-3 border-t border-[#E5E5EA]">
                                <div className="flex items-center space-x-2 text-xs text-[#86868B]">
                                  <ShieldCheck className="w-4 h-4 text-[#007AFF]" />
                                  <span>Super Admin Authority: You can edit financial adjustments or settle payments for this driver.</span>
                                </div>

                                <div className="flex items-center space-x-2">
                                  <button
                                    type="button"
                                    onClick={() => setEditingRecordId(r.id)}
                                    className="px-3.5 py-1.5 rounded-full border border-[#007AFF]/30 bg-[#EBF5FF] hover:bg-[#D9ECFF] text-[#007AFF] text-xs font-semibold flex items-center space-x-1.5 transition-colors cursor-pointer"
                                  >
                                    <Edit3 className="w-3.5 h-3.5" />
                                    <span>Edit Billing & Deductions</span>
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => setSettlingRecord(r)}
                                    className="px-3.5 py-1.5 rounded-full bg-[#34C759] hover:bg-[#2DB34E] text-white text-xs font-semibold flex items-center space-x-1.5 transition-colors shadow-2xs cursor-pointer"
                                  >
                                    <CreditCard className="w-3.5 h-3.5" />
                                    <span>Record Settlement</span>
                                  </button>
                                </div>
                              </div>
                            )}
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modals for Super Admin Operations */}
      {isSuperAdmin && (
        <CreateMonthModal
          isOpen={isCreateMonthOpen}
          onClose={() => setIsCreateMonthOpen(false)}
          existingPeriods={periods}
          onMonthCreated={() => {
            fetchPeriods();
          }}
        />
      )}

      {isSuperAdmin && (
        <VehicleRecordModal
          isOpen={!!editingRecordId}
          recordId={editingRecordId}
          onClose={() => setEditingRecordId(null)}
          onRecordUpdated={() => {
            if (selectedPeriodId) fetchRecords(selectedPeriodId);
            fetchPeriods();
          }}
        />
      )}

      {isSuperAdmin && (
        <PaymentSettlementModal
          isOpen={!!settlingRecord}
          record={settlingRecord}
          onClose={() => setSettlingRecord(null)}
          onPaymentRecorded={() => {
            if (selectedPeriodId) fetchRecords(selectedPeriodId);
            fetchPeriods();
          }}
        />
      )}

      {isSuperAdmin && (
        <AdjustmentModal
          isOpen={isAdjustmentModalOpen}
          mode="create"
          preselectedRecordId={targetAdjustmentRecord?.id}
          preselectedPeriodId={targetAdjustmentRecord?.periodId || selectedPeriodId}
          preselectedVehicleId={targetAdjustmentRecord?.vehicleId}
          periods={periods}
          vehicles={records.map((rec) => ({
            id: rec.vehicleId,
            registrationNumber: rec.vehicle.registrationNumber,
            vehicleType: rec.vehicle.vehicleType,
            ownerName: rec.vehicle.ownerName,
            assignments: rec.vehicle.assignments,
          }))}
          onClose={() => {
            setIsAdjustmentModalOpen(false);
            setTargetAdjustmentRecord(null);
          }}
          onSuccess={() => {
            setIsAdjustmentModalOpen(false);
            setTargetAdjustmentRecord(null);
            if (selectedPeriodId) fetchRecords(selectedPeriodId);
            fetchPeriods();
          }}
        />
      )}
    </div>
  );
}
