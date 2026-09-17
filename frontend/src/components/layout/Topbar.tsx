import React, { useState, useEffect } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
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
    if (realUser && mounted && (!userProfile || realUser.region !== userProfile.region)) {
      login({
        id: realUser.id,
        name: realUser.full_name || realUser.name,
        email: realUser.email,
        role: realUser.role,
        region: realUser.region || 'Region Belum Diatur'
      }, localStorage.getItem('accessToken') || '');
    }
  }, [realUser, mounted]);

  if (!mounted) {
    return <header className="fixed top-0 left-0 right-0 h-20 bg-white z-[60] border-b border-slate-200 shadow-sm"></header>;
  }

  const adminName = userProfile?.name || realUser?.full_name || 'Admin';
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

       

      {/* CENTER SECTION: LETS GO STYLE */}
      <div className="hidden lg:flex flex-col items-center text-center flex-1 mx-4">
        <h2 className="text-base font-black text-[#006492] uppercase tracking-[0.2em]">
          Fuel Monitoring
        </h2>
        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-tight opacity-80">
          {adminRegion} • Monitoring BBM Efisien Terintegrasi
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
            <span className="font-bold text-xs text-slate-800 leading-tight uppercase">
              {adminName.split(' ')[0]}
            </span>
            <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 text-[8px] font-black uppercase tracking-tighter mt-0.5">
              {adminRole}
            </span>
          </div>

          <div className="w-10 h-10 rounded-full bg-[#0070f3] flex items-center justify-center text-white shadow-md border-2 border-white ring-1 ring-slate-100 overflow-hidden cursor-pointer hover:scale-105 transition-transform">
             <User className="h-5 w-5" />
          </div>
        </div>
      </div>
    </header>
  );
}
