'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import api from '@/services/api';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import InteractiveElement from '@/components/ui/InteractiveElement';
import {
  Fuel,
  Wallet,
  Truck,
  AlertTriangle,
  RefreshCw,
  ArrowUp,
  ArrowDown,
  Loader2,
  ChevronRight,
  MapPin,
  Clock,
  CheckCircle2,
  Activity,
  Plus,
  Minus,
  Search,
  Bell,
  Gauge
} from 'lucide-react';
import { cn } from '@/lib/utils';
import toast from 'react-hot-toast';

// --- SUB-KOMPONEN: DONUT CHART (SVG) ---
const DonutChart = ({ data }: { data: any[] }) => {
  const total = data.reduce((acc, curr) => acc + parseFloat(curr.value), 0);
  let currentAngle = 0;

  return (
    <div className="relative w-48 h-48 flex items-center justify-center">
      <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
        {data.map((item, i) => {
          const percentage = (parseFloat(item.value) / total) * 100;
          const angle = (percentage / 100) * 360;
          const x1 = 50 + 40 * Math.cos((currentAngle * Math.PI) / 180);
          const y1 = 50 + 40 * Math.sin((currentAngle * Math.PI) / 180);
          const x2 = 50 + 40 * Math.cos(((currentAngle + angle) * Math.PI) / 180);
          const y2 = 50 + 40 * Math.sin(((currentAngle + angle) * Math.PI) / 180);
          const largeArc = angle > 180 ? 1 : 0;

          const colors = ['#18a4c5', '#00A2E8', '#0b536f', '#ef4444'];
          const pathData = `M 50 50 L ${x1} ${y1} A 40 40 0 ${largeArc} 1 ${x2} ${y2} Z`;
          currentAngle += angle;

          return <path key={i} d={pathData} fill={colors[i % colors.length]} stroke="white" strokeWidth="0.5" />;
        })}
        <circle cx="50" cy="50" r="28" fill="white" />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter leading-none">Total Armada</span>
        <span className="text-xl font-black text-slate-800 leading-tight">110</span>
        <span className="text-[9px] font-bold text-pln-cyan">64.8k Liter</span>
      </div>
    </div>
  );
};

