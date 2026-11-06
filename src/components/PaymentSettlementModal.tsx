'use client';

import React, { useState } from 'react';
import { CreditCard, Printer, CheckCircle, AlertCircle, X, Download, Check } from 'lucide-react';
import { exportToPDF } from '@/lib/exportUtils';

interface PaymentSettlementModalProps {
  isOpen: boolean;
  record: any;
  onClose: () => void;
  onPaymentRecorded: () => void;
}

export default function PaymentSettlementModal({
  isOpen,
  record,
  onClose,
  onPaymentRecorded,
}: PaymentSettlementModalProps) {
  const [amount, setAmount] = useState(
    record ? Math.max(0, record.netPayable - record.amountPaid).toString() : '0'
  );
  const [paymentDate, setPaymentDate] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [paymentMode, setPaymentMode] = useState('NEFT');
  const [referenceNumber, setReferenceNumber] = useState('');
  const [bankName, setBankName] = useState(record?.bankDetails || 'OTHER Bank');
  const [remarks, setRemarks] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !record) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/records/${record.id}/payments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: parseFloat(amount) || 0,
          paymentDate,
          paymentMode,
          referenceNumber,
          bankName,
          remarks,
          statusUpdate: parseFloat(amount) + record.amountPaid >= record.netPayable ? 'Paid' : 'Partially Paid',
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to record payment');

      onPaymentRecorded();
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handlePrintReceipt = () => {
    const headers = ['Field', 'Details'];
    const rows = [
      ['Vehicle Registration', record.vehicle?.registrationNumber || 'N/A'],
      ['Vehicle Category', record.vehicle?.vehicleType || 'N/A'],
      ['Period', record.period?.periodName || 'N/A'],
      ['Gross Billing', `₹${(record.grossBilling || 0).toFixed(2)}`],
      ['Total Deductions', `₹${(record.totalDeductions || 0).toFixed(2)}`],
      ['Net Payable Amount', `₹${(record.netPayable || 0).toFixed(2)}`],
      ['Amount Settled in this Transaction', `₹${(parseFloat(amount) || 0).toFixed(2)}`],
      ['Payment Mode', paymentMode],
      ['Bank Name', bankName],
      ['UTR / Reference Number', referenceNumber || 'N/A'],
      ['Settlement Date', paymentDate],
      ['Remarks', remarks || 'Settled and Reconciled'],
    ];

    exportToPDF({
      title: `Payment Settlement Voucher – ${record.vehicle?.registrationNumber || 'Fleet'}`,
      subtitle: `ATHARVA TRAVELS Internal Finance • Generated on ${new Date().toLocaleString()}`,
      headers,
      rows,
      filename: `Settlement_${record.vehicle?.registrationNumber || 'Record'}_${record.period?.monthCode || 'Period'}`,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#1D1D1F]/20 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="bg-[#FFFFFF] rounded-[24px] shadow-2xl border border-[#E5E5EA] max-w-lg w-full overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Apple Clean Light Header */}
        <div className="px-6 py-5 border-b border-[#E5E5EA] flex items-center justify-between bg-[#FFFFFF]">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-full bg-[#EBF5FF] text-[#007AFF] flex items-center justify-center shrink-0">
              <CreditCard className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-[#1D1D1F] tracking-tight">
                Record Payment Settlement
              </h3>
              <p className="text-xs text-[#86868B] font-mono">
                {record.vehicle?.registrationNumber} · {record.period?.periodName}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-[#F2F2F7] hover:bg-[#E5E5EA] text-[#86868B] hover:text-[#1D1D1F] flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3.5 rounded-[16px] bg-[#FFF0EF] border border-[#FFD0CE] text-[#FF3B30] text-xs flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Balance Summary Card */}
          <div className="p-4 bg-[#F2F2F7] border border-[#E5E5EA] rounded-[18px] grid grid-cols-3 gap-2 text-xs">
            <div>
              <p className="text-[#86868B] text-[11px] font-medium">Net Payable</p>
              <p className="text-sm font-bold text-[#1D1D1F] tabular-nums mt-0.5">
                ₹{record.netPayable.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </p>
            </div>
            <div>
              <p className="text-[#86868B] text-[11px] font-medium">Already Paid</p>
              <p className="text-sm font-bold text-[#34C759] tabular-nums mt-0.5">
                ₹{record.amountPaid.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </p>
            </div>
            <div>
              <p className="text-[#86868B] text-[11px] font-medium">Balance Due</p>
              <p className="text-sm font-bold text-[#007AFF] tabular-nums mt-0.5">
                ₹{Math.max(0, record.netPayable - record.amountPaid).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-[#1D1D1F] mb-1.5">
                Payment Amount (₹)
              </label>
              <input
                type="number"
                step="any"
                required
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-[#F2F2F7] border border-[#E5E5EA] rounded-[14px] text-xs font-semibold text-[#1D1D1F] focus:bg-[#FFFFFF] focus:outline-hidden focus:ring-2 focus:ring-[#007AFF] transition-all"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#1D1D1F] mb-1.5">
                Payment Date
              </label>
              <input
                type="date"
                required
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-[#F2F2F7] border border-[#E5E5EA] rounded-[14px] text-xs text-[#1D1D1F] focus:bg-[#FFFFFF] focus:outline-hidden focus:ring-2 focus:ring-[#007AFF] transition-all"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-[#1D1D1F] mb-1.5">
                Payment Mode
              </label>
              <select
                value={paymentMode}
                onChange={(e) => setPaymentMode(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-[#F2F2F7] border border-[#E5E5EA] rounded-[14px] text-xs text-[#1D1D1F] focus:bg-[#FFFFFF] focus:outline-hidden focus:ring-2 focus:ring-[#007AFF] transition-all cursor-pointer"
              >
                <option value="NEFT">NEFT Bank Transfer</option>
                <option value="RTGS">RTGS Bank Transfer</option>
                <option value="IMPS">IMPS Immediate Payment</option>
                <option value="UPI">UPI Transfer</option>
                <option value="CHEQUE">Cheque</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#1D1D1F] mb-1.5">
                UTR / Reference Number
              </label>
              <input
                type="text"
                value={referenceNumber}
                onChange={(e) => setReferenceNumber(e.target.value)}
                placeholder="e.g. UTR12345678"
                className="w-full px-3.5 py-2.5 bg-[#F2F2F7] border border-[#E5E5EA] rounded-[14px] text-xs text-[#1D1D1F] focus:bg-[#FFFFFF] focus:outline-hidden focus:ring-2 focus:ring-[#007AFF] transition-all"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-[#1D1D1F] mb-1.5">
                Bank Name
              </label>
              <input
                type="text"
                value={bankName}
                onChange={(e) => setBankName(e.target.value)}
                placeholder="OTHER Bank, HDFC, SBI"
                className="w-full px-3.5 py-2.5 bg-[#F2F2F7] border border-[#E5E5EA] rounded-[14px] text-xs text-[#1D1D1F] focus:bg-[#FFFFFF] focus:outline-hidden focus:ring-2 focus:ring-[#007AFF] transition-all"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#1D1D1F] mb-1.5">
                Remarks
              </label>
              <input
                type="text"
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                placeholder="e.g. October settlement"
                className="w-full px-3.5 py-2.5 bg-[#F2F2F7] border border-[#E5E5EA] rounded-[14px] text-xs text-[#1D1D1F] focus:bg-[#FFFFFF] focus:outline-hidden focus:ring-2 focus:ring-[#007AFF] transition-all"
              />
            </div>
          </div>

          {/* Modal Action Buttons with Apple Pill Styling */}
          <div className="flex items-center justify-between pt-4 border-t border-[#E5E5EA]">
            <button
              type="button"
              onClick={handlePrintReceipt}
              className="px-4 py-2 rounded-full text-xs font-medium text-[#1D1D1F] bg-[#F2F2F7] hover:bg-[#E5E5EA] border border-[#E5E5EA] transition-all flex items-center space-x-1.5 active:scale-[0.98]"
            >
              <Printer className="w-3.5 h-3.5 text-[#86868B]" />
              <span>Download PDF Voucher</span>
            </button>

            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-full text-xs font-medium text-[#86868B] hover:bg-[#F2F2F7] transition-all"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-5 py-2 rounded-full text-xs font-semibold bg-[#34C759] hover:bg-[#2FB34F] text-white transition-all flex items-center space-x-1.5 shadow-apple-btn active:scale-[0.98] disabled:opacity-50"
              >
                <Check className="w-3.5 h-3.5" />
                <span>{loading ? 'Recording...' : '✓ Approve Settlement'}</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
