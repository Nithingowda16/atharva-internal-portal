'use client';

import React, { useState, useEffect } from 'react';
import Navbar from '@/components/Navbar';
import {
  Receipt,
  Search,
  Filter,
  Download,
  Building2,
  Calendar,
  CheckCircle,
  FileSpreadsheet
} from 'lucide-react';
import { exportToExcel, exportToCSV, exportToPDF } from '@/lib/exportUtils';

export default function BillingPage() {
  const [lines, setLines] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [companyFilter, setCompanyFilter] = useState('ALL');

  useEffect(() => {
    fetchBilling();
  }, [companyFilter]);

  const fetchBilling = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/reports?type=company_billing');
      const data = await res.json();
      setLines(data.data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const filtered = lines.filter((l) => {
    const matchesComp = companyFilter === 'ALL' || l.companyName === companyFilter;
    const matchesSearch =
      l.companyName.toLowerCase().includes(search.toLowerCase()) ||
      l.record.vehicle.registrationNumber.toLowerCase().includes(search.toLowerCase());
    return matchesComp && matchesSearch;
  });

  const uniqueCompanies = Array.from(new Set(lines.map((l) => l.companyName))).sort();

  const handleExport = (format: 'xlsx' | 'csv' | 'pdf') => {
    const exportData = filtered.map((l) => ({
      Period: l.record.period.periodName,
      Section: l.record.sectionIndex,
      'Vehicle Registration': l.record.vehicle.registrationNumber,
      'Company / Client': l.companyName,
      'KM / Trips': l.kmOrTrips !== null ? l.kmOrTrips : 'N/A',
      'Rate (₹)': l.applicableRate !== null ? l.applicableRate : 'N/A',
      'Billing Total (₹)': l.billingAmount,
      'Formula / Expression': l.amountFormula || 'KM * Rate',
    }));

    if (format === 'xlsx') {
      exportToExcel(exportData, 'Billing Transactions', 'Atharva_Billing_Transactions');
    } else if (format === 'csv') {
      exportToCSV(exportData, 'Atharva_Billing_Transactions');
    } else {
      exportToPDF({
        title: 'Billing & Trip Calculations Report',
        subtitle: `ATHARVA TRAVELS • Filter: ${companyFilter} • Total Records: ${filtered.length}`,
        headers: ['Period', 'Vehicle', 'Company', 'KM/Trips', 'Rate', 'Billing (₹)', 'Formula'],
        rows: filtered.map((l) => [
          l.record.period.periodName,
          l.record.vehicle.registrationNumber,
          l.companyName,
          l.kmOrTrips !== null ? l.kmOrTrips : '-',
          l.applicableRate !== null ? `₹${l.applicableRate}` : '-',
          `₹${l.billingAmount.toFixed(2)}`,
          l.amountFormula || 'Calculated',
        ]),
        filename: 'Atharva_Billing_Report',
      });
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto selection:bg-[#B3D7FF]">
      <Navbar
        title="Billing & Trips Ledger"
        subtitle="Individual Client Billing Lines, Trip Calculations & Kilometre Rates"
        onRefresh={fetchBilling}
      />

      {/* Apple Filter & Action Toolbar */}
      <div className="bg-[#FFFFFF] p-4 rounded-[22px] border border-[#E5E5EA] shadow-apple-card flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-[#86868B] absolute left-3.5 top-3" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search vehicle or client company..."
              className="w-full pl-9 pr-4 py-2 bg-[#F2F2F7] border border-[#E5E5EA] rounded-full text-xs text-[#1D1D1F] focus:bg-[#FFFFFF] focus:outline-hidden focus:ring-2 focus:ring-[#007AFF] transition-all"
            />
          </div>

          <div className="flex items-center space-x-2">
            <span className="text-xs text-[#86868B] font-medium">Company:</span>
            <select
              value={companyFilter}
              onChange={(e) => setCompanyFilter(e.target.value)}
              className="px-3 py-2 bg-[#F2F2F7] border border-[#E5E5EA] rounded-full text-xs font-medium text-[#1D1D1F] focus:outline-hidden focus:ring-2 focus:ring-[#007AFF] transition-all cursor-pointer"
            >
              <option value="ALL">All Companies ({uniqueCompanies.length})</option>
              {uniqueCompanies.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
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
            onClick={() => handleExport('pdf')}
            className="px-4 py-2 rounded-full border border-[#E5E5EA] bg-[#F2F2F7] hover:bg-[#E5E5EA] text-[#1D1D1F] text-xs font-medium flex items-center space-x-1.5 transition-colors"
          >
            <Download className="w-3.5 h-3.5 text-[#FF3B30]" />
            <span>PDF</span>
          </button>
        </div>
      </div>

      {/* Apple Styled Table Card */}
      <div className="bg-[#FFFFFF] rounded-[24px] border border-[#E5E5EA] shadow-apple-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse">
            <thead className="bg-[#F2F2F7] text-[#1D1D1F] font-semibold border-b border-[#E5E5EA]">
              <tr>
                <th className="py-3 px-3">Period</th>
                <th className="py-3 px-3 w-14 text-center">Sec #</th>
                <th className="py-3 px-4">Vehicle Registration</th>
                <th className="py-3 px-4">Client Company</th>
                <th className="py-3 px-3 text-right">KM / Trips</th>
                <th className="py-3 px-3 text-right">Applicable Rate (₹)</th>
                <th className="py-3 px-4 text-right">Calculated Billing (₹)</th>
                <th className="py-3 px-4">Formula / Source Calculation</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E5EA]">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-[#86868B]">
                    Loading billing lines from database...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-[#86868B]">
                    No billing lines match the current filter.
                  </td>
                </tr>
              ) : (
                filtered.map((l) => (
                  <tr key={l.id} className="hover:bg-[#F2F2F7]/50 transition-colors">
                    <td className="py-3 px-3 font-semibold text-[#1D1D1F]">{l.record.period.periodName}</td>
                    <td className="py-3 px-3 text-center font-mono text-[#86868B]">{l.record.sectionIndex}</td>
                    <td className="py-3 px-4 font-bold text-[#1D1D1F] font-mono">{l.record.vehicle.registrationNumber}</td>
                    <td className="py-3 px-4 font-semibold text-[#007AFF]">{l.companyName}</td>
                    <td className="py-3 px-3 text-right font-mono font-medium text-[#1D1D1F] tabular-nums">
                      {l.kmOrTrips !== null ? l.kmOrTrips : '-'}
                    </td>
                    <td className="py-3 px-3 text-right font-mono font-medium text-[#1D1D1F] tabular-nums">
                      {l.applicableRate !== null ? `₹${l.applicableRate}` : '-'}
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-[#1D1D1F] tabular-nums">
                      ₹{l.billingAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-3 px-4 text-[#86868B] font-mono text-[11px] truncate max-w-xs">
                      {l.amountFormula || 'KM × Rate'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
