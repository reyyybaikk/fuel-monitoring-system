'use client';

import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { getDashboardSummary, DashboardSummary } from '@/services/dashboardService';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import InteractiveElement from '@/components/ui/InteractiveElement';
import { Fuel, Wallet, Truck, AlertTriangle, RefreshCw, ArrowUp, ArrowDown, Loader2, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import toast from 'react-hot-toast';

export default function DashboardPage() {
  const router = useRouter();
  const [range, setRange] = useState('7d');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const { data: serverResponse, isLoading, isRefetching, refetch } = useQuery({
    queryKey: ['dashboardSummary', range],
    queryFn: () => getDashboardSummary(range),
    enabled: mounted, // Hanya ambil data jika sudah mounted di browser
  });

  const data: DashboardSummary | undefined = serverResponse?.data;

  const handleSync = async () => {
    const syncToast = toast.loading('Mensinkronkan data...');
    try {
      await refetch();
      toast.success('Sinkronisasi berhasil!', { id: syncToast });
    } catch (err) {
      toast.error('Gagal sinkronisasi.', { id: syncToast });
    }
  };

  const navigateToAnomaly = (id: string) => {
    router.push(`/transactions?id=${id}`);
  };

  // Selama proses Hydration (menunggu mounted), kita tampilkan kerangka kosong
  // atau loading state yang konsisten agar HTML Server & Client cocok.
  if (!mounted || isLoading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-3 text-center">
        <Loader2 className="h-10 w-10 text-pln-cyan animate-spin" />
        <p className="text-sm font-bold text-pln-darkBlue">Menarik Telemetri...</p>
      </div>
    );
  }

  const stats = {
    totalLiter: data?.total_liters ?? 0,
    totalCost: data?.total_cost ?? 0,
    activeVehicles: data?.active_vehicles ?? 0,
    totalVehicles: data?.total_vehicles ?? 0,
    anomalyCount: data?.anomaly_count ?? 0,
    literChange: data?.liter_change_percentage ?? 0,
    costChange: data?.cost_change_percentage ?? 0,
  };

  const recentAnomalies = data?.recent_anomalies ?? [];
  const chartPoints = data?.chart_data ?? [];

  return (
    <div className="space-y-6 font-sans select-none">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-pln-darkBlue text-[11px] font-mono font-bold uppercase tracking-wider mb-0.5">
            <span className="w-2 h-2 rounded-full bg-pln-cyan animate-pulse"></span>
            Audit Operasional Terpadu • Live Data
          </div>
          <h1 className="text-xl font-bold text-foreground tracking-tight">Ringkasan Monitoring BBM</h1>
          <p className="text-xs text-muted-foreground">Pantauan efisiensi armada dan deteksi AI.</p>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center p-0.5 rounded-md bg-white border border-border text-[11px] shadow-sm">
            {['1d', '7d', '30d'].map((r) => (
              <button key={r} onClick={() => setRange(r)} className={cn("px-3 py-1 rounded-[4px] transition-all", range === r ? "bg-pln-iceBlue text-pln-darkBlue font-bold border border-pln-cyan/10" : "text-muted-foreground hover:text-foreground")}>
                {r === '1d' ? 'Hari Ini' : r === '7d' ? '7 Hari' : '30 Hari'}
              </button>
            ))}
          </div>
          <button onClick={handleSync} disabled={isRefetching} className="flex items-center gap-1.5 px-3 py-1.5 h-8 text-xs font-semibold rounded-[4px] bg-white border border-border text-pln-darkBlue shadow-sm active:scale-95 disabled:opacity-50">
            <RefreshCw className={cn("h-3.5 w-3.5 text-pln-cyan", isRefetching && "animate-spin")} />
            <span>Sinkron Data</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {[
          { label: 'Total Konsumsi BBM', value: `${stats.totalLiter.toLocaleString('id-ID')} L`, change: stats.literChange, icon: Fuel, color: 'pln-cyan' },
          { label: 'Total Biaya', value: `Rp ${stats.totalCost.toLocaleString('id-ID')}`, change: stats.costChange, icon: Wallet, color: 'pln-darkBlue' },
          { label: 'Status Armada Aktif', value: `${stats.activeVehicles}/${stats.totalVehicles}`, sub: 'Unit', icon: Truck, color: 'pln-yellow' },
          { label: 'Anomali Terdeteksi', value: `${stats.anomalyCount} Insiden`, badge: 'WARNING', icon: AlertTriangle, color: 'anomaly-red' },
        ].map((item, i) => (
          <InteractiveElement key={i} className="rounded-[8px] border border-border bg-white shadow-sm overflow-hidden h-28 p-4 flex flex-col justify-between group hover:border-pln-cyan/30 transition-all cursor-default">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-muted-foreground uppercase">{item.label}</span>
              <div className="w-8 h-8 rounded-md bg-pln-iceBlue flex items-center justify-center text-pln-darkBlue group-hover:scale-110 transition-transform">
                <item.icon className={cn("h-4 w-4", item.color === 'anomaly-red' && "text-anomaly-red")} />
              </div>
            </div>
            <div>
              <div className="flex items-baseline gap-1">
                <span className={cn("font-mono text-lg font-bold text-foreground", item.color === 'anomaly-red' && "text-anomaly-red")}>{item.value}</span>
              </div>
              {item.change !== undefined && (
                <p className="text-[9px] text-muted-foreground mt-0.5 flex items-center gap-1 font-medium">
                  <span className={cn("flex items-center", item.change > 0 ? (item.color === 'anomaly-red' ? "text-anomaly-red" : "text-pln-cyan") : "text-emerald-600")}>
                    {item.change > 0 ? <ArrowUp className="h-2.5 w-2.5" /> : <ArrowDown className="h-2.5 w-2.5" />} {Math.abs(item.change)}%
                  </span> vs periode lalu
                </p>
              )}
            </div>
          </InteractiveElement>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">
        <Card className="xl:col-span-8 rounded-[8px] border-border bg-white shadow-sm p-5 min-h-[380px]">
          <div className="flex justify-between items-center border-b pb-4 mb-6">
            <h2 className="text-sm font-bold text-foreground">Tren Konsumsi BBM</h2>
            <div className="flex gap-4 text-[10px] font-bold text-muted-foreground">
              <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-pln-darkBlue"></span> Riil</div>
              <div className="flex items-center gap-1.5"><span className="w-3 h-0 border-t-2 border-dashed border-pln-cyan"></span> Batas</div>
            </div>
          </div>
          <div className="h-48 relative flex items-end">
            <svg className="w-full h-full overflow-visible" preserveAspectRatio="none" viewBox="0 0 760 180">
              <line stroke="#eff4ff" strokeWidth="1" x1="0" x2="760" y1="150" y2="150"></line>
              <line stroke="#f6e736" strokeDasharray="4,3" strokeWidth="1.5" x1="0" x2="760" y1="40" y2="40"></line>
              {chartPoints.length > 0 && (
                <path d={`M ${chartPoints.map((p, i) => `${40 + i * 115},${150 - (p.value / 3000) * 120}`).join(' L ')}`} fill="none" stroke="#156075" strokeWidth="2.5" />
              )}
            </svg>
          </div>
        </Card>

        <Card className="xl:col-span-4 rounded-[8px] border-border bg-white shadow-sm p-4 flex flex-col">
          <h2 className="text-sm font-bold text-foreground border-b pb-3 mb-4">Antrean Anomali Terbaru</h2>
          <div className="space-y-3 flex-1 overflow-y-auto max-h-[300px]">
            {recentAnomalies.map((anom: any, idx: number) => (
              <InteractiveElement key={idx} onClick={() => navigateToAnomaly(anom.id)} className="p-3 border border-border bg-white hover:border-pln-cyan/40 rounded-[6px] transition-all cursor-pointer group shadow-sm">
                <div className="flex items-center justify-between font-mono text-[10px] font-bold mb-1">
                  <span className="text-pln-darkBlue bg-pln-iceBlue px-1.5 py-0.5 rounded">{anom.id}</span>
                  <span className="text-anomaly-red">Skor: {anom.score}</span>
                </div>
                <p className="text-xs font-bold text-foreground">{anom.plate}</p>
                <p className="text-[10px] text-muted-foreground line-clamp-1">{anom.notes}</p>
              </InteractiveElement>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}

function Button({ children, className, onClick, ...props }: any) {
  return (
    <button onClick={onClick} className={cn("inline-flex items-center justify-center rounded-md text-sm font-medium h-9 px-4 py-2 transition-all", className)} {...props}>
      {children}
    </button>
  );
}
