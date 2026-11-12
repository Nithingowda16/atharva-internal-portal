'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Lock, Mail, ArrowRight, AlertCircle, ShieldCheck, Eye, EyeOff } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async () => {
    if (!email || !password) {
      setError('Please enter both email and password.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Authentication failed');
      }

      router.push('/dashboard');
      router.refresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F5F5F7] flex flex-col justify-center items-center p-6 selection:bg-[#B3D7FF]">
      <div className="max-w-[420px] w-full space-y-6">
        {/* Official Brand Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-none bg-[#FFFFFF] border border-[#E5E5EA] p-2 shadow-apple-card mb-1 overflow-hidden">
            <img src="/logo.png" alt="Atharva Travels" className="w-full h-full object-contain" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-[#1D1D1F]">
            ATHARVA TRAVELS
          </h1>
          <p className="text-xs text-[#86868B] font-medium">Internal Finance Management Portal</p>
        </div>

        {/* Main Sign-In Card */}
        <div className="bg-[#FFFFFF] border border-[#E5E5EA] rounded-none p-8 shadow-apple-card space-y-6">
          <div>
            <h2 className="text-base font-semibold text-[#1D1D1F]">Sign In</h2>
            <p className="text-xs text-[#86868B] mt-1">Enter your registered email and password to access the portal</p>
          </div>

          {error && (
            <div className="p-3.5 rounded-none bg-[#FFF0EF] border border-[#FFD0CE] text-[#FF3B30] text-xs flex items-center space-x-2.5 animate-in fade-in duration-200">
              <AlertCircle className="w-4 h-4 shrink-0 text-[#FF3B30]" />
              <span>{error}</span>
            </div>
          )}

          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleLogin();
            }}
            className="space-y-4"
          >
            <div>
              <label className="block text-xs font-semibold text-[#1D1D1F] mb-1.5">
                Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-[#86868B] absolute left-3.5 top-3.5" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@atharvatravels.com"
                  className="w-full pl-10 pr-4 py-2.5 bg-[#F2F2F7] border border-[#E5E5EA] rounded-none text-xs text-[#1D1D1F] placeholder-[#86868B] focus:bg-[#FFFFFF] focus:outline-hidden focus:ring-2 focus:ring-[#007AFF] transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#1D1D1F] mb-1.5">
                Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-[#86868B] absolute left-3.5 top-3.5" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full pl-10 pr-10 py-2.5 bg-[#F2F2F7] border border-[#E5E5EA] rounded-none text-xs text-[#1D1D1F] placeholder-[#86868B] focus:bg-[#FFFFFF] focus:outline-hidden focus:ring-2 focus:ring-[#007AFF] transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-3 text-[#86868B] hover:text-[#1D1D1F] transition-colors"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-[#007AFF] hover:bg-[#0062CC] text-white font-semibold rounded-none text-xs transition-all duration-150 flex items-center justify-center space-x-1.5 shadow-apple-btn active:scale-[0.99] disabled:opacity-50 cursor-pointer"
            >
              {loading ? (
                <span>Authenticating...</span>
              ) : (
                <>
                  <span>Sign In</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        </div>

        {/* Footer */}
        <div className="text-center text-[11px] text-[#86868B] space-y-1">
          <p className="flex items-center justify-center space-x-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-[#34C759]" />
            <span>Encrypted Server-Side Authentication · Database Secured</span>
          </p>
          <p>ATHARVA TRAVELS © 2026</p>
        </div>
      </div>
    </div>
  );
}
