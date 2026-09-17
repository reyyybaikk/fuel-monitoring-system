'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { useAuthStore } from '@/store/authStore';
import { loginToBackend } from '@/services/authService';
import toast, { Toaster } from 'react-hot-toast';
import {
  Lock,
  Mail,
  Loader2,
  Zap,
  ShieldCheck,
  Globe,
  HelpCircle,
  Eye,
  EyeOff,
  AlertCircle,
  ArrowRight,
  ShieldAlert
} from 'lucide-react';
import { cn } from '@/lib/utils';

export default function LoginPage() {
  const router = useRouter();
  const loginStore = useAuthStore((state) => state.login);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleCredentialLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error('Silakan isi seluruh kolom email dan kata sandi.');
      return;
    }

    setIsLoading(true);
    try {
      const response: any = await loginToBackend(email, password);
      const token = response.token || response.accessToken || response.data?.token;
      const user = response.user || response.data?.user || { name: 'Admin User', role: 'ADMIN' };

      if (!token) throw new Error('Token tidak ditemukan dalam respon server.');

      loginStore(user, token);
      toast.success(`Otentikasi Berhasil! Mengalihkan ke sistem...`);

      setTimeout(() => {
        router.push('/dashboard');
      }, 800);

    } catch (error: any) {
      const serverMessage = error.response?.data?.message || error.message;
      toast.error(`Akses Ditolak: ${serverMessage || 'Periksa kredensial Anda.'}`);
    } finally {
      setIsLoading(false);
    }
  };

  if (!mounted) return null;

  return (
    <main className="relative min-h-screen w-full bg-[#f0f4f8] overflow-hidden font-sans flex flex-col">
      <Toaster position="top-right" reverseOrder={false} />

      {/* 1. LAYER BACKGROUND GAMBAR (Full Cover & Responsive) */}
      <div className="fixed inset-0 z-0">
        <img
          src="/login-bg-industrial.jpg"
          alt=""
          className="w-full h-full object-cover object-center opacity-100 transition-opacity duration-1000"
          onError={(e) => {
            // Fallback: Jika file belum ada, gunakan gradasi industrial PLN agar tidak kosong
            e.currentTarget.parentElement!.style.background = 'radial-gradient(circle at top right, #e0f2fe, #f8f9ff 50%, #f1f5f9 100%)';
            e.currentTarget.style.display = 'none';
          }}
        />
        {/* Soft Modern Overlay for depth */}
        <div className="absolute inset-0 bg-gradient-to-tr from-[#f8f9ff] via-[#f8f9ff]/40 to-transparent" />
      </div>

      {/* 2. LAYER GRID PATTERN (Aksen Engineering) */}
      <div className="fixed inset-0 z-0 opacity-[0.05] pointer-events-none">
        <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="industrial-grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#00A2E8" strokeWidth="0.5" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#industrial-grid)" />
        </svg>
      </div>

      {/* TOP NAVIGATION */}
      <header className="relative z-10 w-full px-8 py-6 flex items-center justify-between">
        <div className="flex items-center gap-6">
          {/* Logo PLN */}
          <img src="/logo-pln.png" alt="PLN Nusa Daya" className="h-10 w-auto object-contain" />

          <div className="h-8 w-px bg-slate-200 mx-2" />

          {/* Logo Danantara */}
          <img
            src="/logo-danantara.png"
            alt="Danantara Indonesia"
            className="h-6 w-auto object-contain"
            onError={(e) => {
              e.currentTarget.style.display = 'none';
              e.currentTarget.nextElementSibling?.classList.remove('hidden');
            }}
          />
          {/* Fallback Danantara jika gambar belum ada */}
          <div className="hidden flex items-center gap-2">
            <div className="w-8 h-8 rounded bg-[#0b1c30] flex items-center justify-center text-white">
               <Zap className="h-4 w-4 text-[#FFE600]" />
            </div>
            <div className="flex flex-col">
              <span className="font-bold text-[11px] text-slate-800 uppercase tracking-tighter leading-tight">Danantara</span>
              <span className="text-[9px] font-medium text-slate-500 uppercase leading-none">Indonesia</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-6">
          <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-100 shadow-sm">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="text-[10px] font-black text-emerald-700 uppercase tracking-tight">Sistem Telemetri Aktif</span>
          </div>

          <button className="flex items-center gap-2 text-slate-500 hover:text-slate-800 transition-colors">
            <HelpCircle className="h-4 w-4" />
            <span className="text-[11px] font-bold uppercase tracking-tight">Bantuan IT & Helpdesk</span>
          </button>
        </div>
      </header>

      {/* CONTENT GRID */}
      <div className="relative z-10 flex-1 w-full max-w-7xl mx-auto px-8 grid grid-cols-1 lg:grid-cols-2 items-center gap-12 py-12">

        {/* LEFT: HERO TEXT */}
        <div className="space-y-8 animate-in fade-in slide-in-from-left-8 duration-1000 ease-out">
          <div className="inline-flex items-center gap-2.5 px-4 py-2 rounded-full bg-white shadow-md border border-[#00A2E8]/20">
            <div className="bg-[#00A2E8] p-1 rounded-full">
              <Zap className="h-3 w-3 text-white" />
            </div>
            <span className="text-[10px] font-black text-slate-700 uppercase tracking-widest">
              PLN NUSA DAYA • UP KALIMANTAN 2
            </span>
          </div>

          <div className="space-y-4">
            <h1 className="text-5xl md:text-6xl font-black text-[#0b1c30] leading-[1.1] tracking-tight">
              Integrated Fleet Fuel <br/>
              <span className="text-[#00A2E8]">Monitoring System</span>
            </h1>
            <p className="text-base text-slate-600 max-w-lg leading-relaxed font-medium">
              Portal otentikasi pengawasan konsumsi BBM armada kendaraan operasional & unit bergerak PLN Nusa Daya Unit Pelaksana Kalimantan 2 secara real-time.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-6 pt-4">
            <div className="flex items-center gap-2 text-slate-500">
              <ShieldCheck className="h-5 w-5 text-emerald-500" />
              <span className="text-xs font-bold uppercase tracking-tight">256-Bit SSL Enkripsi</span>
            </div>
            <div className="flex items-center gap-2 text-slate-500">
              <Globe className="h-5 w-5 text-[#00A2E8]" />
              <span className="text-xs font-bold uppercase tracking-tight">Single Sign-On (SSO) Terintegrasi</span>
            </div>
          </div>
        </div>

        {/* RIGHT: LOGIN CARD */}
        <div className="flex justify-center lg:justify-end animate-in fade-in slide-in-from-right-8 duration-1000 ease-out">
          <div className="w-full max-w-[480px] relative">
            {/* Top Border Gradient Decoration */}
            <div className="absolute top-0 left-8 right-8 h-1 bg-gradient-to-r from-[#00A2E8] to-[#FFE600] z-20 rounded-full" />

            <Card className="border-none shadow-[0_20px_50px_rgba(11,83,111,0.12)] rounded-[24px] bg-white relative overflow-hidden">
              <CardHeader className="pt-10 px-8 pb-4 space-y-1">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-3xl font-black text-[#0b1c30] tracking-tight">Masuk Akun</CardTitle>
                  <Badge className="bg-slate-100 text-slate-500 hover:bg-slate-100 border-none text-[10px] font-bold px-2 py-0.5 rounded">
                    UP Kalimantan 2
                  </Badge>
                </div>
                <p className="text-sm text-slate-500 font-medium">
                  Gunakan Email untuk mengakses monitoring BBM Armada.
                </p>
              </CardHeader>

              <form onSubmit={handleCredentialLogin}>
                <CardContent className="px-8 pt-6 pb-8 space-y-6">
                  {/* Email Field */}
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <label className="text-xs font-black text-slate-700 uppercase tracking-tight flex items-center gap-1.5">
                        Email <span className="text-red-500">*</span>
                      </label>
                    </div>
                    <div className="relative group">
                      <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[#00A2E8] transition-colors">
                        <Mail className="h-4.5 w-4.5" />
                      </div>
                      <Input
                        type="email"
                        placeholder="contoh: operator.kaltim2@plnnusadaya.co.id"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        disabled={isLoading}
                        className="h-12 pl-11 bg-slate-50 border-slate-200 focus:bg-white focus:border-[#00A2E8] focus:ring-[#00A2E8]/10 rounded-[12px] text-sm font-semibold transition-all"
                      />
                    </div>
                  </div>

                  {/* Password Field */}
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <label className="text-xs font-black text-slate-700 uppercase tracking-tight">
                        Kata Sandi <span className="text-red-500">*</span>
                      </label>
                      <button type="button" className="text-[11px] font-bold text-[#00A2E8] hover:underline uppercase tracking-tight">
                        Lupa sandi?
                      </button>
                    </div>
                    <div className="relative group">
                      <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[#00A2E8] transition-colors">
                        <Lock className="h-4.5 w-4.5" />
                      </div>
                      <Input
                        type={showPassword ? "text" : "password"}
                        placeholder="••••••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        disabled={isLoading}
                        className="h-12 pl-11 pr-11 bg-slate-50 border-slate-200 focus:bg-white focus:border-[#00A2E8] focus:ring-[#00A2E8]/10 rounded-[12px] text-sm font-bold tracking-[0.2em] transition-all"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                      >
                        {showPassword ? <EyeOff className="h-4.5 w-4.5" /> : <Eye className="h-4.5 w-4.5" />}
                      </button>
                    </div>
                  </div>

                  {/* Options */}
                  <div className="flex items-center justify-between pt-2">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="remember"
                        checked={rememberMe}
                        onCheckedChange={(checked) => setRememberMe(checked as boolean)}
                        className="rounded border-slate-300 data-[state=checked]:bg-[#00A2E8] data-[state=checked]:border-[#00A2E8]"
                      />
                      <label htmlFor="remember" className="text-xs font-bold text-slate-600 cursor-pointer select-none">
                        Ingatkan Masuk
                      </label>
                    </div>
                    <div className="flex items-center gap-1.5 text-emerald-600">
                      <ShieldCheck className="h-3.5 w-3.5" />
                      <span className="text-[10px] font-black uppercase tracking-tight"></span>
                    </div>
                  </div>

                  {/* Submit Button */}
                  <Button
                    type="submit"
                    disabled={isLoading}
                    className="w-full h-14 bg-[#0B536F] hover:bg-[#08425a] text-white rounded-[14px] shadow-lg shadow-[#0B536F]/20 flex items-center justify-center gap-3 active:scale-[0.98] transition-all group"
                  >
                    {isLoading ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                      <>
                        <span className="text-sm font-black uppercase tracking-widest">Masuk</span>
                        <ArrowRight className="h-4.5 w-4.5 group-hover:translate-x-1 transition-transform" />
                      </>
                    )}
                  </Button>

                  {/* Official Notice */}
                  <div className="p-4 bg-[#FFE600]/10 border border-[#FFE600]/20 rounded-[16px] flex gap-3">
                    <div className="bg-[#FFE600] p-1.5 h-fit rounded-full shrink-0">
                      <ShieldAlert className="h-3.5 w-3.5 text-[#0B536F]" />
                    </div>
                    <p className="text-[10px] text-slate-600 leading-relaxed font-medium">
                      <strong className="text-[#0B536F] font-bold">Pemberitahuan Resmi:</strong> Akses terbatas khusus personel resmi PLN Nusa Daya & Danantara Indonesia. Aktivitas sesi dicatat untuk audit kepatuhan energi.
                    </p>
                  </div>
                </CardContent>
              </form>
            </Card>
          </div>
        </div>
      </div>

      <footer className="relative z-10 w-full py-8 text-center">
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">
          Powered by rey baik © {new Date().getFullYear()}
        </p>
      </footer>
    </main>
  );
}
