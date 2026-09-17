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
    { label: 'Transaksi', href: '/transactions', icon: Receipt,  },
    { label: 'Laporan', href: '/reports', icon: BarChart3 },
    { label: 'Kendaraan', href: '/vehicles', icon: Truck },
  ];

  return (
    <>
      {/* Overlay backdrop when sidebar is open on small screens */}
      {!isSidebarCollapsed && (
        <div
          className="fixed inset-0 bg-[#0b1c30]/40 z-[45] lg:hidden backdrop-blur-sm"
          onClick={toggleSidebar}
        />
      )}

      <aside className={cn(
        "fixed left-0 top-20 bottom-0 w-64 bg-white z-50 flex flex-col justify-between select-none shadow-2xl font-sans transition-all duration-300 ease-in-out border-r border-slate-200",
        isSidebarCollapsed ? "-translate-x-full" : "translate-x-0"
      )}>
        <div className="flex flex-col flex-1 overflow-hidden">
          {/* Menu Section */}
          <div className="flex-1 py-8 overflow-y-auto no-scrollbar">
            <nav className="flex flex-col gap-1.5 px-4">
              <span className="px-4 mb-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.25em]">
                Monitoring Konsol
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
                      "flex items-center px-4 py-3 rounded-[12px] transition-all duration-300 relative group mb-0.5",
                      isActive
                        ? "bg-[#0b536f] text-white shadow-[0_10px_20px_rgba(11,83,111,0.2)]"
                        : "text-slate-500 hover:text-[#0b536f] hover:bg-slate-50"
                    )}
                  >
                    <div className="flex items-center gap-4">
                      <IconComponent className={cn(
                        "h-5 w-5 shrink-0 transition-all",
                        isActive ? "text-white scale-110" : "text-slate-400 group-hover:text-[#0b536f]"
                      )} />
                      <span className={cn(
                        "text-[13px] font-bold tracking-tight",
                        isActive ? "text-white" : ""
                      )}>
                        {item.label}
                      </span>
                    </div>

                    {item.badge && !isActive && (
                      <span className="ml-auto inline-flex items-center px-1.5 py-0.5 rounded-full font-mono text-[8px] font-black bg-anomaly-red text-white shadow-sm">
                        {item.badge}
                      </span>
                    )}
                  </Link>
                );
              })}
            </nav>
          </div>
        </div>

        {/* Footer - Integrated with Design System */}
        <div className="p-4 bg-slate-50 border-t border-slate-100">
          <button
            onClick={() => logoutUser()}
            className="flex items-center justify-center gap-3 py-3 w-full rounded-[12px] text-[11px] font-black transition-all duration-200 uppercase tracking-widest text-slate-400 hover:bg-red-50 hover:text-red-600 border border-slate-200 hover:border-red-100 group"
          >
            <LogOut className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
            <span>Sign Out Sesi</span>
          </button>
        </div>
      </aside>
    </>
  );
}
