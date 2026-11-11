'use client';

import React, { useState, useEffect } from 'react';
import { X, Save, AlertCircle, Building2, Calculator, Calendar, Truck, Hash, Plus } from 'lucide-react';

interface EditBillingLineModalProps {
  isOpen: boolean;
  mode?: 'create' | 'edit';
  line: any | null;
  periods: Array<{ id: string; periodName: string; monthCode: string }>;
  companies: string[];
  onClose: () => void;
  onSuccess: () => void;
}

export default function EditBillingLineModal({
  isOpen,
  mode = 'edit',
  line,
  periods,
  companies,
  onClose,
  onSuccess,
}: EditBillingLineModalProps) {
  const isCreate = mode === 'create' || !line;

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
    if (line && mode === 'edit') {
      setCompanyName(line.companyName || '');
      setKmOrTrips(line.kmOrTrips !== null && line.kmOrTrips !== undefined ? String(line.kmOrTrips) : '');
      setApplicableRate(line.applicableRate !== null && line.applicableRate !== undefined ? String(line.applicableRate) : '');
      setBillingAmount(line.billingAmount !== null && line.billingAmount !== undefined ? String(line.billingAmount) : '0');
      setAmountFormula(line.amountFormula || '');
      setSectionIndex(line.record?.sectionIndex ? String(line.record.sectionIndex) : '1');
      setRegistrationNumber(line.record?.vehicle?.registrationNumber || '');
      setPeriodId(line.record?.periodId || (periods[0]?.id || ''));
      setIsManualAmount(false);
      setError(null);
    } else if (isCreate) {
      setCompanyName(companies[0] || '');
      setKmOrTrips('');
      setApplicableRate('');
      setBillingAmount('');
      setAmountFormula('');
      setSectionIndex('');
      setRegistrationNumber('');
      setPeriodId(periods[0]?.id || '');
      setIsManualAmount(false);
      setError(null);
    }
  }, [line, mode, isCreate, periods, companies, isOpen]);

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

    if (!companyName.trim()) {
      setError('Client company name is required.');
      return;
    }
    if (!registrationNumber.trim()) {
      setError('Vehicle registration number is required.');
      return;
    }
    if (!periodId) {
      setError('Financial period is required.');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const endpoint = '/api/billing';
      const method = isCreate ? 'POST' : 'PATCH';
      const payload: any = {
        companyName: companyName.trim(),
        kmOrTrips: kmOrTrips !== '' ? parseFloat(kmOrTrips) : null,
        applicableRate: applicableRate !== '' ? parseFloat(applicableRate) : null,
        billingAmount: parseFloat(billingAmount) || 0,
        amountFormula: amountFormula.trim() || null,
        sectionIndex: sectionIndex ? parseInt(sectionIndex) : undefined,
        registrationNumber: registrationNumber.trim().toUpperCase(),
        periodId: periodId || undefined,
      };

      if (!isCreate && line) {
        payload.id = line.id;
      }

      const res = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to save billing line');
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'An error occurred while saving.');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
      <div className="bg-[#FFFFFF] w-full max-w-xl rounded-[28px] border border-[#E5E5EA] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-6 border-b border-[#E5E5EA] flex items-center justify-between bg-[#F9F9FB]">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-[#007AFF]/10 text-[#007AFF] flex items-center justify-center">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-[#1D1D1F]">
                {isCreate ? 'Add Billing Transaction Row' : 'Edit Billing Transaction'}
              </h3>
              <p className="text-xs text-[#86868B]">
                {isCreate
                  ? 'Record a new client billing line and trip calculation'
                  : 'Manually adjust vehicle registration, client, trips, or rate'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-[#86868B] hover:text-[#1D1D1F] hover:bg-[#E5E5EA] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSave} className="p-6 space-y-4">
          {error && (
            <div className="p-3.5 rounded-2xl bg-[#FF3B30]/10 border border-[#FF3B30]/30 flex items-start space-x-2 text-xs text-[#D70015]">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Row 1: Vehicle Registration & Financial Period */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-wider text-[#86868B] mb-1.5">
                Vehicle Registration <span className="text-[#FF3B30]">*</span>
              </label>
              <div className="relative">
                <Truck className="w-4 h-4 text-[#86868B] absolute left-3 top-2.5 pointer-events-none" />
                <input
                  type="text"
                  value={registrationNumber}
                  onChange={(e) => setRegistrationNumber(e.target.value.toUpperCase())}
                  required
                  placeholder="e.g. KA04AA1234"
                  className="w-full pl-9 pr-3.5 py-2 bg-[#F2F2F7] border border-[#E5E5EA] rounded-[14px] text-xs font-mono font-bold text-[#1D1D1F] uppercase focus:bg-[#FFFFFF] focus:outline-hidden focus:ring-2 focus:ring-[#007AFF] transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-wider text-[#86868B] mb-1.5">
                Financial Period <span className="text-[#FF3B30]">*</span>
              </label>
              <div className="relative">
                <Calendar className="w-4 h-4 text-[#86868B] absolute left-3 top-2.5 pointer-events-none" />
                <select
                  value={periodId}
                  onChange={(e) => setPeriodId(e.target.value)}
                  required
                  className="w-full pl-9 pr-3.5 py-2 bg-[#F2F2F7] border border-[#E5E5EA] rounded-[14px] text-xs font-semibold text-[#1D1D1F] focus:bg-[#FFFFFF] focus:outline-hidden focus:ring-2 focus:ring-[#007AFF] transition-all cursor-pointer"
                >
                  {periods.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.periodName} ({p.monthCode})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Row 2: Section Number & Client Company */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-wider text-[#86868B] mb-1.5">
                Section #
              </label>
              <div className="relative">
                <Hash className="w-4 h-4 text-[#86868B] absolute left-3 top-2.5 pointer-events-none" />
                <input
                  type="number"
                  min="1"
                  max="999"
                  value={sectionIndex}
                  onChange={(e) => setSectionIndex(e.target.value)}
                  placeholder="Auto"
                  className="w-full pl-9 pr-3.5 py-2 bg-[#F2F2F7] border border-[#E5E5EA] rounded-[14px] text-xs font-mono font-bold text-[#1D1D1F] focus:bg-[#FFFFFF] focus:outline-hidden focus:ring-2 focus:ring-[#007AFF] transition-all"
                />
              </div>
            </div>

            <div className="sm:col-span-2">
              <label className="block text-[11px] font-semibold uppercase tracking-wider text-[#86868B] mb-1.5">
                Client Company <span className="text-[#FF3B30]">*</span>
              </label>
              <input
                type="text"
                list="company-list"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                required
                placeholder="e.g. ECO Travels, EURO-Amz, ANP-HCL"
                className="w-full px-3.5 py-2 bg-[#F2F2F7] border border-[#E5E5EA] rounded-[14px] text-xs font-semibold text-[#1D1D1F] focus:bg-[#FFFFFF] focus:outline-hidden focus:ring-2 focus:ring-[#007AFF] transition-all"
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
              <label className="block text-[11px] font-semibold uppercase tracking-wider text-[#86868B] mb-1.5">
                KM / Trips
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={kmOrTrips}
                onChange={(e) => handleKmChange(e.target.value)}
                placeholder="e.g. 1500"
                className="w-full px-3.5 py-2 bg-[#F2F2F7] border border-[#E5E5EA] rounded-[14px] text-xs font-mono font-medium text-[#1D1D1F] focus:bg-[#FFFFFF] focus:outline-hidden focus:ring-2 focus:ring-[#007AFF] transition-all"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-wider text-[#86868B] mb-1.5">
                Applicable Rate (₹)
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2 font-bold text-xs text-[#86868B]">₹</span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={applicableRate}
                  onChange={(e) => handleRateChange(e.target.value)}
                  placeholder="e.g. 18.50"
                  className="w-full pl-7 pr-3.5 py-2 bg-[#F2F2F7] border border-[#E5E5EA] rounded-[14px] text-xs font-mono font-medium text-[#1D1D1F] focus:bg-[#FFFFFF] focus:outline-hidden focus:ring-2 focus:ring-[#007AFF] transition-all"
                />
              </div>
            </div>
          </div>

          {/* Row 4: Calculated Billing Total (Auto vs Manual) */}
          <div className="p-4 rounded-2xl bg-[#F2F2F7]/80 border border-[#E5E5EA] space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-semibold uppercase tracking-wider text-[#1D1D1F] flex items-center space-x-1.5">
                <Calculator className="w-3.5 h-3.5 text-[#007AFF]" />
                <span>Calculated Billing Total (₹)</span>
              </label>
              <button
                type="button"
                onClick={() => setIsManualAmount(!isManualAmount)}
                className="text-[11px] font-semibold text-[#007AFF] hover:underline cursor-pointer"
              >
                {isManualAmount ? '✓ Switch to Auto-Calc (KM × Rate)' : 'Manual Override'}
              </button>
            </div>

            <div className="relative">
              <span className="absolute left-3.5 top-2.5 font-bold text-sm text-[#1D1D1F]">₹</span>
              <input
                type="number"
                step="0.01"
                min="0"
                value={billingAmount}
                onChange={(e) => {
                  setBillingAmount(e.target.value);
                  setIsManualAmount(true);
                }}
                required
                className={`w-full pl-8 pr-4 py-2 bg-[#FFFFFF] border rounded-[14px] text-sm font-bold tabular-nums focus:outline-hidden focus:ring-2 transition-all ${
                  isManualAmount
                    ? 'border-[#FF9F0A] text-[#FF9F0A] focus:ring-[#FF9F0A]'
                    : 'border-[#E5E5EA] text-[#007AFF] focus:ring-[#007AFF]'
                }`}
              />
            </div>
            {isManualAmount && (
              <p className="text-[10px] text-[#FF9F0A]">
                * Manual override active. This custom amount will be recorded directly.
              </p>
            )}
          </div>

          {/* Row 5: Notes / Formula Expression */}
          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-wider text-[#86868B] mb-1.5">
              Formula Expression / Source Note
            </label>
            <input
              type="text"
              value={amountFormula}
              onChange={(e) => setAmountFormula(e.target.value)}
              placeholder="e.g. 1500 × ₹18.50, fixed monthly package"
              className="w-full px-3.5 py-2 bg-[#F2F2F7] border border-[#E5E5EA] rounded-[14px] text-xs font-mono text-[#1D1D1F] focus:bg-[#FFFFFF] focus:outline-hidden focus:ring-2 focus:ring-[#007AFF] transition-all"
            />
          </div>

          {/* Footer Buttons */}
          <div className="pt-2 border-t border-[#E5E5EA] flex items-center justify-end space-x-2.5">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="px-4 py-2 rounded-full border border-[#E5E5EA] bg-white text-xs font-semibold text-[#1D1D1F] hover:bg-[#F2F2F7] transition-colors disabled:opacity-50 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2 rounded-full bg-[#007AFF] hover:bg-[#0062CC] text-white text-xs font-semibold flex items-center space-x-1.5 shadow-sm transition-all disabled:opacity-50 cursor-pointer"
            >
              {saving ? (
                <span>Saving & Recalculating...</span>
              ) : (
                <>
                  {isCreate ? <Plus className="w-3.5 h-3.5" /> : <Save className="w-3.5 h-3.5" />}
                  <span>{isCreate ? 'Add Billing Row' : 'Save Changes'}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
