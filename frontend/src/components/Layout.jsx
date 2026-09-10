import { Outlet, Link, useLocation } from 'react-router-dom';
import { Home, FileText, History, BarChart2, ShieldAlert, Truck, Download, HelpCircle } from 'lucide-react';
import clsx from 'clsx';

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
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-slate-200 flex flex-col">
        <div className="p-6">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-600 rounded-md"></div>
            <div>
              <h1 className="font-bold text-blue-900 leading-tight">PLN BBM</h1>
              <p className="text-xs text-slate-500 font-medium">FLEET ANALYTICS</p>
            </div>
          </div>
          
          <div className="mt-6 p-3 bg-slate-50 rounded-lg border border-slate-200 cursor-pointer flex items-center justify-between">
            <div>
              <p className="text-[10px] text-slate-500 font-bold">UNIT OPERASIONAL</p>
              <p className="text-sm font-semibold text-blue-900">UP Kalimantan 2</p>
            </div>
            <span className="text-slate-400">▼</span>
          </div>
        </div>

        <nav className="flex-1 px-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={clsx(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                location.pathname === item.path 
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-blue-600'
              )}
            >
              <item.icon className="w-5 h-5" />
              {item.label}
              {item.badge && (
                <span className="ml-auto bg-red-600 text-white text-[10px] px-2 py-0.5 rounded-full font-bold">
                  {item.badge}
                </span>
              )}
            </Link>
          ))}
        </nav>

        <div className="p-4 border-t border-slate-100">
          <div className="flex items-center gap-2 mb-4 px-2">
            <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
            <span className="text-xs font-medium text-slate-600">Sistem Telemetri</span>
            <span className="ml-auto text-[10px] font-bold text-emerald-600">Aktif Normal</span>
          </div>
          <Link to="/help" className="flex items-center gap-2 px-2 py-2 text-xs font-medium text-slate-600 hover:text-blue-600">
            <HelpCircle className="w-4 h-4" />
            Pusat Bantuan & SOP
          </Link>
          <div className="mt-2 flex justify-between px-2 text-[10px] text-slate-400">
            <span>Build v2.4.1</span>
            <span>PLN UID Kalselteng</span>
          </div>
        </div>
      </aside>

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
