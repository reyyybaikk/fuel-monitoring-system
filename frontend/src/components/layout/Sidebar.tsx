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
  const { isSidebarCollapsed } = useUIStore();

  const menuItems = [
    { label: 'Dasbor', href: '/dashboard', icon: LayoutDashboard },
    { label: 'Transaksi', href: '/transactions', icon: Receipt, badge: '1 Baru' },
    { label: 'Laporan', href: '/reports', icon: BarChart3 },
    { label: 'Kendaraan', href: '/vehicles', icon: Truck },
  ];

  return (
    <aside className={cn(
      "fixed left-0 top-20 bottom-0 bg-pln-darkBlue text-white z-50 flex flex-col justify-between select-none shadow-xl font-sans transition-all duration-300 ease-in-out border-r border-white/5",
      isSidebarCollapsed ? "w-20" : "w-64"
    )}>
      <div className="flex flex-col flex-1 overflow-hidden">
        {/* Menu Section */}
        <div className="flex-1 py-6 overflow-y-auto no-scrollbar">
          <nav className="flex flex-col gap-1 px-3">
            {!isSidebarCollapsed && (
              <span className="px-3 mb-2 text-[10px] font-bold text-white/20 uppercase tracking-[0.2em]">
                Main Menu
              </span>
            )}

            {menuItems.map((item) => {
              const IconComponent = item.icon;
              const isActive = pathname.startsWith(item.href);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  title={isSidebarCollapsed ? item.label : ""}
                  className={cn(
                    "flex items-center rounded-lg transition-all duration-200 relative group",
                    isSidebarCollapsed ? "justify-center h-12" : "px-3 py-2.5",
                    isActive
                      ? "bg-white/10 text-pln-cyan shadow-sm"
                      : "text-white/60 hover:text-white hover:bg-white/5"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <IconComponent className={cn(
                      "h-5 w-5 shrink-0 transition-colors",
                      isActive ? "text-pln-cyan" : "text-white/40 group-hover:text-white/80"
                    )} />
                    {!isSidebarCollapsed && (
                      <span className={cn(
                        "text-xs font-semibold tracking-wide",
                        isActive ? "text-white" : ""
                      )}>
                        {item.label}
                      </span>
                    )}
                  </div>

                  {!isSidebarCollapsed && item.badge && (
                    <span className="ml-auto inline-flex items-center px-1.5 py-0.5 rounded font-mono text-[8px] font-bold bg-anomaly-red text-white">
                      {item.badge}
                    </span>
                  )}

                  {/* Tooltip for Collapsed State */}
                  {isSidebarCollapsed && (
                    <div className="absolute left-16 px-2.5 py-1.5 bg-[#0b1c30] border border-white/10 rounded-md text-[10px] font-bold text-white whitespace-nowrap opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 pointer-events-none transition-all z-50 shadow-2xl uppercase tracking-widest">
                      {item.label}
                    </div>
                  )}
                </Link>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Footer - Minimalist Logout */}
      <div className="p-3 bg-black/10 border-t border-white/5">
        <button
          onClick={() => logoutUser()}
          title={isSidebarCollapsed ? "Keluar Portal" : ""}
          className={cn(
            "flex items-center justify-center gap-2 py-2.5 w-full rounded-lg text-[11px] font-bold transition-all duration-200 uppercase tracking-widest",
            isSidebarCollapsed
              ? "text-white/20 hover:text-anomaly-red"
              : "text-white/40 hover:bg-anomaly-red/10 hover:text-anomaly-red border border-transparent hover:border-anomaly-red/20"
          )}
        >
          <LogOut className="h-4 w-4" />
          {!isSidebarCollapsed && <span>Sign Out</span>}
        </button>
      </div>
    </aside>
  );
}
