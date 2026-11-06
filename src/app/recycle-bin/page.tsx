'use client';

import React, { useState, useEffect } from 'react';
import Navbar from '@/components/Navbar';
import {
  Trash2,
  RotateCcw,
  AlertTriangle,
  Search,
  ShieldAlert,
  CheckCircle2,
  X
} from 'lucide-react';

export default function RecycleBinPage() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    fetchBin();
  }, []);

  const fetchBin = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/recycle-bin');
      const data = await res.json();
      setItems(data.items || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleRestore = async (id: string) => {
    setActionLoading(id);
    try {
      const res = await fetch('/api/recycle-bin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemId: id, action: 'RESTORE' }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Restore failed');

      setMessage('Item restored successfully to active database.');
      fetchBin();
      setTimeout(() => setMessage(null), 3000);
    } catch (e: any) {
      alert(e.message);
    } finally {
      setActionLoading(null);
    }
  };

  const handlePurge = async (id: string) => {
    if (!confirm('CAUTION: Permanent purge will permanently delete this record from the database. Are you sure?')) {
      return;
    }

    setActionLoading(id);
    try {
      const res = await fetch('/api/recycle-bin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemId: id, action: 'PURGE' }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Purge failed');

      setMessage('Item permanently purged from database.');
      fetchBin();
      setTimeout(() => setMessage(null), 3000);
    } catch (e: any) {
      alert(e.message);
    } finally {
      setActionLoading(null);
    }
  };

  const filtered = items.filter(
    (it) =>
      it.displayName.toLowerCase().includes(search.toLowerCase()) ||
      it.entityType.toLowerCase().includes(search.toLowerCase()) ||
      it.deletedByEmail.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6 max-w-7xl mx-auto selection:bg-[#B3D7FF]">
      <Navbar
        title="Recycle Bin & Data Recovery"
        subtitle="Safely Restore Accidentally Deleted Vehicles, Monthly Records, Billing Lines & Adjustments"
        onRefresh={fetchBin}
      />

      {message && (
        <div className="p-4 rounded-[18px] bg-[#EAF9EE] border border-[#D2F4DA] text-[#34C759] text-xs flex items-center space-x-2.5 shadow-2xs">
          <CheckCircle2 className="w-4 h-4 text-[#34C759] shrink-0" />
          <span className="font-semibold">{message}</span>
        </div>
      )}

      {/* Apple Styled Filter & Action Toolbar */}
      <div className="bg-[#FFFFFF] p-4 rounded-[22px] border border-[#E5E5EA] shadow-apple-card flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-[#86868B] absolute left-3.5 top-3" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search deleted item, vehicle or user..."
            className="w-full pl-9 pr-4 py-2 bg-[#F2F2F7] border border-[#E5E5EA] rounded-full text-xs text-[#1D1D1F] focus:bg-[#FFFFFF] focus:outline-hidden focus:ring-2 focus:ring-[#007AFF] transition-all"
          />
        </div>

        <p className="text-xs text-[#86868B] font-medium">
          Soft-deleted items are safely preserved here and can be restored at any time.
        </p>
      </div>

      {/* Apple Styled Table Card */}
      <div className="bg-[#FFFFFF] rounded-[24px] border border-[#E5E5EA] shadow-apple-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse">
            <thead className="bg-[#F2F2F7] text-[#1D1D1F] font-semibold border-b border-[#E5E5EA]">
              <tr>
                <th className="py-3 px-4">Deleted Item / Record</th>
                <th className="py-3 px-3">Entity Type</th>
                <th className="py-3 px-4">Deleted By</th>
                <th className="py-3 px-4">Deleted Timestamp</th>
                <th className="py-3 px-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E5EA]">
              {loading ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-[#86868B]">
                    Loading recycle bin items...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-[#86868B]">
                    Recycle bin is clean. No soft-deleted records found.
                  </td>
                </tr>
              ) : (
                filtered.map((item) => (
                  <tr key={item.id} className="hover:bg-[#F2F2F7]/50 transition-colors">
                    <td className="py-3.5 px-4 font-bold text-[#1D1D1F]">{item.displayName}</td>
                    <td className="py-3.5 px-3">
                      <span className="px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-[#F2F2F7] text-[#1D1D1F] border border-[#E5E5EA]">
                        {item.entityType}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-mono text-[11px] text-[#86868B]">{item.deletedByEmail}</td>
                    <td className="py-3.5 px-4 text-[#86868B] font-mono text-[11px]">
                      {new Date(item.deletedAt).toLocaleString()}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <div className="flex items-center justify-center space-x-2">
                        {/* Apple Green Pill Restore Button (Matches Approve Pill Style) */}
                        <button
                          onClick={() => handleRestore(item.id)}
                          disabled={actionLoading === item.id}
                          className="px-4 py-1.5 rounded-full bg-[#34C759] hover:bg-[#2FB34F] text-white text-xs font-semibold flex items-center space-x-1.5 shadow-apple-btn transition-all active:scale-[0.98]"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          <span>Restore</span>
                        </button>
                        {/* Apple Red Pill Delete/Purge Button (Matches Delete Pill Style) */}
                        <button
                          onClick={() => handlePurge(item.id)}
                          disabled={actionLoading === item.id}
                          className="px-4 py-1.5 rounded-full bg-[#FF3B30] hover:bg-[#E02D23] text-white text-xs font-semibold flex items-center space-x-1.5 shadow-apple-btn transition-all active:scale-[0.98]"
                          title="Permanently Purge Record (Super Admin Only)"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Delete</span>
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
    </div>
  );
}