// --- SUB-KOMPONEN: INTERACTIVE MAP (SVG KALIMANTAN) ---
const KalimantanMap = ({ markers }: { markers: any[] }) => {
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const mapRef = useRef<HTMLDivElement>(null);

  // Batas Peta Kalimantan (Approximate Coordinate Window)
  // Lat: 4.5N to -4.5S, Lng: 108.5E to 119.5E
  const getMapPos = (lat: number, lng: number) => {
    const x = ((lng - 108.5) / (119.5 - 108.5)) * 100;
    const y = (1 - (lat - (-4.5)) / (4.5 - (-4.5))) * 100;
    return { x: `${x}%`, y: `${y}%` };
  };

  return (
    <div className="relative w-full h-[400px] bg-slate-50 border border-border/60 rounded-xl overflow-hidden cursor-grab active:cursor-grabbing shadow-inner group" ref={mapRef}>
      {/* Zoom Controls */}
      <div className="absolute top-4 right-4 z-20 flex flex-col gap-2">
        <button onClick={() => setZoom(prev => Math.min(prev + 0.5, 4))} className="w-8 h-8 rounded bg-white shadow-md border border-border flex items-center justify-center hover:bg-slate-50 active:scale-90 transition-all text-slate-700">
           <Plus className="h-4 w-4" />
        </button>
        <button onClick={() => setZoom(prev => Math.max(prev - 0.5, 1))} className="w-8 h-8 rounded bg-white shadow-md border border-border flex items-center justify-center hover:bg-slate-50 active:scale-90 transition-all text-slate-700">
           <Minus className="h-4 w-4" />
        </button>
      </div>

      <div
        className="w-full h-full transition-transform duration-300 ease-out flex items-center justify-center"
        style={{ transform: `scale(${zoom}) translate(${offset.x}px, ${offset.y}px)` }}
      >
        <div className="relative w-[80%] h-[80%] opacity-20">
          <svg viewBox="0 0 100 100" className="w-full h-full fill-slate-300">
             {/* Simplified Kalimantan Silhouette */}
             <path d="M45,10 C55,5 75,5 85,15 C95,25 98,40 95,55 C92,70 85,85 75,92 C65,98 45,95 30,85 C15,75 5,60 8,40 C12,20 25,10 45,10" />
          </svg>
        </div>

        {/* Dynamic Markers from Database */}
        {markers.map((marker, i) => {
          const pos = getMapPos(marker.lat, marker.lng);
          const hasAnomaly = marker.anomaly_count > 0;

          return (
            <div
              key={i}
              className="absolute group/pin"
              style={{ left: pos.x, top: pos.y }}
            >
              <div className={cn(
                "relative flex items-center justify-center",
                hasAnomaly ? "animate-bounce" : ""
              )}>
                <div className={cn(
                  "w-4 h-4 rounded-full border-2 border-white shadow-lg",
                  hasAnomaly ? "bg-red-500" : "bg-emerald-500"
                )} />
                <div className={cn(
                  "absolute inset-0 rounded-full animate-ping opacity-30",
                  hasAnomaly ? "bg-red-500" : "bg-emerald-500"
                )} />
              </div>

              {/* Marker Tooltip */}
              <div className="absolute bottom-6 left-1/2 -translate-x-1/2 w-48 bg-[#0b1c30] text-white p-3 rounded-lg shadow-2xl opacity-0 group-hover/pin:opacity-100 pointer-events-none transition-all z-30 border border-white/10 scale-90 group-hover/pin:scale-100">
                <span className="text-[10px] font-black uppercase text-pln-cyan block border-b border-white/10 pb-1.5 mb-2">{marker.label}</span>
                <div className="flex flex-col gap-1.5">
                   <div className="flex justify-between text-[11px] font-bold">
                     <span className="text-slate-400">Total Unit:</span>
                     <span>{marker.vehicle_count}</span>
                   </div>
                   {hasAnomaly && (
                     <div className="flex justify-between text-[11px] font-bold text-red-400">
                       <span>⚠️ Anomali:</span>
                       <span>{marker.anomaly_count} Kasus</span>
                     </div>
                   )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Map Legend */}
      <div className="absolute bottom-4 left-4 bg-white/80 backdrop-blur-md p-3 rounded-lg border border-border/60 shadow-sm z-10 flex flex-col gap-2">
         <div className="flex items-center gap-2 text-[10px] font-black text-slate-700 uppercase">
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> Armada Siaga Normal
         </div>
         <div className="flex items-center gap-2 text-[10px] font-black text-slate-700 uppercase">
            <div className="w-2.5 h-2.5 rounded-full bg-red-500" /> Anomali Terdeteksi
         </div>
      </div>
    </div>
  );
};

export default function DashboardPage() {
  const router = useRouter();
  const { userProfile } = useAuthStore();
  const [range, setRange] = useState('7d');
  const [mounted, setMounted] = useState(false);
  const [selectedRegion, setSelectedRegion] = useState<string>('ALL');

  useEffect(() => {
    setMounted(true);
    if (userProfile?.region) setSelectedRegion(userProfile.region);
  }, [userProfile]);

  const isPusat = userProfile?.role === 'ADMIN_PUSAT';

  const { data: serverResponse, isLoading, isRefetching, refetch } = useQuery({
    queryKey: ['dashboardSummary', range, selectedRegion],
    queryFn: async () => {
      const response = await api.get('/api/fuel-transactions/summary', {
        params: {
          range,
          ul_nd: isPusat ? (selectedRegion === 'ALL' ? undefined : selectedRegion) : undefined
        }
      });
      return response.data;
    },
    enabled: mounted && !!userProfile,
  });

  const data = serverResponse?.data;

  if (!mounted || isLoading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4 text-center font-sans">
        <div className="relative">
          <Loader2 className="h-12 w-12 text-pln-cyan animate-spin" />
          <Activity className="absolute inset-0 m-auto h-5 w-5 text-pln-darkBlue animate-pulse" />
        </div>
        <div className="space-y-1">
          <p className="text-sm font-black text-pln-darkBlue uppercase tracking-widest">Inisialisasi Sistem Telemetri</p>
          <p className="text-[10px] text-muted-foreground font-bold">Sinkronisasi Database Supabase & ML Engine...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 font-sans select-none pb-12">

      {/* HEADER PAGE */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-pln-darkBlue text-[11px] font-black uppercase tracking-[0.2em] mb-1">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
            Telemetry Command Center • {isPusat ? 'Kantor Pusat' : selectedRegion}
          </div>
          <h1 className="text-2xl font-black text-[#0b1c30] tracking-tighter">OPERATIONAL DASHBOARD</h1>
        </div>

        <div className="flex items-center gap-3 bg-white p-2 rounded-xl border border-border/60 shadow-sm">
          {isPusat && (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-pln-iceBlue/40 border border-pln-cyan/20 rounded-lg">
              <MapPin className="h-4 w-4 text-pln-cyan" />
              <select
                value={selectedRegion}
                onChange={(e) => setSelectedRegion(e.target.value)}
                className="bg-transparent text-[11px] font-black text-pln-darkBlue uppercase outline-none focus:ring-0 min-w-[160px]"
              >
                <option value="ALL">KESELURUHAN (GLOBAL)</option>
                <option value="Banjarmasin">UL Banjarmasin</option>
                <option value="Barabai">UL Barabai</option>
                <option value="Palangkaraya">UL Palangkaraya</option>
                <option value="Pangkalan Bun">UL Pangkalan Bun</option>
                <option value="Kapuas">UL Kapuas</option>
              </select>
            </div>
          )}
          <button onClick={() => refetch()} disabled={isRefetching} className="p-2.5 rounded-lg bg-slate-50 border border-border hover:bg-white transition-all active:scale-90 group">
             <RefreshCw className={cn("h-4 w-4 text-pln-darkBlue group-hover:rotate-180 transition-transform duration-500", isRefetching && "animate-spin")} />
          </button>
        </div>
      </div>

      {/* 1. TOP METRIC DECK */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        {[
          {
            label: 'Total Konsumsi BBM / Bulan',
            value: `${(data?.total_liters || 0).toLocaleString('id-ID')} L`,
            sub: 'Target: 68.0k L',
            trend: '+4.2% vs target',
            icon: Fuel,
            color: 'bg-[#18a4c5]'
          },
          {
            label: 'Armada Aktif Terhubung',
            value: `${data?.active_vehicles || 0} Unit`,
            sub: '100% Siaga Operasi Lapangan',
            trend: 'Kalsel-Teng',
            icon: Truck,
            color: 'bg-[#0b536f]'
          },
          {
            label: 'Rata-Rata Efisiensi BBM',
            value: `${(data?.avg_efficiency || 0).toFixed(1)} Km/L`,
            sub: 'Benchmark Standar > 10.0 Km/L',
            trend: 'WAJAR',
            icon: Gauge,
            color: 'bg-[#f6e736]',
            light: true
          },
          {
            label: 'Anomali & Over-Quota',
            value: `${data?.anomaly_count || 0} Kasus`,
            sub: '3 Unit Diblokir Otomatis',
            trend: 'PERLU AKSI',
            icon: AlertTriangle,
            color: 'bg-[#ef4444]'
          },
        ].map((item, i) => (
          <Card key={i} className={cn("border-none overflow-hidden relative group shadow-lg", item.color)}>
            <CardContent className="p-6 text-white relative z-10">
              <div className="flex items-center justify-between mb-4">
                <span className={cn("text-[10px] font-black uppercase tracking-widest opacity-80", item.light && "text-slate-800")}>{item.label}</span>
                <item.icon className={cn("h-5 w-5 opacity-60", item.light && "text-slate-800")} />
              </div>
              <div className="space-y-1">
                <div className={cn("text-3xl font-black tracking-tighter font-mono", item.light && "text-slate-900")}>{item.value}</div>
                <div className="flex items-center justify-between pt-2">
                  <span className={cn("text-[10px] font-bold opacity-70", item.light && "text-slate-600")}>{item.sub}</span>
                  <Badge className={cn("bg-white/20 border-none text-[9px] font-black", item.light && "bg-black/10 text-slate-800")}>{item.trend}</Badge>
                </div>
              </div>
            </CardContent>
            {/* Background Icon Watermark */}
            <item.icon className="absolute -right-4 -bottom-4 h-24 w-24 text-black/10 -rotate-12 pointer-events-none group-hover:scale-110 transition-transform duration-700" />
          </Card>
        ))}
      </div>

      {/* 2. CENTER DATA ANALYTICS GRID */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5">

        {/* LEFT: TREND BAR CHART */}
        <Card className="xl:col-span-4 bg-white border border-border/60 shadow-sm rounded-2xl overflow-hidden flex flex-col">
          <div className="p-6 border-b border-border/40 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-black text-[#0b1c30] uppercase tracking-wider">Tren Konsumsi BBM vs Batas Ambang</h2>
              <p className="text-[10px] text-muted-foreground font-bold italic mt-0.5">Monitoring realisasi vs pagu anggaran bulanan</p>
            </div>
            <Badge variant="outline" className="font-mono text-[10px] border-slate-200">2025</Badge>
          </div>
          <div className="flex-1 p-6 flex flex-col justify-end">
            <div className="h-48 w-full flex items-end justify-between gap-2 px-2">
               {(data?.chart_data || []).map((p: any, i: number) => (
                 <div key={i} className="flex-1 flex flex-col items-center group relative">
                    <div className="absolute -top-6 text-[9px] font-black text-slate-800 opacity-0 group-hover:opacity-100 transition-opacity">
                       {Number(p.value || 0).toFixed(0)}
                    </div>
                    <div className="w-full bg-pln-iceBlue rounded-t-sm h-full absolute bottom-0 z-0 opacity-40 border-x border-slate-100" />
                    <div className="w-full bg-[#156075] rounded-t-md transition-all duration-700 z-10" style={{ height: `${(Number(p.value || 0) / 4000) * 100}%` }} />
                    {Number(p.anomaly_value || 0) > 0 && (
                       <div className="w-full bg-[#ef4444] rounded-t-md absolute bottom-0 z-20" style={{ height: `${(Number(p.anomaly_value || 0) / 4000) * 100}%` }} />
                    )}
                    <span className="text-[9px] font-black text-slate-400 mt-3 uppercase">{p.label}</span>
                 </div>
               ))}
            </div>
            {/* Legend */}
            <div className="mt-8 flex items-center gap-4 text-[9px] font-black text-slate-500 uppercase tracking-tighter">
               <div className="flex items-center gap-1.5"><div className="w-3 h-3 bg-[#156075] rounded-sm" /> BBM Riil (PLN Teal)</div>
               <div className="flex items-center gap-1.5"><div className="w-3 h-3 bg-pln-iceBlue border border-slate-200 rounded-sm" /> Kuota Standar</div>
               <div className="flex items-center gap-1.5"><div className="w-3 h-3 bg-[#ef4444] rounded-sm" /> Over-Quota</div>
            </div>
          </div>
        </Card>

        {/* MIDDLE: ALLOCATION DONUT */}
        <Card className="xl:col-span-4 bg-white border border-border/60 shadow-sm rounded-2xl flex flex-col">
          <div className="p-6 border-b border-border/40 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-black text-[#0b1c30] uppercase tracking-wider">Alokasi BBM</h2>
              <p className="text-[10px] text-muted-foreground font-bold italic mt-0.5">Proporsi konsumsi armada PLN</p>
            </div>
          </div>
          <div className="flex-1 p-6 flex flex-col items-center justify-center gap-8">
            <DonutChart data={data?.allocation || []} />
            <div className="w-full space-y-2">
               {(data?.allocation || []).map((item: any, i: number) => (
                 <div key={i} className="flex items-center justify-between text-[11px] font-bold">
                    <div className="flex items-center gap-2">
                       <div className={cn("w-2 h-2 rounded-full", i === 0 ? "bg-[#18a4c5]" : i === 1 ? "bg-[#00A2E8]" : "bg-[#0b536f]")} />
                       <span className="text-slate-600 truncate max-w-[140px] uppercase">{item.label}</span>
                    </div>
                    <span className="text-slate-900">{((Number(item.value || 0) / Math.max(data?.total_liters, 1)) * 100).toFixed(0)}%</span>
                 </div>
               ))}
            </div>
          </div>
        </Card>

        {/* RIGHT: RECENT TRANSACTIONS */}
        <Card className="xl:col-span-4 bg-white border border-border/60 shadow-sm rounded-2xl flex flex-col">
          <div className="p-6 border-b border-border/40 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-black text-[#0b1c30] uppercase tracking-wider">Transaksi BBM Terkini</h2>
              <p className="text-[10px] text-muted-foreground font-bold italic mt-0.5">Dispenser digital & IoT nozzle telemetri</p>
            </div>
            <div className="flex items-center gap-1 text-[#00A2E8] font-black text-[9px] animate-pulse">
               <div className="w-1.5 h-1.5 rounded-full bg-[#00A2E8]" /> LIVE SPBU
            </div>
          </div>
          <div className="flex-1 p-2 space-y-1 overflow-y-auto no-scrollbar">
             {(data?.recent_activities || []).map((tx: any, i: number) => (
               <div key={i} className="flex items-center justify-between p-3 rounded-xl hover:bg-slate-50 transition-colors border border-transparent hover:border-slate-100 group">
                  <div className="flex items-center gap-3">
                     <div className="flex flex-col">
                        <div className="flex items-center gap-1.5">
                           <span className="text-xs font-black text-[#0b1c30] tracking-tighter uppercase">{tx.license_plate}</span>
                           <Badge className={cn(
                             "text-[7px] h-3.5 px-1 font-black rounded-[3px] border-none shadow-sm",
                             tx.ml_is_anomaly ? "bg-[#ef4444] text-white" : "bg-emerald-500 text-white"
                           )}>
                             {tx.ml_is_anomaly ? 'KRITIS' : 'NORMAL'}
                           </Badge>
                        </div>
                        <span className="text-[10px] text-muted-foreground font-bold uppercase truncate max-w-[120px]">{tx.address || 'SPBU Regional'}</span>
                     </div>
                  </div>
                  <div className="text-right">
                     <div className="text-[11px] font-black text-pln-darkBlue font-mono">{tx.fuel_amount} L</div>
                     <div className="text-[9px] font-bold text-slate-400 font-mono italic">Rp {Number(tx.total_cost).toLocaleString('id-ID')}</div>
                  </div>
               </div>
             ))}
             <button onClick={() => router.push('/transactions')} className="w-full mt-4 h-11 bg-pln-cyan text-white text-[10px] font-black uppercase tracking-widest rounded-xl shadow-lg active:scale-95 transition-all">
                Lihat Semua Transaksi BBM
             </button>
          </div>
        </Card>
      </div>

      {/* 3. BOTTOM GRID: TICKETS & MAP */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5">

        {/* TIKET & ANTREAN */}
        <Card className="xl:col-span-4 bg-white border border-border/60 shadow-sm rounded-2xl overflow-hidden flex flex-col">
          <div className="p-6 border-b border-border/40 flex items-center justify-between bg-slate-50/50">
            <div>
              <h2 className="text-sm font-black text-[#0b1c30] uppercase tracking-wider">Tiket & Antrean Verifikasi</h2>
              <p className="text-[10px] text-muted-foreground font-bold italic mt-0.5">Audit Rule-Engine & deteksi anomali volume</p>
            </div>
            <span className="text-[10px] font-black text-red-500">{data?.tickets?.pending_tickets || 0} Kasus Menunggu</span>
          </div>
          <div className="p-4 space-y-4">
             <div className="flex gap-2 mb-4">
                {['Semua', 'Kritis', 'Investigasi', 'Selesai'].map((tab, idx) => (
                  <Badge key={idx} variant="outline" className={cn("text-[9px] px-2.5 py-1 font-black uppercase rounded-lg border-slate-200 cursor-pointer hover:bg-slate-50", idx===0 && "bg-[#0b1c30] text-white border-none")}>
                    {tab} ({idx === 0 ? data?.tickets?.pending_tickets + data?.tickets?.investigation_tickets : idx === 1 ? data?.tickets?.pending_tickets : idx === 2 ? data?.tickets?.investigation_tickets : data?.tickets?.completed_tickets})
                  </Badge>
                ))}
             </div>

             {(data?.recent_activities || []).filter(t => t.ml_is_anomaly).slice(0, 3).map((tx: any, i: number) => (
                <div key={i} className="p-4 rounded-xl border border-slate-100 bg-white shadow-sm relative overflow-hidden">
                   <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#ef4444]" />
                   <div className="flex items-center gap-3 mb-2">
                      <div className="w-6 h-6 rounded-full bg-red-100 flex items-center justify-center">
                         <AlertTriangle className="h-3.5 w-3.5 text-[#ef4444]" />
                      </div>
                      <span className="text-xs font-black text-slate-800 tracking-tighter uppercase">{tx.license_plate} <small className="text-slate-400 font-bold ml-1 font-mono">#TK-{tx.id}</small></span>
                      <Badge className="ml-auto bg-[#ef4444] text-white text-[8px] font-black rounded-[4px] uppercase">Kritis</Badge>
                   </div>
                   <p className="text-[10px] text-slate-600 leading-relaxed font-medium mb-4">
                      Pengisian <span className="font-bold text-slate-800">{tx.fuel_amount} L</span> terdeteksi melampaui ambang batas historis armada di {tx.address || 'SPBU'}.
                   </p>
                   <div className="flex items-center justify-between">
                      <span className="text-[9px] font-bold text-slate-400 uppercase flex items-center gap-1.5">
                         <Clock className="h-3 w-3" /> 18 Menit Lalu
                      </span>
                      <button onClick={() => router.push(`/transactions/${tx.id}/review`)} className="px-3 py-1.5 rounded-lg bg-red-50 text-red-600 text-[9px] font-black uppercase hover:bg-red-600 hover:text-white transition-all">Verifikasi SPBU</button>
                   </div>
                </div>
             ))}

             <button className="w-full flex items-center justify-center gap-2 text-[10px] font-black text-slate-500 uppercase hover:text-pln-darkBlue transition-colors py-2 group">
                Buka Semua Kasus <ChevronRight className="h-3.5 w-3.5 group-hover:translate-x-1 transition-transform" />
             </button>
          </div>
        </Card>

        {/* INTERACTIVE MAP */}
        <Card className="xl:col-span-8 bg-white border border-border/60 shadow-sm rounded-2xl overflow-hidden flex flex-col">
          <div className="p-6 border-b border-border/40 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-black text-[#0b1c30] uppercase tracking-wider">Peta Sebaran Armada & Unit Layanan Terhubung</h2>
              <p className="text-[10px] text-muted-foreground font-bold italic mt-0.5">GPS Telemetri Real-Time Wilayah Kerja Kalimantan Selatan & Kalimantan Tengah</p>
            </div>
            <div className="flex gap-2">
               {['Semua Titik', 'Siaga', 'Kantor ULP'].map((f, idx) => (
                 <Badge key={idx} className={cn("text-[9px] h-6 px-2.5 font-black uppercase border-none rounded-lg", idx === 0 ? "bg-[#0b1c30] text-white" : "bg-slate-100 text-slate-500")}>
                    {f}
                 </Badge>
               ))}
            </div>
          </div>

          {/* Map Info Bar */}
          <div className="bg-[#156075] p-3 flex flex-wrap items-center justify-between gap-4">
             <div className="flex items-center gap-6">
                <div className="flex items-center gap-2">
                   <div className="p-1 rounded bg-white/10 text-pln-cyan"><Activity className="h-3.5 w-3.5" /></div>
                   <div className="flex flex-col"><span className="text-[8px] text-white/60 font-bold uppercase leading-none">Live Sync</span><span className="text-[10px] text-white font-black leading-tight uppercase">Database</span></div>
                </div>
                <div className="flex flex-col"><span className="text-[8px] text-white/60 font-bold uppercase leading-none">Kendaraan Online</span><span className="text-[10px] text-white font-black leading-tight">110 / 110</span></div>
                <div className="flex flex-col"><span className="text-[8px] text-white/60 font-bold uppercase leading-none">Kantor Unit</span><span className="text-[10px] text-white font-black leading-tight">14 Lokasi</span></div>
             </div>
             <div className="flex items-center gap-2">
                <span className="text-[9px] text-white/80 font-black uppercase tracking-widest">SLA: 99.98%</span>
                <div className="w-16 h-1 bg-white/20 rounded-full overflow-hidden"><div className="h-full w-full bg-[#FFE600]" /></div>
             </div>
          </div>

          <KalimantanMap markers={data?.map_markers || []} />

          <div className="p-4 bg-slate-50 border-t border-border/40 flex items-center justify-between">
             <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" /> <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">SCADA Kalselteng Grid Active</span></div>
                <span className="text-slate-300">|</span>
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">GPS Ping: 0.8s</span>
             </div>
             <p className="text-[9px] font-bold text-slate-400 italic">Protokol SCADA Terenkripsi • PLN Nusa Daya & Danantara Sovereign Fund</p>
          </div>
        </Card>
      </div>

    </div>
  );
}
