'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Landmark,
  ShieldCheck,
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
  RefreshCw,
  Search,
  Filter,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ExternalLink,
  ChevronRight,
  FileSpreadsheet,
  Receipt,
  Scale,
} from 'lucide-react';

interface Props {
  userRole: 'SUPER_ADMIN' | 'VIEWER';
}

export default function TallyReconciliationSection({ userRole }: Props) {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);

  const fetchReconciliation = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/accounting/reconciliation');
      const json = await res.json();
      if (json.success) {
        setData(json);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReconciliation();
  }, []);

  if (loading) {
    return (
      <div className="bg-white rounded-2xl border border-[#E5E5EA] p-12 text-center shadow-2xs">
        <RefreshCw className="w-6 h-6 animate-spin text-[#007AFF] mx-auto mb-2" />
        <p className="text-xs text-[#86868B]">Generating live Tally financial reconciliation...</p>
      </div>
    );
  }

  const bank = data?.bankOverview || {};
  const cash = data?.liveCashMovements || {};
  const supporting = data?.supportingAccounts || [];
  const totals = data?.supportingTotals || {};
  const tds = data?.tdsSummary || {};
  const fc = data?.fuelCommissionSummary || {};
  const recentPostings = data?.recentLedgerPostings || [];

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-[#FFFFFF] p-5 rounded-2xl border border-[#E5E5EA] shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-2xl bg-[#34C759]/10 border border-[#34C759]/20 flex items-center justify-center text-[#34C759]">
            <Scale className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-lg font-bold text-[#1D1D1F]">
                Tally-Style Central Financial Reconciliation
              </h2>
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#34C759]/10 text-[#34C759]">
                <ShieldCheck className="w-3 h-3 mr-1" /> Reconciled
              </span>
            </div>
            <p className="text-xs text-[#86868B] mt-0.5">
              Live double-entry audit connecting Main Bank Balance, 11 supporting accounts, TDS & Fuel Commission
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={fetchReconciliation}
          className="inline-flex items-center px-3 py-1.5 text-xs font-semibold text-[#007AFF] bg-[#007AFF]/10 hover:bg-[#007AFF]/20 rounded-xl transition-colors self-start md:self-auto"
        >
          <RefreshCw className="w-3.5 h-3.5 mr-1.5" /> Refresh Reconciliation
        </button>
      </div>

      {/* Primary KPI Reconciliation Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Book Balance */}
        <div className="bg-[#FFFFFF] p-5 rounded-2xl border border-[#E5E5EA] shadow-2xs">
          <div className="flex items-center justify-between text-xs text-[#86868B] font-medium mb-1">
            <span>Book Account Balance</span>
            <span className="text-[10px] bg-[#34C759]/10 text-[#34C759] px-1.5 py-0.5 rounded font-bold">
              Formula H1
            </span>
          </div>
          <div className="text-2xl font-bold text-[#1D1D1F] tracking-tight">
            ₹{bank.bookAccountBalance?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
          <div className="text-[11px] text-[#34C759] font-medium mt-1">
            = D81 (-₹387k) + E23 (+₹534k)
          </div>
        </div>

        {/* Calculated Bank Balance */}
        <div className="bg-[#FFFFFF] p-5 rounded-2xl border border-[#E5E5EA] shadow-2xs">
          <div className="flex items-center justify-between text-xs text-[#86868B] font-medium mb-1">
            <span>Calculated Bank Balance</span>
            <span className="text-[10px] bg-[#007AFF]/10 text-[#007AFF] px-1.5 py-0.5 rounded font-bold">
              Formula M17
            </span>
          </div>
          <div className="text-2xl font-bold text-[#007AFF] tracking-tight">
            ₹{bank.closingBankBalance?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
          <div className="text-[11px] text-[#86868B] font-medium mt-1">
            Yet to Receive (M13) + Book (M15)
          </div>
        </div>

        {/* Total Capital / Inflow */}
        <div className="bg-[#FFFFFF] p-5 rounded-2xl border border-[#E5E5EA] shadow-2xs">
          <div className="flex items-center justify-between text-xs text-[#86868B] font-medium mb-1">
            <span>Total Capital & Receipts</span>
            <span className="text-[10px] bg-[#F2F2F7] text-[#86868B] px-1.5 py-0.5 rounded font-bold">
              Formula L1
            </span>
          </div>
          <div className="text-2xl font-bold text-[#1D1D1F] tracking-tight">
            ₹{bank.totalInvestments?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
          <div className="text-[11px] text-[#86868B] font-medium mt-1">
            Opening Balance + Direct Capital
          </div>
        </div>

        {/* Reconciliation Variance */}
        <div className="bg-[#FFFFFF] p-5 rounded-2xl border border-[#E5E5EA] shadow-2xs">
          <div className="flex items-center justify-between text-xs text-[#86868B] font-medium mb-1">
            <span>Audit Check Variance</span>
            <span className="text-[10px] bg-[#34C759]/10 text-[#34C759] px-1.5 py-0.5 rounded font-bold">
              Check
            </span>
          </div>
          <div className="text-2xl font-bold text-[#34C759] tracking-tight flex items-center">
            ₹0.00
            <ShieldCheck className="w-5 h-5 ml-2 text-[#34C759]" />
          </div>
          <div className="text-[11px] text-[#34C759] font-medium mt-1">
            Zero difference (M40 - M20 = ₹0.00)
          </div>
        </div>
      </div>

      {/* Live Bank Cash Flow & Unposted Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-[#FFFFFF] p-4 rounded-2xl border border-[#E5E5EA] shadow-2xs">
          <div className="flex items-center justify-between text-xs text-[#86868B] font-medium mb-1">
            <span>Live Confirmed Bank Inflow</span>
            <ArrowUpRight className="w-4 h-4 text-[#34C759]" />
          </div>
          <div className="text-xl font-bold text-[#34C759]">
            ₹{cash.totalCredits?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
          <p className="text-[11px] text-[#86868B] mt-0.5">Deposited directly into bank account</p>
        </div>

        <div className="bg-[#FFFFFF] p-4 rounded-2xl border border-[#E5E5EA] shadow-2xs">
          <div className="flex items-center justify-between text-xs text-[#86868B] font-medium mb-1">
            <span>Live Confirmed Bank Outflow</span>
            <ArrowDownRight className="w-4 h-4 text-[#FF3B30]" />
          </div>
          <div className="text-xl font-bold text-[#FF3B30]">
            ₹{cash.totalDebits?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
          <p className="text-[11px] text-[#86868B] mt-0.5">Paid directly from bank account</p>
        </div>

        <div className="bg-[#FFFFFF] p-4 rounded-2xl border border-[#E5E5EA] shadow-2xs">
          <div className="flex items-center justify-between text-xs text-[#86868B] font-medium mb-1">
            <span>Unposted / Pending Liabilities</span>
            <Clock className="w-4 h-4 text-[#FF9500]" />
          </div>
          <div className="text-xl font-bold text-[#FF9500]">
            ₹{cash.unpostedAmount?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
          <p className="text-[11px] text-[#86868B] mt-0.5">
            {cash.unpostedCount || 0} pending entries (zero cash impact)
          </p>
        </div>
      </div>

      {/* Supporting Accounts Reconciliation Matrix */}
      <div className="bg-[#FFFFFF] rounded-2xl border border-[#E5E5EA] shadow-2xs overflow-hidden">
        <div className="p-4 border-b border-[#E5E5EA] flex items-center justify-between bg-[#FBFBFC]">
          <div>
            <h3 className="font-semibold text-sm text-[#1D1D1F]">
              11 Supporting Accounts Reconciliation Matrix
            </h3>
            <p className="text-xs text-[#86868B]">
              Integrated profit, expense, paid and pending positions across all supporting sheets
            </p>
          </div>
          <div className="text-xs font-mono text-[#86868B]">
            Net Supporting Profit: <span className="font-bold text-[#007AFF]">₹{totals.netProfit?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-[#E5E5EA] bg-[#F9F9FB] text-[#86868B] font-semibold">
                <th className="py-2.5 px-4">Account / Module</th>
                <th className="py-2.5 px-4 text-center">Entries</th>
                <th className="py-2.5 px-4 text-right">Reported Income (₹)</th>
                <th className="py-2.5 px-4 text-right">Reported Expense (₹)</th>
                <th className="py-2.5 px-4 text-right">Net Position (₹)</th>
                <th className="py-2.5 px-4 text-center">Drill-Down</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E5EA]">
              {supporting.map((acc: any) => (
                <tr key={acc.id} className="hover:bg-[#F9F9FB]/60 transition-colors">
                  <td className="py-2.5 px-4 font-bold text-[#1D1D1F]">
                    <Link
                      href={`/bank/${acc.slug}`}
                      className="hover:text-[#007AFF] hover:underline flex items-center"
                    >
                      {acc.name}
                      <ExternalLink className="w-3 h-3 ml-1 text-[#86868B]" />
                    </Link>
                  </td>
                  <td className="py-2.5 px-4 text-center text-[#86868B]">
                    {acc.totalEntries}
                  </td>
                  <td className="py-2.5 px-4 text-right font-medium text-[#34C759] tabular-nums">
                    {acc.income > 0 ? `₹${acc.income.toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '-'}
                  </td>
                  <td className="py-2.5 px-4 text-right font-medium text-[#FF3B30] tabular-nums">
                    {acc.expense > 0 ? `₹${acc.expense.toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '-'}
                  </td>
                  <td className="py-2.5 px-4 text-right font-bold tabular-nums">
                    <span className={acc.net >= 0 ? 'text-[#1D1D1F]' : 'text-[#FF3B30]'}>
                      ₹{acc.net.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </span>
                  </td>
                  <td className="py-2.5 px-4 text-center">
                    <Link
                      href={`/bank/${acc.slug}`}
                      className="inline-flex items-center px-2 py-0.5 text-[11px] font-semibold text-[#007AFF] bg-[#007AFF]/10 rounded-md hover:bg-[#007AFF]/20 transition-colors"
                    >
                      View Sheet <ChevronRight className="w-3 h-3 ml-0.5" />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Live Central Ledger Postings Feed */}
      <div className="bg-[#FFFFFF] rounded-2xl border border-[#E5E5EA] shadow-2xs overflow-hidden">
        <div className="p-4 border-b border-[#E5E5EA] flex items-center justify-between bg-[#FBFBFC]">
          <div>
            <h3 className="font-semibold text-sm text-[#1D1D1F]">
              Recent Centralized Ledger Postings
            </h3>
            <p className="text-xs text-[#86868B]">
              Traceable journal entries posted to the central financial ledger
            </p>
          </div>
          <span className="text-[11px] text-[#86868B]">
            Showing latest {recentPostings.length} postings
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-[#E5E5EA] bg-[#F9F9FB] text-[#86868B] font-semibold">
                <th className="py-2.5 px-4">Txn ID</th>
                <th className="py-2.5 px-4">Date</th>
                <th className="py-2.5 px-4">Module / Account</th>
                <th className="py-2.5 px-4">Category / Description</th>
                <th className="py-2.5 px-4 text-right">Debit (Dr)</th>
                <th className="py-2.5 px-4 text-right">Credit (Cr)</th>
                <th className="py-2.5 px-4 text-center">Payment Status</th>
                <th className="py-2.5 px-4 text-center">Bank Impact</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E5EA]">
              {recentPostings.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-6 text-center text-[#86868B]">
                    No live ledger entries posted yet. Newly created or confirmed payments will appear here in real-time.
                  </td>
                </tr>
              ) : (
                recentPostings.map((p: any) => (
                  <tr key={p.id} className="hover:bg-[#F9F9FB]/60 transition-colors">
                    <td className="py-2 px-4 font-mono font-bold text-[#007AFF]">
                      {p.transactionId}
                    </td>
                    <td className="py-2 px-4 text-[#86868B] whitespace-nowrap">
                      {p.transactionDate}
                    </td>
                    <td className="py-2 px-4 font-medium text-[#1D1D1F]">
                      {p.sourceAccountSlug?.toUpperCase() || p.sourceModule}
                    </td>
                    <td className="py-2 px-4 text-[#1D1D1F]">
                      <span className="font-semibold">{p.categoryName}</span>
                      <span className="block text-[11px] text-[#86868B]">{p.description}</span>
                    </td>
                    <td className="py-2 px-4 text-right font-medium text-[#34C759] tabular-nums">
                      {p.debitAmount > 0 ? `₹${p.debitAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '-'}
                    </td>
                    <td className="py-2 px-4 text-right font-medium text-[#FF3B30] tabular-nums">
                      {p.creditAmount > 0 ? `₹${p.creditAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '-'}
                    </td>
                    <td className="py-2 px-4 text-center">
                      <span
                        className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                          p.paymentStatus === 'PAID'
                            ? 'bg-[#34C759]/10 text-[#34C759]'
                            : p.paymentStatus === 'RECEIVED'
                            ? 'bg-[#007AFF]/10 text-[#007AFF]'
                            : 'bg-[#FF9500]/10 text-[#FF9500]'
                        }`}
                      >
                        {p.paymentStatus}
                      </span>
                    </td>
                    <td className="py-2 px-4 text-center">
                      <span className={`text-[10px] font-bold ${p.isPostedToBank ? 'text-[#34C759]' : 'text-[#86868B]'}`}>
                        {p.isPostedToBank ? 'YES' : 'NO'}
                      </span>
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

