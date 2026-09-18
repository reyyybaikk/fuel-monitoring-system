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
  Gauge,
  TrendingUp,
  History,
  ShieldCheck
} from 'lucide-react';
import { cn } from '@/lib/utils';

// --- IMPORT LEAFLET SECARA DINAMIS ---
import dynamic from 'next/dynamic';
import 'leaflet/dist/leaflet.css';

const MapContainer = dynamic(() => import('react-leaflet').then(mod => mod.MapContainer), { ssr: false });
const TileLayer = dynamic(() => import('react-leaflet').then(mod => mod.TileLayer), { ssr: false });
const Marker = dynamic(() => import('react-leaflet').then(mod => mod.Marker), { ssr: false });
const Popup = dynamic(() => import('react-leaflet').then(mod => mod.Popup), { ssr: false });

// --- SUB-KOMPONEN: REAL INTERACTIVE MAP ---
const KalimantanMap = ({ markers }: { markers: any[] }) => {
  const [L, setL] = useState<any>(null);

  useEffect(() => {
    import('leaflet').then(leaflet => {
      setL(leaflet);
    });
  }, []);

  if (!L) return <div className="w-full h-[450px] flex items-center justify-center bg-slate-50/50"><Loader2 className="animate-spin text-pln-cyan" /></div>;

  const createCustomIcon = () => {
    return L.divIcon({
      className: 'custom-div-icon',
      html: `
        <div style="background-color: #0b536f; width: 36px; height: 36px; border-radius: 10px; display: flex; align-items: center; justify-content: center; border: 2px solid white; box-shadow: 0 4px 15px rgba(11,83,111,0.5); transform: rotate(-45deg); border-bottom-right-radius: 2px;">
          <div style="transform: rotate(45deg); display: flex; align-items: center; justify-content: center;">
            <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2"/>
              <path d="M15 18H9"/>
              <path d="M19 18h2a1 1 0 0 0 1-1v-5l-4-4h-3"/>
              <circle cx="7" cy="18" r="2"/>
              <circle cx="17" cy="18" r="2"/>
            </svg>
          </div>
        </div>
      `,
      iconSize: [36, 36],
      iconAnchor: [18, 18]
    });
  };

  return (
    <div className="relative w-full h-[480px] rounded-b-2xl overflow-hidden shadow-inner">
      <MapContainer
        center={[-2.5, 115.0] as any}
        zoom={7}
        style={{ height: '100%', width: '100%' }}
        scrollWheelZoom={true}
        zoomControl={false}
      >
        <TileLayer
          attribution='&copy; OpenStreetMap'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {markers.filter(m => m.lat && m.lng).map((marker, i) => (
          <Marker
            key={i}
            position={[marker.lat, marker.lng] as any}
            icon={createCustomIcon()}
          >
            <Popup className="custom-popup">
              <div className="p-2 font-sans min-w-[160px]">
                <span className="text-[10px] font-black uppercase text-pln-darkBlue border-b border-slate-100 block mb-2 pb-1">{marker.label}</span>
                <div className="space-y-1.5">
                   <div className="flex justify-between text-[11px] items-center">
                     <span className="text-slate-500 font-medium">Total Armada:</span>
                     <span className="font-black text-slate-800">{marker.vehicle_count} Unit</span>
                   </div>
                   <div className="flex justify-between text-[11px] items-center">
                     <span className="text-slate-500 font-medium">Wilayah:</span>
                     <span className="font-black text-pln-cyan uppercase">{marker.region}</span>
                   </div>
                </div>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
};

// --- SUB-KOMPONEN: DONUT CHART ---
const DonutChart = ({ data, totalLiters }: { data: any[], totalLiters: number }) => {
  let currentAngle = 0;
  return (
    <div className="relative w-52 h-52 flex items-center justify-center">
      <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
        {data.map((item, i) => {
          const percentage = (parseFloat(item.value) / Math.max(totalLiters, 1)) * 100;
          const angle = (percentage / 100) * 360;
          const x1 = 50 + 40 * Math.cos((currentAngle * Math.PI) / 180);
          const y1 = 50 + 40 * Math.sin((currentAngle * Math.PI) / 180);
          const x2 = 50 + 40 * Math.cos(((currentAngle + angle) * Math.PI) / 180);
          const y2 = 50 + 40 * Math.sin(((currentAngle + angle) * Math.PI) / 180);
          const largeArc = angle > 180 ? 1 : 0;
          const colors = ['#00a2e8', '#0b536f', '#18a4c5', '#ba1a1a', '#ffe600'];
          const pathData = `M 50 50 L ${x1} ${y1} A 40 40 0 ${largeArc} 1 ${x2} ${y2} Z`;
          currentAngle += angle;
          return <path key={i} d={pathData} fill={colors[i % colors.length]} stroke="white" strokeWidth="1" className="hover:opacity-80 transition-opacity cursor-pointer" />;
        })}
        <circle cx="50" cy="50" r="30" fill="white" />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none">
        <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.1em] mb-0.5">Volume</span>
        <span className="text-2xl font-black text-slate-800 leading-none tracking-tighter">
            {totalLiters > 1000 ? `${(totalLiters/1000).toFixed(1)}k` : totalLiters.toFixed(0)}
        </span>
        <span className="text-[10px] font-black text-pln-cyan uppercase mt-1">Liter</span>
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
      <div className="min-h-[80vh] flex flex-col items-center justify-center gap-4 text-center">
        <div className="relative w-16 h-16">
          <Loader2 className="absolute inset-0 w-full h-full text-pln-cyan animate-spin opacity-20" />
          <Activity className="absolute inset-0 m-auto h-6 w-6 text-pln-darkBlue animate-pulse" />
        </div>
        <div className="space-y-1.5">
          <p className="text-sm font-black text-pln-darkBlue uppercase tracking-[0.2em]">Authenticating Telemetry</p>
          <p className="text-[10px] text-slate-400 font-bold uppercase">Streaming live data from Kalimantan unit nodes...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 font-sans select-none pb-20 animate-in fade-in duration-700">

      {/* 1. TOP HEADER & CONTROLS */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
             <div className="px-2.5 py-1 bg-white border border-border shadow-sm rounded-md flex items-center gap-2">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest">System Online</span>
             </div>
             <span className="text-slate-300 text-xs font-bold">/</span>
             <span className="text-[10px] font-black text-pln-cyan uppercase tracking-widest">{isPusat ? 'Global Regional' : selectedRegion}</span>
          </div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tighter uppercase">Operational Console</h1>
        </div>

        <div className="flex items-center gap-4">
          {isPusat && (
            <div className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl shadow-sm focus-within:ring-2 focus-within:ring-pln-cyan/20 transition-all">
              <MapPin className="h-4 w-4 text-pln-cyan" />
              <select
                value={selectedRegion}
                onChange={(e) => setSelectedRegion(e.target.value)}
                className="bg-transparent text-[11px] font-black text-slate-700 uppercase outline-none min-w-[180px] cursor-pointer"
              >
                <option value="ALL">Seluruh Kalimantan</option>
                <option value="Banjarmasin">UL Banjarmasin</option>
                <option value="Barabai">UL Barabai</option>
                <option value="Palangkaraya">UL Palangkaraya</option>
                <option value="Pangkalan Bun">UL Pangkalan Bun</option>
                <option value="Kapuas">UL Kapuas</option>
              </select>
            </div>
          )}

          <div className="flex items-center p-1 bg-white border border-slate-200 rounded-xl shadow-sm">
            {['1d', '7d', '30d'].map((r) => (
              <button
                key={r}
                onClick={() => setRange(r)}
                className={cn(
                  "px-4 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all",
                  range === r ? "bg-pln-darkBlue text-white shadow-md" : "text-slate-400 hover:text-slate-600"
                )}
              >
                {r === '1d' ? 'Today' : r === '7d' ? '7 Days' : '30 Days'}
              </button>
            ))}
          </div>

          <button
            onClick={() => refetch()}
            disabled={isRefetching}
            className="p-2.5 rounded-xl bg-white border border-slate-200 shadow-sm hover:border-pln-cyan transition-all active:scale-90"
          >
             <RefreshCw className={cn("h-5 w-5 text-slate-600", isRefetching && "animate-spin text-pln-cyan")} />
          </button>
        </div>
      </div>

      {/* 2. KPI METRICS DECK - Ramping & Professional */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            label: 'Total Konsumsi BBM / Bulan',
            value: `${(data?.total_liters || 0).toLocaleString('id-ID')} L`,
            sub: 'Budget: 68.0k L',
            trend: '+4.2%',
            icon: Fuel,
            color: 'bg-gradient-to-br from-[#00a2e8] to-[#008ac6]'
          },
          {
            label: 'Armada Aktif Terhubung',
            value: `${data?.active_vehicles || 0} Unit`,
            sub: 'Monitoring Live 24/7',
            trend: 'Stable',
            icon: Truck,
            color: 'bg-gradient-to-br from-[#0b536f] to-[#08425a]'
          },
          {
            label: 'Rata-Rata Efisiensi',
            value: `${(data?.avg_efficiency || 0).toFixed(1)} Km/L`,
            sub: 'Benchmark: >10.0',
            trend: 'Optimal',
            icon: Gauge,
            color: 'bg-gradient-to-br from-[#ffe600] to-[#e6d100]',
            dark: true
          },
          {
            label: 'Anomali Kritis',
            value: `${data?.anomaly_count || 0} Kasus`,
            sub: 'Butuh Verifikasi',
            trend: 'Attention',
            icon: AlertTriangle,
            color: 'bg-gradient-to-br from-[#ba1a1a] to-[#9a1515]'
          },
        ].map((item, i) => (
          <Card key={i} className={cn("border-none shadow-lg relative group overflow-hidden h-32", item.color)}>
            <CardContent className="p-4 relative z-10 h-full flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className={cn("text-[9px] font-black uppercase tracking-widest opacity-80", item.dark ? "text-slate-800" : "text-white")}>{item.label}</span>
                <div className={cn("p-1.5 rounded-lg bg-white/10 backdrop-blur-md", item.dark ? "text-slate-800" : "text-white")}>
                  <item.icon className="h-4 w-4" />
                </div>
              </div>
              <div>
                <div className={cn("text-2xl font-black tracking-tighter font-mono", item.dark ? "text-slate-900" : "text-white")}>{item.value}</div>
                <div className="flex items-center justify-between pt-1">
                  <span className={cn("text-[9px] font-bold opacity-60", item.dark ? "text-slate-600" : "text-white")}>{item.sub}</span>
                  <div className={cn("px-1.5 py-0.2 rounded text-[8px] font-black uppercase tracking-widest", item.dark ? "bg-black/10 text-slate-800" : "bg-white/20 text-white")}>
                    {item.trend}
                  </div>
                </div>
              </div>
              {/* Background Decor */}
              <item.icon className={cn("absolute -right-4 -bottom-4 h-20 w-20 opacity-10 -rotate-12", item.dark ? "text-black" : "text-white")} />
            </CardContent>
          </Card>
        ))}
      </div>

      {/* 3. CENTER ANALYTICS GRID */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">

        {/* BAR CHART: TRENDS */}
        <Card className="xl:col-span-8 bg-white border border-slate-200/60 shadow-xl rounded-[24px] overflow-hidden flex flex-col">
          <div className="p-7 border-b border-slate-100 flex items-center justify-between bg-slate-50/30">
            <div className="flex items-center gap-4">
               <div className="w-10 h-10 rounded-xl bg-pln-iceBlue flex items-center justify-center text-pln-darkBlue shadow-inner">
                  <TrendingUp className="h-5 w-5" />
               </div>
               <div>
                  <h2 className="text-base font-black text-slate-900 uppercase tracking-tight">Tren Konsumsi & Batas Ambang</h2>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Audit Realisasi vs Kebutuhan Unit</p>
               </div>
            </div>
            <Badge className="bg-slate-900 text-white font-mono px-3 py-1 text-[10px]">FY-2025</Badge>
          </div>

          <div className="flex-1 p-8 flex flex-col justify-end">
            <div className="h-64 w-full flex items-end justify-around gap-2 px-4 relative mb-10">
               {/* Y-Axis Grid */}
               <div className="absolute inset-0 flex flex-col justify-between pointer-events-none px-4">
                  {[15, 12, 9, 6, 3, 0].map((val) => (
                    <div key={val} className="w-full flex items-center gap-3">
                       <span className="text-[9px] font-black text-slate-300 w-6">{val}k</span>
                       <div className="flex-1 h-[1px] bg-slate-100/80" />
                    </div>
                  ))}
               </div>

               {(data?.chart_data || []).map((p: any, i: number) => {
                 const value = Number(p.value || 0);
                 const maxChartVal = Math.max(...(data?.chart_data || []).map((d: any) => Number(d.value)), 15000);
                 const targetVal = 11000; // Benchmark target

                 const riilHeight = (value / maxChartVal) * 100;
                 const targetHeight = (targetVal / maxChartVal) * 100;

                 return (
                   <div key={i} className="flex flex-col items-center group relative z-10 w-full max-w-[50px]">
                      <div className="flex items-end gap-1.5 h-64 w-full justify-center">
                        {/* Bar 1: Real (Stacked Teal + Red) */}
                        <div className="w-4 flex flex-col justify-end h-full">
                           {riilHeight > targetHeight && (
                             <div
                               className="w-full bg-[#ba1a1a] rounded-t-[4px] shadow-lg shadow-red-500/20"
                               style={{ height: `${riilHeight - targetHeight}%` }}
                             />
                           )}
                           <div
                             className={cn(
                               "w-full bg-pln-darkBlue shadow-sm",
                               riilHeight > targetHeight ? "rounded-t-none" : "rounded-t-[4px]"
                             )}
                             style={{ height: `${Math.min(riilHeight, targetHeight)}%` }}
                           >
                              <div className="absolute -top-10 left-1/2 -translate-x-1/2 p-2 bg-slate-900 text-white rounded-lg text-[9px] font-black opacity-0 group-hover:opacity-100 transition-all shadow-xl pointer-events-none whitespace-nowrap z-50">
                                 {value.toLocaleString('id-ID')} L
                              </div>
                           </div>
                        </div>

                        {/* Bar 2: Kuota Standar (Cyan) */}
                        <div
                          className="w-4 bg-pln-cyan/10 border border-pln-cyan/5 rounded-t-[4px]"
                          style={{ height: `${targetHeight}%` }}
                        />
                      </div>
                      <span className="absolute -bottom-8 text-[11px] font-black text-slate-400 uppercase tracking-tighter">{p.label}</span>
                   </div>
                 );
               })}
            </div>

            <div className="flex flex-wrap items-center gap-8 pt-8 border-t border-slate-100">
               <div className="flex items-center gap-2.5">
                  <div className="w-3.5 h-3.5 bg-pln-darkBlue rounded-sm shadow-sm" />
                  <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider">BBM Riil (PLN Teal)</span>
               </div>
               <div className="flex items-center gap-2.5">
                  <div className="w-3.5 h-3.5 bg-pln-cyan/20 rounded-sm" />
                  <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Kuota Standar</span>
               </div>
               <div className="flex items-center gap-2.5">
                  <div className="w-3.5 h-3.5 bg-[#ba1a1a] rounded-sm shadow-md" />
                  <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Anomali / Over</span>
               </div>
            </div>
          </div>
        </Card>

        {/* DONUT: ALLOCATION */}
        <Card className="xl:col-span-4 bg-white border border-slate-200/60 shadow-xl rounded-[24px] flex flex-col">
          <div className="p-7 border-b border-slate-100 flex items-center gap-4">
             <div className="w-10 h-10 rounded-xl bg-pln-iceBlue flex items-center justify-center text-pln-darkBlue shadow-inner">
                <ShieldCheck className="h-5 w-5" />
             </div>
             <div>
                <h2 className="text-base font-black text-slate-900 uppercase tracking-tight">Alokasi BBM</h2>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Proporsi Konsumsi Armada</p>
             </div>
          </div>
          <div className="flex-1 p-8 flex flex-col items-center justify-center gap-10">
            <DonutChart data={data?.allocation || []} totalLiters={data?.total_liters || 0} />
            <div className="w-full space-y-4">
               {(data?.allocation || []).map((item: any, i: number) => (
                 <div key={i} className="flex items-center justify-between p-3 rounded-xl hover:bg-slate-50 transition-colors border border-transparent hover:border-slate-200 group/item">
                    <div className="flex items-center gap-3">
                       <div className={cn("w-2.5 h-2.5 rounded-full ring-4 ring-offset-2 transition-all group-hover/item:scale-110",
                        i === 0 ? "bg-[#00a2e8] ring-[#00a2e8]/10" :
                        i === 1 ? "bg-[#0b536f] ring-[#0b536f]/10" :
                        i === 2 ? "bg-[#18a4c5] ring-[#18a4c5]/10" : "bg-[#ba1a1a] ring-[#ba1a1a]/10"
                       )} />
                       <span className="text-xs font-bold text-slate-600 uppercase tracking-tight">{item.label}</span>
                    </div>
                    <span className="text-sm font-black text-slate-900 font-mono">{((Number(item.value || 0) / Math.max(data?.total_liters, 1)) * 100).toFixed(0)}%</span>
                 </div>
               ))}
            </div>
          </div>
        </Card>
      </div>

      {/* 4. BOTTOM ACTIVITY & MAP GRID */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">

        {/* TICKET SYSTEM: ANOMALY QUEUE */}
        <Card className="xl:col-span-4 bg-white border border-slate-200/60 shadow-xl rounded-[24px] overflow-hidden flex flex-col">
          <div className="p-7 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
            <div className="flex items-center gap-4">
               <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center text-[#ba1a1a] shadow-inner">
                  <History className="h-5 w-5" />
               </div>
               <div>
                  <h2 className="text-base font-black text-slate-900 uppercase tracking-tight">Verifikasi Anomali</h2>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Audit Rule-Engine Active</p>
               </div>
            </div>
            <div className="px-3 py-1 rounded-full bg-red-500 text-white text-[9px] font-black uppercase shadow-lg shadow-red-500/20">
               {data?.tickets?.pending_tickets || 0} Antrean
            </div>
          </div>

          <div className="p-5 space-y-4">
             {(data?.recent_activities || []).filter(t => t.ml_is_anomaly).slice(0, 3).map((tx: any, i: number) => (
                <InteractiveElement
                  key={i}
                  onClick={() => router.push(`/transactions/${tx.id}/review`)}
                  className="flex p-0 rounded-2xl border border-slate-100 bg-white hover:border-pln-cyan transition-all overflow-hidden group/card shadow-sm mb-3 last:mb-0"
                >
                   {/* Column 1: Red Indicator (Guaranteed No Overlap) */}
                   <div className="w-2 bg-[#ba1a1a] group-hover/card:w-3 transition-all shrink-0" />

                   {/* Column 2: Content Body */}
                   <div className="p-5 flex-1 flex flex-col">
                      <div className="flex items-center gap-3 mb-4">
                         <span className="text-xs font-black text-slate-800 uppercase tracking-tighter">{tx.license_plate}</span>
                         <Badge className="bg-red-50 text-[#ba1a1a] text-[9px] font-black uppercase border-none">Kritis</Badge>
                         <span className="ml-auto font-mono text-[10px] font-bold text-slate-300">#TK-{tx.id}</span>
                      </div>

                      <p className="text-[11px] text-slate-600 leading-relaxed font-medium mb-5 line-clamp-2">
                         Sistem mendeteksi volume <span className="font-black text-slate-800">{tx.fuel_amount} L</span> yang melampaui batas aman di {tx.address || 'SPBU Regional'}.
                      </p>

                      <div className="flex items-center justify-between mt-auto">
                         <div className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase">
                            <Clock className="h-3.5 w-3.5" /> 18m Ago
                         </div>
                         <div className="flex items-center gap-1.5 text-pln-cyan group-hover/card:translate-x-1 transition-transform">
                            <span className="text-[10px] font-black uppercase">Verifikasi</span>
                            <ChevronRight className="h-4 w-4" />
                         </div>
                      </div>
                   </div>
                </InteractiveElement>
             ))}

             <button onClick={() => router.push('/transactions')} className="w-full flex items-center justify-center gap-2 text-[10px] font-black text-slate-500 uppercase hover:text-pln-darkBlue transition-all py-4 bg-slate-50/50 rounded-xl hover:bg-slate-50 border border-dashed border-slate-200">
                Buka Semua Kasus Audit
             </button>
          </div>
        </Card>

        {/* INTERACTIVE GEOSPATIAL MAP */}
        <Card className="xl:col-span-8 bg-white border border-slate-200/60 shadow-xl rounded-[24px] overflow-hidden flex flex-col">
          <div className="p-7 border-b border-slate-100 flex items-center justify-between bg-slate-50/30">
            <div className="flex items-center gap-4">
               <div className="w-10 h-10 rounded-xl bg-pln-iceBlue flex items-center justify-center text-pln-darkBlue shadow-inner">
                  <MapPin className="h-5 w-5" />
               </div>
               <div>
                  <h2 className="text-base font-black text-slate-900 uppercase tracking-tight">Peta Sebaran Armada & Unit Layanan</h2>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">GPS Telemetri Real-Time Wilayah Kalimantan</p>
               </div>
            </div>
            <div className="flex items-center gap-4">
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 text-[9px] font-black uppercase tracking-widest">
                   <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" /> Live Tracking
                </div>
            </div>
          </div>

          <div className="bg-pln-darkBlue p-5 flex flex-wrap items-center justify-between gap-6 border-b border-white/5">
             <div className="flex items-center gap-10">
                <div className="flex items-center gap-3">
                   <div className="p-2 rounded-lg bg-white/10 text-pln-cyan shadow-inner"><Activity className="h-4 w-4" /></div>
                   <div className="flex flex-col"><span className="text-[9px] text-white/50 font-bold uppercase tracking-tighter">Database</span><span className="text-[11px] text-white font-black leading-tight uppercase">Live Sync</span></div>
                </div>
                <div className="flex flex-col border-l border-white/10 pl-6"><span className="text-[9px] text-white/50 font-bold uppercase tracking-tighter">Armada Online</span><span className="text-[11px] text-white font-black leading-tight">{data?.total_vehicles} / {data?.total_vehicles}</span></div>
                <div className="flex flex-col border-l border-white/10 pl-6"><span className="text-[9px] text-white/50 font-bold uppercase tracking-tighter">Unit Node</span><span className="text-[11px] text-white font-black leading-tight">{data?.map_markers?.length || 0} Lokasi</span></div>
             </div>
             <div className="flex items-center gap-4 bg-black/20 px-4 py-2 rounded-xl border border-white/5">
                <span className="text-[10px] text-white/70 font-black uppercase tracking-widest">SCADA SLA</span>
                <span className="text-[12px] text-pln-cyan font-black">99.98%</span>
             </div>
          </div>

          <KalimantanMap markers={data?.map_markers || []} />

          <div className="p-5 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-[10px] font-black text-slate-400 uppercase tracking-widest">
             <div className="flex items-center gap-4">
                <span className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" /> SCADA Grid Active</span>
                <span className="text-slate-200">|</span>
                <span>Signal Ping: 0.8s</span>
             </div>
             <p className="hidden md:block italic text-[9px] opacity-60">Protokol SCADA Terenkripsi • Danantara Indonesia</p>
          </div>
        </Card>
      </div>

    </div>
  );
}
