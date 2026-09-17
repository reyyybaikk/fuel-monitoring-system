'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { useUIStore } from '@/store/uiStore';
import { getMe } from '@/services/authService';
import { useQuery } from '@tanstack/react-query';
import { Bell, User, Loader2, Menu, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function Topbar() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const { userProfile, login, isAuthenticated } = useAuthStore();
  const { toggleSidebar } = useUIStore();

  // State untuk menangani sinkronisasi Hydration
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Ambil data Profil User asli dari Database (Render)
  const { data: realUser, isLoading } = useQuery({
    queryKey: ['me'],
    queryFn: getMe,
    enabled: mounted && isAuthenticated,
  });

  useEffect(() => {
    if (realUser && mounted && (!userProfile || realUser.username !== userProfile.username)) {
      login({
        id: realUser.id,
        name: realUser.full_name || realUser.name,
        username: realUser.username,
        email: realUser.email,
        role: realUser.role,
        region: realUser.region || 'Region Belum Diatur'
      }, localStorage.getItem('accessToken') || '');
    }
  }, [realUser, mounted]);

  if (!mounted) {
    return <header className="fixed top-0 left-0 right-0 h-20 bg-white z-[60] border-b border-slate-200 shadow-sm"></header>;
  }

  const adminUser = userProfile?.username || realUser?.username || 'admin';
  const adminRole = userProfile?.role || realUser?.role || 'ADMIN';
  const adminRegion = adminRole === 'ADMIN_PUSAT' ? 'Kantor Pusat UPKAL2' : (userProfile?.region || realUser?.region || 'Unit UPKAL2 Regional');

  return (
    <header className="fixed top-0 left-0 right-0 h-20 bg-white z-[60] px-4 flex items-center justify-between border-b border-slate-200 shadow-sm select-none font-sans">
      {/* LEFT SECTION: MENU & LOGOS */}
      <div className="flex items-center gap-4">
        <button
          onClick={toggleSidebar}
          className="w-10 h-10 rounded-md border border-slate-200 bg-slate-50 flex items-center justify-center text-slate-600 hover:bg-slate-100 hover:text-pln-darkBlue transition-all shadow-sm active:scale-95 cursor-pointer"
        >
          <Menu className="h-5 w-5" />
        </button>

        <div className="flex items-center gap-3">
          {/* Logo PLN */}
          <img src="/logo-pln.png" alt="PLN" className="h-10 w-auto object-contain" />
          <div className="flex flex-col leading-none">
            <span className="font-black text-[14px] text-[#0b536f] tracking-tighter">PLN</span>
            <span className="text-[11px] font-bold text-[#00a2e8]">Nusa Daya</span>
          </div>

          <div className="h-8 w-px bg-slate-200 mx-1"></div>

          {/* Logo Danantara */}
          <div className="relative flex items-center gap-2">
            <img
              src="/logo-danantara.png"
              alt="Danantara"
              className="h-8 w-auto object-contain"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
                e.currentTarget.nextElementSibling?.classList.remove('hidden');
              }}
            />
            <div className="hidden flex items-center gap-2 animate-in fade-in">
              <div className="w-7 h-7 rounded bg-[#0b1c30] flex items-center justify-center text-white shadow-sm border border-white/10">
                 <Zap className="h-3.5 w-3.5 text-[#ffe600]" />
              </div>
              <div className="flex flex-col leading-none ml-1">
                <span className="font-bold text-[10px] text-[#0b1c30] uppercase tracking-tighter">Danantara</span>
                <span className="text-[8px] font-medium text-slate-500 uppercase">Indonesia</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* CENTER SECTION: LETS GO STYLE */}
      <div className="hidden lg:flex flex-col items-center text-center flex-1 mx-4">
        <h2 className="text-base font-black text-[#006492] uppercase tracking-[0.2em]">
          LETS GO
        </h2>
        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-tight opacity-80">
          {adminRegion} • Logistik Efisien Terintegrasi & Solutif
        </p>
      </div>

      {/* RIGHT SECTION: ACTIONS & USER */}
      <div className="flex items-center gap-6">
        <button className="relative p-2 rounded-full hover:bg-slate-100 text-slate-400 transition-colors cursor-pointer">
          <Bell className="h-5 w-5" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-anomaly-red rounded-full border-2 border-white"></span>
        </button>

        <div className="flex items-center gap-3 pl-4 border-l border-slate-200">
          <div className="flex flex-col text-right">
            <span className="font-black text-sm text-slate-900 leading-none">
              {adminUser.toLowerCase()}
            </span>
            <div className="mt-1">
              <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-500 text-[8px] font-black uppercase tracking-tighter border border-slate-200">
                {adminRole.toLowerCase() === 'admin_pusat' ? 'pusat' : adminRole.toLowerCase()}
              </span>
            </div>
          </div>

          <div className="w-10 h-10 rounded-full bg-[#0070f3] flex items-center justify-center text-white shadow-md border-2 border-white ring-1 ring-slate-100 overflow-hidden cursor-pointer hover:scale-105 transition-transform">
             <User className="h-6 w-6" />
          </div>
        </div>
      </div>
    </header>
  );
}
