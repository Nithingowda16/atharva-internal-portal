'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Search,
  X,
  Car,
  User,
  Building2,
  Calendar,
  CreditCard,
  Banknote,
  Clock,
  ArrowRight,
  ShieldCheck,
  Phone,
  FileText,
  AlertCircle,
  TrendingUp,
  Receipt,
  Sparkles,
} from 'lucide-react';

export default function GlobalSearch() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selectedItem, setSelectedItem] = useState<any | null>(null);
  const [activeTab, setActiveTab] = useState<'OVERVIEW' | 'ADVANCES' | 'PAYMENTS' | 'COMPANIES'>('OVERVIEW');

  const searchRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Click outside listener to close dropdown
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Keyboard shortcut (Ctrl+K or Cmd+K) to focus search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
        setIsOpen(true);
      }
      if (e.key === 'Escape') {
        setIsOpen(false);
        if (selectedItem) setSelectedItem(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedItem]);

  // Debounced search query
  useEffect(() => {
    if (!query || query.trim().length < 2) {
      setResults([]);
      setLoading(false);
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(query.trim())}`, {
          cache: 'no-store',
          headers: {
            'Cache-Control': 'no-cache',
          },
        });
        const data = await res.json();
        if (data.success && Array.isArray(data.results)) {
          setResults(data.results);
          setIsOpen(true);
        }
      } catch (err) {
        console.error('Search request failed:', err);
      } finally {
        setLoading(false);
      }
    }, 220);

    return () => clearTimeout(timer);
  }, [query]);

  const handleSelect = (item: any) => {
    setSelectedItem(item);
    setIsOpen(false);
    setActiveTab('OVERVIEW');
  };

  const handleClear = () => {
    setQuery('');
    setResults([]);
    setIsOpen(false);
  };

  const formatCurrency = (amount?: number) => {
    if (amount === undefined || amount === null) return '₹0.00';
    return `₹${amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  return (
    <div ref={searchRef} className="relative w-full max-w-sm sm:max-w-md md:max-w-lg lg:max-w-xl xl:max-w-2xl mx-auto">
      {/* Search Input Bar – Styled like Google Skills search pill */}
      <div className="relative flex items-center group">
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            if (!isOpen) setIsOpen(true);
          }}
          onFocus={() => {
            if (query.length >= 2) setIsOpen(true);
          }}
          placeholder="Search car number or driver name..."
          className="w-full pl-4 pr-16 sm:pr-20 py-2 sm:py-2.5 text-xs sm:text-[13px] rounded-full bg-[#F0F4F9] hover:bg-[#E9EEF6] border border-[#E1E5EA] text-[#1D1D1F] placeholder-[#5F6368] focus:outline-hidden focus:bg-[#FFFFFF] focus:border-[#007AFF] focus:ring-4 focus:ring-[#007AFF]/15 transition-all duration-150 shadow-2xs"
        />

        {/* Right side icons: Shortcut badge & Search Magnifying Glass (Google Skills style) */}
        <div className="absolute right-2 sm:right-3 flex items-center space-x-1.5">
          {query ? (
            <button
              type="button"
              onClick={handleClear}
              className="p-1 rounded-full text-[#5F6368] hover:text-[#1D1D1F] hover:bg-[#DDE3EA] transition-colors"
              title="Clear search"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          ) : (
            <kbd className="hidden sm:inline-flex items-center px-1.5 py-0.5 text-[10px] font-mono text-[#5F6368] bg-[#FFFFFF] border border-[#E1E5EA] rounded shadow-2xs pointer-events-none">
              ⌘K
            </kbd>
          )}

          <button
            type="button"
            onClick={() => {
              inputRef.current?.focus();
              if (query.length >= 2) setIsOpen(true);
            }}
            className="p-1.5 rounded-full text-[#5F6368] hover:text-[#007AFF] hover:bg-[#DDE3EA] transition-colors"
            title="Search"
          >
            <Search className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Autocomplete Dropdown List */}
      {isOpen && (query.trim().length >= 2 || results.length > 0) && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-[#FFFFFF] border border-[#E5E5EA] rounded-[20px] shadow-apple-card overflow-hidden z-50 max-h-96 overflow-y-auto custom-scrollbar animate-in fade-in slide-in-from-top-1 duration-150">
          {loading && (
            <div className="p-4 text-center text-xs text-[#86868B] flex items-center justify-center space-x-2">
              <span className="w-2 h-2 rounded-full bg-[#007AFF] animate-ping" />
              <span>Searching fleet & driver records...</span>
            </div>
          )}

          {!loading && results.length === 0 && (
            <div className="p-6 text-center">
              <p className="text-xs font-semibold text-[#1D1D1F]">No matching vehicle or driver found</p>
              <p className="text-[11px] text-[#86868B] mt-1">
                Try searching by car registration number (e.g. KA03, 6174) or driver name.
              </p>
            </div>
          )}

          {!loading && results.length > 0 && (
            <div className="py-2 divide-y divide-[#E5E5EA]">
              {results.map((item) => {
                const isCar = item.type === 'VEHICLE';
                const d = item.data;
                const advanceCount = d.earlySalaryAndAdvances?.records?.length || 0;
                const totalAdvance = d.earlySalaryAndAdvances?.totalAmount || 0;

                return (
                  <button
                    key={`${item.type}-${item.id}`}
                    type="button"
                    onClick={() => handleSelect(item)}
                    className="w-full px-4 py-3 text-left hover:bg-[#F2F2F7]/70 flex items-center justify-between transition-colors group cursor-pointer"
                  >
                    <div className="flex items-center space-x-3 truncate">
                      <div
                        className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                          isCar
                            ? 'bg-[#007AFF]/10 text-[#007AFF] border border-[#007AFF]/20'
                            : 'bg-[#34C759]/10 text-[#34C759] border border-[#34C759]/20'
                        }`}
                      >
                        {isCar ? <Car className="w-4 h-4" /> : <User className="w-4 h-4" />}
                      </div>

                      <div className="truncate">
                        <div className="flex items-center space-x-2">
                          <p className="text-xs font-bold text-[#1D1D1F] tracking-tight group-hover:text-[#007AFF] transition-colors">
                            {item.title}
                          </p>
                          <span
                            className={`px-2 py-0.5 rounded-full text-[9px] font-semibold ${
                              item.status === 'ACTIVE'
                                ? 'bg-[#EAF9EE] text-[#34C759]'
                                : 'bg-[#F2F2F7] text-[#86868B]'
                            }`}
                          >
                            {item.status || 'Active'}
                          </span>
                        </div>
                        <p className="text-[11px] text-[#86868B] truncate mt-0.5">
                          {item.subtitle}
                        </p>
                      </div>
                    </div>

                    <div className="text-right shrink-0 pl-3">
                      <p className="text-[10px] text-[#86868B] flex items-center justify-end space-x-1">
                        <Building2 className="w-3 h-3 text-[#007AFF]" />
                        <span className="font-semibold text-[#1D1D1F] truncate max-w-[110px]">
                          {d.currentCompany || 'Atharva Fleet'}
                        </span>
                      </p>
                      {totalAdvance > 0 && (
                        <p className="text-[10px] text-[#FF9F0A] font-semibold mt-0.5">
                          Advance: {formatCurrency(totalAdvance)}
                        </p>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Comprehensive Vehicle / Driver Detail Modal */}
      {selectedItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-150">
          <div
            className="bg-[#FFFFFF] border border-[#E5E5EA] rounded-[26px] max-w-2xl w-full shadow-2xl max-h-[90vh] flex flex-col overflow-hidden"
            role="dialog"
            aria-modal="true"
          >
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-[#E5E5EA] flex items-start justify-between bg-[#FBFBFC] shrink-0">
              <div className="flex items-center space-x-3.5">
                <div
                  className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 shadow-2xs ${
                    selectedItem.type === 'VEHICLE'
                      ? 'bg-[#007AFF] text-white'
                      : 'bg-[#34C759] text-white'
                  }`}
                >
                  {selectedItem.type === 'VEHICLE' ? (
                    <Car className="w-5 h-5" />
                  ) : (
                    <User className="w-5 h-5" />
                  )}
                </div>

                <div>
                  <div className="flex items-center space-x-2">
                    <h2 className="text-base sm:text-lg font-bold text-[#1D1D1F] tracking-tight">
                      {selectedItem.title}
                    </h2>
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-[#EAF9EE] text-[#34C759] border border-[#D2F4DA]">
                      {selectedItem.status || 'Active'}
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#F2F2F7] text-[#86868B]">
                      {selectedItem.type === 'VEHICLE' ? 'Fleet Vehicle' : 'Registered Driver'}
                    </span>
                  </div>
                  <p className="text-xs text-[#86868B] mt-0.5 font-medium">
                    {selectedItem.subtitle}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedItem(null)}
                className="p-1.5 rounded-full text-[#86868B] hover:text-[#1D1D1F] hover:bg-[#F2F2F7] transition-colors cursor-pointer"
                aria-label="Close details"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Quick Metrics Bar */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-4 border-b border-[#E5E5EA] bg-[#FFFFFF] shrink-0 text-xs">
              <div className="p-2.5 rounded-xl bg-[#F2F2F7]/70 border border-[#E5E5EA]">
                <p className="text-[10px] text-[#86868B] font-medium flex items-center">
                  <Building2 className="w-3 h-3 mr-1 text-[#007AFF]" /> Client Company
                </p>
                <p className="font-bold text-[#1D1D1F] mt-1 truncate">
                  {selectedItem.data.currentCompany || 'Atharva Corporate'}
                </p>
              </div>

              <div className="p-2.5 rounded-xl bg-[#F2F2F7]/70 border border-[#E5E5EA]">
                <p className="text-[10px] text-[#86868B] font-medium flex items-center">
                  <Receipt className="w-3 h-3 mr-1 text-[#34C759]" /> Net Payable
                </p>
                <p className="font-bold text-[#007AFF] mt-1 tabular-nums truncate">
                  {formatCurrency(selectedItem.data.financials?.totalNet)}
                </p>
              </div>

              <div className="p-2.5 rounded-xl bg-[#F2F2F7]/70 border border-[#E5E5EA]">
                <p className="text-[10px] text-[#86868B] font-medium flex items-center">
                  <Banknote className="w-3 h-3 mr-1 text-[#FF9F0A]" /> Total Paid
                </p>
                <p className="font-bold text-[#34C759] mt-1 tabular-nums truncate">
                  {formatCurrency(selectedItem.data.financials?.totalPaid)}
                </p>
              </div>

              <div className="p-2.5 rounded-xl bg-[#FFF5E5] border border-[#FFE4B8]">
                <p className="text-[10px] text-[#FF9F0A] font-bold flex items-center">
                  <Clock className="w-3 h-3 mr-1 text-[#FF9F0A]" /> Early Salary / Adv.
                </p>
                <p className="font-bold text-[#FF9F0A] mt-1 tabular-nums truncate">
                  {formatCurrency(selectedItem.data.earlySalaryAndAdvances?.totalAmount)}
                </p>
              </div>
            </div>

            {/* Navigation Tabs Inside Modal */}
            <div className="flex items-center space-x-1 px-4 pt-3 border-b border-[#E5E5EA] bg-[#FBFBFC] text-xs font-semibold shrink-0 overflow-x-auto">
              {[
                { id: 'OVERVIEW', label: 'Overview' },
                {
                  id: 'ADVANCES',
                  label: `Early Salary & Advances (${selectedItem.data.earlySalaryAndAdvances?.records?.length || 0})`,
                },
                {
                  id: 'PAYMENTS',
                  label: `Payments & Settlements (${selectedItem.data.payments?.length || 0})`,
                },
                {
                  id: 'COMPANIES',
                  label: `Clients (${selectedItem.data.allCompanies?.length || 1})`,
                },
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`px-3 py-2 border-b-2 whitespace-nowrap transition-colors cursor-pointer ${
                    activeTab === tab.id
                      ? 'border-[#007AFF] text-[#007AFF]'
                      : 'border-transparent text-[#86868B] hover:text-[#1D1D1F]'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Modal Body / Tab Content */}
            <div className="p-4 sm:p-6 overflow-y-auto custom-scrollbar flex-1 space-y-4 text-xs">
              {/* TAB 1: OVERVIEW */}
              {activeTab === 'OVERVIEW' && (
                <div className="space-y-4">
                  {/* Driver / Car Relationship Card */}
                  <div className="p-4 rounded-2xl bg-[#FFFFFF] border border-[#E5E5EA] shadow-2xs space-y-3">
                    <h3 className="font-bold text-[#1D1D1F] uppercase tracking-wider text-[11px]">
                      {selectedItem.type === 'VEHICLE' ? 'Driver Assignment' : 'Assigned Vehicle'}
                    </h3>

                    {selectedItem.type === 'VEHICLE' ? (
                      selectedItem.data.currentDriver ? (
                        <div className="flex items-center justify-between p-3 rounded-xl bg-[#F2F2F7]">
                          <div className="flex items-center space-x-3">
                            <div className="w-8 h-8 rounded-full bg-[#007AFF] text-white flex items-center justify-center font-bold">
                              {selectedItem.data.currentDriver.name[0]}
                            </div>
                            <div>
                              <p className="font-bold text-[#1D1D1F]">
                                {selectedItem.data.currentDriver.name}
                              </p>
                              <p className="text-[11px] text-[#86868B]">
                                Phone: {selectedItem.data.currentDriver.phone || 'N/A'} · Status: {selectedItem.data.currentDriver.status}
                              </p>
                            </div>
                          </div>
                          {selectedItem.data.currentDriver.assignedSince && (
                            <span className="text-[10px] text-[#86868B]">
                              Since: {new Date(selectedItem.data.currentDriver.assignedSince).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                      ) : (
                        <p className="text-[#86868B] italic">No driver currently assigned to this vehicle in Driver Master.</p>
                      )
                    ) : (
                      selectedItem.data.currentVehicle ? (
                        <div className="flex items-center justify-between p-3 rounded-xl bg-[#F2F2F7]">
                          <div className="flex items-center space-x-3">
                            <div className="w-8 h-8 rounded-full bg-[#34C759] text-white flex items-center justify-center font-bold">
                              <Car className="w-4 h-4" />
                            </div>
                            <div>
                              <p className="font-bold text-[#1D1D1F]">
                                {selectedItem.data.currentVehicle.registrationNumber}
                              </p>
                              <p className="text-[11px] text-[#86868B]">
                                {selectedItem.data.currentVehicle.make} {selectedItem.data.currentVehicle.model} ({selectedItem.data.currentVehicle.category})
                              </p>
                            </div>
                          </div>
                          <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-[#EAF9EE] text-[#34C759]">
                            {selectedItem.data.currentVehicle.status}
                          </span>
                        </div>
                      ) : (
                        <p className="text-[#86868B] italic">No active vehicle assignment on record.</p>
                      )
                    )}
                  </div>

                  {/* Financial Overview Card */}
                  <div className="p-4 rounded-2xl bg-[#FFFFFF] border border-[#E5E5EA] shadow-2xs space-y-3">
                    <h3 className="font-bold text-[#1D1D1F] uppercase tracking-wider text-[11px]">
                      Payment & Settlement Summary
                    </h3>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      <div className="p-3 rounded-xl bg-[#F2F2F7]/60 border border-[#E5E5EA]">
                        <p className="text-[10px] text-[#86868B]">Total Gross Billing</p>
                        <p className="text-sm font-bold text-[#1D1D1F] mt-0.5 tabular-nums">
                          {formatCurrency(selectedItem.data.financials?.totalGross)}
                        </p>
                      </div>

                      <div className="p-3 rounded-xl bg-[#F2F2F7]/60 border border-[#E5E5EA]">
                        <p className="text-[10px] text-[#86868B]">Total Deductions</p>
                        <p className="text-sm font-bold text-[#FF3B30] mt-0.5 tabular-nums">
                          {formatCurrency(selectedItem.data.financials?.totalDeductions)}
                        </p>
                      </div>

                      <div className="p-3 rounded-xl bg-[#F2F2F7]/60 border border-[#E5E5EA]">
                        <p className="text-[10px] text-[#86868B]">Outstanding Balance</p>
                        <p className="text-sm font-bold text-[#007AFF] mt-0.5 tabular-nums">
                          {formatCurrency(selectedItem.data.financials?.outstandingBalance)}
                        </p>
                      </div>
                    </div>

                    <div className="p-3 rounded-xl bg-[#FBFBFC] border border-[#E5E5EA] flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[11px]">
                      <div>
                        <span className="text-[#86868B]">Bank Details: </span>
                        <span className="font-semibold text-[#1D1D1F]">
                          {selectedItem.data.financials?.bankDetails || 'Registered Bank Account'}
                        </span>
                      </div>
                      <div>
                        <span className="text-[#86868B]">Latest Settlement: </span>
                        <span className="font-semibold text-[#34C759]">
                          {selectedItem.data.financials?.latestPaymentDate || 'Recorded on Statement'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Early Salary / Advance Highlight Banner */}
                  {selectedItem.data.earlySalaryAndAdvances?.totalAmount > 0 && (
                    <div className="p-4 rounded-2xl bg-[#FFF5E5] border border-[#FFE4B8] flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 rounded-full bg-[#FFEECF] text-[#FF9F0A] flex items-center justify-center font-bold shrink-0">
                          <Banknote className="w-4 h-4 text-[#FF9F0A]" />
                        </div>
                        <div>
                          <p className="font-bold text-[#1D1D1F]">
                            Early Salary & Advances Taken: {formatCurrency(selectedItem.data.earlySalaryAndAdvances.totalAmount)}
                          </p>
                          <p className="text-[11px] text-[#86868B]">
                            {selectedItem.data.earlySalaryAndAdvances.records.length} record(s) on file. Deducted against billing settlements.
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setActiveTab('ADVANCES')}
                        className="px-3 py-1.5 rounded-full bg-[#FFFFFF] hover:bg-[#F2F2F7] text-[#FF9F0A] border border-[#FFE4B8] text-[11px] font-bold shrink-0 transition-colors shadow-2xs cursor-pointer"
                      >
                        View Details
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 2: EARLY SALARY & ADVANCES */}
              {activeTab === 'ADVANCES' && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between pb-2 border-b border-[#E5E5EA]">
                    <div>
                      <h3 className="font-bold text-[#1D1D1F] text-sm">
                        Early Salary & Advance Taken Log
                      </h3>
                      <p className="text-[11px] text-[#86868B]">
                        Includes fuel advances, salary advances, and cash disbursements with date and notes
                      </p>
                    </div>
                    <span className="text-sm font-bold text-[#FF9F0A] tabular-nums">
                      Total: {formatCurrency(selectedItem.data.earlySalaryAndAdvances?.totalAmount)}
                    </span>
                  </div>

                  {selectedItem.data.earlySalaryAndAdvances?.records?.length === 0 ? (
                    <div className="p-8 text-center text-[#86868B] bg-[#F2F2F7]/50 rounded-2xl">
                      <p className="font-semibold text-[#1D1D1F]">No Advance Records Found</p>
                      <p className="text-[11px] mt-1">This driver / vehicle has zero early salary or fuel advances on record.</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto border border-[#E5E5EA] rounded-2xl">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-[#FBFBFC] text-[#86868B] border-b border-[#E5E5EA]">
                          <tr>
                            <th className="py-2.5 px-3">Type / Category</th>
                            <th className="py-2.5 px-3">Amount Taken</th>
                            <th className="py-2.5 px-3">Taken Date</th>
                            <th className="py-2.5 px-3">Financial Month</th>
                            <th className="py-2.5 px-3">Notes & Reason</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#E5E5EA]">
                          {selectedItem.data.earlySalaryAndAdvances.records.map((adv: any, i: number) => (
                            <tr key={i} className="hover:bg-[#F2F2F7]/50 transition-colors">
                              <td className="py-2.5 px-3">
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#FFF5E5] text-[#FF9F0A] border border-[#FFE4B8]">
                                  {adv.category}
                                </span>
                              </td>
                              <td className="py-2.5 px-3 font-bold text-[#FF3B30] tabular-nums">
                                {formatCurrency(adv.amount)}
                              </td>
                              <td className="py-2.5 px-3 font-mono text-[#1D1D1F]">
                                {adv.takenDate}
                              </td>
                              <td className="py-2.5 px-3 text-[#86868B]">
                                {adv.periodName}
                              </td>
                              <td className="py-2.5 px-3 text-[#86868B] italic">
                                {adv.notes}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 3: PAYMENTS & SETTLEMENTS */}
              {activeTab === 'PAYMENTS' && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between pb-2 border-b border-[#E5E5EA]">
                    <div>
                      <h3 className="font-bold text-[#1D1D1F] text-sm">
                        Payment & Disbursement History
                      </h3>
                      <p className="text-[11px] text-[#86868B]">
                        Official settlements, payment modes, bank remarks & reference numbers
                      </p>
                    </div>
                    <span className="text-sm font-bold text-[#34C759] tabular-nums">
                      Total Disbursed: {formatCurrency(selectedItem.data.financials?.totalPaid)}
                    </span>
                  </div>

                  {selectedItem.data.payments?.length === 0 ? (
                    <div className="p-8 text-center text-[#86868B] bg-[#F2F2F7]/50 rounded-2xl">
                      <p className="font-semibold text-[#1D1D1F]">No Direct Payment Transactions Recorded</p>
                      <p className="text-[11px] mt-1">Payment records are logged when monthly settlements are approved.</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto border border-[#E5E5EA] rounded-2xl">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-[#FBFBFC] text-[#86868B] border-b border-[#E5E5EA]">
                          <tr>
                            <th className="py-2.5 px-3">Date</th>
                            <th className="py-2.5 px-3">Amount</th>
                            <th className="py-2.5 px-3">Mode</th>
                            <th className="py-2.5 px-3">Bank / Account</th>
                            <th className="py-2.5 px-3">Remarks / Reference</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#E5E5EA]">
                          {selectedItem.data.payments.map((p: any, i: number) => (
                            <tr key={i} className="hover:bg-[#F2F2F7]/50 transition-colors">
                              <td className="py-2.5 px-3 font-mono text-[#1D1D1F]">
                                {p.paymentDate || 'N/A'}
                              </td>
                              <td className="py-2.5 px-3 font-bold text-[#34C759] tabular-nums">
                                {formatCurrency(p.amount)}
                              </td>
                              <td className="py-2.5 px-3">
                                <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-[#F2F2F7] text-[#1D1D1F]">
                                  {p.paymentMode}
                                </span>
                              </td>
                              <td className="py-2.5 px-3 text-[#1D1D1F]">
                                {p.bankName}
                              </td>
                              <td className="py-2.5 px-3 text-[#86868B]">
                                {p.remarks} {p.referenceNumber ? `(Ref: ${p.referenceNumber})` : ''}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 4: CLIENT COMPANIES */}
              {activeTab === 'COMPANIES' && (
                <div className="space-y-3">
                  <div className="pb-2 border-b border-[#E5E5EA]">
                    <h3 className="font-bold text-[#1D1D1F] text-sm">
                      Client Companies Operating For
                    </h3>
                    <p className="text-[11px] text-[#86868B]">
                      Corporate accounts, clients, and distribution of trips/billing generated
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {selectedItem.data.allCompanies?.map((comp: any, i: number) => (
                      <div
                        key={i}
                        className="p-3.5 rounded-2xl bg-[#F2F2F7]/60 border border-[#E5E5EA] flex items-center justify-between"
                      >
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 rounded-xl bg-[#007AFF]/10 text-[#007AFF] flex items-center justify-center font-bold shrink-0">
                            <Building2 className="w-4 h-4" />
                          </div>
                          <div>
                            <p className="font-bold text-[#1D1D1F]">{comp.companyName}</p>
                            <p className="text-[10px] text-[#86868B]">
                              Total recorded trips/km: {comp.trips}
                            </p>
                          </div>
                        </div>
                        <span className="font-bold text-[#007AFF] tabular-nums">
                          {formatCurrency(comp.billing)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-3 sm:p-4 border-t border-[#E5E5EA] bg-[#FBFBFC] flex items-center justify-between shrink-0">
              <span className="text-[11px] text-[#86868B]">
                ATHARVA TRAVELS Internal Intelligence · Read-Only Verification
              </span>
              <button
                type="button"
                onClick={() => setSelectedItem(null)}
                className="px-5 py-2 rounded-full bg-[#1D1D1F] hover:bg-[#333336] text-white text-xs font-semibold shadow-apple-btn transition-colors cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

