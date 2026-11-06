'use client';

import React, { useState, useEffect } from 'react';
import Navbar from '@/components/Navbar';
import PaymentSettlementModal from '@/components/PaymentSettlementModal';
import {
  CreditCard,
  Search,
  Filter,
  Download,
  Printer,
  CheckCircle,
  PauseCircle,
  Clock,
  AlertCircle,
  Building2,
  Calendar
} from 'lucide-react';
import { exportToExcel, exportToCSV, exportToPDF } from '@/lib/exportUtils';

export default function PaymentsPage() {
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [selectedRecord, setSelectedRecord] = useState<any | null>(null);

  useEffect(() => {
    fetchPayments();
  }, [statusFilter]);

  const fetchPayments = async () => {
    setLoading(true);
    try {
      let url = '/api/records?';
      if (statusFilter !== 'ALL') url += `status=${statusFilter}`;
      const res = await fetch(url);
      const data = await res.json();
      setRecords(data.records || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const filtered = records.filter((r) => {
    const matchesSearch =
      r.vehicle.registrationNumber.toLowerCase().includes(search.toLowerCase()) ||
      (r.bankDetails && r.bankDetails.toLowerCase().includes(search.toLowerCase())) ||
      (r.remarks && r.remarks.toLowerCase().includes(search.toLowerCase()));
    return matchesSearch;
  });

  const handlePrintVoucher = (r: any) => {
    const headers = ['Field', 'Information'];
    const rows = [
      ['Vehicle Registration', r.vehicle.registrationNumber],
      ['Period', r.period.periodName],
      ['Gross Billing', `₹${r.grossBilling.toFixed(2)}`],
      ['Total Deductions', `₹${r.totalDeductions.toFixed(2)}`],
      ['Net Payable', `₹${r.netPayable.toFixed(2)}`],
      ['Amount Paid to Date', `₹${r.amountPaid.toFixed(2)}`],
      ['Outstanding Balance', `₹${(r.netPayable - r.amountPaid).toFixed(2)}`],
      ['Status', r.paymentStatus],
      ['Payment Date', r.paymentDate || 'N/A'],
      ['Bank Account / Name', r.bankDetails || 'OTHER Bank'],
      ['Payment Remarks', r.remarks || 'None'],
    ];

    exportToPDF({
      title: `ATHARVA TRAVELS – Payment Settlement Voucher`,
      subtitle: `Vehicle: ${r.vehicle.registrationNumber} • Period: ${r.period.periodName}`,
      headers,
      rows,
      filename: `Voucher_${r.vehicle.registrationNumber}_${r.period.monthCode}`,
    });
  };

  const handleExport = (format: 'xlsx' | 'csv') => {
    const exportData = filtered.map((r) => ({
      Period: r.period.periodName,
      Section: r.sectionIndex,
      Vehicle: r.vehicle.registrationNumber,
      'Gross Billing (₹)': r.grossBilling,
      'Total Deductions (₹)': r.totalDeductions,
      'Net Payable (₹)': r.netPayable,
      'Amount Paid (₹)': r.amountPaid,
      'Balance Due (₹)': Math.max(0, r.netPayable - r.amountPaid),
      Status: r.paymentStatus,
      'Payment Date': r.paymentDate || 'N/A',
      Bank: r.bankDetails || 'OTHER Bank',
      Remarks: r.remarks || '',
    }));

    if (format === 'xlsx') {
      exportToExcel(exportData, 'Payment Settlements', 'Atharva_Payment_Settlements');
    } else {
      exportToCSV(exportData, 'Atharva_Payment_Settlements');
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto selection:bg-[#B3D7FF]">
      <Navbar
        title="Settlements & Payments"
        subtitle="Track Recorded Payments, Pending Settlements, Bank Accounts & Vouchers"
        onRefresh={fetchPayments}
      />

      {/* Apple Styled Filter & Action Toolbar */}
      <div className="bg-[#FFFFFF] p-4 rounded-[22px] border border-[#E5E5EA] shadow-apple-card flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-[#86868B] absolute left-3.5 top-3" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search vehicle, bank or remark..."
              className="w-full pl-9 pr-4 py-2 bg-[#F2F2F7] border border-[#E5E5EA] rounded-full text-xs text-[#1D1D1F] focus:bg-[#FFFFFF] focus:outline-hidden focus:ring-2 focus:ring-[#007AFF] transition-all"
            />
          </div>

          <div className="flex items-center space-x-2">
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

        <div className="flex items-center space-x-2 self-end md:self-auto">
          <button
            onClick={() => handleExport('xlsx')}
            className="px-4 py-2 rounded-full border border-[#E5E5EA] bg-[#F2F2F7] hover:bg-[#E5E5EA] text-[#1D1D1F] text-xs font-medium flex items-center space-x-1.5 transition-colors"
          >
            <Download className="w-3.5 h-3.5 text-[#34C759]" />
            <span>Excel</span>
          </button>
          <button
            onClick={() => handleExport('csv')}
            className="px-4 py-2 rounded-full border border-[#E5E5EA] bg-[#F2F2F7] hover:bg-[#E5E5EA] text-[#1D1D1F] text-xs font-medium flex items-center space-x-1.5 transition-colors"
          >
            <Download className="w-3.5 h-3.5 text-[#007AFF]" />
            <span>CSV</span>
          </button>
        </div>
      </div>

      {/* Apple Styled Table Card */}
      <div className="bg-[#FFFFFF] rounded-[24px] border border-[#E5E5EA] shadow-apple-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse">
            <thead className="bg-[#F2F2F7] text-[#1D1D1F] font-semibold border-b border-[#E5E5EA]">
              <tr>
                <th className="py-3 px-3">Period</th>
                <th className="py-3 px-4">Vehicle Registration</th>
                <th className="py-3 px-4 text-right">Net Payable (₹)</th>
                <th className="py-3 px-4 text-right">Settled to Date (₹)</th>
                <th className="py-3 px-4 text-right">Outstanding (₹)</th>
                <th className="py-3 px-3 text-center">Status</th>
                <th className="py-3 px-3">Payment Date</th>
                <th className="py-3 px-3">Bank Details</th>
                <th className="py-3 px-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E5EA]">
              {loading ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-[#86868B]">
                    Loading payments directory...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-[#86868B]">
                    No payment records found.
                  </td>
                </tr>
              ) : (
                filtered.map((r) => {
                  const isPaid = r.paymentStatus === 'Paid';
                  const isHold = r.paymentStatus === 'HOLD';
                  const isWF = r.paymentStatus === 'WF';
                  const isNoAcc = r.paymentStatus.includes('No Acc');

                  return (
                    <tr key={r.id} className="hover:bg-[#F2F2F7]/50 transition-colors">
                      <td className="py-3.5 px-3 font-semibold text-[#1D1D1F]">{r.period.periodName}</td>
                      <td className="py-3.5 px-4 font-bold text-[#1D1D1F] font-mono">
                        {r.vehicle.registrationNumber}
                        {r.remarks && <p className="text-[10px] text-[#86868B] font-normal truncate max-w-xs">{r.remarks}</p>}
                      </td>
                      <td className="py-3.5 px-4 text-right font-medium text-[#1D1D1F] tabular-nums">
                        ₹{r.netPayable.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3.5 px-4 text-right font-medium text-[#34C759] tabular-nums">
                        ₹{r.amountPaid.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3.5 px-4 text-right font-bold text-[#007AFF] tabular-nums">
                        ₹{Math.max(0, r.netPayable - r.amountPaid).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3.5 px-3 text-center">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold uppercase border ${
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
                      <td className="py-3.5 px-3 text-[#86868B] font-mono text-[11px]">
                        {r.paymentDate || 'Pending'}
                      </td>
                      <td className="py-3.5 px-3 text-[#1D1D1F] truncate max-w-[130px]">
                        {r.bankDetails || 'OTHER Bank'}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <div className="flex items-center justify-center space-x-2">
                          <button
                            onClick={() => setSelectedRecord(r)}
                            className="px-3.5 py-1.5 rounded-full bg-[#007AFF] text-white hover:bg-[#0062CC] text-xs font-medium transition-all shadow-apple-btn active:scale-[0.98]"
                          >
                            Record Payment
                          </button>
                          <button
                            onClick={() => handlePrintVoucher(r)}
                            className="w-7 h-7 rounded-full bg-[#F2F2F7] hover:bg-[#E5E5EA] text-[#86868B] hover:text-[#1D1D1F] flex items-center justify-center transition-colors"
                            title="Download PDF Payment Voucher"
                          >
                            <Printer className="w-3.5 h-3.5" />
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

      <PaymentSettlementModal
        isOpen={!!selectedRecord}
        record={selectedRecord}
        onClose={() => setSelectedRecord(null)}
        onPaymentRecorded={() => {
          fetchPayments();
        }}
      />
    </div>
  );
}
