'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  User,
  Phone,
  CreditCard,
  FileText,
  Calendar,
  Save,
  Trash2,
  AlertCircle,
  CheckCircle,
  Truck,
  UserPlus,
  Edit2,
  UserMinus
} from 'lucide-react';

interface DriverAssignmentModalProps {
  isOpen: boolean;
  vehicle: {
    id: string;
    registrationNumber: string;
    vehicleType?: string;
  };
  periodName: string;
  currentDriver?: {
    id: string;
    name: string;
    phone?: string;
    panMasked?: string;
    dlMasked?: string;
    licenceExpiry?: string;
    status?: string;
    remarks?: string;
  } | null;
  onClose: () => void;
  onSuccess: () => void;
}

export default function DriverAssignmentModal({
  isOpen,
  vehicle,
  periodName,
  currentDriver,
  onClose,
  onSuccess,
}: DriverAssignmentModalProps) {
  const [activeTab, setActiveTab] = useState<'assign' | 'create' | 'edit'>('assign');
  const [availableDrivers, setAvailableDrivers] = useState<any[]>([]);
  const [selectedDriverId, setSelectedDriverId] = useState('');
  const [loadingDrivers, setLoadingDrivers] = useState(false);

  // Form states for creating / editing driver
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [pan, setPan] = useState('');
  const [drivingLicence, setDrivingLicence] = useState('');
  const [licenceExpiry, setLicenceExpiry] = useState('');
  const [status, setStatus] = useState('ACTIVE');
  const [remarks, setRemarks] = useState('');

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      fetchDrivers();
      if (currentDriver) {
        setActiveTab('edit');
        setName(currentDriver.name || '');
        setPhone(currentDriver.phone || '');
        setPan('');
        setDrivingLicence('');
        setLicenceExpiry(
          currentDriver.licenceExpiry ? new Date(currentDriver.licenceExpiry).toISOString().split('T')[0] : ''
        );
        setStatus(currentDriver.status || 'ACTIVE');
        setRemarks(currentDriver.remarks || '');
      } else {
        setActiveTab('assign');
        setName('');
        setPhone('');
        setPan('');
        setDrivingLicence('');
        setLicenceExpiry('');
        setStatus('ACTIVE');
        setRemarks('');
      }
      setError(null);
    }
  }, [isOpen, currentDriver]);

  const fetchDrivers = async () => {
    setLoadingDrivers(true);
    try {
      const res = await fetch('/api/fleet/drivers');
      const data = await res.json();
      setAvailableDrivers(data.drivers || []);
      if (data.drivers && data.drivers.length > 0 && !selectedDriverId) {
        setSelectedDriverId(data.drivers[0].id);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingDrivers(false);
    }
  };

  if (!isOpen) return null;

  // 1. Assign existing driver
  const handleAssignExisting = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDriverId) {
      setError('Please select a driver to assign.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const res = await fetch('/api/fleet/assignments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vehicleId: vehicle.id,
          driverId: selectedDriverId,
          notes: `Assigned for ${periodName} settlement`,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to assign driver');
      onSuccess();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  // 2. Create new driver and assign
  const handleCreateDriver = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Driver name is required.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const res = await fetch('/api/fleet/drivers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          phone: phone.trim() || null,
          pan: pan.trim() || null,
          drivingLicence: drivingLicence.trim() || null,
          licenceExpiry: licenceExpiry || null,
          status,
          remarks: remarks.trim() || null,
          assignedVehicleId: vehicle.id,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create driver');
      onSuccess();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  // 3. Edit current driver information
  const handleEditDriver = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentDriver?.id) return;
    if (!name.trim()) {
      setError('Driver name is required.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/fleet/drivers/${currentDriver.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          phone: phone.trim() || null,
          pan: pan.trim() || undefined,
          drivingLicence: drivingLicence.trim() || undefined,
          licenceExpiry: licenceExpiry || undefined,
          status,
          remarks: remarks.trim() || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update driver');
      onSuccess();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  // 4. Unassign driver from vehicle
  const handleUnassignDriver = async () => {
    if (!confirm(`Are you sure you want to unassign ${currentDriver?.name || 'the driver'} from vehicle ${vehicle.registrationNumber}?`)) {
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/fleet/assignments?vehicleId=${vehicle.id}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to unassign driver');
      onSuccess();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
      <div className="bg-[#FFFFFF] w-full max-w-lg rounded-[28px] border border-[#E5E5EA] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-5 border-b border-[#E5E5EA] flex items-center justify-between bg-[#F9F9FB]">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-[#007AFF]/10 text-[#007AFF] flex items-center justify-center">
              <User className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-[#1D1D1F]">
                Driver Information Management
              </h3>
              <p className="text-xs text-[#86868B]">
                Vehicle <strong className="text-[#1D1D1F] font-mono">{vehicle.registrationNumber}</strong> · {periodName}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-full text-[#86868B] hover:text-[#1D1D1F] hover:bg-[#E5E5EA] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="px-5 pt-3 pb-2 flex items-center space-x-2 border-b border-[#E5E5EA] bg-[#FFFFFF]">
          {currentDriver && (
            <button
              type="button"
              onClick={() => setActiveTab('edit')}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold flex items-center space-x-1.5 transition-colors cursor-pointer ${
                activeTab === 'edit'
                  ? 'bg-[#007AFF] text-white shadow-xs'
                  : 'text-[#86868B] hover:bg-[#F2F2F7]'
              }`}
            >
              <Edit2 className="w-3.5 h-3.5" />
              <span>Alter Driver Info</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setActiveTab('assign')}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold flex items-center space-x-1.5 transition-colors cursor-pointer ${
              activeTab === 'assign'
                ? 'bg-[#007AFF] text-white shadow-xs'
                : 'text-[#86868B] hover:bg-[#F2F2F7]'
            }`}
          >
            <Truck className="w-3.5 h-3.5" />
            <span>Assign Existing</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('create')}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold flex items-center space-x-1.5 transition-colors cursor-pointer ${
              activeTab === 'create'
                ? 'bg-[#007AFF] text-white shadow-xs'
                : 'text-[#86868B] hover:bg-[#F2F2F7]'
            }`}
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>Add New Driver</span>
          </button>

          {currentDriver && (
            <button
              type="button"
              onClick={handleUnassignDriver}
              disabled={saving}
              className="ml-auto px-3 py-1.5 rounded-full text-xs font-semibold text-[#FF3B30] hover:bg-[#FF3B30]/10 flex items-center space-x-1 transition-colors cursor-pointer disabled:opacity-50"
              title="Remove driver assignment from this vehicle"
            >
              <UserMinus className="w-3.5 h-3.5" />
              <span>Unassign</span>
            </button>
          )}
        </div>

        {/* Error banner */}
        {error && (
          <div className="mx-5 mt-4 p-3 rounded-2xl bg-[#FF3B30]/10 border border-[#FF3B30]/30 flex items-start space-x-2 text-xs text-[#D70015]">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* Tab 1: Assign Existing Driver */}
        {activeTab === 'assign' && (
          <form onSubmit={handleAssignExisting} className="p-6 space-y-4">
            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-wider text-[#86868B] mb-1.5">
                Select Fleet Driver
              </label>
              {loadingDrivers ? (
                <p className="text-xs text-[#86868B]">Loading registered drivers...</p>
              ) : availableDrivers.length === 0 ? (
                <p className="text-xs text-[#FF3B30]">No drivers registered yet. Switch to "Add New Driver" tab.</p>
              ) : (
                <select
                  value={selectedDriverId}
                  onChange={(e) => setSelectedDriverId(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-[#F2F2F7] border border-[#E5E5EA] rounded-[16px] text-xs font-semibold text-[#1D1D1F] focus:bg-[#FFFFFF] focus:outline-hidden focus:ring-2 focus:ring-[#007AFF] transition-all cursor-pointer"
                >
                  {availableDrivers.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name} {d.phone ? `(${d.phone})` : ''} · Status: {d.status}
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div className="p-3.5 rounded-2xl bg-[#F2F2F7] text-xs text-[#86868B] space-y-1">
              <p>
                * Assigning a driver will automatically link them to vehicle{' '}
                <strong className="text-[#1D1D1F] font-mono">{vehicle.registrationNumber}</strong> and reflect on
                the monthly salary payment receipt.
              </p>
            </div>

            <div className="pt-2 flex justify-end space-x-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-full border border-[#E5E5EA] bg-white text-xs font-semibold text-[#1D1D1F] hover:bg-[#F2F2F7]"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving || availableDrivers.length === 0}
                className="px-5 py-2 rounded-full bg-[#007AFF] hover:bg-[#0062CC] text-white text-xs font-semibold transition-all disabled:opacity-50 cursor-pointer"
              >
                {saving ? 'Assigning...' : 'Assign to Vehicle'}
              </button>
            </div>
          </form>
        )}

        {/* Tab 2: Create New Driver OR Tab 3: Alter Driver Info */}
        {(activeTab === 'create' || activeTab === 'edit') && (
          <form onSubmit={activeTab === 'edit' ? handleEditDriver : handleCreateDriver} className="p-6 space-y-3.5">
            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-wider text-[#86868B] mb-1">
                Driver Full Name <span className="text-[#FF3B30]">*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                placeholder="e.g. Ramesh Kumar"
                className="w-full px-3.5 py-2 bg-[#F2F2F7] border border-[#E5E5EA] rounded-[14px] text-xs font-semibold text-[#1D1D1F] focus:bg-[#FFFFFF] focus:outline-hidden focus:ring-2 focus:ring-[#007AFF]"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-[#86868B] mb-1">
                  Contact Phone
                </label>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="e.g. 9876543210"
                  className="w-full px-3.5 py-2 bg-[#F2F2F7] border border-[#E5E5EA] rounded-[14px] text-xs font-semibold text-[#1D1D1F] focus:bg-[#FFFFFF] focus:outline-hidden focus:ring-2 focus:ring-[#007AFF]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-[#86868B] mb-1">
                  Status
                </label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="w-full px-3 py-2 bg-[#F2F2F7] border border-[#E5E5EA] rounded-[14px] text-xs font-semibold text-[#1D1D1F] focus:bg-[#FFFFFF] focus:outline-hidden focus:ring-2 focus:ring-[#007AFF]"
                >
                  <option value="ACTIVE">ACTIVE</option>
                  <option value="ON_LEAVE">ON_LEAVE</option>
                  <option value="INACTIVE">INACTIVE</option>
                  <option value="TERMINATED">TERMINATED</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-[#86868B] mb-1">
                  PAN Number {activeTab === 'edit' && currentDriver?.panMasked && `(${currentDriver.panMasked})`}
                </label>
                <input
                  type="text"
                  value={pan}
                  onChange={(e) => setPan(e.target.value.toUpperCase())}
                  placeholder={activeTab === 'edit' ? 'Leave blank to keep current' : 'e.g. ABCDE1234F'}
                  maxLength={10}
                  className="w-full px-3.5 py-2 bg-[#F2F2F7] border border-[#E5E5EA] rounded-[14px] text-xs font-mono font-bold text-[#1D1D1F] focus:bg-[#FFFFFF] focus:outline-hidden focus:ring-2 focus:ring-[#007AFF]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-[#86868B] mb-1">
                  Driving Licence {activeTab === 'edit' && currentDriver?.dlMasked && `(${currentDriver.dlMasked})`}
                </label>
                <input
                  type="text"
                  value={drivingLicence}
                  onChange={(e) => setDrivingLicence(e.target.value.toUpperCase())}
                  placeholder={activeTab === 'edit' ? 'Leave blank to keep current' : 'e.g. KA0420190012345'}
                  className="w-full px-3.5 py-2 bg-[#F2F2F7] border border-[#E5E5EA] rounded-[14px] text-xs font-mono font-bold text-[#1D1D1F] focus:bg-[#FFFFFF] focus:outline-hidden focus:ring-2 focus:ring-[#007AFF]"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-wider text-[#86868B] mb-1">
                Licence Expiry Date
              </label>
              <input
                type="date"
                value={licenceExpiry}
                onChange={(e) => setLicenceExpiry(e.target.value)}
                className="w-full px-3.5 py-2 bg-[#F2F2F7] border border-[#E5E5EA] rounded-[14px] text-xs text-[#1D1D1F] focus:bg-[#FFFFFF] focus:outline-hidden focus:ring-2 focus:ring-[#007AFF]"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-wider text-[#86868B] mb-1">
                Remarks / Bank Account Notes
              </label>
              <input
                type="text"
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                placeholder="e.g. Primary driver, HDFC salary bank A/C"
                className="w-full px-3.5 py-2 bg-[#F2F2F7] border border-[#E5E5EA] rounded-[14px] text-xs text-[#1D1D1F] focus:bg-[#FFFFFF] focus:outline-hidden focus:ring-2 focus:ring-[#007AFF]"
              />
            </div>

            <div className="pt-3 border-t border-[#E5E5EA] flex justify-end space-x-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-full border border-[#E5E5EA] bg-white text-xs font-semibold text-[#1D1D1F] hover:bg-[#F2F2F7]"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-5 py-2 rounded-full bg-[#007AFF] hover:bg-[#0062CC] text-white text-xs font-semibold transition-all disabled:opacity-50 cursor-pointer"
              >
                {saving
                  ? 'Saving...'
                  : activeTab === 'edit'
                  ? 'Update Driver Info'
                  : 'Save & Assign Driver'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

