'use client';

import React, { useState, useEffect } from 'react';
import Navbar from '@/components/Navbar';
import {
  Truck,
  Plus,
  Search,
  Filter,
  Download,
  Edit2,
  Trash2,
  CheckCircle,
  XCircle,
  Eye,
  X,
  CreditCard,
  Calendar,
  AlertTriangle,
  Check
} from 'lucide-react';
import { exportToExcel, exportToCSV } from '@/lib/exportUtils';

export default function VehiclesPage() {
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('ALL');

  // Modals
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<any | null>(null);
  const [viewHistoryVehicle, setViewHistoryVehicle] = useState<any | null>(null);

  // New vehicle form
  const [newRegNo, setNewRegNo] = useState('');
  const [newType, setNewType] = useState('Vehicle - 4-Seater');
  const [ownerName, setOwnerName] = useState('');
  const [contactNumber, setContactNumber] = useState('');
  const [bankAccountMasked, setBankAccountMasked] = useState('');
  const [bankName, setBankName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchVehicles();
  }, [typeFilter, search]);

  const fetchVehicles = async () => {
    setLoading(true);
    try {
      let url = '/api/vehicles?';
      if (typeFilter !== 'ALL') url += `type=${encodeURIComponent(typeFilter)}&`;
      if (search) url += `search=${encodeURIComponent(search)}`;

      const res = await fetch(url);
      const data = await res.json();
      setVehicles(data.vehicles || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleAddVehicle = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch('/api/vehicles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          registrationNumber: newRegNo,
          vehicleType: newType,
          ownerName,
          contactNumber,
          bankAccountMasked,
          bankName,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to add vehicle');

      setIsAddOpen(false);
      setNewRegNo('');
      setOwnerName('');
      setContactNumber('');
      setBankAccountMasked('');
      setBankName('');
      fetchVehicles();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateVehicle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingVehicle) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/vehicles/${editingVehicle.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingVehicle),
      });
      if (res.ok) {
        setEditingVehicle(null);
        fetchVehicles();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteVehicle = async (id: string, regNo: string) => {
    const reason = prompt(`Enter reason for deleting vehicle ${regNo} (soft-deleted to Recycle Bin):`);
    if (!reason) return;

    try {
      await fetch(`/api/vehicles/${id}?reason=${encodeURIComponent(reason)}`, {
        method: 'DELETE',
      });
      fetchVehicles();
    } catch (e) {
      console.error(e);
    }
  };

  const handleExport = (format: 'xlsx' | 'csv') => {
    const exportData = vehicles.map((v) => ({
      'Registration Number': v.registrationNumber,
      'Vehicle Type': v.vehicleType,
      Status: v.isActive ? 'Active' : 'Inactive',
      'Owner / Driver': v.ownerName || 'N/A',
      Contact: v.contactNumber || 'N/A',
      'Masked Account': v.bankAccountMasked || 'N/A',
      Bank: v.bankName || 'N/A',
      'Total Historical Billing (₹)': v.totalBilling,
      'Total Historical Deductions (₹)': v.totalDeductions,
      'Total Paid (₹)': v.totalPaid,
      'Outstanding Balance (₹)': v.outstandingBalance,
      'Months Active': v.monthsCount,
    }));

    if (format === 'xlsx') {
      exportToExcel(exportData, 'Vehicles Master', 'Atharva_Vehicles_Master');
    } else {
      exportToCSV(exportData, 'Atharva_Vehicles_Master');
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto selection:bg-[#B3D7FF]">
      <Navbar
        title="Vehicle Master Directory"
        subtitle="Complete Fleet Records, Historical Statements & Configurations"
        onRefresh={fetchVehicles}
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
              placeholder="Search registration, owner, category..."
              className="w-full pl-9 pr-4 py-2 bg-[#F2F2F7] border border-[#E5E5EA] rounded-full text-xs text-[#1D1D1F] focus:bg-[#FFFFFF] focus:outline-hidden focus:ring-2 focus:ring-[#007AFF] transition-all"
            />
          </div>

          <div className="flex items-center space-x-2">
            <span className="text-xs text-[#86868B] font-medium">Category:</span>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="px-3 py-2 bg-[#F2F2F7] border border-[#E5E5EA] rounded-full text-xs font-medium text-[#1D1D1F] focus:outline-hidden focus:ring-2 focus:ring-[#007AFF] transition-all cursor-pointer"
            >
              <option value="ALL">All Categories</option>
              <option value="Vehicle - 4-Seater">4-Seater</option>
              <option value="Vehicle - 6-Seater">6-Seater</option>
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
          <button
            onClick={() => setIsAddOpen(true)}
            className="px-5 py-2.5 rounded-full bg-[#007AFF] hover:bg-[#0062CC] text-white text-xs font-semibold flex items-center space-x-1.5 shadow-apple-btn transition-all active:scale-[0.98]"
          >
            <Plus className="w-4 h-4" />
            <span>Add Vehicle</span>
          </button>
        </div>
      </div>

      {/* Apple Styled Table Card */}
      <div className="bg-[#FFFFFF] rounded-[24px] border border-[#E5E5EA] shadow-apple-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse">
            <thead className="bg-[#F2F2F7] text-[#1D1D1F] font-semibold border-b border-[#E5E5EA]">
              <tr>
                <th className="py-3 px-4">Registration No</th>
                <th className="py-3 px-3">Category</th>
                <th className="py-3 px-3 text-center">Status</th>
                <th className="py-3 px-4 text-right">Total Billing (₹)</th>
                <th className="py-3 px-4 text-right">Deductions (₹)</th>
                <th className="py-3 px-4 text-right">Paid (₹)</th>
                <th className="py-3 px-4 text-right">Outstanding (₹)</th>
                <th className="py-3 px-3 text-center">Months</th>
                <th className="py-3 px-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E5EA]">
              {loading ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-[#86868B]">
                    Loading vehicles directory...
                  </td>
                </tr>
              ) : vehicles.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-[#86868B]">
                    No vehicles found matching current filter.
                  </td>
                </tr>
              ) : (
                vehicles.map((v) => (
                  <tr key={v.id} className="hover:bg-[#F2F2F7]/50 transition-colors">
                    <td className="py-3.5 px-4 font-bold text-[#1D1D1F]">
                      <button
                        onClick={() => setViewHistoryVehicle(v)}
                        className="hover:text-[#007AFF] text-left font-mono tracking-wide underline decoration-dotted transition-colors"
                        title="Click to view full monthly statement"
                      >
                        {v.registrationNumber}
                      </button>
                      {v.notes && (
                        <p className="text-[10px] text-[#86868B] font-normal truncate max-w-xs">{v.notes}</p>
                      )}
                    </td>

                    <td className="py-3.5 px-3 text-[#1D1D1F]">
                      <span className="px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-[#F2F2F7] border border-[#E5E5EA]">
                        {v.vehicleType.replace('Vehicle - ', '')}
                      </span>
                    </td>

                    <td className="py-3.5 px-3 text-center">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${
                          v.isActive
                            ? 'bg-[#EAF9EE] text-[#34C759] border-[#D2F4DA]'
                            : 'bg-[#FFF0EF] text-[#FF3B30] border-[#FFD0CE]'
                        }`}
                      >
                        {v.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-right font-medium text-[#1D1D1F] tabular-nums">
                      ₹{v.totalBilling.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>

                    <td className="py-3.5 px-4 text-right font-medium text-[#FF3B30] tabular-nums">
                      ₹{v.totalDeductions.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>

                    <td className="py-3.5 px-4 text-right font-medium text-[#34C759] tabular-nums">
                      ₹{v.totalPaid.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>

                    <td className="py-3.5 px-4 text-right font-bold text-[#007AFF] tabular-nums">
                      ₹{v.outstandingBalance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>

                    <td className="py-3.5 px-3 text-center font-bold text-[#1D1D1F] font-mono">
                      {v.monthsCount}
                    </td>

                    <td className="py-3.5 px-4 text-center">
                      <div className="flex items-center justify-center space-x-1.5">
                        <button
                          onClick={() => setViewHistoryVehicle(v)}
                          className="p-1.5 rounded-full text-[#86868B] hover:text-[#007AFF] hover:bg-[#EBF5FF] transition-colors"
                          title="View Payment History"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setEditingVehicle(v)}
                          className="p-1.5 rounded-full text-[#86868B] hover:text-[#007AFF] hover:bg-[#EBF5FF] transition-colors"
                          title="Edit Vehicle Master"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteVehicle(v.id, v.registrationNumber)}
                          className="p-1.5 rounded-full text-[#86868B] hover:text-[#FF3B30] hover:bg-[#FFF0EF] transition-colors"
                          title="Soft Delete Vehicle"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Vehicle Historical Timeline Modal */}
      {viewHistoryVehicle && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#1D1D1F]/20 backdrop-blur-md p-4 animate-in fade-in duration-200">
          <div className="bg-[#FFFFFF] rounded-[24px] shadow-2xl border border-[#E5E5EA] max-w-2xl w-full max-h-[85vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="px-6 py-5 border-b border-[#E5E5EA] flex items-center justify-between shrink-0 bg-[#FFFFFF]">
              <div>
                <h3 className="font-bold text-sm text-[#1D1D1F] tracking-tight">
                  Statement & Payment History: {viewHistoryVehicle.registrationNumber}
                </h3>
                <p className="text-xs text-[#007AFF] font-medium mt-0.5">
                  {viewHistoryVehicle.vehicleType} • {viewHistoryVehicle.monthsCount} Monthly Periods Recorded
                </p>
              </div>
              <button
                onClick={() => setViewHistoryVehicle(null)}
                className="w-8 h-8 rounded-full bg-[#F2F2F7] hover:bg-[#E5E5EA] text-[#86868B] hover:text-[#1D1D1F] flex items-center justify-center transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-[#F2F2F7] p-4 rounded-[18px] border border-[#E5E5EA] text-xs">
                <div>
                  <span className="text-[#86868B] text-[11px] font-medium">Total Billing:</span>
                  <p className="font-bold text-[#1D1D1F] tabular-nums text-sm mt-0.5">₹{viewHistoryVehicle.totalBilling.toLocaleString('en-IN')}</p>
                </div>
                <div>
                  <span className="text-[#86868B] text-[11px] font-medium">Total Deductions:</span>
                  <p className="font-bold text-[#FF3B30] tabular-nums text-sm mt-0.5">₹{viewHistoryVehicle.totalDeductions.toLocaleString('en-IN')}</p>
                </div>
                <div>
                  <span className="text-[#86868B] text-[11px] font-medium">Total Settled:</span>
                  <p className="font-bold text-[#34C759] tabular-nums text-sm mt-0.5">₹{viewHistoryVehicle.totalPaid.toLocaleString('en-IN')}</p>
                </div>
                <div>
                  <span className="text-[#86868B] text-[11px] font-medium">Outstanding:</span>
                  <p className="font-bold text-[#007AFF] tabular-nums text-sm mt-0.5">₹{viewHistoryVehicle.outstandingBalance.toLocaleString('en-IN')}</p>
                </div>
              </div>

              <div className="border border-[#E5E5EA] rounded-[18px] overflow-hidden">
                <table className="w-full text-xs text-left">
                  <thead className="bg-[#F2F2F7] text-[#1D1D1F] font-semibold border-b border-[#E5E5EA]">
                    <tr>
                      <th className="py-2.5 px-3">Period</th>
                      <th className="py-2.5 px-3 text-right">Gross Billing</th>
                      <th className="py-2.5 px-3 text-right">Deductions</th>
                      <th className="py-2.5 px-3 text-right">Net Payable</th>
                      <th className="py-2.5 px-3 text-center">Status</th>
                      <th className="py-2.5 px-3">Payment Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E5E5EA]">
                    {viewHistoryVehicle.history?.map((h: any, idx: number) => (
                      <tr key={idx} className="hover:bg-[#F2F2F7]/50 transition-colors">
                        <td className="py-2.5 px-3 font-semibold text-[#1D1D1F]">{h.periodName}</td>
                        <td className="py-2.5 px-3 text-right tabular-nums">₹{h.grossBilling.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                        <td className="py-2.5 px-3 text-right text-[#FF3B30] tabular-nums">₹{h.totalDeductions.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                        <td className="py-2.5 px-3 text-right font-bold text-[#007AFF] tabular-nums">₹{h.netPayable.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                        <td className="py-2.5 px-3 text-center">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#F2F2F7] border border-[#E5E5EA] text-[#1D1D1F]">
                            {h.status}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-[#86868B] font-mono text-[11px]">{h.paymentDate || 'Pending'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Vehicle Modal */}
      {editingVehicle && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#1D1D1F]/20 backdrop-blur-md p-4 animate-in fade-in duration-200">
          <div className="bg-[#FFFFFF] rounded-[24px] shadow-2xl border border-[#E5E5EA] max-w-md w-full overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="px-6 py-5 border-b border-[#E5E5EA] flex items-center justify-between bg-[#FFFFFF]">
              <h3 className="font-bold text-sm text-[#1D1D1F] tracking-tight">Edit Vehicle Details</h3>
              <button
                onClick={() => setEditingVehicle(null)}
                className="w-8 h-8 rounded-full bg-[#F2F2F7] hover:bg-[#E5E5EA] text-[#86868B] hover:text-[#1D1D1F] flex items-center justify-center transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleUpdateVehicle} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#1D1D1F] mb-1.5">
                  Registration Number
                </label>
                <input
                  type="text"
                  required
                  value={editingVehicle.registrationNumber}
                  onChange={(e) => setEditingVehicle({ ...editingVehicle, registrationNumber: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-[#F2F2F7] border border-[#E5E5EA] rounded-[14px] text-xs font-mono uppercase text-[#1D1D1F] focus:bg-[#FFFFFF] focus:outline-hidden focus:ring-2 focus:ring-[#007AFF] transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#1D1D1F] mb-1.5">
                  Category
                </label>
                <select
                  value={editingVehicle.vehicleType}
                  onChange={(e) => setEditingVehicle({ ...editingVehicle, vehicleType: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-[#F2F2F7] border border-[#E5E5EA] rounded-[14px] text-xs text-[#1D1D1F] focus:bg-[#FFFFFF] focus:outline-hidden focus:ring-2 focus:ring-[#007AFF] transition-all cursor-pointer"
                >
                  <option value="Vehicle - 4-Seater">4-Seater</option>
                  <option value="Vehicle - 6-Seater">6-Seater</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#1D1D1F] mb-1.5">
                    Owner / Driver Name
                  </label>
                  <input
                    type="text"
                    value={editingVehicle.ownerName || ''}
                    onChange={(e) => setEditingVehicle({ ...editingVehicle, ownerName: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-[#F2F2F7] border border-[#E5E5EA] rounded-[14px] text-xs text-[#1D1D1F] focus:bg-[#FFFFFF] focus:outline-hidden focus:ring-2 focus:ring-[#007AFF] transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#1D1D1F] mb-1.5">
                    Contact Number
                  </label>
                  <input
                    type="text"
                    value={editingVehicle.contactNumber || ''}
                    onChange={(e) => setEditingVehicle({ ...editingVehicle, contactNumber: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-[#F2F2F7] border border-[#E5E5EA] rounded-[14px] text-xs text-[#1D1D1F] focus:bg-[#FFFFFF] focus:outline-hidden focus:ring-2 focus:ring-[#007AFF] transition-all"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end space-x-2 pt-4 border-t border-[#E5E5EA]">
                <button
                  type="button"
                  onClick={() => setEditingVehicle(null)}
                  className="px-4 py-2 rounded-full text-xs font-medium text-[#86868B] hover:bg-[#F2F2F7] transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-full text-xs font-semibold bg-[#007AFF] hover:bg-[#0062CC] text-white transition-all shadow-apple-btn active:scale-[0.98]"
                >
                  {submitting ? 'Updating...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Vehicle Modal */}
      {isAddOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#1D1D1F]/20 backdrop-blur-md p-4 animate-in fade-in duration-200">
          <div className="bg-[#FFFFFF] rounded-[24px] shadow-2xl border border-[#E5E5EA] max-w-md w-full overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="px-6 py-5 border-b border-[#E5E5EA] flex items-center justify-between bg-[#FFFFFF]">
              <h3 className="font-bold text-sm text-[#1D1D1F] tracking-tight">Add New Vehicle to Fleet</h3>
              <button
                onClick={() => setIsAddOpen(false)}
                className="w-8 h-8 rounded-full bg-[#F2F2F7] hover:bg-[#E5E5EA] text-[#86868B] hover:text-[#1D1D1F] flex items-center justify-center transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddVehicle} className="p-6 space-y-4">
              {error && (
                <div className="p-3.5 rounded-[16px] bg-[#FFF0EF] border border-[#FFD0CE] text-[#FF3B30] text-xs">
                  {error}
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-[#1D1D1F] mb-1.5">
                  Registration Number *
                </label>
                <input
                  type="text"
                  required
                  value={newRegNo}
                  onChange={(e) => setNewRegNo(e.target.value)}
                  placeholder="e.g. KA03AQ 5313"
                  className="w-full px-3.5 py-2.5 bg-[#F2F2F7] border border-[#E5E5EA] rounded-[14px] text-xs font-mono uppercase text-[#1D1D1F] focus:bg-[#FFFFFF] focus:outline-hidden focus:ring-2 focus:ring-[#007AFF] transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#1D1D1F] mb-1.5">
                  Vehicle Category
                </label>
                <select
                  value={newType}
                  onChange={(e) => setNewType(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-[#F2F2F7] border border-[#E5E5EA] rounded-[14px] text-xs text-[#1D1D1F] focus:bg-[#FFFFFF] focus:outline-hidden focus:ring-2 focus:ring-[#007AFF] transition-all cursor-pointer"
                >
                  <option value="Vehicle - 4-Seater">4-Seater</option>
                  <option value="Vehicle - 6-Seater">6-Seater</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#1D1D1F] mb-1.5">
                    Owner / Driver Name
                  </label>
                  <input
                    type="text"
                    value={ownerName}
                    onChange={(e) => setOwnerName(e.target.value)}
                    placeholder="Owner name"
                    className="w-full px-3.5 py-2.5 bg-[#F2F2F7] border border-[#E5E5EA] rounded-[14px] text-xs text-[#1D1D1F] focus:bg-[#FFFFFF] focus:outline-hidden focus:ring-2 focus:ring-[#007AFF] transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#1D1D1F] mb-1.5">
                    Contact Number
                  </label>
                  <input
                    type="text"
                    value={contactNumber}
                    onChange={(e) => setContactNumber(e.target.value)}
                    placeholder="+91..."
                    className="w-full px-3.5 py-2.5 bg-[#F2F2F7] border border-[#E5E5EA] rounded-[14px] text-xs text-[#1D1D1F] focus:bg-[#FFFFFF] focus:outline-hidden focus:ring-2 focus:ring-[#007AFF] transition-all"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end space-x-2 pt-4 border-t border-[#E5E5EA]">
                <button
                  type="button"
                  onClick={() => setIsAddOpen(false)}
                  className="px-4 py-2 rounded-full text-xs font-medium text-[#86868B] hover:bg-[#F2F2F7] transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-full text-xs font-semibold bg-[#007AFF] hover:bg-[#0062CC] text-white transition-all shadow-apple-btn active:scale-[0.98]"
                >
                  {submitting ? 'Saving...' : 'Add Vehicle'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
