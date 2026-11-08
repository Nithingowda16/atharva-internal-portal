'use client';

import React, { useState, useEffect } from 'react';
import Navbar from '@/components/Navbar';
import Link from 'next/link';
import {
  Users,
  Shield,
  Key,
  Database,
  CheckCircle2,
  Lock,
  RefreshCw,
  HardDrive,
  Plus,
  Edit2,
  Trash2,
  AlertTriangle,
  X,
  History,
  KeyRound,
  Check,
  UserX,
  UserCheck
} from 'lucide-react';

export default function UsersPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [accessDenied, setAccessDenied] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Modals
  const [isAddUserOpen, setIsAddUserOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<any | null>(null);
  const [resetPasswordUser, setResetPasswordUser] = useState<any | null>(null);
  const [newPassword, setNewPassword] = useState('');

  // Form
  const [userForm, setUserForm] = useState({
    name: '',
    email: '',
    role: 'VIEWER',
    password: '',
  });

  const [submitting, setSubmitting] = useState(false);
  const [backupLoading, setBackupLoading] = useState(false);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    setAccessDenied(false);
    try {
      const res = await fetch('/api/users');
      if (res.status === 403 || res.status === 401) {
        setAccessDenied(true);
        return;
      }
      const data = await res.json();
      if (data.users) {
        setUsers(data.users);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userForm),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage({ text: data.error || 'Failed to create user', type: 'error' });
        return;
      }
      setMessage({ text: `Account for ${data.user.name} created successfully!`, type: 'success' });
      setIsAddUserOpen(false);
      setUserForm({ name: '', email: '', role: 'VIEWER', password: '' });
      fetchUsers();
    } catch (err: any) {
      setMessage({ text: err.message || 'Error creating user', type: 'error' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    setSubmitting(true);
    try {
      const res = await fetch('/api/users', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingUser),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage({ text: data.error || 'Failed to update user', type: 'error' });
        return;
      }
      setMessage({ text: `Account for ${data.user.name} updated!`, type: 'success' });
      setEditingUser(null);
      fetchUsers();
    } catch (err: any) {
      setMessage({ text: err.message || 'Error updating user', type: 'error' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleStatus = async (user: any) => {
    const action = user.isAllowed ? 'deactivate' : 'activate';
    if (!confirm(`Are you sure you want to ${action} ${user.name}'s account?`)) return;

    try {
      const res = await fetch('/api/users', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: user.id, isAllowed: !user.isAllowed }),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || 'Failed to update status');
        return;
      }
      fetchUsers();
    } catch (e) {
      console.error(e);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetPasswordUser || !newPassword) return;
    setSubmitting(true);
    try {
      const res = await fetch('/api/users', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: resetPasswordUser.id, newPassword }),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || 'Failed to reset password');
        return;
      }
      setMessage({ text: `Password for ${resetPasswordUser.name} updated successfully!`, type: 'success' });
      setResetPasswordUser(null);
      setNewPassword('');
    } catch (err: any) {
      alert(err.message || 'Error updating password');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateBackup = async () => {
    setBackupLoading(true);
    try {
      const res = await fetch('/api/backups', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Backup failed');
      setMessage({ text: `Database backup snapshot created: ${data.filename}`, type: 'success' });
    } catch (e: any) {
      setMessage({ text: e.message || 'Backup failed', type: 'error' });
    } finally {
      setBackupLoading(false);
    }
  };

  if (accessDenied) {
    return (
      <div className="space-y-6 max-w-4xl mx-auto selection:bg-[#B3D7FF] py-16 text-center">
        <div className="w-16 h-16 rounded-full bg-[#FEECEB] text-[#FF3B30] flex items-center justify-center mx-auto mb-4">
          <Lock className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-[#1D1D1F]">Access Restricted – Administrator Only</h2>
        <p className="text-xs text-[#86868B] max-w-md mx-auto">
          User Management and security administration can only be accessed by the Super Admin. View-only accounts are restricted from this area.
        </p>
        <div className="pt-4">
          <Link
            href="/dashboard"
            className="px-6 py-2.5 rounded-full text-xs font-semibold bg-[#007AFF] text-white hover:bg-[#0062CC] shadow-apple-btn inline-block"
          >
            Return to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto selection:bg-[#B3D7FF] pb-12">
      <Navbar
        title="User & Access Control Management"
        subtitle="Administrator RBAC Policy, Authorized Accounts & Security Credential Management"
        onRefresh={fetchUsers}
      />

      {message && (
        <div
          className={`p-4 rounded-[18px] text-xs flex items-center justify-between shadow-2xs ${
            message.type === 'success'
              ? 'bg-[#EAF9EE] border border-[#D2F4DA] text-[#34C759]'
              : 'bg-[#FEECEB] border border-[#FCD3D1] text-[#FF3B30]'
          }`}
        >
          <div className="flex items-center space-x-2">
            {message.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
            <span className="font-semibold">{message.text}</span>
          </div>
          <button onClick={() => setMessage(null)} className="hover:opacity-75">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Security Policy Card */}
      <div className="bg-[#FFFFFF] p-6 rounded-[24px] border border-[#E5E5EA] shadow-apple-card flex flex-col md:flex-row items-center justify-between gap-5">
        <div className="flex items-center space-x-3.5">
          <div className="w-12 h-12 rounded-full bg-[#EBF5FF] text-[#007AFF] flex items-center justify-center shrink-0">
            <Lock className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-bold text-sm text-[#1D1D1F] tracking-tight">Strict Private Access Policy Active</h3>
            <p className="text-xs text-[#86868B] mt-0.5">
              Public registration disabled. Only verified accounts provisioned by the Super Admin can access this internal portal.
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2.5">
          <button
            onClick={handleCreateBackup}
            disabled={backupLoading}
            className="px-4 py-2 rounded-full border border-[#E5E5EA] bg-[#FFFFFF] hover:bg-[#F2F2F7] text-[#1D1D1F] text-xs font-semibold flex items-center space-x-1.5 transition-colors shadow-2xs disabled:opacity-50"
          >
            <HardDrive className="w-3.5 h-3.5 text-[#86868B]" />
            <span>{backupLoading ? 'Backing up...' : 'Snapshot DB'}</span>
          </button>
          <button
            onClick={() => {
              setUserForm({ name: '', email: '', role: 'VIEWER', password: '' });
              setIsAddUserOpen(true);
            }}
            className="px-5 py-2 rounded-full bg-[#007AFF] hover:bg-[#0062CC] text-white text-xs font-semibold flex items-center space-x-1.5 shadow-apple-btn transition-all active:scale-[0.98]"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Create Authorized Account</span>
          </button>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-[#FFFFFF] rounded-[24px] border border-[#E5E5EA] shadow-apple-card overflow-hidden">
        <div className="p-4 border-b border-[#E5E5EA] flex items-center justify-between">
          <div>
            <h4 className="font-bold text-sm text-[#1D1D1F]">Authorized Portal Accounts ({users.length})</h4>
            <p className="text-xs text-[#86868B]">Strict server-enforced role-based access control</p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse">
            <thead className="bg-[#F2F2F7] text-[#1D1D1F] font-semibold border-b border-[#E5E5EA]">
              <tr>
                <th className="py-3 px-4">User Name</th>
                <th className="py-3 px-4">Email Address</th>
                <th className="py-3 px-4">Role & Authority</th>
                <th className="py-3 px-4">Account Status</th>
                <th className="py-3 px-4">Last Login</th>
                <th className="py-3 px-4">Created Date</th>
                <th className="py-3 px-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E5EA]">
              {loading && users.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-[#86868B]">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-[#007AFF]" />
                    <span>Loading authorized accounts...</span>
                  </td>
                </tr>
              ) : (
                users.map((u) => {
                  const isSuper = u.role === 'SUPER_ADMIN';
                  return (
                    <tr key={u.id} className="hover:bg-[#F2F2F7]/50 transition-colors">
                      {/* Name */}
                      <td className="py-3.5 px-4 font-semibold text-[#1D1D1F]">
                        <div className="flex items-center space-x-2.5">
                          <div className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs ${
                            isSuper ? 'bg-[#EBF5FF] text-[#007AFF]' : 'bg-[#F2F2F7] text-[#86868B]'
                          }`}>
                            {u.name.charAt(0)}
                          </div>
                          <span>{u.name}</span>
                        </div>
                      </td>

                      {/* Email */}
                      <td className="py-3.5 px-4 font-mono text-xs text-[#1D1D1F]">
                        {u.email}
                      </td>

                      {/* Role */}
                      <td className="py-3.5 px-4">
                        {isSuper ? (
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#EBF5FF] text-[#007AFF] border border-[#B3D7FF]">
                            SUPER ADMIN (Full Access)
                          </span>
                        ) : (
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-[#F2F2F7] text-[#86868B] border border-[#E5E5EA]">
                            VIEWER (Read-Only)
                          </span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4">
                        {u.isAllowed ? (
                          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[#EAF9EE] text-[#34C759] border border-[#D2F4DA]">
                            Active
                          </span>
                        ) : (
                          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[#FEECEB] text-[#FF3B30] border border-[#FCD3D1]">
                            Disabled
                          </span>
                        )}
                      </td>

                      {/* Last Login */}
                      <td className="py-3.5 px-4 text-[#86868B] text-[11px] font-mono">
                        {u.lastLogin ? new Date(u.lastLogin).toLocaleString('en-IN') : 'Never logged in'}
                      </td>

                      {/* Created Date */}
                      <td className="py-3.5 px-4 text-[#86868B] text-[11px] font-mono">
                        {new Date(u.createdAt).toLocaleDateString('en-IN')}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-center">
                        <div className="flex items-center justify-center space-x-1.5">
                          {/* Edit User */}
                          <button
                            onClick={() => setEditingUser(u)}
                            className="p-1.5 text-[#86868B] hover:text-[#007AFF] hover:bg-[#EBF5FF] rounded-full transition-colors"
                            title="Edit Role & Details"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>

                          {/* Reset Password */}
                          <button
                            onClick={() => {
                              setResetPasswordUser(u);
                              setNewPassword('');
                            }}
                            className="p-1.5 text-[#86868B] hover:text-[#007AFF] hover:bg-[#EBF5FF] rounded-full transition-colors"
                            title="Reset Password"
                          >
                            <KeyRound className="w-3.5 h-3.5" />
                          </button>

                          {/* Toggle Active / Inactive */}
                          <button
                            onClick={() => handleToggleStatus(u)}
                            className={`p-1.5 rounded-full transition-colors ${
                              u.isAllowed
                                ? 'text-[#86868B] hover:text-[#FF3B30] hover:bg-[#FEECEB]'
                                : 'text-[#86868B] hover:text-[#34C759] hover:bg-[#EAF9EE]'
                            }`}
                            title={u.isAllowed ? 'Deactivate Account' : 'Activate Account'}
                          >
                            {u.isAllowed ? <UserX className="w-3.5 h-3.5" /> : <UserCheck className="w-3.5 h-3.5" />}
                          </button>

                          {/* Audit Logs */}
                          <Link
                            href={`/audit?userEmail=${encodeURIComponent(u.email)}`}
                            className="p-1.5 text-[#86868B] hover:text-[#1D1D1F] hover:bg-[#F2F2F7] rounded-full transition-colors"
                            title="Review Activity History"
                          >
                            <History className="w-3.5 h-3.5" />
                          </Link>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* CREATE USER MODAL */}
      {isAddUserOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-[#FFFFFF] rounded-[24px] max-w-md w-full p-6 shadow-2xl border border-[#E5E5EA] space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-[#E5E5EA]">
              <h3 className="font-bold text-sm text-[#1D1D1F]">Create Authorized User</h3>
              <button
                onClick={() => setIsAddUserOpen(false)}
                className="w-7 h-7 rounded-full bg-[#F2F2F7] flex items-center justify-center text-[#86868B] hover:text-[#1D1D1F]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="space-y-3.5">
              <div>
                <label className="block text-xs font-medium text-[#86868B] mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Anand Sharma"
                  value={userForm.name}
                  onChange={(e) => setUserForm({ ...userForm, name: e.target.value })}
                  className="w-full px-3 py-2 bg-[#F2F2F7] border border-[#E5E5EA] rounded-xl text-xs text-[#1D1D1F] focus:bg-[#FFFFFF] focus:outline-hidden focus:ring-2 focus:ring-[#007AFF]"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#86868B] mb-1">Email Address</label>
                <input
                  type="email"
                  required
                  placeholder="user@atharvatravels.com"
                  value={userForm.email}
                  onChange={(e) => setUserForm({ ...userForm, email: e.target.value })}
                  className="w-full px-3 py-2 bg-[#F2F2F7] border border-[#E5E5EA] rounded-xl text-xs text-[#1D1D1F] focus:bg-[#FFFFFF] focus:outline-hidden focus:ring-2 focus:ring-[#007AFF]"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#86868B] mb-1">Assigned Role</label>
                <select
                  value={userForm.role}
                  onChange={(e) => setUserForm({ ...userForm, role: e.target.value })}
                  className="w-full px-3 py-2 bg-[#F2F2F7] border border-[#E5E5EA] rounded-xl text-xs text-[#1D1D1F] focus:bg-[#FFFFFF] focus:outline-hidden focus:ring-2 focus:ring-[#007AFF]"
                >
                  <option value="VIEWER">VIEWER (Read-Only / No Mutations)</option>
                  <option value="SUPER_ADMIN">SUPER_ADMIN (Complete Administrative Access)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-[#86868B] mb-1">Initial Password</label>
                <input
                  type="password"
                  required
                  minLength={8}
                  placeholder="Minimum 8 characters"
                  value={userForm.password}
                  onChange={(e) => setUserForm({ ...userForm, password: e.target.value })}
                  className="w-full px-3 py-2 bg-[#F2F2F7] border border-[#E5E5EA] rounded-xl text-xs text-[#1D1D1F] focus:bg-[#FFFFFF] focus:outline-hidden focus:ring-2 focus:ring-[#007AFF]"
                />
              </div>

              <div className="flex items-center justify-end space-x-2 pt-2 border-t border-[#E5E5EA]">
                <button
                  type="button"
                  onClick={() => setIsAddUserOpen(false)}
                  className="px-4 py-2 rounded-full text-xs font-medium bg-[#F2F2F7] text-[#1D1D1F] hover:bg-[#E5E5EA]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-full text-xs font-semibold bg-[#007AFF] text-white hover:bg-[#0062CC] shadow-apple-btn disabled:opacity-50"
                >
                  {submitting ? 'Creating...' : 'Create Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT USER MODAL */}
      {editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-[#FFFFFF] rounded-[24px] max-w-md w-full p-6 shadow-2xl border border-[#E5E5EA] space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-[#E5E5EA]">
              <h3 className="font-bold text-sm text-[#1D1D1F]">Edit Account: {editingUser.email}</h3>
              <button
                onClick={() => setEditingUser(null)}
                className="w-7 h-7 rounded-full bg-[#F2F2F7] flex items-center justify-center text-[#86868B] hover:text-[#1D1D1F]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleUpdateUser} className="space-y-3.5">
              <div>
                <label className="block text-xs font-medium text-[#86868B] mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  value={editingUser.name}
                  onChange={(e) => setEditingUser({ ...editingUser, name: e.target.value })}
                  className="w-full px-3 py-2 bg-[#F2F2F7] border border-[#E5E5EA] rounded-xl text-xs text-[#1D1D1F] focus:bg-[#FFFFFF] focus:outline-hidden focus:ring-2 focus:ring-[#007AFF]"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#86868B] mb-1">Role & Authority</label>
                <select
                  value={editingUser.role}
                  onChange={(e) => setEditingUser({ ...editingUser, role: e.target.value })}
                  className="w-full px-3 py-2 bg-[#F2F2F7] border border-[#E5E5EA] rounded-xl text-xs text-[#1D1D1F] focus:bg-[#FFFFFF] focus:outline-hidden focus:ring-2 focus:ring-[#007AFF]"
                >
                  <option value="VIEWER">VIEWER (Read-Only / No Mutations)</option>
                  <option value="SUPER_ADMIN">SUPER_ADMIN (Full Administrative Control)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-[#86868B] mb-1">Account Status</label>
                <select
                  value={editingUser.isAllowed ? 'ACTIVE' : 'DISABLED'}
                  onChange={(e) => setEditingUser({ ...editingUser, isAllowed: e.target.value === 'ACTIVE' })}
                  className="w-full px-3 py-2 bg-[#F2F2F7] border border-[#E5E5EA] rounded-xl text-xs text-[#1D1D1F] focus:bg-[#FFFFFF] focus:outline-hidden focus:ring-2 focus:ring-[#007AFF]"
                >
                  <option value="ACTIVE">Active (Can Sign In)</option>
                  <option value="DISABLED">Disabled (Access Denied)</option>
                </select>
              </div>

              <div className="flex items-center justify-end space-x-2 pt-2 border-t border-[#E5E5EA]">
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="px-4 py-2 rounded-full text-xs font-medium bg-[#F2F2F7] text-[#1D1D1F] hover:bg-[#E5E5EA]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-full text-xs font-semibold bg-[#007AFF] text-white hover:bg-[#0062CC] shadow-apple-btn disabled:opacity-50"
                >
                  {submitting ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* RESET PASSWORD MODAL */}
      {resetPasswordUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-[#FFFFFF] rounded-[24px] max-w-md w-full p-6 shadow-2xl border border-[#E5E5EA] space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-[#E5E5EA]">
              <div className="flex items-center space-x-2 text-[#007AFF]">
                <KeyRound className="w-5 h-5" />
                <h3 className="font-bold text-sm text-[#1D1D1F]">Reset Password</h3>
              </div>
              <button
                onClick={() => setResetPasswordUser(null)}
                className="w-7 h-7 rounded-full bg-[#F2F2F7] flex items-center justify-center text-[#86868B] hover:text-[#1D1D1F]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-[#86868B]">
              Enter a new secure password for <strong className="text-[#1D1D1F]">{resetPasswordUser.name}</strong> ({resetPasswordUser.email}).
            </p>

            <form onSubmit={handleResetPassword} className="space-y-3.5">
              <div>
                <label className="block text-xs font-medium text-[#86868B] mb-1">New Password</label>
                <input
                  type="password"
                  required
                  minLength={8}
                  placeholder="Minimum 8 characters"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-3 py-2 bg-[#F2F2F7] border border-[#E5E5EA] rounded-xl text-xs text-[#1D1D1F] focus:bg-[#FFFFFF] focus:outline-hidden focus:ring-2 focus:ring-[#007AFF]"
                />
              </div>

              <div className="flex items-center justify-end space-x-2 pt-2 border-t border-[#E5E5EA]">
                <button
                  type="button"
                  onClick={() => setResetPasswordUser(null)}
                  className="px-4 py-2 rounded-full text-xs font-medium bg-[#F2F2F7] text-[#1D1D1F] hover:bg-[#E5E5EA]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-full text-xs font-semibold bg-[#007AFF] text-white hover:bg-[#0062CC] shadow-apple-btn disabled:opacity-50"
                >
                  {submitting ? 'Updating...' : 'Set New Password'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
