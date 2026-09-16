'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { useUIStore } from '@/store/uiStore';
import { getMe } from '@/services/authService';
import { useQuery } from '@tanstack/react-query';
import { Search, Bell, User, Building2, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function Topbar() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const { userProfile, login, isAuthenticated } = useAuthStore();
  const { isSidebarCollapsed } = useUIStore();
  const [searchValue, setSearchValue] = useState(searchParams.get('q') || '');

  // State untuk menangani sinkronisasi Hydration
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setSearchValue(searchParams.get('q') || '');
  }, [searchParams]);

  // Ambil data Profil User asli dari Database (Render)
  const { data: realUser, isLoading } = useQuery({
    queryKey: ['me'],
    queryFn: getMe,
    enabled: mounted && isAuthenticated, // Hanya jalan jika sudah terpasang di browser & login
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

  // Jika belum mounted (masih di server), tampilkan bar kosong atau placeholder agar HTML cocok
  if (!mounted) {
    return (
      <header className={cn(
        "fixed top-0 right-0 h-16 bg-white z-40 px-6 border-b border-border shadow-sm transition-all duration-300",
        isSidebarCollapsed ? "left-20" : "left-64"
      )}></header>
    );
  }

  const adminName = userProfile?.name || realUser?.full_name || 'Admin';
  const adminRole = userProfile?.role || realUser?.role || 'ADMIN';
  const adminRegion = userProfile?.region || realUser?.region || 'Unit UPKAL2 Regional';

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchValue.trim()) return;
    const params = new URLSearchParams(searchParams.toString());
    params.set('q', searchValue.trim());
    router.push(`/transactions?${params.toString()}`);
  };

  return (
    <header className={cn(
      "fixed top-0 right-0 h-16 bg-white z-40 px-6 flex items-center justify-between border-b border-border shadow-sm select-none font-sans transition-all duration-300",
      isSidebarCollapsed ? "left-20" : "left-64"
    )}>
      <div className="flex items-center gap-4 flex-1 max-w-xl">
        <form onSubmit={handleSearch} className="relative flex items-center w-full group">
          <div className="flex items-center gap-2 w-full px-3 py-1.5 rounded-[4px] bg-[#e6f4f8]/40 border border-border/60 text-muted-foreground focus-within:border-pln-cyan focus-within:ring-1 focus-within:ring-pln-cyan/30 focus-within:bg-white transition-all">
            <Search className="h-4 w-4 text-muted-foreground/60 shrink-0 group-focus-within:text-pln-cyan transition-colors" />
            <input
              type="text"
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              placeholder="Cari pelat nomor, driver, atau ID transaksi..."
              className="w-full bg-transparent text-xs text-foreground placeholder:text-muted-foreground/50 focus:outline-none font-sans"
            />
          </div>
        </form>

        <div className="hidden xl:flex items-center gap-1.5 px-3 py-1 rounded-full bg-pln-iceBlue text-pln-darkBlue border border-pln-cyan/10 shrink-0">
          <Building2 className="h-3.5 w-3.5 text-pln-cyan shrink-0" />
          <span className="font-mono text-[9px] font-bold uppercase tracking-wider">
            UID BBM • {adminRegion}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={() => router.push('/transactions?status=ANOMALY')}
          className="relative flex items-center gap-1.5 px-3 py-1.5 rounded-[4px] bg-red-50 text-anomaly-red border border-red-100 hover:bg-red-100/70 transition-all font-sans"
        >
          <Bell className="h-4 w-4 text-anomaly-red shrink-0" />
          <span className="font-sans font-bold text-xs">Aktivitas</span>
        </button>

        <div className="h-6 w-px bg-border/80"></div>

        <div className="flex items-center gap-3">
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin text-pln-cyan" />
          ) : (
            <div className="flex flex-col text-right">
              <span className="font-sans font-bold text-xs text-foreground leading-tight">{adminName}</span>
              <div className="flex items-center justify-end gap-1.5 mt-0.5">
                <span className="px-1.5 py-0.2 rounded font-mono text-[9px] bg-pln-darkBlue text-white font-bold uppercase">
                  {adminRole}
                </span>
              </div>
            </div>
          )}

          <div className="w-8 h-8 rounded-full bg-pln-darkBlue flex items-center justify-center text-white shadow-sm shrink-0 border border-pln-cyan/20 cursor-pointer hover:scale-105 transition-transform">
            <User className="h-4 w-4 text-white" />
          </div>
        </div>
      </div>
    </header>
  );
}
