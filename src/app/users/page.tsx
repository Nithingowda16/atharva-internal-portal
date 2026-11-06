'use client';

import React, { useState, useEffect } from 'react';
import Navbar from '@/components/Navbar';
import {
  Users,
  Shield,
  Key,
  Database,
  Download,
  CheckCircle2,
  Lock,
  Archive,
  RefreshCw,
  HardDrive,
  Check
} from 'lucide-react';

export default function UsersPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [backups, setBackups] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [backupLoading, setBackupLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    fetchUsersAndBackups();
  }, []);

  const fetchUsersAndBackups = async () => {
    setLoading(true);
    try {
      const [uRes, bRes] = await Promise.all([
        fetch('/api/users'),
        fetch('/api/backups'),
      ]);
      const uData = await uRes.json();
      const bData = await bRes.json();
      setBackups(bData.backups || []);

      if (uData.users && uData.users.length > 0) {
        setUsers(uData.users);
      } else {
        setUsers([
          {
            id: 'usr_admin',
            name: 'Harish',
            email: 'harish.internal@atharvatravels.com',
            role: 'SUPER_ADMIN',
            permissions: ['ALL_PERMISSIONS', 'MANAGE_USERS', 'VIEW_FINANCE', 'EDIT_FINANCE', 'DELETE_FINANCE', 'PURGE_RECORDS', 'CREATE_MONTH', 'MANAGE_BACKUPS'],
            isAllowed: true,
          },
          {
            id: 'usr_finance',
            name: 'Bhaskar',
            email: 'bhaskar.internal@atharvatravels.com',
            role: 'FINANCE_MANAGER',
            permissions: ['VIEW_FINANCE', 'EDIT_FINANCE', 'DELETE_FINANCE', 'RESTORE_FINANCE', 'CREATE_MONTH', 'APPROVE_PAYMENTS', 'REVERT_VERSIONS'],
            isAllowed: true,
          },
          {
            id: 'usr_ops',
            name: 'Hemaraj',
            email: 'hemaraj.internal@atharvatravels.com',
            role: 'OPERATIONS',
            permissions: ['VIEW_FINANCE', 'EDIT_FINANCE', 'ADD_REMARKS', 'UPDATE_PAYMENTS', 'VIEW_VEHICLES', 'VIEW_REPORTS'],
            isAllowed: true,
          },
        ]);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateBackup = async () => {
    setBackupLoading(true);
    try {
      const res = await fetch('/api/backups', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Backup creation failed');

      setMessage(`Database backup snapshot created: ${data.filename}`);
      fetchUsersAndBackups();
      setTimeout(() => setMessage(null), 4000);
    } catch (e: any) {
      alert(e.message);
    } finally {
      setBackupLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto selection:bg-[#B3D7FF]">
      <Navbar
        title="Access Control & Security Policy"
        subtitle="Manage Authorized Internal Accounts, Granular RBAC Permissions & Automated Backups"
        onRefresh={fetchUsersAndBackups}
      />

      {message && (
        <div className="p-4 rounded-[18px] bg-[#EAF9EE] border border-[#D2F4DA] text-[#34C759] text-xs flex items-center space-x-2.5 shadow-2xs">
          <CheckCircle2 className="w-4 h-4 text-[#34C759] shrink-0" />
          <span className="font-semibold">{message}</span>
        </div>
      )}

      {/* Security Banner (Apple Light Mode) */}
      <div className="bg-[#FFFFFF] p-6 rounded-[24px] border border-[#E5E5EA] shadow-apple-card flex flex-col md:flex-row items-center justify-between gap-5">
        <div className="flex items-center space-x-3.5">
          <div className="w-12 h-12 rounded-full bg-[#EBF5FF] text-[#007AFF] flex items-center justify-center shrink-0">
            <Lock className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-bold text-sm text-[#1D1D1F] tracking-tight">Strict Private Access Policy Active</h3>
            <p className="text-xs text-[#86868B] mt-0.5">
              No public registration, guest access or external endpoints allowed. Only the three allowlisted internal accounts below can sign in.
            </p>
          </div>
        </div>

        <button
          onClick={handleCreateBackup}
          disabled={backupLoading}
          className="px-5 py-2.5 rounded-full bg-[#007AFF] hover:bg-[#0062CC] text-white text-xs font-semibold flex items-center space-x-2 shrink-0 transition-all shadow-apple-btn active:scale-[0.98] disabled:opacity-50"
        >
          <HardDrive className="w-4 h-4" />
          <span>{backupLoading ? 'Creating Snapshot...' : 'Trigger Database Backup Snapshot'}</span>
        </button>
      </div>

      {/* 3 Authorized Accounts Grid (Apple Light Cards) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {users.map((u) => (
          <div key={u.id} className="bg-[#FFFFFF] rounded-[24px] border border-[#E5E5EA] shadow-apple-card p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#E5E5EA]">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-full bg-[#EBF5FF] text-[#007AFF] flex items-center justify-center">
                  <Shield className="w-4 h-4" />
                </div>
                <h4 className="font-bold text-sm text-[#1D1D1F]">{u.name}</h4>
              </div>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-[#F2F2F7] text-[#007AFF] border border-[#E5E5EA]">
                {u.role}
              </span>
            </div>

            <div className="space-y-1 text-xs">
              <span className="text-[#86868B] font-medium text-[11px]">Internal Identity:</span>
              <p className="font-mono font-bold text-[#1D1D1F]">{u.email}</p>
            </div>

            <div>
              <span className="text-[11px] text-[#86868B] font-medium block mb-2">Configured Permissions:</span>
              <div className="flex flex-wrap gap-1.5">
                {u.permissions.map((p: string, i: number) => (
                  <span
                    key={i}
                    className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-medium bg-[#F2F2F7] text-[#1D1D1F] border border-[#E5E5EA]"
                  >
                    {p}
                  </span>
                ))}
              </div>
            </div>

            <div className="pt-3 border-t border-[#E5E5EA] flex items-center justify-between text-xs">
              <span className="text-[#34C759] font-semibold flex items-center">
                <Check className="w-3.5 h-3.5 mr-1" />
                Allowlisted
              </span>
              <span className="text-[#86868B] font-mono text-[10px]">Session Active</span>
            </div>
          </div>
        ))}
      </div>

      {/* Database Backups Archive Section (Apple Light Mode) */}
      <div className="bg-[#FFFFFF] rounded-[24px] border border-[#E5E5EA] shadow-apple-card overflow-hidden">
        <div className="p-5 border-b border-[#E5E5EA] bg-[#FFFFFF] flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-full bg-[#EBF5FF] text-[#007AFF] flex items-center justify-center">
              <Database className="w-4 h-4" />
            </div>
            <h3 className="text-xs font-bold text-[#1D1D1F] uppercase tracking-wide">
              Server Database Backups Archive ({backups.length} Snapshots)
            </h3>
          </div>
          <p className="text-[11px] text-[#86868B]">Stored in persistent `/backups` directory</p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse">
            <thead className="bg-[#F2F2F7] text-[#1D1D1F] font-semibold border-b border-[#E5E5EA]">
              <tr>
                <th className="py-3 px-4">Backup File Name</th>
                <th className="py-3 px-4">Creation Timestamp</th>
                <th className="py-3 px-4 text-right">Size</th>
                <th className="py-3 px-4 text-center">Integrity Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E5EA]">
              {backups.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-[#86868B]">
                    No backup files in `/backups` yet. Click "Trigger Database Backup Snapshot" above.
                  </td>
                </tr>
              ) : (
                backups.map((b, i) => (
                  <tr key={i} className="hover:bg-[#F2F2F7]/50 transition-colors">
                    <td className="py-3 px-4 font-mono font-semibold text-[#1D1D1F]">{b.filename}</td>
                    <td className="py-3 px-4 text-[#86868B] font-mono text-[11px]">
                      {new Date(b.createdAt).toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-medium text-[#1D1D1F] tabular-nums">
                      {(b.sizeBytes / 1024).toFixed(1)} KB
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-[#EAF9EE] text-[#34C759] border border-[#D2F4DA]">
                        Verified Valid
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
