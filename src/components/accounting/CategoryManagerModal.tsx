'use client';

import React, { useState, useEffect } from 'react';
import {
  Tag,
  Plus,
  Edit2,
  Trash2,
  CheckCircle2,
  AlertCircle,
  X,
  RefreshCw,
  ShieldCheck,
} from 'lucide-react';

interface Category {
  id: string;
  name: string;
  description?: string | null;
  assignedAccountSlug: string;
  transactionType: string;
  defaultClassification: string;
  isCashImpact: boolean;
  requiresConfirmation: boolean;
  reportingGroup?: string | null;
  isActive: boolean;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onCategoryAdded?: () => void;
  currentAccountSlug?: string;
}

export default function CategoryManagerModal({
  isOpen,
  onClose,
  onCategoryAdded,
  currentAccountSlug = 'ALL',
}: Props) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    assignedAccountSlug: currentAccountSlug,
    transactionType: 'EXPENSE',
    defaultClassification: 'DEBIT',
    isCashImpact: true,
    requiresConfirmation: true,
    reportingGroup: 'OPERATING',
  });

  const fetchCategories = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/accounting/categories?activeOnly=false');
      const data = await res.json();
      if (data.success) {
        setCategories(data.categories || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchCategories();
      setIsCreating(false);
      setError(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch('/api/accounting/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setIsCreating(false);
        setFormData({
          name: '',
          description: '',
          assignedAccountSlug: currentAccountSlug,
          transactionType: 'EXPENSE',
          defaultClassification: 'DEBIT',
          isCashImpact: true,
          requiresConfirmation: true,
          reportingGroup: 'OPERATING',
        });
        fetchCategories();
        if (onCategoryAdded) onCategoryAdded();
      } else {
        setError(data.error || 'Failed to create category');
      }
    } catch (err) {
      setError('Connection error occurred');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeactivate = async (id: string, name: string) => {
    if (!confirm(`Deactivate category "${name}"?`)) return;
    try {
      const res = await fetch(`/api/accounting/categories/${id}`, { method: 'DELETE' });
      if (res.ok) {
        fetchCategories();
        if (onCategoryAdded) onCategoryAdded();
      }
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-[#FFFFFF] w-full max-w-2xl rounded-2xl shadow-xl border border-[#E5E5EA] overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="p-4 border-b border-[#E5E5EA] flex items-center justify-between bg-[#FBFBFC]">
          <div className="flex items-center space-x-2">
            <Tag className="w-4 h-4 text-[#007AFF]" />
            <h3 className="font-bold text-sm text-[#1D1D1F]">
              Dynamic Accounting Category Manager
            </h3>
            <span className="text-[10px] bg-[#007AFF]/10 text-[#007AFF] px-2 py-0.5 rounded-full font-bold">
              Super Admin
            </span>
          </div>
          <button type="button" onClick={onClose} className="text-[#86868B] hover:text-[#1D1D1F]">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 overflow-y-auto space-y-4 flex-1 text-xs">
          {error && (
            <div className="p-3 bg-[#FF3B30]/10 border border-[#FF3B30]/20 rounded-xl text-[#FF3B30] flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {!isCreating ? (
            <div className="flex items-center justify-between pb-2 border-b border-[#E5E5EA]">
              <span className="text-[#86868B]">
                Configure categories, debit/credit rules & bank balance impact.
              </span>
              <button
                type="button"
                onClick={() => setIsCreating(true)}
                className="inline-flex items-center px-3 py-1.5 bg-[#007AFF] text-white font-bold rounded-xl shadow-2xs hover:bg-[#007AFF]/90 transition-colors"
              >
                <Plus className="w-3.5 h-3.5 mr-1" /> Add New Category
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="p-4 bg-[#F9F9FB] rounded-xl border border-[#E5E5EA] space-y-3">
              <div className="flex items-center justify-between border-b border-[#E5E5EA] pb-2">
                <span className="font-bold text-[#1D1D1F]">New Financial Category</span>
                <button
                  type="button"
                  onClick={() => setIsCreating(false)}
                  className="text-xs text-[#86868B] hover:text-[#1D1D1F]"
                >
                  Cancel
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-[#86868B] mb-1">Category Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Vehicle Repair, Driver Penalty"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-1.5 bg-[#FFFFFF] border border-[#E5E5EA] rounded-xl focus:border-[#007AFF] focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-[#86868B] mb-1">Reporting Group</label>
                  <select
                    value={formData.reportingGroup}
                    onChange={(e) => setFormData({ ...formData, reportingGroup: e.target.value })}
                    className="w-full px-3 py-1.5 bg-[#FFFFFF] border border-[#E5E5EA] rounded-xl focus:border-[#007AFF] focus:outline-hidden"
                  >
                    <option value="OPERATING">Operating Expenses</option>
                    <option value="VEHICLE">Vehicle Related</option>
                    <option value="DRIVER">Driver Related</option>
                    <option value="ADMIN">Administrative & Office</option>
                    <option value="TAX">Tax & Statutory</option>
                    <option value="FINANCIAL">Financial & Bank</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-[#86868B] mb-1">Transaction Type</label>
                  <select
                    value={formData.transactionType}
                    onChange={(e) => {
                      const type = e.target.value;
                      const isIncome = type === 'INCOME' || type === 'RECEIPT';
                      setFormData({
                        ...formData,
                        transactionType: type,
                        defaultClassification: isIncome ? 'CREDIT' : 'DEBIT',
                      });
                    }}
                    className="w-full px-2.5 py-1.5 bg-[#FFFFFF] border border-[#E5E5EA] rounded-xl focus:border-[#007AFF] focus:outline-hidden"
                  >
                    <option value="EXPENSE">Expense</option>
                    <option value="INCOME">Income / Revenue</option>
                    <option value="DEDUCTION">Deduction</option>
                    <option value="ADDITION">Addition</option>
                    <option value="ADJUSTMENT">Adjustment</option>
                    <option value="TRANSFER">Internal Transfer</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-[#86868B] mb-1">Debit / Credit</label>
                  <select
                    value={formData.defaultClassification}
                    onChange={(e) => setFormData({ ...formData, defaultClassification: e.target.value })}
                    className="w-full px-2.5 py-1.5 bg-[#FFFFFF] border border-[#E5E5EA] rounded-xl focus:border-[#007AFF] focus:outline-hidden"
                  >
                    <option value="DEBIT">Debit (Dr)</option>
                    <option value="CREDIT">Credit (Cr)</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-[#86868B] mb-1">Assigned Account</label>
                  <input
                    type="text"
                    placeholder="ALL or account slug"
                    value={formData.assignedAccountSlug}
                    onChange={(e) => setFormData({ ...formData, assignedAccountSlug: e.target.value })}
                    className="w-full px-2.5 py-1.5 bg-[#FFFFFF] border border-[#E5E5EA] rounded-xl focus:border-[#007AFF] focus:outline-hidden"
                  />
                </div>
              </div>

              <div className="flex items-center space-x-6 pt-1">
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.isCashImpact}
                    onChange={(e) => setFormData({ ...formData, isCashImpact: e.target.checked })}
                    className="rounded text-[#007AFF]"
                  />
                  <span className="font-medium text-[#1D1D1F]">Impacts Main Bank Balance</span>
                </label>
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.requiresConfirmation}
                    onChange={(e) => setFormData({ ...formData, requiresConfirmation: e.target.checked })}
                    className="rounded text-[#007AFF]"
                  />
                  <span className="font-medium text-[#1D1D1F]">Requires Confirmed Payment / Receipt</span>
                </label>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-1.5 bg-[#007AFF] text-white font-bold rounded-xl shadow-2xs hover:bg-[#007AFF]/90 transition-colors disabled:opacity-50"
                >
                  {submitting ? 'Saving...' : 'Save Category'}
                </button>
              </div>
            </form>
          )}

          {/* Existing Categories Table */}
          <div className="border border-[#E5E5EA] rounded-xl overflow-hidden">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-[#F9F9FB] border-b border-[#E5E5EA] text-[#86868B] font-semibold">
                  <th className="py-2 px-3">Category Name</th>
                  <th className="py-2 px-3">Type</th>
                  <th className="py-2 px-3">Dr / Cr</th>
                  <th className="py-2 px-3">Group</th>
                  <th className="py-2 px-3 text-center">Bank Impact</th>
                  <th className="py-2 px-3 text-center">Status</th>
                  <th className="py-2 px-3 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E5EA]">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="py-6 text-center text-[#86868B]">
                      <RefreshCw className="w-4 h-4 animate-spin mx-auto mb-1 text-[#007AFF]" />
                      Loading categories...
                    </td>
                  </tr>
                ) : (
                  categories.map((cat) => (
                    <tr key={cat.id} className="hover:bg-[#F9F9FB]/60 transition-colors">
                      <td className="py-2 px-3 font-semibold text-[#1D1D1F]">
                        {cat.name}
                        {cat.description && (
                          <span className="block text-[10px] text-[#86868B] font-normal">{cat.description}</span>
                        )}
                      </td>
                      <td className="py-2 px-3 text-[#86868B]">
                        <span className="px-1.5 py-0.5 rounded text-[10px] bg-[#F2F2F7] font-semibold">
                          {cat.transactionType}
                        </span>
                      </td>
                      <td className="py-2 px-3 font-mono text-[11px] font-bold">
                        {cat.defaultClassification}
                      </td>
                      <td className="py-2 px-3 text-[#86868B]">
                        {cat.reportingGroup}
                      </td>
                      <td className="py-2 px-3 text-center">
                        <span className={`text-[10px] font-bold ${cat.isCashImpact ? 'text-[#34C759]' : 'text-[#86868B]'}`}>
                          {cat.isCashImpact ? 'YES' : 'NO'}
                        </span>
                      </td>
                      <td className="py-2 px-3 text-center">
                        <span
                          className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                            cat.isActive ? 'bg-[#34C759]/10 text-[#34C759]' : 'bg-[#FF3B30]/10 text-[#FF3B30]'
                          }`}
                        >
                          {cat.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="py-2 px-3 text-center">
                        {cat.isActive && (
                          <button
                            type="button"
                            onClick={() => handleDeactivate(cat.id, cat.name)}
                            className="p-1 text-[#FF3B30] hover:bg-[#FF3B30]/10 rounded-lg transition-colors"
                            title="Deactivate Category"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-[#E5E5EA] flex justify-end bg-[#FBFBFC]">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-[#F2F2F7] hover:bg-[#E5E5EA] text-[#1D1D1F] font-semibold rounded-xl transition-colors text-xs"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

