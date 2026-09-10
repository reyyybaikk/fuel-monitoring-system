import { Outlet, Link, useLocation } from 'react-router-dom';
import { Home, FileText, History, BarChart2, ShieldAlert, Truck, Download, HelpCircle } from 'lucide-react';
import clsx from 'clsx';
import Sidebar from './Sidebar';

const navItems = [
  { path: '/', label: 'Beranda Monitoring', icon: Home },
  { path: '/input', label: 'Input Realisasi BBM', icon: FileText },
  { path: '/history', label: 'Riwayat Transaksi', icon: History },
  { path: '/reports', label: 'Laporan & Analitik', icon: BarChart2 },
  { path: '/audit', label: 'Audit & Anomali', icon: ShieldAlert, badge: 5 },
  { path: '/fleet', label: 'Data Armada', icon: Truck },
  { path: '/export', label: 'Ekspor & Laporan PDF', icon: Download },
];

export default function Layout() {
  const location = useLocation();

  return (
    <div className="flex h-screen bg-slate-100 font-sans text-slate-800">
      <Sidebar navItems={navItems} />

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6">
          <div className="flex-1 max-w-2xl">
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">🔍</span>
              <input 
                type="text" 
                placeholder="Cari No. Polisi, ID Kendaraan, SPBU, atau No. Kupon" 
                className="w-full pl-10 pr-4 py-2 bg-slate-100 border-none rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
          </div>
          
          <div className="flex items-center gap-4 ml-4">
            <button className="flex items-center gap-2 text-sm font-medium text-slate-600 bg-white border border-slate-200 px-3 py-1.5 rounded-lg">
              <span className="text-slate-400">⚙️</span> Filter Armada ▼
            </button>
            <button className="flex items-center gap-2 text-sm font-medium text-slate-600 bg-white border border-slate-200 px-3 py-1.5 rounded-lg">
              📅 Periode Anggaran <br/><span className="font-bold text-slate-800">Mei 2025</span> ▼
            </button>
            <button className="relative p-2 text-slate-400 hover:text-blue-600">
              🔔
              <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
            </button>
            <div className="flex items-center gap-3 pl-4 border-l border-slate-200">
              <div className="w-8 h-8 bg-slate-200 rounded-full overflow-hidden">
                {/* Avatar Placeholder */}
              </div>
              <div className="text-sm">
                <p className="font-bold text-slate-800 leading-none">Sofyan Hartopo</p>
                <p className="text-xs text-slate-500 mt-1">Fleet Supervisor</p>
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto bg-slate-50 p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
