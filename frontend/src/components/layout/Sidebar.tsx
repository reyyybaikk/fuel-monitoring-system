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
    <>
      {/* Overlay backdrop when sidebar is open on small screens */}
      {!isSidebarCollapsed && (
        <div
          className="fixed inset-0 bg-black/20 z-[45] lg:hidden backdrop-blur-sm"
          onClick={toggleSidebar}
        />
      )}

      <aside className={cn(
        "fixed left-0 top-20 bottom-0 w-64 bg-pln-darkBlue text-white z-50 flex flex-col justify-between select-none shadow-2xl font-sans transition-all duration-300 ease-in-out border-r border-white/5",
        isSidebarCollapsed ? "-translate-x-full" : "translate-x-0"
      )}>
        <div className="flex flex-col flex-1 overflow-hidden">
          {/* Menu Section */}
          <div className="flex-1 py-6 overflow-y-auto no-scrollbar">
            <nav className="flex flex-col gap-1 px-3">
              <span className="px-3 mb-4 text-[10px] font-bold text-white/20 uppercase tracking-[0.2em]">
                Navigasi Audit
              </span>

              {menuItems.map((item) => {
                const IconComponent = item.icon;
                const isActive = pathname.startsWith(item.href);

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => {
                        if (window.innerWidth < 1024) toggleSidebar();
                    }}
                    className={cn(
                      "flex items-center px-4 py-3 rounded-xl transition-all duration-200 relative group mb-1",
                      isActive
                        ? "bg-white/10 text-pln-cyan shadow-sm border border-white/5"
                        : "text-white/60 hover:text-white hover:bg-white/5"
                    )}
                  >
                    <div className="flex items-center gap-3.5">
                      <IconComponent className={cn(
                        "h-5 w-5 shrink-0 transition-colors",
                        isActive ? "text-pln-cyan" : "text-white/30 group-hover:text-white/70"
                      )} />
                      <span className={cn(
                        "text-[13px] font-bold tracking-wide uppercase",
                        isActive ? "text-white" : ""
                      )}>
                        {item.label}
                      </span>
                    </div>

                    {item.badge && (
                      <span className="ml-auto inline-flex items-center px-2 py-0.5 rounded-full font-mono text-[9px] font-black bg-anomaly-red text-white shadow-sm ring-2 ring-black/10">
                        {item.badge}
                      </span>
                    )}
                  </Link>
                );
              })}
            </nav>
          </div>
        </div>

        {/* Footer - Minimalist Logout */}
        <div className="p-4 bg-black/20 border-t border-white/5">
          <button
            onClick={() => logoutUser()}
            className="flex items-center justify-center gap-3 py-3 w-full rounded-xl text-[11px] font-black transition-all duration-200 uppercase tracking-widest text-white/40 hover:bg-anomaly-red hover:text-white shadow-sm border border-white/5 hover:border-transparent group"
          >
            <LogOut className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
            <span>Keluar Portal</span>
          </button>
        </div>
      </aside>
    </>
  );
}
