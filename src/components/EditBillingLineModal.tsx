'use client';

import React, { useState, useEffect } from 'react';
import { X, Save, AlertCircle, Building2, Calculator, Calendar, Truck, Hash } from 'lucide-react';

interface EditBillingLineModalProps {
  isOpen: boolean;
  line: any | null;
  periods: Array<{ id: string; periodName: string; monthCode: string }>;
  companies: string[];
  onClose: () => void;
  onSuccess: () => void;
}

export default function EditBillingLineModal({
  isOpen,
  line,
  periods,
  companies,
  onClose,
  onSuccess,
}: EditBillingLineModalProps) {
  const [companyName, setCompanyName] = useState('');
  const [kmOrTrips, setKmOrTrips] = useState<string>('');
  const [applicableRate, setApplicableRate] = useState<string>('');
  const [billingAmount, setBillingAmount] = useState<string>('');
  const [amountFormula, setAmountFormula] = useState('');
  const [sectionIndex, setSectionIndex] = useState<string>('');
  const [registrationNumber, setRegistrationNumber] = useState('');
  const [periodId, setPeriodId] = useState('');

  const [isManualAmount, setIsManualAmount] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (line) {
      setCompanyName(line.companyName || '');
      setKmOrTrips(line.kmOrTrips !== null && line.kmOrTrips !== undefined ? String(line.kmOrTrips) : '');
      setApplicableRate(line.applicableRate !== null && line.applicableRate !== undefined ? String(line.applicableRate) : '');
      setBillingAmount(line.billingAmount !== null && line.billingAmount !== undefined ? String(line.billingAmount) : '0');
      setAmountFormula(line.amountFormula || '');
      setSectionIndex(line.record?.sectionIndex ? String(line.record.sectionIndex) : '1');
      setRegistrationNumber(line.record?.vehicle?.registrationNumber || '');
      setPeriodId(line.record?.periodId || '');
      setIsManualAmount(false);
      setError(null);
    }
  }, [line]);

  // Automatically recalculate billing amount when KM/Trips or Rate change (unless manual override is toggled)
  const handleKmChange = (val: string) => {
    setKmOrTrips(val);
    if (!isManualAmount) {
      const km = parseFloat(val);
      const rate = parseFloat(applicableRate);
      if (!isNaN(km) && !isNaN(rate)) {
        setBillingAmount(String(Math.round(km * rate * 100) / 100));
        setAmountFormula(`${km} × ₹${rate}`);
      }
    }
  };

  const handleRateChange = (val: string) => {
    setApplicableRate(val);
    if (!isManualAmount) {
      const km = parseFloat(kmOrTrips);
      const rate = parseFloat(val);
      if (!isNaN(km) && !isNaN(rate)) {
        setBillingAmount(String(Math.round(km * rate * 100) / 100));
        setAmountFormula(`${km} × ₹${rate}`);
      }
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!line) return;

    if (!companyName.trim()) {
      setError('Client company name is required.');
      return;
    }
    if (!registrationNumber.trim()) {
      setError('Vehicle registration number is required.');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const res = await fetch('/api/billing', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: line.id,
          companyName: companyName.trim(),
          kmOrTrips: kmOrTrips !== '' ? parseFloat(kmOrTrips) : null,
          applicableRate: applicableRate !== '' ? parseFloat(applicableRate) : null,
          billingAmount: parseFloat(billingAmount) || 0,
          amountFormula: amountFormula.trim() || null,
          sectionIndex: parseInt(sectionIndex) || 1,
          registrationNumber: registrationNumber.trim().toUpperCase(),
          periodId: periodId || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to update billing line');
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'An error occurred while saving.');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen || !line) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-150">
      <div
        className="bg-[#FFFFFF] border border-[#E5E5EA] rounded-[24px] w-full max-w-xl shadow-apple-card overflow-hidden flex flex-col max-h-[90vh]"
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#E5E5EA] flex items-center justify-between shrink-0 bg-[#FBFBFC]">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-full bg-[#007AFF]/10 text-[#007AFF] flex items-center justify-center">
              <Calculator className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm sm:text-base text-[#1D1D1F]">
                Edit Billing Transaction
              </h3>
              <p className="text-[11px] text-[#86868B]">
                Manually adjust company, trips, rate, car assignment, or calculation amount.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full text-[#86868B] hover:text-[#1D1D1F] hover:bg-[#E5E5EA] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSave} className="p-6 space-y-4 overflow-y-auto custom-scrollbar flex-1">
          {error && (
            <div className="p-3 rounded-xl bg-[#FEECEB] border border-[#FCD3D1] text-[#FF3B30] text-xs flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Row 1: Period & Section Number */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-[#1D1D1F] mb-1.5 flex items-center space-x-1">
                <Calendar className="w-3.5 h-3.5 text-[#007AFF]" />
                <span>Financial Period</span>
              </label>
              <select
                value={periodId}
                onChange={(e) => setPeriodId(e.target.value)}
                className="w-full px-3 py-2 bg-[#F2F2F7] border border-[#E5E5EA] rounded-xl text-xs font-semibold text-[#1D1D1F] focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-[#007AFF] cursor-pointer"
              >
                {periods.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.periodName} ({p.monthCode})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#1D1D1F] mb-1.5 flex items-center space-x-1">
                <Hash className="w-3.5 h-3.5 text-[#86868B]" />
                <span>Section Number (Sec #)</span>
              </label>
              <input
                type="number"
                min="1"
                max="999"
                value={sectionIndex}
                onChange={(e) => setSectionIndex(e.target.value)}
                className="w-full px-3 py-2 bg-[#F2F2F7] border border-[#E5E5EA] rounded-xl text-xs font-mono font-semibold text-[#1D1D1F] focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-[#007AFF]"
                placeholder="1"
              />
            </div>
          </div>

          {/* Row 2: Vehicle Registration & Client Company */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-[#1D1D1F] mb-1.5 flex items-center space-x-1">
                <Truck className="w-3.5 h-3.5 text-[#007AFF]" />
                <span>Vehicle Registration Number</span>
              </label>
              <input
                type="text"
                value={registrationNumber}
                onChange={(e) => setRegistrationNumber(e.target.value.toUpperCase())}
                className="w-full px-3 py-2 bg-[#F2F2F7] border border-[#E5E5EA] rounded-xl text-xs font-mono font-bold text-[#1D1D1F] focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-[#007AFF]"
                placeholder="KA03AP 6182"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#1D1D1F] mb-1.5 flex items-center space-x-1">
                <Building2 className="w-3.5 h-3.5 text-[#007AFF]" />
                <span>Client Company</span>
              </label>
              <input
                type="text"
                list="company-list"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                className="w-full px-3 py-2 bg-[#F2F2F7] border border-[#E5E5EA] rounded-xl text-xs font-semibold text-[#1D1D1F] focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-[#007AFF]"
                placeholder="e.g. Amazon, Oracle, Walmart"
                required
              />
              <datalist id="company-list">
                {companies.map((c) => (
                  <option key={c} value={c} />
                ))}
              </datalist>
            </div>
          </div>

          {/* Row 3: KM / Trips & Applicable Rate */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-[#1D1D1F] mb-1.5">
                KM / Trips Count
              </label>
              <input
                type="number"
                step="any"
                value={kmOrTrips}
                onChange={(e) => handleKmChange(e.target.value)}
                className="w-full px-3 py-2 bg-[#F2F2F7] border border-[#E5E5EA] rounded-xl text-xs font-mono font-semibold text-[#1D1D1F] focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-[#007AFF]"
                placeholder="e.g. 45"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#1D1D1F] mb-1.5">
                Applicable Rate (₹)
              </label>
              <input
                type="number"
                step="any"
                value={applicableRate}
                onChange={(e) => handleRateChange(e.target.value)}
                className="w-full px-3 py-2 bg-[#F2F2F7] border border-[#E5E5EA] rounded-xl text-xs font-mono font-semibold text-[#1D1D1F] focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-[#007AFF]"
                placeholder="e.g. 1200"
              />
            </div>
          </div>

          {/* Row 4: Calculated Billing Amount & Manual Override */}
          <div className="p-4 rounded-2xl bg-[#FBFBFC] border border-[#E5E5EA] space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-[#1D1D1F]">
                Calculated Billing Amount (₹)
              </label>
              <label className="flex items-center space-x-1.5 text-[11px] text-[#86868B] cursor-pointer">
                <input
                  type="checkbox"
                  checked={isManualAmount}
                  onChange={(e) => setIsManualAmount(e.target.checked)}
                  className="rounded text-[#007AFF] focus:ring-[#007AFF]"
                />
                <span>Manual Override</span>
              </label>
            </div>

            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold text-[#86868B]">₹</span>
              <input
                type="number"
                step="any"
                value={billingAmount}
                onChange={(e) => setBillingAmount(e.target.value)}
                disabled={!isManualAmount && !!kmOrTrips && !!applicableRate}
                className="w-full pl-7 pr-3 py-2.5 bg-[#FFFFFF] border border-[#E5E5EA] rounded-xl text-sm font-bold text-[#007AFF] focus:outline-hidden focus:ring-2 focus:ring-[#007AFF] disabled:bg-[#F2F2F7] disabled:text-[#1D1D1F]"
                placeholder="0.00"
                required
              />
            </div>

            {!isManualAmount && kmOrTrips && applicableRate && (
              <p className="text-[10px] text-[#34C759] font-medium">
                Auto-calculated: {kmOrTrips} × ₹{applicableRate} = ₹{billingAmount} (Check &quot;Manual Override&quot; to change directly)
              </p>
            )}
          </div>

          {/* Row 5: Formula / Source Remarks */}
          <div>
            <label className="block text-xs font-semibold text-[#1D1D1F] mb-1.5">
              Formula Expression / Calculation Notes
            </label>
            <input
              type="text"
              value={amountFormula}
              onChange={(e) => setAmountFormula(e.target.value)}
              className="w-full px-3 py-2 bg-[#F2F2F7] border border-[#E5E5EA] rounded-xl text-xs font-mono text-[#48484A] focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-[#007AFF]"
              placeholder="e.g. KM * Rate or Special Contract Tariff"
            />
          </div>

          {/* Actions */}
          <div className="pt-3 flex items-center justify-end space-x-3 border-t border-[#E5E5EA]">
            <button
              type="button"
              disabled={saving}
              onClick={onClose}
              className="px-4 py-2 rounded-full border border-[#E5E5EA] bg-[#F2F2F7] hover:bg-[#E5E5EA] text-[#1D1D1F] text-xs font-semibold transition-colors disabled:opacity-50 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2 rounded-full bg-[#007AFF] hover:bg-[#0062CC] text-white text-xs font-semibold shadow-apple-btn transition-colors disabled:opacity-50 flex items-center space-x-1.5 cursor-pointer"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{saving ? 'Saving...' : 'Save Changes'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

