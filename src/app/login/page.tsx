'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Shield, Eye, EyeOff, AlertCircle } from 'lucide-react';

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
    <div className="min-h-screen bg-[#F4F6F8] flex flex-col justify-center items-center p-4 sm:p-6 selection:bg-[#B3D7FF]">
      <div className="max-w-[440px] w-full space-y-7">
        {/* Official Atharva Travels Brand Logo */}
        <div className="text-center">
          <img
            src="/atharva-logo-transparent.png"
            alt="Atharva Travels - Let's Drive Together"
            className="h-24 sm:h-28 w-auto object-contain mx-auto transition-transform hover:scale-105 duration-200"
          />
        </div>

        {/* Main Sign-In Card with Curvy Borders */}
        <div className="bg-[#FFFFFF] border border-[#EAECEF] rounded-[28px] shadow-[0_8px_30px_rgba(0,0,0,0.06)] p-8 sm:p-10 space-y-6">
          {/* Admin Header */}
          <div className="flex items-center space-x-2.5 pb-3 border-b border-[#EAECEF]">
            <div className="w-8 h-8 rounded-full bg-[#EBF5FF] text-[#007AFF] flex items-center justify-center shrink-0">
              <Shield className="w-4 h-4 text-[#007AFF]" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-[#1D1D1F]">Atharva Admin Login</h2>
              <p className="text-[11px] text-[#8C9BA5]">Internal Finance Management Portal</p>
            </div>
          </div>

          {error && (
            <div className="p-3.5 rounded-2xl bg-[#FFF0EF] border border-[#FFD0CE] text-[#FF3B30] text-xs flex items-center space-x-2.5 animate-in fade-in duration-200">
              <AlertCircle className="w-4 h-4 shrink-0 text-[#FF3B30]" />
              <span>{error}</span>
            </div>
          )}

          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleLogin();
            }}
            className="space-y-6 pt-1"
          >
            {/* Email Field with Underline Style */}
            <div>
              <label className="block text-[11px] font-bold text-[#8C9BA5] uppercase tracking-wider mb-2">
                AUTHORIZED ADMIN EMAIL
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name.admin@atharvatravels.com"
                className="w-full bg-transparent border-b border-[#D5DCE2] focus:border-[#007AFF] pb-2.5 pt-1 text-sm text-[#1D1D1F] outline-none placeholder-[#8C9BA5] transition-colors font-medium"
              />
            </div>

            {/* Password Field with Underline Style & Toggle Eye */}
            <div>
              <label className="block text-[11px] font-bold text-[#8C9BA5] uppercase tracking-wider mb-2">
                PASSWORD
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Password"
                  className="w-full bg-transparent border-b border-[#D5DCE2] focus:border-[#007AFF] pb-2.5 pt-1 pr-9 text-sm text-[#1D1D1F] outline-none placeholder-[#8C9BA5] transition-colors font-medium"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-0 bottom-2.5 text-[#8C9BA5] hover:text-[#1D1D1F] transition-colors cursor-pointer"
                  tabIndex={-1}
                  title={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-4.5 h-4.5" /> : <Eye className="w-4.5 h-4.5" />}
                </button>
              </div>
            </div>

            {/* Curvy Log In Button */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={loading}
                className={`w-full py-3.5 font-bold text-sm rounded-full transition-all duration-150 flex items-center justify-center space-x-2 cursor-pointer shadow-apple-btn active:scale-[0.99] disabled:opacity-50 ${
                  email && password
                    ? 'bg-[#007AFF] hover:bg-[#0062CC] text-white shadow-xs'
                    : 'bg-[#EEF2F6] text-[#8C9BA5] hover:bg-[#007AFF] hover:text-white'
                }`}
              >
                {loading ? <span>Authenticating...</span> : <span>Log In</span>}
              </button>
            </div>

            {/* Reset Password Link */}
            <div className="text-center pt-1">
              <button
                type="button"
                onClick={() =>
                  alert(
                    'To reset or re-issue your portal password, please reach out directly to Bhaskar (Super Admin).'
                  )
                }
                className="text-[#007AFF] hover:text-[#005bb5] font-semibold text-xs tracking-wide cursor-pointer transition-colors"
              >
                Reset password
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
