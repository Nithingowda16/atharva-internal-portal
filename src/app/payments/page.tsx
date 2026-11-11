'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Navbar from '@/components/Navbar';
import PaymentSettlementModal from '@/components/PaymentSettlementModal';
import DriverAssignmentModal from '@/components/DriverAssignmentModal';
import VehicleRecordModal from '@/components/VehicleRecordModal';
import AdjustmentModal from '@/components/AdjustmentModal';
import AddVehicleModal from '@/components/AddVehicleModal';
import { useSidebar } from '@/contexts/SidebarContext';
import {
  CreditCard,
  Search,
  Filter,
  Download,
  Printer,
  CheckCircle,
  AlertCircle,
  Building2,
  Calendar,
  ChevronDown,
  User,
  UserPlus,
  Edit2,
  Edit3,
  UserMinus,
  FileText,
  Wallet,
  AlertTriangle,
  TrendingDown,
  Plus,
  RefreshCw,
  FileSpreadsheet,
  Banknote,
  Receipt,
  Info,
  X,
  Trash2,
  CheckSquare,
  Square
} from 'lucide-react';
import { exportToExcel, exportToCSV, exportSalaryReceiptPDF, SalaryReceiptData } from '@/lib/exportUtils';

export default function PaymentsPage() {
  const { user } = useSidebar();
  const isSuperAdmin = user?.role === 'SUPER_ADMIN';

  const [records, setRecords] = useState<any[]>([]);
  const [periods, setPeriods] = useState<any[]>([]);
  const [selectedPeriodId, setSelectedPeriodId] = useState<string>('ALL');
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Accordion state: set of expanded record IDs
  const [expandedRecordIds, setExpandedRecordIds] = useState<Set<string>>(new Set());

  // Multi-select for vehicle records (bulk delete)
  const [selectedRecordIds, setSelectedRecordIds] = useState<Set<string>>(new Set());

  // Multi-select for itemized deductions within expanded cards
  const [selectedDeductionIds, setSelectedDeductionIds] = useState<Set<string>>(new Set());

  // Modal states
  const [selectedRecordForPayment, setSelectedRecordForPayment] = useState<any | null>(null);
  const [driverModalRecord, setDriverModalRecord] = useState<any | null>(null);
  const [isDriverModalOpen, setIsDriverModalOpen] = useState(false);

  // Edit vehicle record modal
  const [editingRecordId, setEditingRecordId] = useState<string | null>(null);

  // Add vehicle row modal
  const [isAddVehicleOpen, setIsAddVehicleOpen] = useState(false);

  // Adjustment modal state (for create/edit deduction or manual TDS)
  const [isAdjustmentModalOpen, setIsAdjustmentModalOpen] = useState(false);
  const [adjustmentModalMode, setAdjustmentModalMode] = useState<'create' | 'edit'>('create');
  const [adjustmentToEdit, setAdjustmentToEdit] = useState<any | null>(null);
  const [targetRecordForAdjustment, setTargetRecordForAdjustment] = useState<any | null>(null);

  // Delete confirmation modal state
  const [deleteConfirm, setDeleteConfirm] = useState<{
    isOpen: boolean;
    type: 'record' | 'records-bulk' | 'deduction' | 'deductions-bulk' | 'payment';
    targetId?: string;
    parentRecordId?: string;
    title: string;
    description: string;
  } | null>(null);

  // Notification state
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    fetchPeriods();
  }, []);

  useEffect(() => {
    fetchPayments();
    setSelectedRecordIds(new Set());
    setSelectedDeductionIds(new Set());
  }, [statusFilter, selectedPeriodId]);

  // Auto-clear notification after 5s
  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => setNotification(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  const fetchPeriods = async () => {
    try {
      const res = await fetch('/api/months');
      const data = await res.json();
      setPeriods(data.periods || []);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchPayments = async () => {
    setLoading(true);
    try {
      let url = '/api/records?';
      const params = new URLSearchParams();
      if (statusFilter !== 'ALL') params.set('status', statusFilter);
      if (selectedPeriodId !== 'ALL') params.set('periodId', selectedPeriodId);
      url += params.toString();

      const res = await fetch(url);
      const data = await res.json();
      setRecords(data.records || []);
    } catch (e) {
      console.error(e);
      setNotification({ type: 'error', text: 'Failed to load payments directory.' });
    } finally {
      setLoading(false);
    }
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

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return records.filter((r) => {
      const reg = (r.vehicle?.registrationNumber || '').toLowerCase();
      const driver = (r.vehicle?.assignments?.[0]?.driver?.name || '').toLowerCase();
      const phone = (r.vehicle?.assignments?.[0]?.driver?.phone || '').toLowerCase();
      const bank = (r.bankDetails || '').toLowerCase();
      const remarks = (r.remarks || '').toLowerCase();

      return (
        !q ||
        reg.includes(q) ||
        driver.includes(q) ||
        phone.includes(q) ||
        bank.includes(q) ||
        remarks.includes(q) ||
        String(r.sectionIndex || '').includes(q)
      );
    });
  }, [records, search]);

  // Financial aggregates
  const { totalGross, totalTds, totalAdvances, totalNet, totalSettled, totalOutstanding } = useMemo(() => {
    let gross = 0;
    let tds = 0;
    let advances = 0;
    let net = 0;
    let settled = 0;
    let outstanding = 0;

    for (const r of filtered) {
      gross += r.grossBilling || 0;
      net += r.netPayable || 0;
      settled += r.amountPaid || 0;
      outstanding += Math.max(0, (r.netPayable || 0) - (r.amountPaid || 0));

      const adjustments = r.adjustments || [];
      const tdsAdj = adjustments.find((a: any) => (a.category || '').toLowerCase().includes('tds'));
      if (tdsAdj) {
        tds += Math.abs(tdsAdj.amount || 0);
      } else {
        tds += Math.round((r.grossBilling || 0) * 0.01 * 100) / 100;
      }

      for (const a of adjustments) {
        const cat = (a.category || '').toLowerCase();
        if (cat.includes('adv') || cat.includes('salary') || cat.includes('early') || cat.includes('fuel')) {
          advances += Math.abs(a.amount || 0);
        }
      }
    }

    return {
      totalGross: gross,
      totalTds: tds,
      totalAdvances: advances,
      totalNet: net,
      totalSettled: settled,
      totalOutstanding: outstanding,
    };
  }, [filtered]);

  // Derived vehicles list for AdjustmentModal
  const vehiclesList = useMemo(() => {
    const map = new Map<string, any>();
    for (const r of records) {
      if (r.vehicle && !map.has(r.vehicle.id)) {
        map.set(r.vehicle.id, r.vehicle);
      }
    }
    return Array.from(map.values());
  }, [records]);

  // Record selection handlers
  const handleToggleSelectRecord = (id: string) => {
    setSelectedRecordIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSelectAllRecords = () => {
    if (selectedRecordIds.size === filtered.length && filtered.length > 0) {
      setSelectedRecordIds(new Set());
    } else {
      setSelectedRecordIds(new Set(filtered.map((r) => r.id)));
    }
  };

  // Deduction selection handlers
  const handleToggleSelectDeduction = (id: string) => {
    setSelectedDeductionIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Driver Assignment Handlers
  const handleOpenDriverModal = (r: any) => {
    setDriverModalRecord(r);
    setIsDriverModalOpen(true);
  };

  // 1% TDS Handler
  const handleApplyTds = async (r: any) => {
    const calculatedTds = Math.round((r.grossBilling || 0) * 0.01 * 100) / 100;

    // If gross > 0, apply the calculated 1% TDS directly
    if (calculatedTds > 0) {
      try {
        const res = await fetch('/api/adjustments', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            recordId: r.id,
            category: 'TDS 1%',
            adjustmentType: 'DEDUCTION',
            amount: calculatedTds,
            notes: `Statutory 1% TDS deducted from main monthly salary (Gross: ₹${r.grossBilling.toLocaleString('en-IN')})`,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to apply TDS');

        setNotification({
          type: 'success',
          text: `1% TDS (₹${calculatedTds.toLocaleString('en-IN')}) successfully deducted from monthly salary of ${r.vehicle.registrationNumber}.`,
        });
        fetchPayments();
      } catch (err: any) {
        setNotification({ type: 'error', text: err.message || 'Error applying 1% TDS.' });
      }
    } else {
      // If gross is 0 or negative, open AdjustmentModal pre-configured for TDS 1% so the user can enter/verify the amount
      setTargetRecordForAdjustment(r);
      setAdjustmentModalMode('create');
      setAdjustmentToEdit(null);
      setIsAdjustmentModalOpen(true);
    }
  };

  // Adjustment Modal Handlers
  const handleOpenAddAdjustment = (r: any) => {
    setTargetRecordForAdjustment(r);
    setAdjustmentModalMode('create');
    setAdjustmentToEdit(null);
    setIsAdjustmentModalOpen(true);
  };

  const handleOpenEditAdjustment = (adj: any, r: any) => {
    setTargetRecordForAdjustment(r);
    setAdjustmentModalMode('edit');
    setAdjustmentToEdit(adj);
    setIsAdjustmentModalOpen(true);
  };

  // Execute Deletion
  const handleExecuteDelete = async () => {
    if (!deleteConfirm) return;
    const { type, targetId, parentRecordId } = deleteConfirm;

    try {
      if (type === 'record' && targetId) {
        const res = await fetch(`/api/records?id=${targetId}&reason=Deleted from Payments section by Super Admin`, {
          method: 'DELETE',
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to delete vehicle record');
        setNotification({ type: 'success', text: 'Vehicle record moved to Recycle Bin and totals updated.' });
        setSelectedRecordIds((prev) => {
          const next = new Set(prev);
          next.delete(targetId);
          return next;
        });
        fetchPayments();
      } else if (type === 'records-bulk') {
        const ids = Array.from(selectedRecordIds);
        const res = await fetch('/api/records', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ids, reason: 'Bulk delete from Payments section by Super Admin' }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to bulk delete vehicle records');
        setNotification({
          type: 'success',
          text: `Successfully deleted ${data.deletedCount || ids.length} vehicle record(s).`,
        });
        setSelectedRecordIds(new Set());
        fetchPayments();
      } else if (type === 'deduction' && targetId) {
        const res = await fetch(`/api/adjustments?id=${targetId}&reason=Deleted deduction by Super Admin`, {
          method: 'DELETE',
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to delete deduction');
        setNotification({ type: 'success', text: 'Deduction deleted and vehicle record recalculated.' });
        setSelectedDeductionIds((prev) => {
          const next = new Set(prev);
          next.delete(targetId);
          return next;
        });
        fetchPayments();
      } else if (type === 'deductions-bulk') {
        const ids = Array.from(selectedDeductionIds);
        const res = await fetch('/api/adjustments', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ids, reason: 'Bulk deleted deductions by Super Admin' }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to bulk delete deductions');
        setNotification({
          type: 'success',
          text: `Successfully deleted ${ids.length} itemized deduction(s) and recalculated totals.`,
        });
        setSelectedDeductionIds(new Set());
        fetchPayments();
      } else if (type === 'payment' && targetId && parentRecordId) {
        const res = await fetch(`/api/records/${parentRecordId}/payments?paymentId=${targetId}`, {
          method: 'DELETE',
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to delete payment transaction');
        setNotification({ type: 'success', text: 'Payment transaction removed and vehicle balance recalculated.' });
        fetchPayments();
      }
    } catch (err: any) {
      console.error(err);
      setNotification({ type: 'error', text: err.message || 'Error executing deletion.' });
    } finally {
      setDeleteConfirm(null);
    }
  };

  // Download official salary receipt PDF
  const handleDownloadSalaryReceipt = (r: any) => {
    const assignedDriver = r.vehicle?.assignments?.[0]?.driver || null;
    const adjustments = r.adjustments || [];

    // Categorize adjustments
    const tdsAdj = adjustments.find((a: any) => (a.category || '').toLowerCase().includes('tds'));
    const tdsAmount = tdsAdj ? Math.abs(tdsAdj.amount || 0) : Math.round((r.grossBilling || 0) * 0.01 * 100) / 100;

    const salaryAdvances = adjustments
      .filter((a: any) => {
        const cat = (a.category || '').toLowerCase();
        return (cat.includes('salary') || cat.includes('early') || cat.includes('adv')) && !cat.includes('fuel') && !cat.includes('tds');
      })
      .reduce((sum: number, a: any) => sum + Math.abs(a.amount || 0), 0);

    const fuelAdvances = adjustments
      .filter((a: any) => (a.category || '').toLowerCase().includes('fuel'))
      .reduce((sum: number, a: any) => sum + Math.abs(a.amount || 0), 0);

    const driverPenalties = adjustments
      .filter((a: any) => {
        const cat = (a.category || '').toLowerCase();
        return cat.includes('penalty') || cat.includes('fine');
      })
      .reduce((sum: number, a: any) => sum + Math.abs(a.amount || 0), 0);

    const otherDeductions = adjustments
      .filter((a: any) => {
        const cat = (a.category || '').toLowerCase();
        return !cat.includes('tds') && !cat.includes('salary') && !cat.includes('early') && !cat.includes('fuel') && !cat.includes('penalty') && !cat.includes('fine');
      })
      .reduce((sum: number, a: any) => sum + Math.abs(a.amount || 0), 0);

    const receiptPayload: SalaryReceiptData = {
      periodName: r.period.periodName,
      monthCode: r.period.monthCode,
      sectionIndex: r.sectionIndex,
      vehicle: {
        registrationNumber: r.vehicle.registrationNumber,
        vehicleType: r.vehicle.vehicleType,
        ownerName: r.vehicle.ownerName,
      },
      driver: assignedDriver
        ? {
            name: assignedDriver.name,
            phone: assignedDriver.phone,
            panMasked: assignedDriver.panMasked,
            dlMasked: assignedDriver.dlMasked,
            status: assignedDriver.status,
          }
        : null,
      bankDetails: r.bankDetails,
      grossBilling: r.grossBilling || 0,
      tdsAmount,
      salaryAdvances,
      fuelAdvances,
      driverPenalties,
      otherDeductions,
      totalDeductions: r.totalDeductions || 0,
      netPayable: r.netPayable || 0,
      amountPaid: r.amountPaid || 0,
      balanceDue: Math.max(0, (r.netPayable || 0) - (r.amountPaid || 0)),
      paymentStatus: r.paymentStatus,
      paymentDate: r.paymentDate,
      paymentsList: r.payments || [],
    };

    exportSalaryReceiptPDF(receiptPayload);
  };

  // Export Internal Record
  const handleExportInternalRecord = (format: 'xlsx' | 'csv') => {
    const exportData = filtered.map((r) => {
      const assignedDriver = r.vehicle?.assignments?.[0]?.driver || null;
      const adjustments = r.adjustments || [];

      const tdsAdj = adjustments.find((a: any) => (a.category || '').toLowerCase().includes('tds'));
      const tdsAmount = tdsAdj ? Math.abs(tdsAdj.amount || 0) : Math.round((r.grossBilling || 0) * 0.01 * 100) / 100;

      const salaryAdvances = adjustments
        .filter((a: any) => {
          const cat = (a.category || '').toLowerCase();
          return (cat.includes('salary') || cat.includes('early') || cat.includes('adv')) && !cat.includes('fuel') && !cat.includes('tds');
        })
        .reduce((sum: number, a: any) => sum + Math.abs(a.amount || 0), 0);

      const fuelAdvances = adjustments
        .filter((a: any) => (a.category || '').toLowerCase().includes('fuel'))
        .reduce((sum: number, a: any) => sum + Math.abs(a.amount || 0), 0);

      const penalties = adjustments
        .filter((a: any) => {
          const cat = (a.category || '').toLowerCase();
          return cat.includes('penalty') || cat.includes('fine');
        })
        .reduce((sum: number, a: any) => sum + Math.abs(a.amount || 0), 0);

      const otherDeductions = adjustments
        .filter((a: any) => {
          const cat = (a.category || '').toLowerCase();
          return !cat.includes('tds') && !cat.includes('salary') && !cat.includes('early') && !cat.includes('fuel') && !cat.includes('penalty') && !cat.includes('fine');
        })
        .reduce((sum: number, a: any) => sum + Math.abs(a.amount || 0), 0);

      return {
        Period: r.period.periodName,
        Section: r.sectionIndex,
        Vehicle: r.vehicle.registrationNumber,
        'Vehicle Type': r.vehicle.vehicleType,
        'Driver Name': assignedDriver?.name || 'Unassigned',
        'Driver Phone': assignedDriver?.phone || 'N/A',
        'Driver PAN': assignedDriver?.panMasked || 'N/A',
        'Driver DL': assignedDriver?.dlMasked || 'N/A',
        'Main Monthly Salary / Gross (₹)': r.grossBilling,
        '1% TDS Cut (₹)': tdsAmount,
        'Early Salary Advances (₹)': salaryAdvances,
        'Fuel Advances (₹)': fuelAdvances,
        'Driver Penalties (₹)': penalties,
        'Other Deductions (₹)': otherDeductions,
        'Total Deductions (₹)': r.totalDeductions,
        'Net Monthly Salary Payable (₹)': r.netPayable,
        'Amount Paid to Date (₹)': r.amountPaid,
        'Balance Due (₹)': Math.max(0, r.netPayable - r.amountPaid),
        'Payment Status': r.paymentStatus,
        'Payment Date': r.paymentDate || 'N/A',
        'Bank Details': r.bankDetails || 'Registered Bank Account',
        Remarks: r.remarks || '',
      };
    });

    if (format === 'xlsx') {
      exportToExcel(exportData, 'Internal Salary Record', 'Atharva_Internal_Salary_Record');
    } else {
      exportToCSV(exportData, 'Atharva_Internal_Salary_Record');
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto selection:bg-[#B3D7FF] pb-24">
      <Navbar
        title="Settlements & Payments"
        subtitle="Driver Payouts, 1% TDS Deductions, Salary Breakdown & Official Payment Vouchers"
        onRefresh={fetchPayments}
      />

      {/* Notification Toast */}
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
            className="p-1 rounded-full hover:bg-black/5 transition-colors cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Top KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Gross Monthly Salary */}
        <div className="bg-[#FFFFFF] p-4 rounded-[22px] border border-[#E5E5EA] shadow-apple-card flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-[#86868B]">
              Gross Monthly Earnings
            </p>
            <p className="text-2xl font-bold text-[#1D1D1F] mt-1 tabular-nums">
              ₹{totalGross.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </p>
            <span className="text-[10px] text-[#86868B] mt-0.5 block">
              Main billing across {filtered.length} vehicles
            </span>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-[#007AFF]/10 flex items-center justify-center text-[#007AFF]">
            <Receipt className="w-5 h-5" />
          </div>
        </div>

        {/* Card 2: 1% TDS Cut */}
        <div className="bg-[#FFFFFF] p-4 rounded-[22px] border border-[#E5E5EA] shadow-apple-card flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-[#86868B]">
              1% TDS Cut (Statutory)
            </p>
            <p className="text-2xl font-bold text-[#FF3B30] mt-1 tabular-nums">
              ₹{totalTds.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </p>
            <span className="text-[10px] text-[#FF3B30] mt-0.5 block">
              1% cut from main monthly salary
            </span>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-[#FF3B30]/10 flex items-center justify-center text-[#FF3B30]">
            <FileText className="w-5 h-5" />
          </div>
        </div>

        {/* Card 3: Net Payable Salary */}
        <div className="bg-[#FFFFFF] p-4 rounded-[22px] border border-[#E5E5EA] shadow-apple-card flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-[#86868B]">
              Net Salary Payable
            </p>
            <p className="text-2xl font-bold text-[#007AFF] mt-1 tabular-nums">
              ₹{totalNet.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </p>
            <span className="text-[10px] text-[#007AFF] mt-0.5 block">
              After advances & deductions
            </span>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-[#007AFF]/10 flex items-center justify-center text-[#007AFF]">
            <Wallet className="w-5 h-5" />
          </div>
        </div>

        {/* Card 4: Disbursed to Date */}
        <div className="bg-[#FFFFFF] p-4 rounded-[22px] border border-[#E5E5EA] shadow-apple-card flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-[#86868B]">
              Settled to Date
            </p>
            <p className="text-2xl font-bold text-[#34C759] mt-1 tabular-nums">
              ₹{totalSettled.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </p>
            <span className="text-[10px] text-[#86868B] mt-0.5 block">
              Outstanding: <strong className="text-[#FF9F0A]">₹{totalOutstanding.toLocaleString('en-IN')}</strong>
            </span>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-[#34C759]/10 flex items-center justify-center text-[#34C759]">
            <Banknote className="w-5 h-5" />
          </div>
        </div>
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
              placeholder="Search vehicle, driver, phone..."
              className="w-full pl-9 pr-4 py-2 bg-[#F2F2F7] border border-[#E5E5EA] rounded-full text-xs text-[#1D1D1F] focus:bg-[#FFFFFF] focus:outline-hidden focus:ring-2 focus:ring-[#007AFF] transition-all"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-3 top-2.5 text-[#86868B] hover:text-[#1D1D1F] cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Period Dropdown Filter */}
          <div className="flex items-center space-x-1.5">
            <Calendar className="w-3.5 h-3.5 text-[#86868B]" />
            <span className="text-xs text-[#86868B] font-medium">Month:</span>
            <select
              value={selectedPeriodId}
              onChange={(e) => setSelectedPeriodId(e.target.value)}
              className="px-3 py-2 bg-[#F2F2F7] border border-[#E5E5EA] rounded-full text-xs font-semibold text-[#1D1D1F] focus:outline-hidden focus:ring-2 focus:ring-[#007AFF] transition-all cursor-pointer"
            >
              <option value="ALL">All Financial Months ({periods.length})</option>
              {periods.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.periodName} ({p.monthCode})
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div className="flex items-center space-x-1.5">
            <Filter className="w-3.5 h-3.5 text-[#86868B]" />
            <span className="text-xs text-[#86868B] font-medium">Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 bg-[#F2F2F7] border border-[#E5E5EA] rounded-full text-xs font-medium text-[#1D1D1F] focus:outline-hidden focus:ring-2 focus:ring-[#007AFF] transition-all cursor-pointer"
            >
              <option value="ALL">All Settlement Statuses</option>
              <option value="Paid">Paid</option>
              <option value="Partially Paid">Partially Paid</option>
              <option value="HOLD">HOLD</option>
              <option value="WF">WF</option>
              <option value="No Account">No Account</option>
              <option value="Draft">Draft</option>
            </select>
          </div>
        </div>

        {/* Action Toolbar */}
        <div className="flex flex-wrap items-center gap-2 self-end lg:self-auto">
          {/* Add Vehicle Row Button (Super Admin) */}
          {isSuperAdmin && (
            <button
              onClick={() => setIsAddVehicleOpen(true)}
              className="px-4 py-2 rounded-full bg-[#007AFF] hover:bg-[#0062CC] text-white text-xs font-semibold flex items-center space-x-1.5 transition-all shadow-apple-btn active:scale-[0.98] cursor-pointer"
              title="Add a new vehicle row in payments directory"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Vehicle Row</span>
            </button>
          )}

          <button
            onClick={() => handleExportInternalRecord('xlsx')}
            className="px-3.5 py-2 rounded-full border border-[#E5E5EA] bg-[#F2F2F7] hover:bg-[#E5E5EA] text-[#1D1D1F] text-xs font-medium flex items-center space-x-1.5 transition-colors cursor-pointer"
            title="Download complete internal finance record (Excel)"
          >
            <Download className="w-3.5 h-3.5 text-[#34C759]" />
            <span>Internal Record (Excel)</span>
          </button>
          <button
            onClick={() => handleExportInternalRecord('csv')}
            className="px-3.5 py-2 rounded-full border border-[#E5E5EA] bg-[#F2F2F7] hover:bg-[#E5E5EA] text-[#1D1D1F] text-xs font-medium flex items-center space-x-1.5 transition-colors cursor-pointer"
            title="Download internal record (CSV)"
          >
            <Download className="w-3.5 h-3.5 text-[#007AFF]" />
            <span>CSV</span>
          </button>
        </div>
      </div>

      {/* Floating Bulk Action Bar for Selected Vehicles */}
      {selectedRecordIds.size > 0 && isSuperAdmin && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-[#1D1D1F]/90 backdrop-blur-md text-white px-5 py-3 rounded-full shadow-apple-modal border border-white/20 flex items-center space-x-4 animate-in slide-in-from-bottom-5 duration-200">
          <span className="text-xs font-semibold">
            {selectedRecordIds.size} vehicle record{selectedRecordIds.size > 1 ? 's' : ''} selected
          </span>
          <div className="h-4 w-px bg-white/30" />
          <button
            onClick={() => {
              setDeleteConfirm({
                isOpen: true,
                type: 'records-bulk',
                title: `Delete ${selectedRecordIds.size} Selected Vehicle Records?`,
                description: `Are you sure you want to delete ${selectedRecordIds.size} vehicle records? They will be safely moved to the Recycle Bin and period totals will be recalculated.`,
              });
            }}
            className="px-3 py-1 bg-[#FF3B30] hover:bg-[#D70015] text-white text-xs font-semibold rounded-full flex items-center space-x-1 transition-colors cursor-pointer"
          >
            <Trash2 className="w-3 h-3" />
            <span>Delete Selected ({selectedRecordIds.size})</span>
          </button>
          <button
            onClick={() => setSelectedRecordIds(new Set())}
            className="text-xs text-white/70 hover:text-white transition-colors cursor-pointer"
          >
            Deselect All
          </button>
        </div>
      )}

      {/* Main Settlements Table with Dropdown Row for Monthly Salary */}
      <div className="bg-[#FFFFFF] rounded-[24px] border border-[#E5E5EA] shadow-apple-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse">
            <thead className="bg-[#F2F2F7] text-[#1D1D1F] font-semibold border-b border-[#E5E5EA] select-none">
              <tr>
                {/* Select All Checkbox */}
                {isSuperAdmin && (
                  <th className="py-3 px-2 w-8 text-center">
                    <button
                      type="button"
                      onClick={handleSelectAllRecords}
                      className="p-1 rounded text-[#86868B] hover:text-[#007AFF] transition-colors cursor-pointer"
                      title={selectedRecordIds.size === filtered.length && filtered.length > 0 ? 'Deselect all' : 'Select all'}
                    >
                      {selectedRecordIds.size === filtered.length && filtered.length > 0 ? (
                        <CheckSquare className="w-4 h-4 text-[#007AFF]" />
                      ) : (
                        <Square className="w-4 h-4" />
                      )}
                    </button>
                  </th>
                )}
                <th className="py-3 px-2 w-8 text-center"></th>
                <th className="py-3 px-3">Period</th>
                <th className="py-3 px-4">Vehicle & Driver Profile</th>
                <th className="py-3 px-4 text-right">Main Monthly Salary (₹)</th>
                <th className="py-3 px-4 text-right">Net Payable (₹)</th>
                <th className="py-3 px-4 text-right">Settled to Date (₹)</th>
                <th className="py-3 px-4 text-right">Balance Due (₹)</th>
                <th className="py-3 px-3 text-center">Status</th>
                <th className="py-3 px-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E5EA]">
              {loading ? (
                <tr>
                  <td colSpan={isSuperAdmin ? 10 : 9} className="py-12 text-center text-[#86868B]">
                    <div className="flex flex-col items-center justify-center space-y-2">
                      <RefreshCw className="w-5 h-5 animate-spin text-[#007AFF]" />
                      <span>Loading payments & settlements directory...</span>
                    </div>
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={isSuperAdmin ? 10 : 9} className="py-12 text-center text-[#86868B]">
                    No payment records match current filters.
                  </td>
                </tr>
              ) : (
                filtered.map((r) => {
                  const isExpanded = expandedRecordIds.has(r.id);
                  const isSelected = selectedRecordIds.has(r.id);
                  const isPaid = r.paymentStatus === 'Paid';
                  const isHold = r.paymentStatus === 'HOLD';
                  const isWF = r.paymentStatus === 'WF';
                  const isNoAcc = r.paymentStatus.includes('No Acc');

                  const assignedDriver = r.vehicle?.assignments?.[0]?.driver || null;
                  const adjustments = r.adjustments || [];

                  // 1% TDS
                  const existingTds = adjustments.find((a: any) =>
                    (a.category || '').toLowerCase().includes('tds')
                  );
                  const tdsAmount = existingTds
                    ? Math.abs(existingTds.amount || 0)
                    : Math.round((r.grossBilling || 0) * 0.01 * 100) / 100;

                  // Advances and penalties
                  const salaryAdvances = adjustments
                    .filter((a: any) => {
                      const cat = (a.category || '').toLowerCase();
                      return (
                        (cat.includes('salary') || cat.includes('early') || cat.includes('adv')) &&
                        !cat.includes('fuel') &&
                        !cat.includes('tds')
                      );
                    })
                    .reduce((sum: number, a: any) => sum + Math.abs(a.amount || 0), 0);

                  const fuelAdvances = adjustments
                    .filter((a: any) => (a.category || '').toLowerCase().includes('fuel'))
                    .reduce((sum: number, a: any) => sum + Math.abs(a.amount || 0), 0);

                  const penalties = adjustments
                    .filter((a: any) => {
                      const cat = (a.category || '').toLowerCase();
                      return cat.includes('penalty') || cat.includes('fine');
                    })
                    .reduce((sum: number, a: any) => sum + Math.abs(a.amount || 0), 0);

                  const otherDeductions = adjustments
                    .filter((a: any) => {
                      const cat = (a.category || '').toLowerCase();
                      return (
                        !cat.includes('tds') &&
                        !cat.includes('salary') &&
                        !cat.includes('early') &&
                        !cat.includes('fuel') &&
                        !cat.includes('penalty') &&
                        !cat.includes('fine')
                      );
                    })
                    .reduce((sum: number, a: any) => sum + Math.abs(a.amount || 0), 0);

                  const outstandingBalance = Math.max(0, (r.netPayable || 0) - (r.amountPaid || 0));

                  return (
                    <React.Fragment key={r.id}>
                      {/* Main Row */}
                      <tr
                        className={`transition-colors ${
                          isSelected
                            ? 'bg-[#007AFF]/10'
                            : isExpanded
                            ? 'bg-[#F2F7FF]/70'
                            : 'hover:bg-[#F2F2F7]/50'
                        }`}
                      >
                        {/* Row Checkbox */}
                        {isSuperAdmin && (
                          <td className="py-3 px-2 text-center">
                            <button
                              type="button"
                              onClick={() => handleToggleSelectRecord(r.id)}
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

                        {/* Dropdown Chevron */}
                        <td className="py-3 px-2 text-center">
                          <button
                            type="button"
                            onClick={() => toggleExpand(r.id)}
                            className="p-1 rounded-md text-[#86868B] hover:text-[#007AFF] hover:bg-white transition-all cursor-pointer"
                            title="Click to view detailed salary subtractions and deductions"
                          >
                            <ChevronDown
                              className={`w-4 h-4 transition-transform duration-200 ${
                                isExpanded ? 'rotate-180 text-[#007AFF]' : ''
                              }`}
                            />
                          </button>
                        </td>

                        {/* Period & Section */}
                        <td className="py-3.5 px-3">
                          <p className="font-semibold text-[#1D1D1F]">{r.period.periodName}</p>
                          <span className="text-[10px] font-mono text-[#86868B]">
                            Sec #{r.sectionIndex}
                          </span>
                        </td>

                        {/* Vehicle & Driver Profile */}
                        <td className="py-3.5 px-4">
                          <div className="flex items-center space-x-2">
                            <span className="font-bold text-[#1D1D1F] font-mono text-sm">
                              {r.vehicle.registrationNumber}
                            </span>
                            <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-[#F2F2F7] text-[#86868B]">
                              {r.vehicle.vehicleType.replace('Vehicle - ', '')}
                            </span>
                          </div>

                          {/* Driver Info with Add / Alter / Delete controls */}
                          <div className="flex items-center space-x-2 mt-1">
                            {assignedDriver ? (
                              <div className="flex items-center space-x-1.5 text-xs text-[#1D1D1F] font-medium bg-[#FFFFFF] px-2.5 py-0.5 rounded-full border border-[#E5E5EA] shadow-2xs">
                                <User className="w-3 h-3 text-[#007AFF]" />
                                <span>{assignedDriver.name}</span>
                                {assignedDriver.phone && (
                                  <span className="text-[11px] text-[#86868B]">
                                    ({assignedDriver.phone})
                                  </span>
                                )}

                                {/* Admin alter/edit driver button */}
                                {isSuperAdmin && (
                                  <button
                                    onClick={() => handleOpenDriverModal(r)}
                                    className="p-0.5 text-[#86868B] hover:text-[#007AFF] transition-colors ml-1 cursor-pointer"
                                    title="Alter driver information (Super Admin)"
                                  >
                                    <Edit2 className="w-3 h-3" />
                                  </button>
                                )}
                              </div>
                            ) : (
                              <div className="flex items-center space-x-1 text-xs">
                                <span className="text-[#86868B] italic">No driver assigned</span>
                                {isSuperAdmin && (
                                  <button
                                    onClick={() => handleOpenDriverModal(r)}
                                    className="text-[11px] font-semibold text-[#007AFF] hover:underline flex items-center space-x-0.5 ml-1 cursor-pointer"
                                  >
                                    <Plus className="w-3 h-3" />
                                    <span>Assign Driver</span>
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                        </td>

                        {/* Main Monthly Salary (Gross) */}
                        <td className="py-3.5 px-4 text-right">
                          <button
                            type="button"
                            onClick={() => toggleExpand(r.id)}
                            className="font-bold text-[#1D1D1F] tabular-nums hover:text-[#007AFF] transition-colors cursor-pointer"
                            title="Click to drop down monthly salary deductions"
                          >
                            ₹{r.grossBilling.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </button>
                          <span className="block text-[10px] text-[#86868B]">
                            Gross Client Billing
                          </span>
                        </td>

                        {/* Net Payable Monthly Salary */}
                        <td className="py-3.5 px-4 text-right font-bold text-[#007AFF] tabular-nums">
                          ₹{r.netPayable.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          <span className="block text-[10px] text-[#86868B] font-normal">
                            After Deductions & TDS
                          </span>
                        </td>

                        {/* Settled to Date */}
                        <td className="py-3.5 px-4 text-right font-semibold text-[#34C759] tabular-nums">
                          ₹{r.amountPaid.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          {r.paymentDate && (
                            <span className="block text-[10px] text-[#86868B] font-mono">
                              {r.paymentDate}
                            </span>
                          )}
                        </td>

                        {/* Outstanding Balance */}
                        <td className="py-3.5 px-4 text-right font-bold tabular-nums">
                          <span
                            className={
                              outstandingBalance > 0 ? 'text-[#FF9F0A]' : 'text-[#34C759]'
                            }
                          >
                            ₹{outstandingBalance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </span>
                        </td>

                        {/* Status */}
                        <td className="py-3.5 px-3 text-center">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[10px] font-semibold uppercase border ${
                              isPaid
                                ? 'bg-[#EAF9EE] text-[#34C759] border-[#D2F4DA]'
                                : isHold
                                ? 'bg-[#FFF5E5] text-[#FF9F0A] border-[#FFE4B8]'
                                : isWF
                                ? 'bg-[#F5EEFF] text-[#AF52DE] border-[#E8D4FF]'
                                : isNoAcc
                                ? 'bg-[#FFF0EF] text-[#FF3B30] border-[#FFD0CE]'
                                : 'bg-[#F2F2F7] text-[#86868B] border-[#E5E5EA]'
                            }`}
                          >
                            {r.paymentStatus}
                          </span>
                        </td>

                        {/* Actions */}
                        <td className="py-3.5 px-4 text-center">
                          <div className="flex items-center justify-center space-x-1.5">
                            {/* Record Payment Button */}
                            {isSuperAdmin && (
                              <button
                                onClick={() => setSelectedRecordForPayment(r)}
                                className="px-3 py-1.5 rounded-full bg-[#007AFF] text-white hover:bg-[#0062CC] text-xs font-semibold transition-all shadow-apple-btn active:scale-[0.98] cursor-pointer"
                                title="Disburse payment settlement (Super Admin)"
                              >
                                Settle
                              </button>
                            )}

                            {/* Edit Record Button */}
                            {isSuperAdmin && (
                              <button
                                onClick={() => setEditingRecordId(r.id)}
                                className="p-1.5 rounded-full bg-[#F2F2F7] hover:bg-[#E5E5EA] text-[#86868B] hover:text-[#007AFF] transition-colors cursor-pointer"
                                title="Edit Vehicle Record details"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>
                            )}

                            {/* Download Salary Receipt PDF */}
                            <button
                              onClick={() => handleDownloadSalaryReceipt(r)}
                              className="p-1.5 rounded-full bg-[#F2F2F7] hover:bg-[#E5E5EA] text-[#86868B] hover:text-[#1D1D1F] transition-colors cursor-pointer"
                              title="Download Official Salary Receipt & Voucher (PDF)"
                            >
                              <Printer className="w-3.5 h-3.5" />
                            </button>

                            {/* Delete Record Button */}
                            {isSuperAdmin && (
                              <button
                                onClick={() => {
                                  setDeleteConfirm({
                                    isOpen: true,
                                    type: 'record',
                                    targetId: r.id,
                                    title: `Delete Record for ${r.vehicle.registrationNumber}?`,
                                    description: `Are you sure you want to delete the vehicle record for ${r.vehicle.registrationNumber} (${r.period.periodName})? It will be moved to the Recycle Bin.`,
                                  });
                                }}
                                className="p-1.5 rounded-full bg-[#FEECEB] hover:bg-[#FCD3D1] text-[#FF3B30] transition-colors cursor-pointer"
                                title="Delete this vehicle record"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>

                      {/* =========================================================================
                          DROPDOWN ACCORDION: Step-by-Step Subtraction Breakdown
                          Under the Main Monthly Salary and Amount Paid
                          ========================================================================= */}
                      {isExpanded && (
                        <tr className="bg-[#F8F9FB] border-b-2 border-[#007AFF]/20">
                          <td colSpan={isSuperAdmin ? 10 : 9} className="p-4 sm:p-6 space-y-4 animate-in fade-in duration-200">
                            {/* 1. Header with Driver & Vehicle Quick Bar */}
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-[#E5E5EA] gap-2">
                              <div className="flex items-center space-x-3">
                                <div className="w-9 h-9 rounded-2xl bg-[#007AFF]/10 text-[#007AFF] flex items-center justify-center shrink-0">
                                  <FileSpreadsheet className="w-4 h-4" />
                                </div>
                                <div>
                                  <h4 className="font-bold text-xs sm:text-sm text-[#1D1D1F]">
                                    Monthly Salary & Deductions Statement
                                  </h4>
                                  <p className="text-[11px] text-[#86868B]">
                                    Detailed itemized subtractions from main monthly salary for{' '}
                                    <strong className="text-[#1D1D1F] font-mono">
                                      {r.vehicle.registrationNumber}
                                    </strong>{' '}
                                    ({r.period.periodName})
                                  </p>
                                </div>
                              </div>

                              {/* Admin Buttons for Driver and Receipt */}
                              <div className="flex flex-wrap items-center gap-2">
                                {isSuperAdmin && (
                                  <button
                                    onClick={() => handleOpenDriverModal(r)}
                                    className="px-3 py-1.5 rounded-full border border-[#E5E5EA] bg-[#FFFFFF] hover:bg-[#F2F2F7] text-[#1D1D1F] text-[11px] font-semibold flex items-center space-x-1.5 transition-colors cursor-pointer shadow-2xs"
                                  >
                                    <User className="w-3 h-3 text-[#007AFF]" />
                                    <span>
                                      {assignedDriver ? 'Alter Driver Info' : 'Add / Assign Driver'}
                                    </span>
                                  </button>
                                )}

                                <button
                                  onClick={() => handleDownloadSalaryReceipt(r)}
                                  className="px-3.5 py-1.5 rounded-full bg-[#1D1D1F] hover:bg-[#2C2C2E] text-white text-[11px] font-semibold flex items-center space-x-1.5 transition-colors cursor-pointer shadow-2xs"
                                >
                                  <Printer className="w-3 h-3 text-[#34C759]" />
                                  <span>Download Salary Receipt</span>
                                </button>
                              </div>
                            </div>

                            {/* 2. MATHEMATICAL SUBTRACTION STEP-BY-STEP BAR */}
                            <div className="p-4 rounded-[20px] bg-[#FFFFFF] border border-[#007AFF]/25 shadow-apple-card space-y-3">
                              <div className="flex items-center justify-between">
                                <span className="text-[11px] font-bold uppercase tracking-wider text-[#86868B]">
                                  Salary Calculation Steps:
                                </span>
                                {!existingTds && isSuperAdmin && (
                                  <button
                                    onClick={() => handleApplyTds(r)}
                                    className="px-2.5 py-1 rounded-full bg-[#FF3B30]/10 hover:bg-[#FF3B30]/20 text-[#FF3B30] text-[10px] font-bold flex items-center space-x-1 transition-colors cursor-pointer"
                                    title="Click to deduct 1% TDS from monthly salary"
                                  >
                                    <Plus className="w-3 h-3" />
                                    <span>Apply 1% TDS Cut (-₹{tdsAmount.toFixed(2)})</span>
                                  </button>
                                )}
                              </div>

                              <div className="grid grid-cols-2 sm:grid-cols-6 gap-2 text-center text-xs">
                                {/* 1. Main Monthly Salary */}
                                <div className="p-2.5 rounded-xl bg-[#F2F2F7] border border-[#E5E5EA]">
                                  <span className="text-[10px] text-[#86868B] font-semibold block">
                                    Main Monthly Salary
                                  </span>
                                  <span className="font-bold text-[#1D1D1F] tabular-nums">
                                    ₹{r.grossBilling.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                  </span>
                                </div>

                                {/* - 1% TDS */}
                                <div className="p-2.5 rounded-xl bg-[#FFF0EF] border border-[#FFD0CE]">
                                  <span className="text-[10px] text-[#FF3B30] font-semibold block">
                                    - 1% TDS Cut
                                  </span>
                                  <span className="font-bold text-[#FF3B30] tabular-nums">
                                    - ₹{tdsAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                  </span>
                                </div>

                                {/* - Early Salary Advances */}
                                <div className="p-2.5 rounded-xl bg-[#FFF5E5] border border-[#FFE4B8]">
                                  <span className="text-[10px] text-[#FF9F0A] font-semibold block">
                                    - Salary Advances
                                  </span>
                                  <span className="font-bold text-[#FF9F0A] tabular-nums">
                                    - ₹{salaryAdvances.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                  </span>
                                </div>

                                {/* - Driver Penalties */}
                                <div className="p-2.5 rounded-xl bg-[#FFF0EF] border border-[#FFD0CE]">
                                  <span className="text-[10px] text-[#FF3B30] font-semibold block">
                                    - Driver Penalties
                                  </span>
                                  <span className="font-bold text-[#FF3B30] tabular-nums">
                                    - ₹{penalties.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                  </span>
                                </div>

                                {/* - Fuel & Other */}
                                <div className="p-2.5 rounded-xl bg-[#F2F2F7] border border-[#E5E5EA]">
                                  <span className="text-[10px] text-[#86868B] font-semibold block">
                                    - Fuel & Other
                                  </span>
                                  <span className="font-bold text-[#FF3B30] tabular-nums">
                                    - ₹{(fuelAdvances + otherDeductions).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                  </span>
                                </div>

                                {/* = Net Monthly Salary */}
                                <div className="p-2.5 rounded-xl bg-[#EBF5FF] border border-[#D0E2FF] col-span-2 sm:col-span-1">
                                  <span className="text-[10px] text-[#007AFF] font-bold block">
                                    = Net Payable Salary
                                  </span>
                                  <span className="font-bold text-[#007AFF] tabular-nums">
                                    = ₹{r.netPayable.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                  </span>
                                </div>
                              </div>

                              {/* Disbursement Status Note */}
                              <div className="p-3 rounded-xl bg-[#F8F9FA] border border-[#E5E5EA] flex flex-col sm:flex-row sm:items-center justify-between text-xs gap-2">
                                <div className="flex items-center space-x-2">
                                  <Info className="w-4 h-4 text-[#007AFF] shrink-0" />
                                  <p className="text-[#48484A]">
                                    <strong>Driver Settlement Note:</strong> Gross earnings: ₹{r.grossBilling.toLocaleString('en-IN')},
                                    minus ₹{tdsAmount.toFixed(2)} (1% TDS), minus ₹{salaryAdvances.toFixed(2)} (early salary advances),
                                    minus ₹{penalties.toFixed(2)} (driver penalties), minus ₹{(fuelAdvances + otherDeductions).toFixed(2)} (fuel & other).
                                  </p>
                                </div>
                                <div className="shrink-0 flex items-center space-x-3 text-xs">
                                  <span>Paid: <strong className="text-[#34C759]">₹{r.amountPaid.toLocaleString('en-IN')}</strong></span>
                                  <span>Due: <strong className="text-[#FF9F0A]">₹{outstandingBalance.toLocaleString('en-IN')}</strong></span>
                                </div>
                              </div>
                            </div>

                            {/* 3. Detailed Tables: Recorded Payments & Adjustments */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              {/* Payment History with UTR / Reference Numbers */}
                              <div className="p-3.5 rounded-2xl bg-[#FFFFFF] border border-[#E5E5EA] space-y-2">
                                <div className="flex items-center justify-between">
                                  <h5 className="font-bold text-xs text-[#1D1D1F] flex items-center space-x-1.5">
                                    <Banknote className="w-3.5 h-3.5 text-[#34C759]" />
                                    <span>Settled Payments ({r.payments?.length || 0})</span>
                                  </h5>
                                  <span className="text-xs font-bold text-[#34C759]">
                                    ₹{r.amountPaid.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                  </span>
                                </div>

                                {r.payments?.length === 0 ? (
                                  <p className="text-xs text-[#86868B] italic py-2">
                                    No recorded disbursements for this month.
                                  </p>
                                ) : (
                                  <div className="overflow-x-auto">
                                    <table className="w-full text-[11px] text-left">
                                      <thead className="text-[#86868B] border-b border-[#E5E5EA]">
                                        <tr>
                                          <th className="py-1 px-1.5">Date</th>
                                          <th className="py-1 px-1.5">Mode</th>
                                          <th className="py-1 px-1.5">UTR / Bank</th>
                                          <th className="py-1 px-1.5 text-right">Amount (₹)</th>
                                          {isSuperAdmin && <th className="py-1 px-1.5 text-center">Action</th>}
                                        </tr>
                                      </thead>
                                      <tbody className="divide-y divide-[#E5E5EA]/60">
                                        {r.payments.map((p: any) => (
                                          <tr key={p.id} className="hover:bg-[#F2F2F7]/50">
                                            <td className="py-1.5 px-1.5 text-[#1D1D1F] font-medium">{p.paymentDate}</td>
                                            <td className="py-1.5 px-1.5 text-[#86868B]">{p.paymentMode}</td>
                                            <td className="py-1.5 px-1.5 text-[#86868B] font-mono text-[10px]">
                                              {p.referenceNumber || p.bankName || 'NEFT'}
                                            </td>
                                            <td className="py-1.5 px-1.5 text-right font-bold text-[#34C759]">
                                              ₹{p.amount.toLocaleString('en-IN')}
                                            </td>
                                            {isSuperAdmin && (
                                              <td className="py-1.5 px-1.5 text-center">
                                                <button
                                                  onClick={() => {
                                                    setDeleteConfirm({
                                                      isOpen: true,
                                                      type: 'payment',
                                                      targetId: p.id,
                                                      parentRecordId: r.id,
                                                      title: 'Delete Payment Transaction?',
                                                      description: `Delete payment disbursement of ₹${p.amount.toLocaleString('en-IN')} (${p.paymentDate}) for ${r.vehicle.registrationNumber}? Balance due will be restored.`,
                                                    });
                                                  }}
                                                  className="p-1 rounded text-[#86868B] hover:text-[#FF3B30] hover:bg-[#FEECEB] transition-colors cursor-pointer"
                                                  title="Delete this payment disbursement"
                                                >
                                                  <Trash2 className="w-3 h-3" />
                                                </button>
                                              </td>
                                            )}
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                  </div>
                                )}
                              </div>

                              {/* Itemized Deductions & Adjustments with Edit, Delete & Bulk Delete */}
                              <div className="p-3.5 rounded-2xl bg-[#FFFFFF] border border-[#E5E5EA] space-y-2">
                                <div className="flex items-center justify-between gap-2">
                                  <h5 className="font-bold text-xs text-[#1D1D1F] flex items-center space-x-1.5">
                                    <TrendingDown className="w-3.5 h-3.5 text-[#FF3B30]" />
                                    <span>Itemized Deductions ({adjustments.length})</span>
                                  </h5>

                                  <div className="flex items-center space-x-2">
                                    {/* Bulk delete deductions button if any selected */}
                                    {selectedDeductionIds.size > 0 && isSuperAdmin && (
                                      <button
                                        onClick={() => {
                                          setDeleteConfirm({
                                            isOpen: true,
                                            type: 'deductions-bulk',
                                            title: `Delete ${selectedDeductionIds.size} Selected Deductions?`,
                                            description: `Delete ${selectedDeductionIds.size} itemized deductions? Monthly totals will be automatically recalculated.`,
                                          });
                                        }}
                                        className="px-2 py-0.5 rounded-full bg-[#FEECEB] hover:bg-[#FCD3D1] text-[#FF3B30] text-[10px] font-semibold flex items-center space-x-1 cursor-pointer transition-colors"
                                      >
                                        <Trash2 className="w-3 h-3" />
                                        <span>Delete Selected ({selectedDeductionIds.size})</span>
                                      </button>
                                    )}

                                    {/* Add Deduction Button */}
                                    {isSuperAdmin && (
                                      <button
                                        onClick={() => handleOpenAddAdjustment(r)}
                                        className="px-2 py-0.5 rounded-full bg-[#007AFF]/10 hover:bg-[#007AFF]/20 text-[#007AFF] text-[10px] font-semibold flex items-center space-x-1 cursor-pointer transition-colors"
                                        title="Add a deduction or salary advance for this vehicle"
                                      >
                                        <Plus className="w-3 h-3" />
                                        <span>Add Deduction / Advance</span>
                                      </button>
                                    )}

                                    <span className="text-xs font-bold text-[#FF3B30]">
                                      -₹{r.totalDeductions.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                    </span>
                                  </div>
                                </div>

                                {adjustments.length === 0 ? (
                                  <p className="text-xs text-[#86868B] italic py-2">
                                    No deductions recorded for this month.
                                  </p>
                                ) : (
                                  <div className="overflow-x-auto">
                                    <table className="w-full text-[11px] text-left">
                                      <thead className="text-[#86868B] border-b border-[#E5E5EA]">
                                        <tr>
                                          {isSuperAdmin && <th className="py-1 px-1 w-6 text-center"></th>}
                                          <th className="py-1 px-1.5">Category</th>
                                          <th className="py-1 px-1.5">Description</th>
                                          <th className="py-1 px-1.5 text-right">Amount (₹)</th>
                                          {isSuperAdmin && <th className="py-1 px-1.5 text-center">Actions</th>}
                                        </tr>
                                      </thead>
                                      <tbody className="divide-y divide-[#E5E5EA]/60">
                                        {adjustments.map((a: any, idx: number) => {
                                          const isAdjSelected = selectedDeductionIds.has(a.id);
                                          return (
                                            <tr
                                              key={a.id || idx}
                                              className={`hover:bg-[#F2F2F7]/50 ${
                                                isAdjSelected ? 'bg-[#FF3B30]/5' : ''
                                              }`}
                                            >
                                              {isSuperAdmin && (
                                                <td className="py-1.5 px-1 text-center">
                                                  <button
                                                    type="button"
                                                    onClick={() => handleToggleSelectDeduction(a.id)}
                                                    className="p-0.5 text-[#86868B] hover:text-[#007AFF] cursor-pointer"
                                                  >
                                                    {isAdjSelected ? (
                                                      <CheckSquare className="w-3.5 h-3.5 text-[#007AFF]" />
                                                    ) : (
                                                      <Square className="w-3.5 h-3.5" />
                                                    )}
                                                  </button>
                                                </td>
                                              )}
                                              <td className="py-1.5 px-1.5 font-semibold text-[#1D1D1F]">
                                                {a.category}
                                              </td>
                                              <td className="py-1.5 px-1.5 text-[#86868B] truncate max-w-xs">
                                                {a.notes || a.formulaString || '-'}
                                              </td>
                                              <td className="py-1.5 px-1.5 text-right font-bold text-[#FF3B30]">
                                                -₹{Math.abs(a.amount || 0).toLocaleString('en-IN')}
                                              </td>
                                              {isSuperAdmin && (
                                                <td className="py-1.5 px-1.5 text-center">
                                                  <div className="flex items-center justify-center space-x-1">
                                                    <button
                                                      onClick={() => handleOpenEditAdjustment(a, r)}
                                                      className="p-1 rounded text-[#86868B] hover:text-[#007AFF] hover:bg-black/5 transition-colors cursor-pointer"
                                                      title="Edit this deduction"
                                                    >
                                                      <Edit2 className="w-3 h-3" />
                                                    </button>
                                                    <button
                                                      onClick={() => {
                                                        setDeleteConfirm({
                                                          isOpen: true,
                                                          type: 'deduction',
                                                          targetId: a.id,
                                                          title: `Delete Deduction: ${a.category}?`,
                                                          description: `Delete ${a.category} (-₹${Math.abs(a.amount || 0)}) for ${r.vehicle.registrationNumber}? Net salary will be recalculated.`,
                                                        });
                                                      }}
                                                      className="p-1 rounded text-[#86868B] hover:text-[#FF3B30] hover:bg-[#FEECEB] transition-colors cursor-pointer"
                                                      title="Delete this deduction"
                                                    >
                                                      <Trash2 className="w-3 h-3" />
                                                    </button>
                                                  </div>
                                                </td>
                                              )}
                                            </tr>
                                          );
                                        })}
                                      </tbody>
                                    </table>
                                  </div>
                                )}
                              </div>
                            </div>
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

        {/* Table Footer */}
        <div className="px-4 py-3 bg-[#F2F2F7] border-t border-[#E5E5EA] flex flex-col sm:flex-row items-center justify-between text-[11px] text-[#86868B] gap-2">
          <div>
            Showing <span className="font-semibold text-[#1D1D1F]">{filtered.length}</span> of{' '}
            <span className="font-semibold text-[#1D1D1F]">{records.length}</span> vehicle settlement records
          </div>
          <div className="flex items-center space-x-4">
            <span>
              Total Gross:{' '}
              <span className="font-semibold text-[#1D1D1F] font-mono">
                ₹{totalGross.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </span>
            </span>
            <span>
              Total Disbursed:{' '}
              <span className="font-semibold text-[#34C759] font-mono">
                ₹{totalSettled.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </span>
            </span>
            <span>
              Balance Due:{' '}
              <span className="font-semibold text-[#FF9F0A] font-mono">
                ₹{totalOutstanding.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </span>
            </span>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {deleteConfirm && deleteConfirm.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-[#FFFFFF] rounded-[24px] shadow-apple-modal border border-[#E5E5EA] max-w-md w-full overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6 space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-[#FEECEB] text-[#FF3B30] flex items-center justify-center">
                <Trash2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-base text-[#1D1D1F]">{deleteConfirm.title}</h3>
                <p className="text-xs text-[#86868B] mt-1 leading-relaxed">
                  {deleteConfirm.description}
                </p>
              </div>

              <div className="flex items-center justify-end space-x-2 pt-3 border-t border-[#E5E5EA]">
                <button
                  type="button"
                  onClick={() => setDeleteConfirm(null)}
                  className="px-4 py-2 rounded-full text-xs font-semibold text-[#1D1D1F] bg-[#F2F2F7] hover:bg-[#E5E5EA] transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleExecuteDelete}
                  className="px-4 py-2 rounded-full text-xs font-semibold bg-[#FF3B30] hover:bg-[#D70015] text-white transition-all shadow-apple-btn active:scale-[0.98] cursor-pointer"
                >
                  Confirm Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Vehicle Row Modal */}
      {isAddVehicleOpen && (
        <AddVehicleModal
          isOpen={isAddVehicleOpen}
          periodId={selectedPeriodId !== 'ALL' ? selectedPeriodId : undefined}
          periods={periods}
          onClose={() => setIsAddVehicleOpen(false)}
          onVehicleAdded={() => {
            setIsAddVehicleOpen(false);
            fetchPayments();
            setNotification({
              type: 'success',
              text: 'New vehicle row added to payments directory.',
            });
          }}
        />
      )}

      {/* Record Payment Settlement Modal */}
      {selectedRecordForPayment && (
        <PaymentSettlementModal
          isOpen={!!selectedRecordForPayment}
          record={selectedRecordForPayment}
          onClose={() => setSelectedRecordForPayment(null)}
          onPaymentRecorded={() => {
            fetchPayments();
            setSelectedRecordForPayment(null);
            setNotification({
              type: 'success',
              text: 'Payment settlement successfully recorded and reconciled.',
            });
          }}
        />
      )}

      {/* Driver Information Management Modal */}
      {driverModalRecord && (
        <DriverAssignmentModal
          isOpen={isDriverModalOpen}
          vehicle={{
            id: driverModalRecord.vehicle.id,
            registrationNumber: driverModalRecord.vehicle.registrationNumber,
            vehicleType: driverModalRecord.vehicle.vehicleType,
          }}
          periodName={driverModalRecord.period.periodName}
          currentDriver={driverModalRecord.vehicle?.assignments?.[0]?.driver || null}
          onClose={() => {
            setIsDriverModalOpen(false);
            setDriverModalRecord(null);
          }}
          onSuccess={() => {
            setIsDriverModalOpen(false);
            setDriverModalRecord(null);
            fetchPayments();
            setNotification({
              type: 'success',
              text: 'Driver information successfully updated for this vehicle.',
            });
          }}
        />
      )}

      {/* Edit Vehicle Record Modal */}
      {editingRecordId && (
        <VehicleRecordModal
          isOpen={!!editingRecordId}
          recordId={editingRecordId}
          onClose={() => setEditingRecordId(null)}
          onRecordUpdated={() => {
            setEditingRecordId(null);
            fetchPayments();
            setNotification({
              type: 'success',
              text: 'Vehicle record successfully updated and totals recalculated.',
            });
          }}
        />
      )}

      {/* Adjustment & Deduction Add / Edit Modal */}
      {isAdjustmentModalOpen && (
        <AdjustmentModal
          isOpen={isAdjustmentModalOpen}
          mode={adjustmentModalMode}
          adjustmentToEdit={adjustmentToEdit}
          periods={periods}
          vehicles={vehiclesList}
          preselectedPeriodId={targetRecordForAdjustment?.periodId || (selectedPeriodId !== 'ALL' ? selectedPeriodId : undefined)}
          preselectedVehicleId={targetRecordForAdjustment?.vehicleId}
          preselectedRecordId={targetRecordForAdjustment?.id}
          onClose={() => {
            setIsAdjustmentModalOpen(false);
            setAdjustmentToEdit(null);
            setTargetRecordForAdjustment(null);
          }}
          onSuccess={() => {
            setIsAdjustmentModalOpen(false);
            setAdjustmentToEdit(null);
            setTargetRecordForAdjustment(null);
            fetchPayments();
            setNotification({
              type: 'success',
              text: 'Adjustment saved successfully and financial balances recalculated.',
            });
          }}
        />
      )}
    </div>
  );
}
