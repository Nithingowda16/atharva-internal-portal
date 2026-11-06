'use client';

import React, { useState, useEffect } from 'react';
import Navbar from '@/components/Navbar';
import {
  History,
  Search,
  Filter,
  Download,
  ShieldCheck,
  User,
  Clock,
  Eye,
  X
} from 'lucide-react';
import { exportToExcel, exportToCSV } from '@/lib/exportUtils';

export default function AuditPage() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionFilter, setActionFilter] = useState('ALL');
  const [moduleFilter, setModuleFilter] = useState('ALL');
  const [search, setSearch] = useState('');
  const [selectedLog, setSelectedLog] = useState<any | null>(null);

  useEffect(() => {
    fetchLogs();
  }, [actionFilter, moduleFilter]);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      let url = '/api/audit?';
      if (actionFilter !== 'ALL') url += `action=${actionFilter}&`;
      if (moduleFilter !== 'ALL') url += `module=${moduleFilter}&`;
      const res = await fetch(url);
      const data = await res.json();
      setLogs(data.logs || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const filtered = logs.filter((l) => {
    const matchesSearch =
      l.userEmail.toLowerCase().includes(search.toLowerCase()) ||
      l.entityType.toLowerCase().includes(search.toLowerCase()) ||
      (l.reason && l.reason.toLowerCase().includes(search.toLowerCase()));
    return matchesSearch;
  });

  const handleExport = (format: 'xlsx' | 'csv') => {
    const exportData = filtered.map((l) => ({
      Timestamp: new Date(l.createdAt).toLocaleString(),
      'User Account': l.userEmail,
      Action: l.action,
      Module: l.module,
      'Entity Type': l.entityType,
      'Entity ID': l.entityId || 'N/A',
      Reason: l.reason || '',
      'IP Address': l.ipAddress || 'Internal',
    }));

    if (format === 'xlsx') exportToExcel(exportData, 'Audit History', 'Atharva_Audit_Logs');
    else exportToCSV(exportData, 'Atharva_Audit_Logs');
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto selection:bg-[#B3D7FF]">
      <Navbar
        title="Enterprise Compliance & Audit Logs"
        subtitle="Immutable Server-Side Audit Trail of Every Create, Edit, Delete, Restore, Revert & Settlement"
        onRefresh={fetchLogs}
      />

      {/* Apple Styled Filter & Action Toolbar */}
      <div className="bg-[#FFFFFF] p-4 rounded-[22px] border border-[#E5E5EA] shadow-apple-card flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 text-[#86868B] absolute left-3.5 top-3" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search user, entity or reason..."
              className="w-full pl-9 pr-4 py-2 bg-[#F2F2F7] border border-[#E5E5EA] rounded-full text-xs text-[#1D1D1F] focus:bg-[#FFFFFF] focus:outline-hidden focus:ring-2 focus:ring-[#007AFF] transition-all"
            />
          </div>

          <div className="flex items-center space-x-2">
            <span className="text-xs text-[#86868B] font-medium">Action:</span>
            <select
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value)}
              className="px-3 py-2 bg-[#F2F2F7] border border-[#E5E5EA] rounded-full text-xs font-medium text-[#1D1D1F] focus:outline-hidden focus:ring-2 focus:ring-[#007AFF] transition-all cursor-pointer"
            >
              <option value="ALL">All Actions</option>
              <option value="CREATE">CREATE</option>
              <option value="UPDATE">UPDATE</option>
              <option value="DELETE">DELETE</option>
              <option value="RESTORE">RESTORE</option>
              <option value="REVERT">REVERT</option>
              <option value="CLONE_MONTH">CLONE_MONTH</option>
              <option value="LOGIN">LOGIN</option>
            </select>
          </div>

          <div className="flex items-center space-x-2">
            <span className="text-xs text-[#86868B] font-medium">Module:</span>
            <select
              value={moduleFilter}
              onChange={(e) => setModuleFilter(e.target.value)}
              className="px-3 py-2 bg-[#F2F2F7] border border-[#E5E5EA] rounded-full text-xs font-medium text-[#1D1D1F] focus:outline-hidden focus:ring-2 focus:ring-[#007AFF] transition-all cursor-pointer"
            >
              <option value="ALL">All Modules</option>
              <option value="MONTHLY_FINANCE">MONTHLY_FINANCE</option>
              <option value="VEHICLES">VEHICLES</option>
              <option value="PAYMENTS">PAYMENTS</option>
              <option value="USERS">USERS</option>
              <option value="EXCEL_IMPORT">EXCEL_IMPORT</option>
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
        </div>
      </div>

      {/* Audit Table Card */}
      <div className="bg-[#FFFFFF] rounded-[24px] border border-[#E5E5EA] shadow-apple-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse">
            <thead className="bg-[#F2F2F7] text-[#1D1D1F] font-semibold border-b border-[#E5E5EA]">
              <tr>
                <th className="py-3 px-4">Date & Time</th>
                <th className="py-3 px-4">User Account</th>
                <th className="py-3 px-3 text-center">Action</th>
                <th className="py-3 px-3">Module</th>
                <th className="py-3 px-3">Entity Type</th>
                <th className="py-3 px-6">Reason for Change / Operation</th>
                <th className="py-3 px-3 text-center">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E5EA]">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-[#86868B]">
                    Loading audit trail...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-[#86868B]">
                    No audit records found.
                  </td>
                </tr>
              ) : (
                filtered.map((l) => {
                  const isDelete = l.action === 'DELETE';
                  const isRestore = l.action === 'RESTORE';
                  const isRevert = l.action === 'REVERT';
                  const isCreate = l.action === 'CREATE' || l.action === 'CLONE_MONTH';

                  return (
                    <tr key={l.id} className="hover:bg-[#F2F2F7]/50 transition-colors">
                      <td className="py-3 px-4 text-[#86868B] font-mono text-[11px] whitespace-nowrap">
                        {new Date(l.createdAt).toLocaleString()}
                      </td>
                      <td className="py-3 px-4 font-semibold text-[#1D1D1F] font-mono text-[11px]">
                        {l.userEmail}
                      </td>
                      <td className="py-3 px-3 text-center">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase border ${
                            isDelete
                              ? 'bg-[#FFF0EF] text-[#FF3B30] border-[#FFD0CE]'
                              : isRestore
                              ? 'bg-[#EAF9EE] text-[#34C759] border-[#D2F4DA]'
                              : isRevert
                              ? 'bg-[#F5EEFF] text-[#AF52DE] border-[#E8D4FF]'
                              : isCreate
                              ? 'bg-[#EBF5FF] text-[#007AFF] border-[#CCE4FF]'
                              : 'bg-[#F2F2F7] text-[#86868B] border-[#E5E5EA]'
                          }`}
                        >
                          {l.action}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-[#1D1D1F] font-medium">{l.module}</td>
                      <td className="py-3 px-3 text-[#86868B] font-mono text-[11px]">{l.entityType}</td>
                      <td className="py-3 px-6 text-[#1D1D1F] font-medium truncate max-w-sm">
                        {l.reason || '-'}
                      </td>
                      <td className="py-3 px-3 text-center">
                        <button
                          onClick={() => setSelectedLog(l)}
                          className="w-7 h-7 rounded-full bg-[#F2F2F7] hover:bg-[#E5E5EA] text-[#86868B] hover:text-[#007AFF] flex items-center justify-center transition-colors mx-auto"
                          title="View JSON Snapshot"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Snapshot Modal (Strict Light Mode) */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#1D1D1F]/20 backdrop-blur-md p-4 animate-in fade-in duration-200">
          <div className="bg-[#FFFFFF] rounded-[24px] shadow-2xl border border-[#E5E5EA] max-w-xl w-full max-h-[85vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="px-6 py-5 border-b border-[#E5E5EA] bg-[#FFFFFF] flex items-center justify-between shrink-0">
              <h3 className="font-bold text-sm text-[#1D1D1F] tracking-tight">
                Audit Snapshot: {selectedLog.action} on {selectedLog.entityType}
              </h3>
              <button
                onClick={() => setSelectedLog(null)}
                className="w-8 h-8 rounded-full bg-[#F2F2F7] hover:bg-[#E5E5EA] text-[#86868B] hover:text-[#1D1D1F] flex items-center justify-center transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4 text-xs font-mono">
              {selectedLog.previousState && (
                <div>
                  <p className="font-bold text-[#1D1D1F] font-sans mb-1.5 text-xs">Previous State:</p>
                  <pre className="p-4 rounded-[16px] bg-[#F2F2F7] border border-[#E5E5EA] text-[#1D1D1F] overflow-x-auto text-[11px] leading-relaxed">
                    {JSON.stringify(JSON.parse(selectedLog.previousState), null, 2)}
                  </pre>
                </div>
              )}

              {selectedLog.newState && (
                <div>
                  <p className="font-bold text-[#1D1D1F] font-sans mb-1.5 text-xs">Updated State:</p>
                  <pre className="p-4 rounded-[16px] bg-[#F2F2F7] border border-[#E5E5EA] text-[#1D1D1F] overflow-x-auto text-[11px] leading-relaxed">
                    {JSON.stringify(JSON.parse(selectedLog.newState), null, 2)}
                  </pre>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
