'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  Save,
  AlertCircle,
  Scissors,
  Calendar,
  Truck,
  User,
  Sparkles,
  Wallet,
  AlertTriangle,
  Fuel,
  Radio,
  FileText,
  Building,
  Award,
  CheckCircle,
  HelpCircle
} from 'lucide-react';

interface AdjustmentModalProps {
  isOpen: boolean;
  mode?: 'create' | 'edit';
  adjustmentToEdit?: any | null;
  periods: Array<{ id: string; periodName: string; monthCode: string; financialYear: string }>;
  vehicles: Array<{
    id: string;
    registrationNumber: string;
    vehicleType?: string;
    ownerName?: string;
    assignments?: Array<{ driver?: { id: string; name: string; phone?: string } }>;
  }>;
  preselectedPeriodId?: string;
  preselectedVehicleId?: string;
  preselectedRecordId?: string;
  onClose: () => void;
  onSuccess: () => void;
}

export default function AdjustmentModal({
  isOpen,
  mode = 'create',
  adjustmentToEdit = null,
  periods,
  vehicles,
  preselectedPeriodId,
  preselectedVehicleId,
  preselectedRecordId,
  onClose,
  onSuccess,
}: AdjustmentModalProps) {
  const isEdit = mode === 'edit' && !!adjustmentToEdit;

  const [periodId, setPeriodId] = useState('');
  const [vehicleId, setVehicleId] = useState('');
  const [category, setCategory] = useState('Early Salary Advance');
  const [adjustmentType, setAdjustmentType] = useState<'DEDUCTION' | 'ADDITION'>('DEDUCTION');
  const [amount, setAmount] = useState('');
  const [notes, setNotes] = useState('');
  const [formulaString, setFormulaString] = useState('');

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Popular preset templates requested by user:
  // e.g. Early salary advance taken by driver, driver penalties, fuel, etc.
  const presets = [
    {
      label: 'Early Salary Advance',
      category: 'Early Salary Advance',
      type: 'DEDUCTION' as const,
      icon: Wallet,
      desc: 'Early salary taken by driver, adjusted from monthly salary',
      color: 'bg-[#FF9F0A]/10 text-[#FF9F0A] border-[#FF9F0A]/30',
    },
    {
      label: 'Driver Penalty / Fine',
      category: 'Driver Penalty / Fine',
      type: 'DEDUCTION' as const,
      icon: AlertTriangle,
      desc: 'Penalties for client violations, late reporting, damage',
      color: 'bg-[#FF3B30]/10 text-[#FF3B30] border-[#FF3B30]/30',
    },
    {
      label: 'Fuel Advance',
      category: 'Fuel Advance',
      type: 'DEDUCTION' as const,
      icon: Fuel,
      desc: 'Cash / card advance given to driver for operational diesel',
      color: 'bg-[#FF9500]/10 text-[#FF9500] border-[#FF9500]/30',
    },
    {
      label: 'GPS Tracking Fee',
      category: 'GPS Charges',
      type: 'DEDUCTION' as const,
      icon: Radio,
      desc: 'Monthly telematics & tracking device fee',
      color: 'bg-[#5856D6]/10 text-[#5856D6] border-[#5856D6]/30',
    },
    {
      label: '3% Handling Fee',
      category: '3% Handling',
      type: 'DEDUCTION' as const,
      icon: Building,
      desc: 'Standard Atharva fleet administrative charge',
      color: 'bg-[#007AFF]/10 text-[#007AFF] border-[#007AFF]/30',
    },
    {
      label: 'TDS 1% Deduction',
      category: 'TDS 1%',
      type: 'DEDUCTION' as const,
      icon: FileText,
      desc: '1% Tax Deducted at Source on vendor payout',
      color: 'bg-[#8E8E93]/10 text-[#8E8E93] border-[#8E8E93]/30',
    },
    {
      label: 'Driver Bonus / Incentive',
      category: 'Driver Performance Bonus',
      type: 'ADDITION' as const,
      icon: Award,
      desc: 'Extra addition for overtime, exceptional client rating',
      color: 'bg-[#34C759]/10 text-[#34C759] border-[#34C759]/30',
    },
  ];

  useEffect(() => {
    if (isEdit && adjustmentToEdit) {
      setPeriodId(adjustmentToEdit.record?.periodId || '');
      setVehicleId(adjustmentToEdit.record?.vehicleId || '');
      setCategory(adjustmentToEdit.category || '');
      setAdjustmentType(
        adjustmentToEdit.adjustmentType ||
          (adjustmentToEdit.amount < 0 ? 'DEDUCTION' : 'ADDITION')
      );
      setAmount(String(Math.abs(adjustmentToEdit.amount || 0)));
      setNotes(adjustmentToEdit.notes || '');
      setFormulaString(adjustmentToEdit.formulaString || '');
      setError(null);
    } else {
      // Create mode
      setPeriodId(preselectedPeriodId || (periods[0]?.id || ''));
      setVehicleId(preselectedVehicleId || (vehicles[0]?.id || ''));
      setCategory('Early Salary Advance');
      setAdjustmentType('DEDUCTION');
      setAmount('');
      setNotes('Early salary advance taken by driver, to be adjusted from monthly salary');
      setFormulaString('');
      setError(null);
    }
  }, [isOpen, isEdit, adjustmentToEdit, preselectedPeriodId, preselectedVehicleId, periods, vehicles]);

  if (!isOpen) return null;

  const handleApplyPreset = (p: typeof presets[0]) => {
    setCategory(p.category);
    setAdjustmentType(p.type);
    if (!notes || notes === 'Early salary advance taken by driver, to be adjusted from monthly salary') {
      setNotes(p.desc);
    }
  };

  const selectedVehicle = vehicles.find((v) => v.id === vehicleId);
  const assignedDriver = selectedVehicle?.assignments?.[0]?.driver;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!category.trim()) {
      setError('Please provide or select an adjustment category.');
      return;
    }

    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      setError('Please enter a valid amount greater than zero.');
      return;
    }

    if (!isEdit && !preselectedRecordId && (!periodId || !vehicleId)) {
      setError('Please select both a financial period and a vehicle.');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      if (isEdit) {
        // Edit existing
        const res = await fetch('/api/adjustments', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: adjustmentToEdit.id,
            category: category.trim(),
            adjustmentType,
            amount: numAmount,
            notes: notes.trim(),
            formulaString: formulaString.trim() || null,
          }),
        });
        const data = await res.json();
        if (!res.ok || !data.success) {
          throw new Error(data.error || 'Failed to update adjustment');
        }
      } else {
        // Create new
        const payload: any = {
          category: category.trim(),
          adjustmentType,
          amount: numAmount,
          notes: notes.trim(),
          formulaString: formulaString.trim() || null,
        };

        if (preselectedRecordId) {
          payload.recordId = preselectedRecordId;
        } else {
          payload.periodId = periodId;
          payload.vehicleId = vehicleId;
        }

        const res = await fetch('/api/adjustments', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (!res.ok || !data.success) {
          throw new Error(data.error || 'Failed to record adjustment');
        }
      }

      onSuccess();
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'An error occurred while saving.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
      <div className="bg-[#FFFFFF] w-full max-w-2xl rounded-[32px] border border-[#E5E5EA] shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-6 border-b border-[#E5E5EA] flex items-center justify-between shrink-0 bg-[#F9F9FB]">
          <div className="flex items-center space-x-3">
            <div
              className={`w-10 h-10 rounded-2xl flex items-center justify-center ${
                adjustmentType === 'DEDUCTION'
                  ? 'bg-[#FF3B30]/10 text-[#FF3B30]'
                  : 'bg-[#34C759]/10 text-[#34C759]'
              }`}
            >
              <Scissors className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-[#1D1D1F]">
                {isEdit ? 'Edit Adjustment / Deduction' : 'Add Adjustment or Deduction'}
              </h3>
              <p className="text-xs text-[#86868B]">
                Record early salary advances, driver penalties, fuel advances or deductions
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
        <form onSubmit={handleSubmit} className="overflow-y-auto p-6 space-y-5">
          {error && (
            <div className="p-4 rounded-2xl bg-[#FF3B30]/10 border border-[#FF3B30]/30 flex items-start space-x-2 text-xs text-[#D70015]">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Quick-Select Presets Chips (e.g. Early Salary Advance, Driver Penalties) */}
          {!isEdit && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-[#86868B] flex items-center space-x-1">
                  <Sparkles className="w-3 h-3 text-[#007AFF]" />
                  <span>Common Adjustment Presets (Click to Auto-fill)</span>
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                {presets.map((p) => {
                  const Icon = p.icon;
                  const isSelected = category === p.category && adjustmentType === p.type;
                  return (
                    <button
                      key={p.label}
                      type="button"
                      onClick={() => handleApplyPreset(p)}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium border flex items-center space-x-1.5 transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-[#007AFF] text-white border-[#007AFF] shadow-sm'
                          : `${p.color} hover:bg-white hover:border-[#1D1D1F]/20`
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      <span>{p.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Target Period & Target Vehicle Selection */}
          {!isEdit && !preselectedRecordId && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-[#86868B] mb-1.5">
                  Financial Period
                </label>
                <div className="relative">
                  <Calendar className="w-4 h-4 text-[#86868B] absolute left-3 top-3 pointer-events-none" />
                  <select
                    value={periodId}
                    onChange={(e) => setPeriodId(e.target.value)}
                    required
                    className="w-full pl-9 pr-4 py-2.5 bg-[#F2F2F7] border border-[#E5E5EA] rounded-[16px] text-xs font-semibold text-[#1D1D1F] focus:bg-[#FFFFFF] focus:outline-hidden focus:ring-2 focus:ring-[#007AFF] transition-all cursor-pointer"
                  >
                    {periods.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.periodName} ({p.monthCode})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-[#86868B] mb-1.5">
                  Target Vehicle / Driver
                </label>
                <div className="relative">
                  <Truck className="w-4 h-4 text-[#86868B] absolute left-3 top-3 pointer-events-none" />
                  <select
                    value={vehicleId}
                    onChange={(e) => setVehicleId(e.target.value)}
                    required
                    className="w-full pl-9 pr-4 py-2.5 bg-[#F2F2F7] border border-[#E5E5EA] rounded-[16px] text-xs font-bold font-mono text-[#1D1D1F] focus:bg-[#FFFFFF] focus:outline-hidden focus:ring-2 focus:ring-[#007AFF] transition-all cursor-pointer"
                  >
                    {vehicles.map((v) => {
                      const driverName = v.assignments?.[0]?.driver?.name;
                      return (
                        <option key={v.id} value={v.id}>
                          {v.registrationNumber} {driverName ? `• Driver: ${driverName}` : ''}
                        </option>
                      );
                    })}
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* Info Card when target vehicle is chosen */}
          {selectedVehicle && (
            <div className="p-3.5 rounded-2xl bg-[#F2F2F7] border border-[#E5E5EA] flex items-center justify-between text-xs">
              <div className="flex items-center space-x-2.5">
                <div className="w-7 h-7 rounded-full bg-[#007AFF]/10 text-[#007AFF] flex items-center justify-center font-bold text-xs">
                  <User className="w-3.5 h-3.5" />
                </div>
                <div>
                  <span className="font-bold text-[#1D1D1F]">
                    {selectedVehicle.registrationNumber}
                  </span>
                  <span className="text-[#86868B] ml-2">
                    Driver: <strong className="text-[#1D1D1F]">{assignedDriver?.name || 'Unassigned'}</strong>
                    {assignedDriver?.phone && ` (${assignedDriver.phone})`}
                  </span>
                </div>
              </div>
              <span className="text-[11px] text-[#86868B] font-mono">
                {selectedVehicle.vehicleType}
              </span>
            </div>
          )}

          {/* Type Toggle: Deduction vs Addition */}
          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-wider text-[#86868B] mb-1.5">
              Adjustment Type
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setAdjustmentType('DEDUCTION')}
                className={`py-2.5 px-4 rounded-[16px] border text-xs font-bold flex items-center justify-center space-x-2 transition-all cursor-pointer ${
                  adjustmentType === 'DEDUCTION'
                    ? 'bg-[#FF3B30] text-white border-[#FF3B30] shadow-sm'
                    : 'bg-[#F2F2F7] text-[#1D1D1F] border-[#E5E5EA] hover:bg-[#E5E5EA]'
                }`}
              >
                <span>Deduction (-)</span>
                <span className="text-[10px] opacity-80 font-normal">
                  (Deducted from driver salary)
                </span>
              </button>

              <button
                type="button"
                onClick={() => setAdjustmentType('ADDITION')}
                className={`py-2.5 px-4 rounded-[16px] border text-xs font-bold flex items-center justify-center space-x-2 transition-all cursor-pointer ${
                  adjustmentType === 'ADDITION'
                    ? 'bg-[#34C759] text-white border-[#34C759] shadow-sm'
                    : 'bg-[#F2F2F7] text-[#1D1D1F] border-[#E5E5EA] hover:bg-[#E5E5EA]'
                }`}
              >
                <span>Addition (+)</span>
                <span className="text-[10px] opacity-80 font-normal">
                  (Added to driver salary)
                </span>
              </button>
            </div>
          </div>

          {/* Category & Amount */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-wider text-[#86868B] mb-1.5">
                Category Name <span className="text-[#FF3B30]">*</span>
              </label>
              <input
                type="text"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                required
                placeholder="e.g. Early Salary Advance, Driver Penalty, Fuel Advance"
                className="w-full px-3.5 py-2.5 bg-[#F2F2F7] border border-[#E5E5EA] rounded-[16px] text-xs font-semibold text-[#1D1D1F] focus:bg-[#FFFFFF] focus:outline-hidden focus:ring-2 focus:ring-[#007AFF] transition-all"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-wider text-[#86868B] mb-1.5">
                Adjustment Amount (₹) <span className="text-[#FF3B30]">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-2.5 font-bold text-xs text-[#86868B]">₹</span>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  required
                  placeholder="0.00"
                  className={`w-full pl-8 pr-4 py-2.5 bg-[#F2F2F7] border border-[#E5E5EA] rounded-[16px] text-xs font-bold tabular-nums focus:bg-[#FFFFFF] focus:outline-hidden focus:ring-2 transition-all ${
                    adjustmentType === 'DEDUCTION'
                      ? 'text-[#FF3B30] focus:ring-[#FF3B30]'
                      : 'text-[#34C759] focus:ring-[#34C759]'
                  }`}
                />
              </div>
            </div>
          </div>

          {/* Notes & Reason for Driver & Accountant explanation */}
          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-wider text-[#86868B] mb-1.5 flex items-center justify-between">
              <span>Reason / Explanation (Shown in Accountant & Driver Breakdown)</span>
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Driver requested advance on 5th Oct for family medical urgency, to be adjusted in monthly salary."
              className="w-full px-3.5 py-2.5 bg-[#F2F2F7] border border-[#E5E5EA] rounded-[16px] text-xs text-[#1D1D1F] focus:bg-[#FFFFFF] focus:outline-hidden focus:ring-2 focus:ring-[#007AFF] transition-all"
            />
          </div>

          {/* Impact preview pill */}
          <div className="p-3.5 rounded-2xl bg-[#007AFF]/5 border border-[#007AFF]/20 text-xs flex items-center justify-between">
            <div className="flex items-center space-x-2 text-[#007AFF]">
              <HelpCircle className="w-4 h-4 shrink-0" />
              <span className="font-medium text-[11px]">
                {adjustmentType === 'DEDUCTION'
                  ? 'This deduction will subtract ₹' + (parseFloat(amount) || 0).toLocaleString('en-IN') + ' from net monthly payout.'
                  : 'This addition will add ₹' + (parseFloat(amount) || 0).toLocaleString('en-IN') + ' to net monthly payout.'}
              </span>
            </div>
            <span className="text-[10px] font-semibold text-[#86868B]">
              Auto-recalculated
            </span>
          </div>

          {/* Footer action buttons */}
          <div className="pt-2 border-t border-[#E5E5EA] flex items-center justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="px-4 py-2.5 rounded-full border border-[#E5E5EA] bg-[#FFFFFF] hover:bg-[#E5E5EA] text-[#1D1D1F] text-xs font-semibold transition-colors disabled:opacity-50 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2.5 rounded-full bg-[#007AFF] hover:bg-[#0062CC] text-white text-xs font-semibold flex items-center space-x-1.5 shadow-sm transition-all disabled:opacity-50 cursor-pointer"
            >
              {saving ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Saving & Recalculating...</span>
                </>
              ) : (
                <>
                  <Save className="w-3.5 h-3.5" />
                  <span>{isEdit ? 'Save Changes' : 'Record Adjustment'}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
