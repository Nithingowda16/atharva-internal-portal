'use client';

import React, { useState, useEffect } from 'react';
import Navbar from '@/components/Navbar';
import CreateMonthModal from '@/components/CreateMonthModal';
import VehicleRecordModal from '@/components/VehicleRecordModal';
import PaymentSettlementModal from '@/components/PaymentSettlementModal';
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
  CheckCircle2,
  Clock,
  RotateCcw,
  Receipt,
  FileSpreadsheet
} from 'lucide-react';
import { exportToExcel, exportToCSV } from '@/lib/exportUtils';

export default function MonthlyFinancePage() {
  const [periods, setPeriods] = useState<any[]>([]);
  const [selectedPeriodId, setSelectedPeriodId] = useState<string>('');
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Modals state
  const [isCreateMonthOpen, setIsCreateMonthOpen] = useState(false);
  const [editingRecordId, setEditingRecordId] = useState<string | null>(null);
  const [settlingRecord, setSettlingRecord] = useState<any | null>(null);

  useEffect(() => {
    fetchPeriods();
  }, []);

  useEffect(() => {
    if (selectedPeriodId) {
      fetchRecords(selectedPeriodId);
    }
  }, [selectedPeriodId, statusFilter, search]);

  const fetchPeriods = async () => {
    try {
      const res = await fetch('/api/months');
      const data = await res.json();
      setPeriods(data.periods || []);
      if (data.periods && data.periods.length > 0 && !selectedPeriodId) {
        setSelectedPeriodId(data.periods[0].id);
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

      const res = await fetch(url);
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
    if (!activePeriod) return;
    const newStatus = activePeriod.status === 'Locked' ? 'In Progress' : 'Locked';
    const reason = prompt(`Enter reason to change month status to ${newStatus}:`);
    if (!reason) return;

    try {
      await fetch(`/api/months/${activePeriod.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus, reason }),
      });
      fetchPeriods();
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteRecord = async (recordId: string, regNo: string) => {
    const reason = prompt(`Reason for deleting record for ${regNo} (soft-deleted to Recycle Bin):`);
    if (!reason) return;

    try {
      const res = await fetch(`/api/records/${recordId}?reason=${encodeURIComponent(reason)}`, {
        method: 'DELETE',
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

  return (
    <div className="space-y-6 max-w-7xl mx-auto selection:bg-[#B3D7FF]">
      <Navbar
        title="Monthly Finance Management"
        subtitle="Vehicle Billing, Deductions, Net Settlements & Future Months"
        onRefresh={() => {
          fetchPeriods();
          if (selectedPeriodId) fetchRecords(selectedPeriodId);
        }}
      />

      {/* Month Selector & Action Pills Bar */}
      <div className="bg-[#FFFFFF] p-5 rounded-[24px] border border-[#E5E5EA] shadow-apple-card flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold text-[#86868B] uppercase tracking-wider mr-1">Period:</span>
          {periods.map((p) => {
            const isSelected = p.id === selectedPeriodId;
            return (
              <button
                key={p.id}
                onClick={() => setSelectedPeriodId(p.id)}
                className={`px-4 py-2 rounded-full text-xs font-medium transition-all duration-150 flex items-center space-x-1.5 ${
                  isSelected
                    ? 'bg-[#007AFF] text-white shadow-apple-btn font-semibold'
                    : 'bg-[#F2F2F7] text-[#1D1D1F] hover:bg-[#E5E5EA] border border-[#E5E5EA]'
                }`}
              >
                <span>{p.periodName}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                    isSelected ? 'bg-white/20 text-white' : 'bg-black/5 text-[#86868B]'
                  }`}
                >
                  {p._count?.monthlyRecords || 46}
                </span>
              </button>
            );
          })}
        </div>

        <div className="flex items-center space-x-2 shrink-0">
          {activePeriod && (
            <button
              onClick={handleToggleMonthStatus}
              className="px-4 py-2 rounded-full border border-[#E5E5EA] bg-[#FFFFFF] hover:bg-[#F2F2F7] text-[#1D1D1F] text-xs font-medium flex items-center space-x-1.5 transition-colors"
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
          )}

          <button
            onClick={() => setIsCreateMonthOpen(true)}
            className="px-5 py-2 rounded-full bg-[#007AFF] hover:bg-[#0062CC] text-white text-xs font-medium transition-all duration-150 flex items-center space-x-1.5 shadow-apple-btn active:scale-[0.98]"
          >
            <Plus className="w-4 h-4" />
            <span>+ Create New Month</span>
          </button>
        </div>
      </div>

      {/* Active Period Reconciled Card */}
      {activePeriod && (
        <div className="bg-[#FFFFFF] border border-[#E5E5EA] rounded-[24px] p-6 shadow-apple-card space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-[#E5E5EA] gap-2">
            <div className="flex items-center space-x-2.5">
              <h3 className="text-base font-bold text-[#1D1D1F] tracking-tight">{activePeriod.periodName} Statement</h3>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-[#EAF9EE] text-[#34C759] border border-[#D2F4DA]">
                {activePeriod.status}
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-[#F2F2F7] text-[#86868B] border border-[#E5E5EA]">
                FY {activePeriod.financialYear}
              </span>
            </div>
            <p className="text-xs text-[#86868B] font-mono">
              {activePeriod.startDate} to {activePeriod.endDate}
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-1">
            <div className="p-4 rounded-2xl bg-[#F2F2F7]/60 border border-[#E5E5EA]">
              <p className="text-xs text-[#86868B] font-medium">Gross Billing</p>
              <p className="text-xl font-bold text-[#1D1D1F] mt-0.5 tabular-nums">
                ₹{activePeriod.grossBilling.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </p>
            </div>
            <div className="p-4 rounded-2xl bg-[#F2F2F7]/60 border border-[#E5E5EA]">
              <p className="text-xs text-[#86868B] font-medium">Total Deductions</p>
              <p className="text-xl font-bold text-[#FF3B30] mt-0.5 tabular-nums">
                ₹{activePeriod.totalDeductions.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </p>
            </div>
            <div className="p-4 rounded-2xl bg-[#F2F2F7]/60 border border-[#E5E5EA]">
              <p className="text-xs text-[#86868B] font-medium">Net Payable</p>
              <p className="text-xl font-bold text-[#007AFF] mt-0.5 tabular-nums">
                ₹{activePeriod.netPayable.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </p>
            </div>
            <div className="p-4 rounded-2xl bg-[#F2F2F7]/60 border border-[#E5E5EA]">
              <p className="text-xs text-[#86868B] font-medium">Recorded Settlements</p>
              <p className="text-xl font-bold text-[#34C759] mt-0.5 tabular-nums">
                ₹{activePeriod.totalPaid.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Filter Toolbar */}
      <div className="bg-[#FFFFFF] p-4 rounded-[22px] border border-[#E5E5EA] shadow-apple-card flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 text-[#86868B] absolute left-3.5 top-2.5" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search vehicle number or remarks..."
              className="w-full pl-10 pr-3 py-2 bg-[#F2F2F7] border border-[#E5E5EA] rounded-full text-xs text-[#1D1D1F] focus:bg-[#FFFFFF] focus:ring-2 focus:ring-[#007AFF] focus:outline-hidden transition-all"
            />
          </div>

          <div className="flex items-center space-x-1.5">
            <span className="text-xs text-[#86868B] font-medium">Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 border border-[#E5E5EA] rounded-full text-xs font-medium text-[#1D1D1F] bg-[#F2F2F7] focus:outline-hidden cursor-pointer"
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
          <button
            onClick={() => handleExport('xlsx')}
            className="px-4 py-2 rounded-full border border-[#E5E5EA] bg-[#FFFFFF] hover:bg-[#F2F2F7] text-[#1D1D1F] text-xs font-medium flex items-center space-x-1 transition-colors"
          >
            <Download className="w-3.5 h-3.5 text-[#34C759]" />
            <span>Excel</span>
          </button>
          <button
            onClick={() => handleExport('csv')}
            className="px-4 py-2 rounded-full border border-[#E5E5EA] bg-[#FFFFFF] hover:bg-[#F2F2F7] text-[#1D1D1F] text-xs font-medium flex items-center space-x-1 transition-colors"
          >
            <Download className="w-3.5 h-3.5 text-[#007AFF]" />
            <span>CSV</span>
          </button>
        </div>
      </div>

      {/* Main Vehicle Records Table */}
      <div className="bg-[#FFFFFF] rounded-[24px] border border-[#E5E5EA] shadow-apple-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse">
            <thead className="bg-[#FBFBFC] text-[#86868B] font-semibold border-b border-[#E5E5EA]">
              <tr>
                <th className="py-3 px-3 w-14 text-center">Sec #</th>
                <th className="py-3 px-4">Vehicle Registration</th>
                <th className="py-3 px-3">Category</th>
                <th className="py-3 px-4 text-right">Gross Billing (₹)</th>
                <th className="py-3 px-4 text-right">Deductions (₹)</th>
                <th className="py-3 px-4 text-right">Net Payable (₹)</th>
                <th className="py-3 px-4 text-right">Paid (₹)</th>
                <th className="py-3 px-3 text-center">Status</th>
                <th className="py-3 px-3">Bank Details</th>
                <th className="py-3 px-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E5EA]">
              {loading ? (
                <tr>
                  <td colSpan={10} className="py-8 text-center text-[#86868B]">
                    Loading records from database...
                  </td>
                </tr>
              ) : records.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-8 text-center text-[#86868B]">
                    No vehicle records found matching current filters.
                  </td>
                </tr>
              ) : (
                records.map((r) => {
                  const isHold = r.paymentStatus === 'HOLD';
                  const isWF = r.paymentStatus === 'WF';
                  const isNoAcc = r.paymentStatus.includes('No Acc');
                  const isPaid = r.paymentStatus === 'Paid';

                  return (
                    <tr key={r.id} className="hover:bg-[#F2F2F7]/50 transition-colors">
                      <td className="py-3.5 px-3 text-center font-mono text-[#86868B]">
                        {r.sectionIndex}
                      </td>

                      <td className="py-3.5 px-4 font-semibold text-[#1D1D1F]">
                        <div className="flex items-center space-x-1.5">
                          <span>{r.vehicle.registrationNumber}</span>
                          {r.hasRefErrors && (
                            <span
                              title={`Contains ${r.refErrorCount} original #REF! error(s) in source workbook`}
                              className="text-[#FF9F0A] cursor-help"
                            >
                              <AlertTriangle className="w-3.5 h-3.5 text-[#FF9F0A]" />
                            </span>
                          )}
                        </div>
                        {r.remarks && (
                          <p className="text-[10px] text-[#86868B] font-normal truncate max-w-xs mt-0.5">
                            {r.remarks}
                          </p>
                        )}
                      </td>

                      <td className="py-3.5 px-3 text-[#86868B]">
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] bg-[#F2F2F7] border border-[#E5E5EA]">
                          {r.vehicle.vehicleType.replace('Vehicle - ', '')}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-right font-medium text-[#1D1D1F] tabular-nums">
                        ₹{r.grossBilling.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>

                      <td className="py-3.5 px-4 text-right font-medium text-[#FF3B30] tabular-nums">
                        ₹{r.totalDeductions.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>

                      <td className="py-3.5 px-4 text-right font-bold text-[#007AFF] tabular-nums">
                        ₹{r.netPayable.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>

                      <td className="py-3.5 px-4 text-right font-semibold text-[#34C759] tabular-nums">
                        ₹{r.amountPaid.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>

                      <td className="py-3.5 px-3 text-center">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-semibold tracking-wide uppercase ${
                            isPaid
                              ? 'bg-[#EAF9EE] text-[#34C759] border border-[#D2F4DA]'
                              : isHold
                              ? 'bg-[#FFF5E5] text-[#FF9F0A] border border-[#FFE4B8]'
                              : isWF
                              ? 'bg-[#F2F2F7] text-[#5856D6] border border-[#E5E5EA]'
                              : isNoAcc
                              ? 'bg-[#FEECEB] text-[#FF3B30] border border-[#FCD3D1]'
                              : 'bg-[#F2F2F7] text-[#86868B] border border-[#E5E5EA]'
                          }`}
                        >
                          {r.paymentStatus}
                        </span>
                      </td>

                      <td className="py-3.5 px-3 text-[#86868B] truncate max-w-[130px]" title={r.bankDetails}>
                        <span className="text-[#1D1D1F] font-medium">{r.bankDetails || 'OTHER Bank'}</span>
                        {r.paymentDate && (
                          <span className="block text-[10px] text-[#86868B] font-mono">
                            {r.paymentDate}
                          </span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-center">
                        <div className="flex items-center justify-center space-x-1">
                          <button
                            onClick={() => setEditingRecordId(r.id)}
                            className="p-1.5 rounded-full text-[#86868B] hover:text-[#007AFF] hover:bg-[#EBF5FF] transition-colors"
                            title="Edit Record & Billing Lines"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>

                          <button
                            onClick={() => setSettlingRecord(r)}
                            className="p-1.5 rounded-full text-[#86868B] hover:text-[#34C759] hover:bg-[#EAF9EE] transition-colors"
                            title="Record Settlement Payment"
                          >
                            <CreditCard className="w-3.5 h-3.5" />
                          </button>

                          <button
                            onClick={() => handleDeleteRecord(r.id, r.vehicle.registrationNumber)}
                            className="p-1.5 rounded-full text-[#86868B] hover:text-[#FF3B30] hover:bg-[#FEECEB] transition-colors"
                            title="Soft Delete to Recycle Bin"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modals */}
      <CreateMonthModal
        isOpen={isCreateMonthOpen}
        onClose={() => setIsCreateMonthOpen(false)}
        existingPeriods={periods}
        onMonthCreated={() => {
          fetchPeriods();
        }}
      />

      <VehicleRecordModal
        isOpen={!!editingRecordId}
        recordId={editingRecordId}
        onClose={() => setEditingRecordId(null)}
        onRecordUpdated={() => {
          if (selectedPeriodId) fetchRecords(selectedPeriodId);
          fetchPeriods();
        }}
      />

      <PaymentSettlementModal
        isOpen={!!settlingRecord}
        record={settlingRecord}
        onClose={() => setSettlingRecord(null)}
        onPaymentRecorded={() => {
          if (selectedPeriodId) fetchRecords(selectedPeriodId);
          fetchPeriods();
        }}
      />
    </div>
  );
}
