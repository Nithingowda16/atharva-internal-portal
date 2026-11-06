'use client';

import React, { useState } from 'react';
import { Plus, Calendar, AlertCircle, X, Sparkles, Copy, Check } from 'lucide-react';

interface CreateMonthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onMonthCreated: () => void;
  existingPeriods: Array<{ id: string; periodName: string; monthCode: string }>;
}

export default function CreateMonthModal({
  isOpen,
  onClose,
  onMonthCreated,
  existingPeriods,
}: CreateMonthModalProps) {
  const [creationMode, setCreationMode] = useState<'BLANK' | 'TEMPLATE'>('BLANK');
  const [monthCode, setMonthCode] = useState('2026-10');
  const [periodName, setPeriodName] = useState('October 2026');
  const [financialYear, setFinancialYear] = useState('2026-27');
  const [templatePeriodId, setTemplatePeriodId] = useState(
    existingPeriods.length > 0 ? existingPeriods[0].id : ''
  );
  const [copyRecurring, setCopyRecurring] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/months', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        cache: 'no-store',
        body: JSON.stringify({
          monthCode: monthCode.trim(),
          periodName: periodName.trim(),
          financialYear: financialYear.trim(),
          creationMode,
          templatePeriodId: creationMode === 'TEMPLATE' ? templatePeriodId : 'BLANK',
          copyRecurringCharges: creationMode === 'TEMPLATE' ? copyRecurring : false,
          startDate: `${monthCode.trim()}-01`,
          endDate: `${monthCode.trim()}-28`,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to create month');
      }

      onMonthCreated();
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-xs p-4">
      <div className="bg-[#FFFFFF] rounded-[24px] shadow-apple-modal border border-[#E5E5EA] max-w-lg w-full overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Apple Clean Light Header */}
        <div className="px-6 py-5 border-b border-[#E5E5EA] flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-full bg-[#EBF5FF] flex items-center justify-center text-[#007AFF]">
              <Calendar className="w-4 h-4 text-[#007AFF]" />
            </div>
            <div>
              <h3 className="font-semibold text-sm text-[#1D1D1F]">Create New Financial Month</h3>
              <p className="text-[11px] text-[#86868B]">Set up a billing cycle for ATHARVA fleet</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-[#F2F2F7] text-[#86868B] hover:text-[#1D1D1F] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 rounded-2xl bg-[#FEECEB] border border-[#FCD3D1] text-[#FF3B30] text-xs flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-[#FF3B30]" />
              <span>{error}</span>
            </div>
          )}

          {/* Creation Mode Choice */}
          <div>
            <label className="block text-xs font-semibold text-[#1D1D1F] mb-2">
              Month Setup Option
            </label>
            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => setCreationMode('BLANK')}
                className={`p-3 rounded-2xl border text-left transition-all ${
                  creationMode === 'BLANK'
                    ? 'border-[#007AFF] bg-[#F2F7FF] ring-2 ring-[#007AFF]/20'
                    : 'border-[#E5E5EA] bg-[#FFFFFF] hover:bg-[#F2F2F7]'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center space-x-1.5 text-xs font-semibold text-[#1D1D1F]">
                    <Sparkles className="w-3.5 h-3.5 text-[#007AFF]" />
                    <span>Blank Fresh Month</span>
                  </div>
                  {creationMode === 'BLANK' && <Check className="w-3.5 h-3.5 text-[#007AFF]" />}
                </div>
                <p className="text-[11px] text-[#86868B] leading-tight">
                  Clean slate with 0 records. Start fresh with no carry-over.
                </p>
              </button>

              <button
                type="button"
                onClick={() => setCreationMode('TEMPLATE')}
                className={`p-3 rounded-2xl border text-left transition-all ${
                  creationMode === 'TEMPLATE'
                    ? 'border-[#007AFF] bg-[#F2F7FF] ring-2 ring-[#007AFF]/20'
                    : 'border-[#E5E5EA] bg-[#FFFFFF] hover:bg-[#F2F2F7]'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center space-x-1.5 text-xs font-semibold text-[#1D1D1F]">
                    <Copy className="w-3.5 h-3.5 text-[#FF9F0A]" />
                    <span>Copy Template</span>
                  </div>
                  {creationMode === 'TEMPLATE' && <Check className="w-3.5 h-3.5 text-[#007AFF]" />}
                </div>
                <p className="text-[11px] text-[#86868B] leading-tight">
                  Carry forward fleet vehicles and approved client rates.
                </p>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-[#1D1D1F] mb-1.5">
                Month Code (YYYY-MM)
              </label>
              <input
                type="text"
                required
                value={monthCode}
                onChange={(e) => setMonthCode(e.target.value)}
                placeholder="2026-10"
                className="w-full px-3.5 py-2.5 bg-[#F2F2F7] border border-[#E5E5EA] rounded-xl text-xs text-[#1D1D1F] focus:bg-[#FFFFFF] focus:ring-2 focus:ring-[#007AFF] focus:outline-hidden"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#1D1D1F] mb-1.5">
                Period Display Name
              </label>
              <input
                type="text"
                required
                value={periodName}
                onChange={(e) => setPeriodName(e.target.value)}
                placeholder="October 2026"
                className="w-full px-3.5 py-2.5 bg-[#F2F2F7] border border-[#E5E5EA] rounded-xl text-xs text-[#1D1D1F] focus:bg-[#FFFFFF] focus:ring-2 focus:ring-[#007AFF] focus:outline-hidden"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-[#1D1D1F] mb-1.5">
                Financial Year
              </label>
              <input
                type="text"
                required
                value={financialYear}
                onChange={(e) => setFinancialYear(e.target.value)}
                placeholder="2026-27"
                className="w-full px-3.5 py-2.5 bg-[#F2F2F7] border border-[#E5E5EA] rounded-xl text-xs text-[#1D1D1F] focus:bg-[#FFFFFF] focus:ring-2 focus:ring-[#007AFF] focus:outline-hidden"
              />
            </div>

            {creationMode === 'TEMPLATE' ? (
              <div>
                <label className="block text-xs font-medium text-[#1D1D1F] mb-1.5">
                  Template Source Month
                </label>
                <select
                  value={templatePeriodId}
                  onChange={(e) => setTemplatePeriodId(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-[#F2F2F7] border border-[#E5E5EA] rounded-xl text-xs text-[#1D1D1F] focus:bg-[#FFFFFF] focus:ring-2 focus:ring-[#007AFF] focus:outline-hidden cursor-pointer"
                >
                  {existingPeriods.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.periodName} ({p.monthCode})
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <div className="flex flex-col justify-end">
                <div className="px-3 py-2 bg-[#F2F2F7] rounded-xl border border-[#E5E5EA] text-[11px] text-[#86868B]">
                  No prior month records will be cloned.
                </div>
              </div>
            )}
          </div>

          {creationMode === 'TEMPLATE' ? (
            <div className="p-4 bg-[#F2F2F7]/70 rounded-[18px] border border-[#E5E5EA] space-y-2">
              <label className="flex items-center space-x-2 text-xs font-medium text-[#1D1D1F] cursor-pointer">
                <input
                  type="checkbox"
                  checked={copyRecurring}
                  onChange={(e) => setCopyRecurring(e.target.checked)}
                  className="rounded-md border-[#E5E5EA] text-[#007AFF] focus:ring-[#007AFF]"
                />
                <span>Copy recurring deductions (GPS Rental, Office Charges)</span>
              </label>
              <p className="text-[11px] text-[#86868B] leading-relaxed">
                • Historical data in prior months remains 100% immutable.<br />
                • Fleet master and client service categories are carried forward.<br />
                • Kilometres and payments are reset to 0.00 for the new month.
              </p>
            </div>
          ) : (
            <div className="p-4 bg-[#F2F7FF] rounded-[18px] border border-[#D0E2FF] space-y-1.5">
              <p className="text-xs font-semibold text-[#007AFF] flex items-center space-x-1.5">
                <Sparkles className="w-3.5 h-3.5 text-[#007AFF]" />
                <span>Blank Clean Month Selected</span>
              </p>
              <p className="text-[11px] text-[#1D1D1F] leading-relaxed">
                A fresh, clean month will be initialized with <strong>0 vehicle records</strong>.
                You can add vehicle records and billing line items whenever you are ready.
              </p>
            </div>
          )}

          <div className="flex items-center justify-end space-x-2.5 pt-3 border-t border-[#E5E5EA]">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2 rounded-full text-xs font-medium text-[#1D1D1F] bg-[#F2F2F7] hover:bg-[#E5E5EA] border border-[#E5E5EA] transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 rounded-full text-xs font-medium bg-[#007AFF] hover:bg-[#0062CC] text-white transition-all shadow-apple-btn flex items-center space-x-1.5"
            >
              {loading ? (
                <span>Creating Month...</span>
              ) : (
                <>
                  <Plus className="w-3.5 h-3.5" />
                  <span>{creationMode === 'BLANK' ? 'Create Blank Month' : 'Clone Month'}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
