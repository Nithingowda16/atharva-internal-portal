'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  Plus,
  Trash2,
  History,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  Receipt,
  Scissors,
  CreditCard,
  Save
} from 'lucide-react';

interface VehicleRecordModalProps {
  isOpen: boolean;
  recordId: string | null;
  onClose: () => void;
  onRecordUpdated: () => void;
}

export default function VehicleRecordModal({
  isOpen,
  recordId,
  onClose,
  onRecordUpdated,
}: VehicleRecordModalProps) {
  const [activeTab, setActiveTab] = useState<'billing' | 'adjustments' | 'payment' | 'versions'>('billing');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [record, setRecord] = useState<any>(null);
  const [changeReason, setChangeReason] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Editable fields
  const [paymentStatus, setPaymentStatus] = useState('Paid');
  const [paymentDate, setPaymentDate] = useState('');
  const [bankDetails, setBankDetails] = useState('');
  const [remarks, setRemarks] = useState('');
  const [billingLines, setBillingLines] = useState<any[]>([]);
  const [adjustments, setAdjustments] = useState<any[]>([]);

  useEffect(() => {
    if (isOpen && recordId) {
      loadRecord(recordId);
    }
  }, [isOpen, recordId]);

  const loadRecord = async (id: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/records/${id}`, { cache: 'no-store' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load record');

      setRecord(data.record);
      setPaymentStatus(data.record.paymentStatus);
      setPaymentDate(data.record.paymentDate || '');
      setBankDetails(data.record.bankDetails || '');
      setRemarks(data.record.remarks || '');
      setBillingLines(data.record.billingLines || []);
      const formattedAdjustments = (data.record.adjustments || []).map((adj: any) => ({
        id: adj.id,
        category: adj.category || '',
        adjustmentType: adj.adjustmentType || (adj.amount < 0 ? 'DEDUCTION' : 'ADDITION'),
        amount: Math.abs(adj.amount !== null && adj.amount !== undefined ? adj.amount : 0),
        notes: adj.notes || '',
      }));
      setAdjustments(formattedAdjustments);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !recordId) return null;

  const handleAddBillingLine = () => {
    setBillingLines([
      ...billingLines,
      {
        id: null,
        companyName: 'ORACLE',
        kmOrTrips: 0,
        applicableRate: 20,
        billingAmount: 0,
      },
    ]);
  };

  const handleAddAdjustment = () => {
    setAdjustments([
      ...adjustments,
      {
        id: null,
        category: 'Less Fuel Adv.',
        adjustmentType: 'DEDUCTION',
        amount: 1000,
        notes: '',
      },
    ]);
  };

  const updateBillingLine = (index: number, field: string, val: any) => {
    const updated = [...billingLines];
    updated[index][field] = val;
    if (field === 'kmOrTrips' || field === 'applicableRate') {
      const km = parseFloat(updated[index].kmOrTrips) || 0;
      const rate = parseFloat(updated[index].applicableRate) || 0;
      updated[index].billingAmount = km * rate;
    }
    setBillingLines(updated);
  };

  const updateAdjustment = (index: number, field: string, val: any) => {
    const updated = [...adjustments];
    updated[index][field] = val;
    setAdjustments(updated);
  };

  const handleSave = async () => {
    if (!changeReason.trim()) {
      setError('Please provide a reason for financial change (Audit Compliance Requirement).');
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/records/${recordId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        cache: 'no-store',
        body: JSON.stringify({
          paymentStatus,
          paymentDate,
          bankDetails,
          remarks,
          changeReason,
          billingLines,
          adjustments: adjustments.map((adj) => ({
            id: adj.id,
            category: adj.category,
            adjustmentType: adj.adjustmentType || 'DEDUCTION',
            amount: Math.abs(parseFloat(adj.amount) || 0),
            notes: adj.notes,
          })),
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save changes');

      setSuccessMsg('Record saved and recalculated successfully.');
      setChangeReason('');
      await loadRecord(recordId);
      onRecordUpdated();
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleRevert = async (versionNumber: number) => {
    if (!confirm(`Are you sure you want to revert to Version ${versionNumber}?`)) return;

    setLoading(true);
    try {
      const res = await fetch(`/api/records/${recordId}/versions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetVersion: versionNumber }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Revert failed');

      setSuccessMsg(`Successfully restored state from Version ${versionNumber}.`);
      loadRecord(recordId);
      onRecordUpdated();
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  let liveGross = 0;
  for (const bl of billingLines) {
    liveGross += parseFloat(bl.billingAmount) || 0;
  }
  let liveDeductions = 0;
  for (const adj of adjustments) {
    const amt = Math.abs(parseFloat(adj.amount) || 0);
    if (adj.adjustmentType === 'ADDITION') {
      liveDeductions -= amt;
    } else {
      liveDeductions += amt;
    }
  }
  const liveNet = liveGross - liveDeductions;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-xs p-4">
      <div className="bg-[#FFFFFF] rounded-[24px] shadow-apple-modal border border-[#E5E5EA] max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Apple Clean Light Header */}
        <div className="px-6 py-4 border-b border-[#E5E5EA] flex items-center justify-between shrink-0 bg-[#FFFFFF]">
          <div className="flex items-center space-x-3">
            <span className="px-3 py-1 rounded-full bg-[#EBF5FF] text-[#007AFF] text-xs font-semibold">
              Section #{record?.sectionIndex || 1}
            </span>
            <div>
              <h3 className="font-bold text-sm text-[#1D1D1F] tracking-tight flex items-center space-x-2">
                <span>{record?.vehicle?.registrationNumber || 'Vehicle'}</span>
                <span className="text-xs font-normal text-[#86868B]">({record?.period?.periodName})</span>
              </h3>
              <p className="text-[11px] text-[#86868B]">
                {record?.vehicle?.vehicleType} · {record?.calcHeader || 'Payment Calculation'}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-full hover:bg-[#F2F2F7] text-[#86868B] hover:text-[#1D1D1F] transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Live Calculation Bar */}
        <div className="px-6 py-3 bg-[#FBFBFC] border-b border-[#E5E5EA] flex items-center justify-between text-xs">
          <div className="flex items-center space-x-6">
            <div>
              <span className="text-[#86868B] font-medium">Gross Billing: </span>
              <span className="font-bold text-[#1D1D1F] tabular-nums">₹{liveGross.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
            </div>
            <div>
              <span className="text-[#86868B] font-medium">Total Deductions: </span>
              <span className="font-bold text-[#FF3B30] tabular-nums">₹{liveDeductions.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
            </div>
            <div>
              <span className="text-[#86868B] font-medium">Net Payable: </span>
              <span className="font-bold text-[#007AFF] tabular-nums">₹{liveNet.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
            </div>
          </div>

          {record?.hasRefErrors && (
            <div className="flex items-center space-x-1.5 px-3 py-1 rounded-full bg-[#FFF5E5] text-[#FF9F0A] border border-[#FFE4B8] text-[11px] font-semibold">
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>Original #REF! Error Flagged</span>
            </div>
          )}
        </div>

        {/* Apple Segmented Pill Tabs */}
        <div className="px-6 py-3 bg-[#FFFFFF] border-b border-[#E5E5EA] flex items-center shrink-0">
          <div className="p-1 rounded-full bg-[#F2F2F7] border border-[#E5E5EA] flex items-center space-x-1">
            <button
              onClick={() => setActiveTab('billing')}
              className={`px-4 py-1 rounded-full text-xs font-medium transition-all ${
                activeTab === 'billing' ? 'bg-[#FFFFFF] text-[#1D1D1F] shadow-2xs font-semibold' : 'text-[#86868B] hover:text-[#1D1D1F]'
              }`}
            >
              Billing Lines ({billingLines.length})
            </button>
            <button
              onClick={() => setActiveTab('adjustments')}
              className={`px-4 py-1 rounded-full text-xs font-medium transition-all ${
                activeTab === 'adjustments' ? 'bg-[#FFFFFF] text-[#1D1D1F] shadow-2xs font-semibold' : 'text-[#86868B] hover:text-[#1D1D1F]'
              }`}
            >
              Adjustments ({adjustments.length})
            </button>
            <button
              onClick={() => setActiveTab('payment')}
              className={`px-4 py-1 rounded-full text-xs font-medium transition-all ${
                activeTab === 'payment' ? 'bg-[#FFFFFF] text-[#1D1D1F] shadow-2xs font-semibold' : 'text-[#86868B] hover:text-[#1D1D1F]'
              }`}
            >
              Settlement & Bank
            </button>
            <button
              onClick={() => setActiveTab('versions')}
              className={`px-4 py-1 rounded-full text-xs font-medium transition-all ${
                activeTab === 'versions' ? 'bg-[#FFFFFF] text-[#1D1D1F] shadow-2xs font-semibold' : 'text-[#86868B] hover:text-[#1D1D1F]'
              }`}
            >
              Versions ({record?.versions?.length || 1})
            </button>
          </div>
        </div>

        {/* Body Content */}
        <div className="p-6 overflow-y-auto flex-1 space-y-4 custom-scrollbar">
          {error && (
            <div className="p-3 rounded-2xl bg-[#FEECEB] border border-[#FCD3D1] text-[#FF3B30] text-xs flex items-center space-x-2">
              <AlertTriangle className="w-4 h-4 shrink-0 text-[#FF3B30]" />
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3 rounded-2xl bg-[#EAF9EE] border border-[#D2F4DA] text-[#34C759] text-xs flex items-center space-x-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* TAB 1: Billing Lines */}
          {activeTab === 'billing' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-xs text-[#86868B] font-medium">
                  Amount = Kilometres × Applicable Rate
                </p>
                <button
                  type="button"
                  onClick={handleAddBillingLine}
                  className="px-3.5 py-1 rounded-full text-xs font-medium bg-[#EBF5FF] text-[#007AFF] hover:bg-[#D9ECFF] flex items-center space-x-1 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Line</span>
                </button>
              </div>

              <div className="border border-[#E5E5EA] rounded-[18px] overflow-hidden">
                <table className="w-full text-xs text-left border-collapse">
                  <thead className="bg-[#FBFBFC] text-[#86868B] font-semibold border-b border-[#E5E5EA]">
                    <tr>
                      <th className="py-2.5 px-3">Company / Client</th>
                      <th className="py-2.5 px-3 w-28">KM / Trips</th>
                      <th className="py-2.5 px-3 w-28">Rate (₹)</th>
                      <th className="py-2.5 px-3 w-32">Total Billing (₹)</th>
                      <th className="py-2.5 px-3 w-14 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E5E5EA]">
                    {billingLines.map((line, idx) => (
                      <tr key={idx} className="hover:bg-[#F2F2F7]/50">
                        <td className="py-2 px-3">
                          <input
                            type="text"
                            value={line.companyName || ''}
                            onChange={(e) => updateBillingLine(idx, 'companyName', e.target.value)}
                            className="w-full px-2.5 py-1.5 bg-[#F2F2F7] border border-[#E5E5EA] rounded-lg text-xs text-[#1D1D1F] focus:bg-[#FFFFFF] focus:outline-hidden focus:ring-2 focus:ring-[#007AFF]"
                          />
                        </td>
                        <td className="py-2 px-3">
                          <input
                            type="number"
                            step="any"
                            value={line.kmOrTrips !== null ? line.kmOrTrips : ''}
                            onChange={(e) => updateBillingLine(idx, 'kmOrTrips', e.target.value)}
                            className="w-full px-2.5 py-1.5 bg-[#F2F2F7] border border-[#E5E5EA] rounded-lg text-xs text-[#1D1D1F] focus:bg-[#FFFFFF] focus:outline-hidden focus:ring-2 focus:ring-[#007AFF]"
                          />
                        </td>
                        <td className="py-2 px-3">
                          <input
                            type="number"
                            step="any"
                            value={line.applicableRate !== null ? line.applicableRate : ''}
                            onChange={(e) => updateBillingLine(idx, 'applicableRate', e.target.value)}
                            className="w-full px-2.5 py-1.5 bg-[#F2F2F7] border border-[#E5E5EA] rounded-lg text-xs text-[#1D1D1F] focus:bg-[#FFFFFF] focus:outline-hidden focus:ring-2 focus:ring-[#007AFF]"
                          />
                        </td>
                        <td className="py-2 px-3 font-semibold text-[#1D1D1F] tabular-nums">
                          ₹{(parseFloat(line.billingAmount) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="py-2 px-3 text-center">
                          <button
                            type="button"
                            onClick={() => setBillingLines(billingLines.filter((_, i) => i !== idx))}
                            className="p-1 rounded-full text-[#86868B] hover:text-[#FF3B30] hover:bg-[#FEECEB] transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 2: Deductions & Adjustments */}
          {activeTab === 'adjustments' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-xs text-[#86868B] font-medium">
                  Select Deduction or Addition. Enter amount in Rupees (changes calculate automatically).
                </p>
                <button
                  type="button"
                  onClick={handleAddAdjustment}
                  className="px-3.5 py-1 rounded-full text-xs font-medium bg-[#EBF5FF] text-[#007AFF] hover:bg-[#D9ECFF] flex items-center space-x-1 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Deduction / Adjustment</span>
                </button>
              </div>

              {/* Datalist for fast category selection */}
              <datalist id="category-presets">
                <option value="Less Fuel Adv." />
                <option value="Office charge" />
                <option value="GPS Rental" />
                <option value="Fastag Recharge" />
                <option value="Toll & Parking" />
                <option value="Penalty / Traffic Fine" />
                <option value="Advance Deduction" />
                <option value="Driver Salary Advance" />
                <option value="Performance Bonus" />
                <option value="Trip Incentive" />
              </datalist>

              <div className="border border-[#E5E5EA] rounded-[18px] overflow-hidden">
                <table className="w-full text-xs text-left border-collapse">
                  <thead className="bg-[#FBFBFC] text-[#86868B] font-semibold border-b border-[#E5E5EA]">
                    <tr>
                      <th className="py-2.5 px-3">Adjustment Category</th>
                      <th className="py-2.5 px-3 w-36">Type</th>
                      <th className="py-2.5 px-3 w-36">Amount (₹)</th>
                      <th className="py-2.5 px-3">Notes</th>
                      <th className="py-2.5 px-3 w-14 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E5E5EA]">
                    {adjustments.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-6 text-center text-[#86868B] text-xs">
                          No deductions or adjustments recorded for this vehicle.
                        </td>
                      </tr>
                    ) : (
                      adjustments.map((adj, idx) => (
                        <tr key={idx} className="hover:bg-[#F2F2F7]/50">
                          <td className="py-2 px-3">
                            <input
                              type="text"
                              list="category-presets"
                              value={adj.category || ''}
                              onChange={(e) => updateAdjustment(idx, 'category', e.target.value)}
                              placeholder="e.g. Less Fuel Adv., Office charge"
                              className="w-full px-2.5 py-1.5 bg-[#F2F2F7] border border-[#E5E5EA] rounded-lg text-xs text-[#1D1D1F] focus:bg-[#FFFFFF] focus:outline-hidden focus:ring-2 focus:ring-[#007AFF]"
                            />
                          </td>
                          <td className="py-2 px-3">
                            <select
                              value={adj.adjustmentType || 'DEDUCTION'}
                              onChange={(e) => updateAdjustment(idx, 'adjustmentType', e.target.value)}
                              className={`w-full px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-colors cursor-pointer ${
                                adj.adjustmentType === 'ADDITION'
                                  ? 'bg-[#EAF9EE] text-[#34C759] border-[#D2F4DA]'
                                  : 'bg-[#FEECEB] text-[#FF3B30] border-[#FCD3D1]'
                              }`}
                            >
                              <option value="DEDUCTION">Deduction (-)</option>
                              <option value="ADDITION">Addition (+)</option>
                            </select>
                          </td>
                          <td className="py-2 px-3">
                            <div className="relative">
                              <span className="absolute left-2.5 top-1.5 text-xs text-[#86868B] font-medium">₹</span>
                              <input
                                type="number"
                                step="any"
                                min="0"
                                value={adj.amount !== null && adj.amount !== undefined ? adj.amount : ''}
                                onChange={(e) => updateAdjustment(idx, 'amount', e.target.value)}
                                placeholder="0.00"
                                className={`w-full pl-6 pr-2.5 py-1.5 bg-[#F2F2F7] border border-[#E5E5EA] rounded-lg text-xs font-semibold focus:bg-[#FFFFFF] focus:outline-hidden focus:ring-2 focus:ring-[#007AFF] tabular-nums ${
                                  adj.adjustmentType === 'ADDITION' ? 'text-[#34C759]' : 'text-[#FF3B30]'
                                }`}
                              />
                            </div>
                          </td>
                          <td className="py-2 px-3">
                            <input
                              type="text"
                              value={adj.notes || ''}
                              onChange={(e) => updateAdjustment(idx, 'notes', e.target.value)}
                              placeholder="Optional remark or slip number"
                              className="w-full px-2.5 py-1.5 bg-[#F2F2F7] border border-[#E5E5EA] rounded-lg text-xs text-[#1D1D1F] focus:bg-[#FFFFFF] focus:outline-hidden focus:ring-2 focus:ring-[#007AFF]"
                            />
                          </td>
                          <td className="py-2 px-3 text-center">
                            <button
                              type="button"
                              onClick={() => setAdjustments(adjustments.filter((_, i) => i !== idx))}
                              title="Delete adjustment"
                              className="p-1 rounded-full text-[#86868B] hover:text-[#FF3B30] hover:bg-[#FEECEB] transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 3: Payment & Settlement */}
          {activeTab === 'payment' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-[#1D1D1F] mb-1.5">
                    Settlement Status
                  </label>
                  <select
                    value={paymentStatus}
                    onChange={(e) => setPaymentStatus(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-[#F2F2F7] border border-[#E5E5EA] rounded-xl text-xs font-medium text-[#1D1D1F] focus:bg-[#FFFFFF] focus:outline-hidden focus:ring-2 focus:ring-[#007AFF] cursor-pointer"
                  >
                    <option value="Paid">Paid (Settled)</option>
                    <option value="Partially Paid">Partially Paid</option>
                    <option value="HOLD">HOLD (On Hold)</option>
                    <option value="WF">WF (Wait Followup)</option>
                    <option value="No Account">No Account</option>
                    <option value="Draft">Draft</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#1D1D1F] mb-1.5">
                    Payment Date
                  </label>
                  <input
                    type="text"
                    value={paymentDate}
                    onChange={(e) => setPaymentDate(e.target.value)}
                    placeholder="e.g. 02-10-2025"
                    className="w-full px-3.5 py-2.5 bg-[#F2F2F7] border border-[#E5E5EA] rounded-xl text-xs text-[#1D1D1F] focus:bg-[#FFFFFF] focus:outline-hidden focus:ring-2 focus:ring-[#007AFF]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-[#1D1D1F] mb-1.5">
                    Bank Information
                  </label>
                  <input
                    type="text"
                    value={bankDetails}
                    onChange={(e) => setBankDetails(e.target.value)}
                    placeholder="e.g. OTHER Bank, HDFC, SBI"
                    className="w-full px-3.5 py-2.5 bg-[#F2F2F7] border border-[#E5E5EA] rounded-xl text-xs text-[#1D1D1F] focus:bg-[#FFFFFF] focus:outline-hidden focus:ring-2 focus:ring-[#007AFF]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#1D1D1F] mb-1.5">
                    Payment Remarks
                  </label>
                  <input
                    type="text"
                    value={remarks}
                    onChange={(e) => setRemarks(e.target.value)}
                    placeholder="e.g. RAVi, GS penalty adjustment"
                    className="w-full px-3.5 py-2.5 bg-[#F2F2F7] border border-[#E5E5EA] rounded-xl text-xs text-[#1D1D1F] focus:bg-[#FFFFFF] focus:outline-hidden focus:ring-2 focus:ring-[#007AFF]"
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: Version History & Revert */}
          {activeTab === 'versions' && (
            <div className="space-y-3">
              <p className="text-xs text-[#86868B] font-medium">
                Every financial modification is versioned. You can revert to any prior state.
              </p>

              <div className="border border-[#E5E5EA] rounded-[18px] divide-y divide-[#E5E5EA]">
                {record?.versions?.map((ver: any) => (
                  <div key={ver.id} className="p-3.5 flex items-center justify-between hover:bg-[#F2F2F7]/50">
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="px-2.5 py-0.5 rounded-full bg-[#EBF5FF] text-[#007AFF] text-[10px] font-bold">
                          v{ver.versionNumber}
                        </span>
                        <span className="text-xs font-semibold text-[#1D1D1F]">{ver.changeReason || 'Snapshot'}</span>
                      </div>
                      <p className="text-[11px] text-[#86868B] mt-0.5">
                        {new Date(ver.createdAt).toLocaleString()} · {ver.createdBy?.name || 'Admin'}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleRevert(ver.versionNumber)}
                      className="px-3.5 py-1.5 rounded-full bg-[#F2F2F7] hover:bg-[#E5E5EA] text-[#1D1D1F] border border-[#E5E5EA] text-xs font-medium flex items-center space-x-1 transition-colors"
                    >
                      <RotateCcw className="w-3.5 h-3.5 text-[#86868B]" />
                      <span>Revert</span>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Mandatory Reason Input */}
          {activeTab !== 'versions' && (
            <div className="pt-3 border-t border-[#E5E5EA]">
              <label className="block text-xs font-medium text-[#1D1D1F] mb-1.5">
                Reason for Financial Change <span className="text-[#FF3B30]">*</span>
              </label>
              <input
                type="text"
                required
                value={changeReason}
                onChange={(e) => setChangeReason(e.target.value)}
                placeholder="Audit Requirement: e.g. Updated KM for trip, corrected fuel advance deduction"
                className="w-full px-3.5 py-2.5 bg-[#F2F2F7] border border-[#E5E5EA] rounded-xl text-xs text-[#1D1D1F] focus:bg-[#FFFFFF] focus:outline-hidden focus:ring-2 focus:ring-[#007AFF]"
              />
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 bg-[#FBFBFC] border-t border-[#E5E5EA] flex items-center justify-end space-x-2.5 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-full text-xs font-medium text-[#1D1D1F] bg-[#FFFFFF] hover:bg-[#F2F2F7] border border-[#E5E5EA] transition-colors"
          >
            Close
          </button>
          {activeTab !== 'versions' && (
            <button
              type="button"
              disabled={saving}
              onClick={handleSave}
              className="px-5 py-2 rounded-full text-xs font-medium bg-[#007AFF] hover:bg-[#0062CC] text-white transition-all shadow-apple-btn flex items-center space-x-1.5"
            >
              {saving ? (
                <span>Recalculating...</span>
              ) : (
                <>
                  <Save className="w-3.5 h-3.5" />
                  <span>Save Changes</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
