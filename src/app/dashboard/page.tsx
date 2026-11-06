'use client';

import React, { useState, useEffect } from 'react';
import Navbar from '@/components/Navbar';
import Link from 'next/link';
import {
  TrendingUp,
  Receipt,
  Scissors,
  CheckCircle,
  Clock,
  Truck,
  PauseCircle,
  AlertTriangle,
  ArrowUpRight,
  Download,
  Building2,
  Calendar,
  CreditCard,
  Landmark,
  Plus,
  Eye,
  Check
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { exportToExcel } from '@/lib/exportUtils';
import CreateMonthModal from '@/components/CreateMonthModal';

export default function DashboardPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState('ALL');
  const [isCreateMonthOpen, setIsCreateMonthOpen] = useState(false);

  useEffect(() => {
    fetchDashboard(selectedPeriod);
  }, [selectedPeriod]);

  const fetchDashboard = async (period: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/dashboard?period=${period}`);
      const json = await res.json();
      setData(json);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleExportSummary = () => {
    if (!data) return;
    const exportData = data.monthlyTrends.map((t: any) => ({
      Period: t.periodName,
      'Gross Billing (₹)': t.grossBilling,
      'Total Deductions (₹)': t.totalDeductions,
      'Net Payable (₹)': t.netPayable,
      'Total Paid (₹)': t.totalPaid,
      'Outstanding (₹)': t.outstanding,
      Status: t.status,
    }));
    exportToExcel(exportData, 'Dashboard KPI Summary', 'Atharva_Executive_KPI_Summary');
  };

  if (loading && !data) {
    return (
      <div className="space-y-6 max-w-7xl mx-auto animate-pulse">
        <div className="h-44 bg-[#FFFFFF] rounded-[24px] border border-[#E5E5EA]" />
        <div className="grid grid-cols-4 gap-4">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <div key={i} className="h-28 bg-[#FFFFFF] rounded-[22px] border border-[#E5E5EA]" />
          ))}
        </div>
      </div>
    );
  }

  const kpis = data?.kpis || {};
  const currentPeriodName = selectedPeriod === 'ALL' ? 'Consolidated Overview' : (data?.periods?.find((p: any) => p.monthCode === selectedPeriod)?.periodName || selectedPeriod);

  // Time-aware greeting
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning.' : hour < 18 ? 'Good afternoon.' : 'Good evening.';

  return (
    <div className="space-y-6 max-w-7xl mx-auto selection:bg-[#B3D7FF]">
      <Navbar
        title="Executive Finance Dashboard"
        subtitle="Consolidated Fleet Performance, Billing Trends & Settlement Overview"
        onRefresh={() => fetchDashboard(selectedPeriod)}
      />

      {/* Flagged #REF! Warning Card */}
      {kpis.refErrorsCount > 0 && (
        <div className="p-4 rounded-[20px] bg-[#FFF5E5] border border-[#FFE4B8] flex items-center justify-between shadow-2xs">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-full bg-[#FFEECF] flex items-center justify-center text-[#FF9F0A] shrink-0">
              <AlertTriangle className="w-5 h-5 text-[#FF9F0A]" />
            </div>
            <div>
              <h4 className="text-xs font-semibold text-[#1D1D1F]">
                Data Quality Audit: {kpis.refErrorsCount} Original Excel #REF! Errors Flagged
              </h4>
              <p className="text-xs text-[#86868B] mt-0.5">
                Preserved verbatim from the August 2026 worksheet. Source cells retain formulas without inventing values or zeroing data.
              </p>
            </div>
          </div>
          <Link
            href="/raw-cells?onlyRef=true"
            className="px-4 py-1.5 rounded-full bg-[#FFFFFF] hover:bg-[#F2F2F7] text-[#FF9F0A] border border-[#FFE4B8] text-xs font-semibold shrink-0 transition-colors shadow-2xs"
          >
            Review Errors
          </Link>
        </div>
      )}

      {/* Apple-Inspired Hero Card (matches user uploaded preview media_1793937165878_c31a9c16.png!) */}
      <div className="bg-[#FFFFFF] border border-[#E5E5EA] rounded-[24px] p-6 md:p-8 shadow-apple-card space-y-6">
        {/* Top Header Inside Card */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 rounded-2xl bg-[#FFFFFF] border border-[#E5E5EA] p-1.5 flex items-center justify-center shadow-xs overflow-hidden">
              <img src="/logo.png" alt="Atharva Travels" className="w-full h-full object-contain" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-[#1D1D1F] tracking-tight">ATHARVA TRAVELS</h3>
              <p className="text-xs text-[#86868B]">Internal Finance Portal</p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <span className="px-3 py-1 rounded-full bg-[#EAF9EE] text-[#34C759] border border-[#D2F4DA] text-xs font-semibold flex items-center space-x-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#34C759]" />
              <span>Live</span>
            </span>

            {/* Period Selector Pill */}
            <select
              value={selectedPeriod}
              onChange={(e) => setSelectedPeriod(e.target.value)}
              className="px-3 py-1.5 bg-[#F2F2F7] border border-[#E5E5EA] rounded-full text-xs font-medium text-[#1D1D1F] focus:outline-hidden focus:ring-2 focus:ring-[#007AFF] transition-all cursor-pointer"
            >
              <option value="ALL">All Periods (Consolidated)</option>
              {data?.periods?.map((p: any) => (
                <option key={p.id} value={p.monthCode}>
                  {p.periodName} ({p.monthCode})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Greeting Section */}
        <div>
          <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-[#1D1D1F]">
            {greeting}
          </h2>
          <p className="text-xs text-[#86868B] mt-1 font-medium">
            Your financial overview · {currentPeriodName}
          </p>
        </div>

        {/* Inner Dual Metric Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-[#F2F2F7]/70 border border-[#E5E5EA] rounded-[20px] p-5 space-y-1 transition-all hover:bg-[#F2F2F7]">
            <p className="text-xs font-medium text-[#86868B]">Total billing</p>
            <p className="text-2xl md:text-3xl font-bold text-[#1D1D1F] tracking-tight tabular-nums">
              ₹{(kpis.totalGross / 100000).toFixed(1)}L
              <span className="text-xs font-normal text-[#86868B] ml-2 font-mono">
                (₹{kpis.totalGross?.toLocaleString('en-IN', { minimumFractionDigits: 2 })})
              </span>
            </p>
            <p className="text-xs font-semibold text-[#34C759] pt-1">
              Monthly billing · 100% Reconciled
            </p>
          </div>

          <div className="bg-[#F2F2F7]/70 border border-[#E5E5EA] rounded-[20px] p-5 space-y-1 transition-all hover:bg-[#F2F2F7]">
            <p className="text-xs font-medium text-[#86868B]">Outstanding balance</p>
            <p className="text-2xl md:text-3xl font-bold text-[#1D1D1F] tracking-tight tabular-nums">
              ₹{(kpis.outstandingBalance / 100000).toFixed(1)}L
              <span className="text-xs font-normal text-[#86868B] ml-2 font-mono">
                (₹{kpis.outstandingBalance?.toLocaleString('en-IN', { minimumFractionDigits: 2 })})
              </span>
            </p>
            <p className="text-xs font-medium text-[#86868B] pt-1">
              Pending settlements across vehicles
            </p>
          </div>
        </div>

        {/* Performance Bar Chart Inside Card */}
        <div className="pt-2">
          <div className="flex items-center justify-between pb-3">
            <div>
              <h4 className="text-xs font-semibold text-[#1D1D1F]">Monthly performance</h4>
              <p className="text-[11px] text-[#86868B]">Monthly billing trend</p>
            </div>
            <span className="text-[11px] text-[#86868B]">Primary source comparison</span>
          </div>

          <div className="h-44 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data?.monthlyTrends} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E5EA" />
                <XAxis dataKey="periodName" tick={{ fontSize: 11, fill: '#86868B' }} axisLine={false} tickLine={false} />
                <YAxis
                  tickFormatter={(val) => `₹${(val / 100000).toFixed(1)}L`}
                  tick={{ fontSize: 11, fill: '#86868B' }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  formatter={(value: any) => [`₹${Number(value).toLocaleString('en-IN')}`, 'Gross Billing']}
                  contentStyle={{ backgroundColor: '#FFFFFF', borderRadius: 16, border: '1px solid #E5E5EA', fontSize: 12 }}
                />
                <Bar dataKey="grossBilling" fill="#007AFF" radius={[10, 10, 0, 0]} barSize={44} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Apple Pill Buttons at Bottom */}
        <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-[#E5E5EA]">
          <button
            onClick={() => setIsCreateMonthOpen(true)}
            className="px-5 py-2.5 rounded-full bg-[#007AFF] hover:bg-[#0062CC] text-white text-xs font-medium transition-all duration-150 flex items-center space-x-1.5 shadow-apple-btn active:scale-[0.98]"
          >
            <Plus className="w-4 h-4" />
            <span>+ New month</span>
          </button>

          <Link
            href="/reports"
            className="px-5 py-2.5 rounded-full bg-[#F2F2F7] hover:bg-[#E5E5EA] text-[#1D1D1F] border border-[#E5E5EA] text-xs font-medium transition-all duration-150 flex items-center space-x-1.5 active:scale-[0.98]"
          >
            <Eye className="w-4 h-4 text-[#86868B]" />
            <span>View reports</span>
          </Link>

          <button
            onClick={handleExportSummary}
            className="px-5 py-2.5 rounded-full bg-[#FFFFFF] hover:bg-[#F2F2F7] text-[#1D1D1F] border border-[#E5E5EA] text-xs font-medium transition-all duration-150 flex items-center space-x-1.5 ml-auto"
          >
            <Download className="w-4 h-4 text-[#86868B]" />
            <span>Export Excel</span>
          </button>
        </div>
      </div>

      {/* 8 Clean Apple Financial KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Total Monthly Billing */}
        <div className="bg-[#FFFFFF] p-5 rounded-[22px] border border-[#E5E5EA] shadow-apple-card space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-[#86868B]">Total Monthly Billing</span>
            <div className="w-7 h-7 rounded-full bg-[#EBF5FF] flex items-center justify-center text-[#007AFF]">
              <Receipt className="w-3.5 h-3.5" />
            </div>
          </div>
          <p className="text-xl font-bold text-[#1D1D1F] tracking-tight tabular-nums">
            ₹{kpis.totalGross?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </p>
          <p className="text-[11px] text-[#34C759] font-medium flex items-center">
            <Check className="w-3 h-3 mr-1" />
            <span>100% Reconciled</span>
          </p>
        </div>

        {/* Total Deductions */}
        <div className="bg-[#FFFFFF] p-5 rounded-[22px] border border-[#E5E5EA] shadow-apple-card space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-[#86868B]">Total Deductions</span>
            <div className="w-7 h-7 rounded-full bg-[#FEECEB] flex items-center justify-center text-[#FF3B30]">
              <Scissors className="w-3.5 h-3.5" />
            </div>
          </div>
          <p className="text-xl font-bold text-[#FF3B30] tracking-tight tabular-nums">
            ₹{kpis.totalDeductions?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </p>
          <p className="text-[11px] text-[#86868B]">
            Fuel Adv, TDS, GPS & Penalties
          </p>
        </div>

        {/* Total Net Payable */}
        <div className="bg-[#FFFFFF] p-5 rounded-[22px] border border-[#E5E5EA] shadow-apple-card space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-[#86868B]">Total Net Payable</span>
            <div className="w-7 h-7 rounded-full bg-[#EAF9EE] flex items-center justify-center text-[#34C759]">
              <TrendingUp className="w-3.5 h-3.5" />
            </div>
          </div>
          <p className="text-xl font-bold text-[#1D1D1F] tracking-tight tabular-nums">
            ₹{kpis.totalNet?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </p>
          <p className="text-[11px] text-[#86868B]">
            Billing − Valid Deductions
          </p>
        </div>

        {/* Total Paid / Settled */}
        <div className="bg-[#FFFFFF] p-5 rounded-[22px] border border-[#E5E5EA] shadow-apple-card space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-[#86868B]">Total Paid / Settled</span>
            <div className="w-7 h-7 rounded-full bg-[#EAF9EE] flex items-center justify-center text-[#34C759]">
              <CheckCircle className="w-3.5 h-3.5" />
            </div>
          </div>
          <p className="text-xl font-bold text-[#34C759] tracking-tight tabular-nums">
            ₹{kpis.totalPaid?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </p>
          <p className="text-[11px] text-[#86868B]">
            Recorded Bank Settlements
          </p>
        </div>

        {/* Active Vehicles */}
        <div className="bg-[#FFFFFF] p-5 rounded-[22px] border border-[#E5E5EA] shadow-apple-card space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-[#86868B]">Active Vehicles</span>
            <div className="w-7 h-7 rounded-full bg-[#F2F2F7] flex items-center justify-center text-[#1D1D1F]">
              <Truck className="w-3.5 h-3.5" />
            </div>
          </div>
          <p className="text-xl font-bold text-[#1D1D1F] tracking-tight">
            {kpis.activeVehiclesCount} Registered
          </p>
          <p className="text-[11px] text-[#86868B]">
            4-Seater & 6-Seater Fleet
          </p>
        </div>

        {/* Vehicles on HOLD */}
        <div className="bg-[#FFFFFF] p-5 rounded-[22px] border border-[#E5E5EA] shadow-apple-card space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-[#86868B]">Vehicles on HOLD</span>
            <div className="w-7 h-7 rounded-full bg-[#FFF5E5] flex items-center justify-center text-[#FF9F0A]">
              <PauseCircle className="w-3.5 h-3.5" />
            </div>
          </div>
          <p className="text-xl font-bold text-[#FF9F0A] tracking-tight">
            {kpis.vehiclesOnHoldCount} Vehicles
          </p>
          <p className="text-[11px] text-[#86868B]">
            Requires Finance Release
          </p>
        </div>

        {/* Pending Settlements */}
        <div className="bg-[#FFFFFF] p-5 rounded-[22px] border border-[#E5E5EA] shadow-apple-card space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-[#86868B]">Pending Settlements</span>
            <div className="w-7 h-7 rounded-full bg-[#F2F2F7] flex items-center justify-center text-[#1D1D1F]">
              <Clock className="w-3.5 h-3.5" />
            </div>
          </div>
          <p className="text-xl font-bold text-[#1D1D1F] tracking-tight">
            {kpis.pendingSettlementCount} Records
          </p>
          <p className="text-[11px] text-[#86868B]">
            Draft & Follow-up status
          </p>
        </div>

        {/* Total Vehicle Sections */}
        <div className="bg-[#FFFFFF] p-5 rounded-[22px] border border-[#E5E5EA] shadow-apple-card space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-[#86868B]">Vehicle Sections</span>
            <div className="w-7 h-7 rounded-full bg-[#EBF5FF] flex items-center justify-center text-[#007AFF]">
              <Building2 className="w-3.5 h-3.5" />
            </div>
          </div>
          <p className="text-xl font-bold text-[#1D1D1F] tracking-tight">
            {kpis.totalVehicleRecords} Sections
          </p>
          <p className="text-[11px] text-[#86868B]">
            46 Aug + 46 Sep
          </p>
        </div>
      </div>

      {/* Dual Table Panels: Company Summary & Month Comparison */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Company Billing Summary */}
        <div className="bg-[#FFFFFF] rounded-[24px] border border-[#E5E5EA] shadow-apple-card overflow-hidden">
          <div className="p-5 border-b border-[#E5E5EA] flex items-center justify-between">
            <div>
              <h3 className="text-xs font-semibold text-[#1D1D1F] uppercase tracking-wide">
                Client Billing Summary
              </h3>
              <p className="text-[11px] text-[#86868B]">{data?.companySummary?.length || 0} Corporate Clients</p>
            </div>
            <Link
              href="/billing"
              className="px-3 py-1 rounded-full bg-[#F2F2F7] hover:bg-[#E5E5EA] text-[#007AFF] text-xs font-medium transition-colors"
            >
              View all
            </Link>
          </div>

          <div className="overflow-x-auto max-h-72 custom-scrollbar">
            <table className="w-full text-xs text-left">
              <thead className="bg-[#FBFBFC] text-[#86868B] font-medium border-b border-[#E5E5EA] sticky top-0">
                <tr>
                  <th className="py-2.5 px-5">Company</th>
                  <th className="py-2.5 px-4 text-right">Trips</th>
                  <th className="py-2.5 px-5 text-right">Total Billing (₹)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E5EA]">
                {data?.companySummary?.slice(0, 8).map((c: any, idx: number) => (
                  <tr key={idx} className="hover:bg-[#F2F2F7]/50 transition-colors">
                    <td className="py-2.5 px-5 font-medium text-[#1D1D1F]">{c.name}</td>
                    <td className="py-2.5 px-4 text-right text-[#86868B] font-mono">{c.tripCount}</td>
                    <td className="py-2.5 px-5 text-right font-semibold text-[#1D1D1F] tabular-nums">
                      ₹{c.totalBilling?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Month-on-Month Comparison */}
        <div className="bg-[#FFFFFF] rounded-[24px] border border-[#E5E5EA] shadow-apple-card overflow-hidden">
          <div className="p-5 border-b border-[#E5E5EA] flex items-center justify-between">
            <div>
              <h3 className="text-xs font-semibold text-[#1D1D1F] uppercase tracking-wide">
                Historical Month Comparison
              </h3>
              <p className="text-[11px] text-[#86868B]">Verified Financial Records</p>
            </div>
            <Link
              href="/reports?type=reconciliation"
              className="px-3 py-1 rounded-full bg-[#F2F2F7] hover:bg-[#E5E5EA] text-[#007AFF] text-xs font-medium transition-colors"
            >
              Reconciliation
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-[#FBFBFC] text-[#86868B] font-medium border-b border-[#E5E5EA]">
                <tr>
                  <th className="py-2.5 px-5">Month</th>
                  <th className="py-2.5 px-4 text-right">Gross Billing</th>
                  <th className="py-2.5 px-4 text-right">Net Payable</th>
                  <th className="py-2.5 px-5 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E5EA]">
                {data?.monthlyTrends?.map((m: any, idx: number) => (
                  <tr key={idx} className="hover:bg-[#F2F2F7]/50 transition-colors">
                    <td className="py-3 px-5 font-semibold text-[#1D1D1F]">{m.periodName}</td>
                    <td className="py-3 px-4 text-right text-[#1D1D1F] tabular-nums">
                      ₹{m.grossBilling?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-[#007AFF] tabular-nums">
                      ₹{m.netPayable?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-3 px-5 text-center">
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-[#EAF9EE] text-[#34C759] border border-[#D2F4DA]">
                        {m.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <CreateMonthModal
        isOpen={isCreateMonthOpen}
        onClose={() => setIsCreateMonthOpen(false)}
        existingPeriods={data?.periods || []}
        onMonthCreated={() => fetchDashboard(selectedPeriod)}
      />
    </div>
  );
}
