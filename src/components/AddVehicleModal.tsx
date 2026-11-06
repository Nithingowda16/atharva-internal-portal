'use client';

import React, { useState } from 'react';
import { Plus, Truck, AlertCircle, X } from 'lucide-react';

interface AddVehicleModalProps {
  isOpen: boolean;
  periodId: string;
  periodName: string;
  onClose: () => void;
  onVehicleAdded: (newRecordId?: string) => void;
}

export default function AddVehicleModal({
  isOpen,
  periodId,
  periodName,
  onClose,
  onVehicleAdded,
}: AddVehicleModalProps) {
  const [regNo, setRegNo] = useState('');
  const [vehicleType, setVehicleType] = useState('Vehicle - 4-Seater');
  const [remarks, setRemarks] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!regNo.trim()) {
      setError('Please enter a vehicle registration number.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/records', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        cache: 'no-store',
        body: JSON.stringify({
          periodId,
          registrationNumber: regNo.trim().toUpperCase(),
          vehicleType,
          remarks: remarks.trim() || null,
          billingLines: [],
          adjustments: [],
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to add vehicle');

      setRegNo('');
      setRemarks('');
      onVehicleAdded(data.record?.id);
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-xs p-4">
      <div className="bg-[#FFFFFF] rounded-[24px] shadow-apple-modal border border-[#E5E5EA] max-w-md w-full overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="px-6 py-5 border-b border-[#E5E5EA] flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-full bg-[#EBF5FF] flex items-center justify-center text-[#007AFF]">
              <Truck className="w-4 h-4 text-[#007AFF]" />
            </div>
            <div>
              <h3 className="font-semibold text-sm text-[#1D1D1F]">Add Vehicle to {periodName}</h3>
              <p className="text-[11px] text-[#86868B]">Initialize a new monthly vehicle billing record</p>
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

          <div>
            <label className="block text-xs font-medium text-[#1D1D1F] mb-1.5">
              Vehicle Registration Number <span className="text-[#FF3B30]">*</span>
            </label>
            <input
              type="text"
              required
              value={regNo}
              onChange={(e) => setRegNo(e.target.value.toUpperCase())}
              placeholder="e.g. KA52B7020"
              className="w-full px-3.5 py-2.5 bg-[#F2F2F7] border border-[#E5E5EA] rounded-xl text-xs font-mono font-semibold text-[#1D1D1F] uppercase focus:bg-[#FFFFFF] focus:ring-2 focus:ring-[#007AFF] focus:outline-hidden"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-[#1D1D1F] mb-1.5">
              Vehicle Type / Category
            </label>
            <select
              value={vehicleType}
              onChange={(e) => setVehicleType(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-[#F2F2F7] border border-[#E5E5EA] rounded-xl text-xs text-[#1D1D1F] focus:bg-[#FFFFFF] focus:ring-2 focus:ring-[#007AFF] focus:outline-hidden cursor-pointer"
            >
              <option value="Vehicle - 4-Seater">Vehicle - 4-Seater (Sedan / Hatchback)</option>
              <option value="Vehicle - 7-Seater">Vehicle - 7-Seater (Innova / Ertiga / SUV)</option>
              <option value="Bus / Coach">Bus / Tempo Traveller / Coach</option>
              <option value="Commercial Transport">Commercial Transport / Logistics</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-[#1D1D1F] mb-1.5">
              Initial Remarks (Optional)
            </label>
            <input
              type="text"
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="e.g. Dedicated client cab, driver name"
              className="w-full px-3.5 py-2.5 bg-[#F2F2F7] border border-[#E5E5EA] rounded-xl text-xs text-[#1D1D1F] focus:bg-[#FFFFFF] focus:ring-2 focus:ring-[#007AFF] focus:outline-hidden"
            />
          </div>

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
                <span>Adding...</span>
              ) : (
                <>
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Vehicle Record</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

