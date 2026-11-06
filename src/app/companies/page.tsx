'use client';

import React, { useState, useEffect } from 'react';
import Navbar from '@/components/Navbar';
import {
  Building2,
  Plus,
  Search,
  Download,
  DollarSign,
  Tag,
  CheckCircle,
  X,
  FileSpreadsheet
} from 'lucide-react';
import { exportToExcel, exportToCSV } from '@/lib/exportUtils';

export default function CompaniesPage() {
  const [companies, setCompanies] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [newCompanyName, setNewCompanyName] = useState('');
  const [defaultRate, setDefaultRate] = useState('');
  const [category, setCategory] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchCompanies();
  }, []);

  const fetchCompanies = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/companies');
      const data = await res.json();
      setCompanies(data.companies || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleAddCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch('/api/companies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newCompanyName,
          defaultRate,
          category,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to add company');

      setIsAddOpen(false);
      setNewCompanyName('');
      setDefaultRate('');
      setCategory('');
      fetchCompanies();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const filtered = companies.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase())
  );

  const handleExport = (format: 'xlsx' | 'csv') => {
    const exportData = companies.map((c) => ({
      'Company / Client Name': c.name,
      'Default Approved Rate (₹)': c.defaultRate || 'Variable',
      Category: c.category || 'Enterprise Transport',
      'Total Billed to Date (₹)': c.totalBilled,
      'Total Trips Recorded': c.totalTrips,
      Status: c.isActive ? 'Active' : 'Inactive',
    }));

    if (format === 'xlsx') {
      exportToExcel(exportData, 'Client Companies', 'Atharva_Client_Companies');
    } else {
      exportToCSV(exportData, 'Atharva_Client_Companies');
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto selection:bg-[#B3D7FF]">
      <Navbar
        title="Company & Client Directory"
        subtitle="Corporate Clients, Service Categories & Configured Billing Rates"
        onRefresh={fetchCompanies}
      />

      {/* Apple Styled Filter & Action Toolbar */}
      <div className="bg-[#FFFFFF] p-4 rounded-[22px] border border-[#E5E5EA] shadow-apple-card flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-[#86868B] absolute left-3.5 top-3" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search company or client name..."
            className="w-full pl-9 pr-4 py-2 bg-[#F2F2F7] border border-[#E5E5EA] rounded-full text-xs text-[#1D1D1F] focus:bg-[#FFFFFF] focus:outline-hidden focus:ring-2 focus:ring-[#007AFF] transition-all"
          />
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
            <span>Add Client</span>
          </button>
        </div>
      </div>

      {/* Companies Grid & Table */}
      <div className="bg-[#FFFFFF] rounded-[24px] border border-[#E5E5EA] shadow-apple-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse">
            <thead className="bg-[#F2F2F7] text-[#1D1D1F] font-semibold border-b border-[#E5E5EA]">
              <tr>
                <th className="py-3 px-4">Client Company Name</th>
                <th className="py-3 px-3">Service Category</th>
                <th className="py-3 px-4 text-right">Default Rate (₹)</th>
                <th className="py-3 px-4 text-right">Total Recorded Trips</th>
                <th className="py-3 px-4 text-right">Total Billed to Date (₹)</th>
                <th className="py-3 px-3 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E5EA]">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-[#86868B]">
                    Loading companies directory...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-[#86868B]">
                    No client companies found.
                  </td>
                </tr>
              ) : (
                filtered.map((c) => (
                  <tr key={c.id} className="hover:bg-[#F2F2F7]/50 transition-colors">
                    <td className="py-3.5 px-4 font-bold text-[#1D1D1F] flex items-center space-x-2.5">
                      <div className="w-7 h-7 rounded-full bg-[#EBF5FF] text-[#007AFF] flex items-center justify-center shrink-0">
                        <Building2 className="w-3.5 h-3.5" />
                      </div>
                      <span>{c.name}</span>
                    </td>

                    <td className="py-3.5 px-3 text-[#1D1D1F]">
                      <span className="px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-[#F2F2F7] border border-[#E5E5EA]">
                        {c.category || (c.name.includes('Escort') ? 'Escort Service' : 'Corporate Transport')}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-right font-mono font-medium text-[#1D1D1F] tabular-nums">
                      {c.defaultRate ? `₹${c.defaultRate.toLocaleString('en-IN')}` : 'Variable'}
                    </td>

                    <td className="py-3.5 px-4 text-right font-mono font-medium text-[#1D1D1F] tabular-nums">
                      {c.totalTrips || 0}
                    </td>

                    <td className="py-3.5 px-4 text-right font-bold text-[#007AFF] tabular-nums">
                      ₹{c.totalBilled.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>

                    <td className="py-3.5 px-3 text-center">
                      <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[#EAF9EE] text-[#34C759] border border-[#D2F4DA]">
                        Active
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Company Modal */}
      {isAddOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#1D1D1F]/20 backdrop-blur-md p-4 animate-in fade-in duration-200">
          <div className="bg-[#FFFFFF] rounded-[24px] shadow-2xl border border-[#E5E5EA] max-w-md w-full overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="px-6 py-5 border-b border-[#E5E5EA] flex items-center justify-between bg-[#FFFFFF]">
              <h3 className="font-bold text-sm text-[#1D1D1F] tracking-tight">Add New Corporate Client</h3>
              <button
                onClick={() => setIsAddOpen(false)}
                className="w-8 h-8 rounded-full bg-[#F2F2F7] hover:bg-[#E5E5EA] text-[#86868B] hover:text-[#1D1D1F] flex items-center justify-center transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddCompany} className="p-6 space-y-4">
              {error && (
                <div className="p-3.5 rounded-[16px] bg-[#FFF0EF] border border-[#FFD0CE] text-[#FF3B30] text-xs">
                  {error}
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-[#1D1D1F] mb-1.5">
                  Company / Client Name *
                </label>
                <input
                  type="text"
                  required
                  value={newCompanyName}
                  onChange={(e) => setNewCompanyName(e.target.value)}
                  placeholder="e.g. Google India, Infosys"
                  className="w-full px-3.5 py-2.5 bg-[#F2F2F7] border border-[#E5E5EA] rounded-[14px] text-xs text-[#1D1D1F] focus:bg-[#FFFFFF] focus:outline-hidden focus:ring-2 focus:ring-[#007AFF] transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#1D1D1F] mb-1.5">
                  Default Rate (₹)
                </label>
                <input
                  type="number"
                  step="any"
                  value={defaultRate}
                  onChange={(e) => setDefaultRate(e.target.value)}
                  placeholder="e.g. 600 or 20"
                  className="w-full px-3.5 py-2.5 bg-[#F2F2F7] border border-[#E5E5EA] rounded-[14px] text-xs text-[#1D1D1F] focus:bg-[#FFFFFF] focus:outline-hidden focus:ring-2 focus:ring-[#007AFF] transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#1D1D1F] mb-1.5">
                  Service Category
                </label>
                <input
                  type="text"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  placeholder="e.g. Dedicated 4-Seater, Escort, Employee Cab"
                  className="w-full px-3.5 py-2.5 bg-[#F2F2F7] border border-[#E5E5EA] rounded-[14px] text-xs text-[#1D1D1F] focus:bg-[#FFFFFF] focus:outline-hidden focus:ring-2 focus:ring-[#007AFF] transition-all"
                />
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
                  {submitting ? 'Saving...' : 'Add Client'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
