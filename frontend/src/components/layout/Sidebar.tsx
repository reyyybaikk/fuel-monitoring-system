'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import {
  Fuel,
  LayoutDashboard,
  Receipt,
  BarChart3,
  Truck,
  Users,
  Settings,
  Cpu,
  HelpCircle,
  LogOut
} from 'lucide-react';
import { cn } from '@/lib/utils';

export default function Sidebar() {
  const pathname = usePathname();
  const logoutUser = useAuthStore((state) => state.logout);

  const menuItems = [
    { label: 'Dasbor', href: '/dashboard', icon: LayoutDashboard },
    { label: 'Transaksi', href: '/transactions', icon: Receipt, badge: '1 Baru' },
    { label: 'Laporan', href: '/reports', icon: BarChart3 },
    { label: 'Kendaraan', href: '/vehicles', icon: Truck },
    { label: 'Pengguna', href: '/users', icon: Users },
    { label: 'Pengaturan', href: '/pengaturan', icon: Settings },
  ];

  return (
    <aside className="fixed left-0 top-0 h-screen w-64 bg-pln-darkBlue text-white z-50 flex flex-col justify-between select-none shadow-md font-sans">
      <div className="flex flex-col">
        {/* Header Logo Brand */}
        <div className="h-16 px-4 flex items-center gap-2.5 bg-black/10 border-b border-white/5">
          <div className="w-8 h-8 rounded-md bg-white/10 flex items-center justify-center text-white shrink-0">
            <Fuel className="h-4 w-4" />
          </div>
          <div className="flex flex-col min-w-0">
            <span className="font-sans font-bold text-sm text-white tracking-tight leading-tight truncate">
              FuelGuard AI
            </span>
            <span className="font-mono text-[9px] text-pln-cyan font-bold uppercase tracking-wider leading-none">
              Audit BBM &amp; Anti-Fraud
            </span>
          </div>
        </div>

        {/* Menu Section Kategori */}
        <div className="px-4 pt-5 pb-1.5">
          <span className="font-mono text-[10px] text-pln-iceBlue/50 uppercase tracking-widest font-bold">
            Menu Utama
          </span>
        </div>

        {/* Link Navigasi Menu */}
        <nav className="flex flex-col gap-1 px-2.5">
          {menuItems.map((item) => {
            const IconComponent = item.icon;
            const isActive = pathname.startsWith(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center justify-between px-3 py-2 rounded-[4px] text-xs font-medium transition-all duration-150",
                  isActive
                    ? "bg-pln-cyan text-white shadow-sm font-semibold"
                    : "text-pln-iceBlue/80 hover:bg-white/5 hover:text-white"
                )}
              >
                <div className="flex items-center gap-2.5">
                  <IconComponent className={cn("h-4 w-4 shrink-0", isActive ? "text-white" : "text-pln-iceBlue/60")} />
                  <span className="truncate">{item.label}</span>
                </div>
                {item.badge && (
                  <span className="inline-flex items-center px-1.5 py-0.5 rounded-full font-mono text-[9px] font-bold bg-anomaly-red text-white shadow-sm">
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Footer ML Engine Status & Logout */}
      <div className="p-3 flex flex-col gap-2 border-t border-white/5 bg-black/5">
        <div className="bg-white/5 border border-white/10 rounded-[6px] p-2.5">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-1.5">
              <span className="relative flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-pln-yellow opacity-75"></span>
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-pln-yellow"></span>
              </span>
              <span className="font-mono text-[9px] text-white/90 uppercase tracking-wide font-medium">
                Mesin ML: Aktif
              </span>
            </div>
            <span className="font-mono text-[9px] text-pln-cyan font-bold">V3.2</span>
          </div>
          <p className="font-sans text-[10px] text-pln-iceBlue/60 leading-tight">
            Model deteksi fraud real-time berjalan normal pada seluruh depo wilayah.
          </p>
        </div>

        <button
          onClick={() => logoutUser()}
          className="flex items-center justify-center gap-2 py-1.5 w-full rounded-[4px] font-sans text-[11px] font-medium text-pln-iceBlue/60 hover:bg-anomaly-red/10 hover:text-anomaly-red border border-transparent hover:border-anomaly-red/20 transition-all duration-150"
        >
          <LogOut className="h-3.5 w-3.5" />
          <span>Keluar Portal</span>
        </button>
      </div>
    </aside>
  );
}
