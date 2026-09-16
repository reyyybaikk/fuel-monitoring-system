'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { useUIStore } from '@/store/uiStore';
import {
  LayoutDashboard,
  Receipt,
  BarChart3,
  Truck,
  LogOut,
  ChevronLeft,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export default function Sidebar() {
  const pathname = usePathname();
  const logoutUser = useAuthStore((state) => state.logout);
  const { isSidebarCollapsed, toggleSidebar } = useUIStore();

  const menuItems = [
    { label: 'Dasbor', href: '/dashboard', icon: LayoutDashboard },
    { label: 'Transaksi', href: '/transactions', icon: Receipt, badge: '1 Baru' },
    { label: 'Laporan', href: '/reports', icon: BarChart3 },
    { label: 'Kendaraan', href: '/vehicles', icon: Truck },
  ];

  return (
    <aside className={cn(
      "fixed left-0 top-0 h-screen bg-pln-darkBlue text-white z-50 flex flex-col justify-between select-none shadow-md font-sans transition-all duration-300",
      isSidebarCollapsed ? "w-20" : "w-64"
    )}>
      <div className="flex flex-col">
        {/* Header Logo Brand - PLN NUSA DAYA UPKAL 2 */}
        <div className={cn(
          "h-24 px-4 flex items-center border-b border-white/10 relative transition-all duration-300",
          isSidebarCollapsed ? "justify-center px-0" : "gap-3 bg-black/10"
        )}>
          <div className={cn(
            "rounded bg-white p-1.5 flex items-center justify-center shrink-0 shadow-sm transition-all duration-300",
            isSidebarCollapsed ? "w-10 h-10" : "w-12 h-12"
          )}>
            <img src="/logo-pln.png" alt="PLN" className="w-full h-auto object-contain" onError={(e) => {
              e.currentTarget.style.display = 'none';
              e.currentTarget.parentElement!.innerHTML = '<span class="text-pln-darkBlue font-black text-[10px] text-center">PLN</span>';
            }} />
          </div>

          {!isSidebarCollapsed && (
            <div className="flex flex-col min-w-0">
              <span className="font-sans font-black text-[11px] text-white tracking-tighter leading-tight uppercase">
                PLN NUSA DAYA
              </span>
              <span className="font-sans text-[9px] text-pln-cyan font-bold uppercase tracking-tight leading-none mt-0.5">
                Unit Pelaksana Kalimantan 2
              </span>
            </div>
          )}

          {/* Tombol Mekanis Buka/Tutup */}
          <button
            onClick={toggleSidebar}
            className={cn(
              "absolute -right-3 top-10 w-6 h-6 rounded-full bg-pln-cyan text-white flex items-center justify-center shadow-lg hover:scale-110 active:scale-95 transition-all z-50",
              isSidebarCollapsed && "rotate-180"
            )}
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
        </div>

        {/* Menu Section Kategori */}
        <div className={cn("px-4 pt-5 pb-1.5", isSidebarCollapsed && "text-center px-0")}>
          <span className="font-mono text-[10px] text-pln-iceBlue/50 uppercase tracking-widest font-bold">
            {isSidebarCollapsed ? "•••" : "Menu Utama"}
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
                title={isSidebarCollapsed ? item.label : ""}
                className={cn(
                  "flex items-center rounded-[4px] text-xs font-medium transition-all duration-150 relative group",
                  isSidebarCollapsed ? "justify-center p-2.5 h-10" : "justify-between px-3 py-2",
                  isActive
                    ? "bg-pln-cyan text-white shadow-sm font-semibold"
                    : "text-pln-iceBlue/80 hover:bg-white/5 hover:text-white"
                )}
              >
                <div className="flex items-center gap-2.5">
                  <IconComponent className={cn("h-4 w-4 shrink-0", isActive ? "text-white" : "text-pln-iceBlue/60")} />
                  {!isSidebarCollapsed && <span className="truncate">{item.label}</span>}
                </div>

                {!isSidebarCollapsed && item.badge && (
                  <span className="inline-flex items-center px-1.5 py-0.5 rounded-full font-mono text-[9px] font-bold bg-anomaly-red text-white shadow-sm">
                    {item.badge}
                  </span>
                )}

                {/* Tooltip for Collapsed State */}
                {isSidebarCollapsed && (
                  <div className="absolute left-14 px-2 py-1 bg-pln-darkBlue border border-white/10 rounded text-[10px] font-bold text-white whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50">
                    {item.label}
                  </div>
                )}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Footer Logout */}
      <div className="p-3 flex flex-col gap-2 border-t border-white/5 bg-black/5">
        <button
          onClick={() => logoutUser()}
          title={isSidebarCollapsed ? "Keluar Portal" : ""}
          className={cn(
            "flex items-center justify-center gap-2 py-1.5 w-full rounded-[4px] font-sans text-[11px] font-medium text-pln-iceBlue/60 hover:bg-anomaly-red/10 hover:text-anomaly-red border border-transparent hover:border-anomaly-red/20 transition-all duration-150",
            isSidebarCollapsed ? "p-2" : "px-3"
          )}
        >
          <LogOut className="h-3.5 w-3.5" />
          {!isSidebarCollapsed && <span>Keluar Portal</span>}
        </button>
      </div>
    </aside>
  );
}
