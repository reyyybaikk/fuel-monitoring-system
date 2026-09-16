'use client';

import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getVehicles } from '@/services/vehicleService';
import { useAuthStore } from '@/store/authStore';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import InteractiveElement from '@/components/ui/InteractiveElement';
import { Truck, QrCode, Plus, Loader2, Building2 } from 'lucide-react';
import toast from 'react-hot-toast';

export default function VehiclesPage() {
  const { userProfile } = useAuthStore();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const { data: serverVehicles, isLoading } = useQuery({
    queryKey: ['vehicles', userProfile?.region],
    queryFn: () => getVehicles(undefined, userProfile?.region),
    enabled: mounted && !!userProfile,
  });

  const handlePrintQR = (plate: string) => {
    toast.success(`Menyiapkan cetak QR untuk armada ${plate}`);
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://fuel-monitoring-backend.onrender.com';
    window.open(`${apiUrl}/api/vehicles/qrcode/${encodeURIComponent(plate)}`, '_blank');
  };

  if (isLoading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-2">
        <Loader2 className="h-8 w-8 text-pln-cyan animate-spin" />
        <p className="text-xs font-medium text-pln-darkBlue font-sans">Menghubungkan Master Data...</p>
      </div>
    );
  }

  const vehicles = serverVehicles || [];

  if (!mounted) return null;

  return (
    <div className="space-y-4 font-sans select-none pb-10">
      <div className="bg-white p-4 rounded-[8px] border border-border flex flex-col sm:flex-row justify-between sm:items-center gap-3 shadow-sm">
        <div>
          <h1 className="text-base font-bold text-foreground flex items-center gap-1.5 uppercase tracking-tight">
            <Truck className="h-4 w-4 text-pln-darkBlue" /> Master Data Armada - {userProfile?.region}
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">Pengelolaan aset kendaraan operasional khusus wilayah otoritas Anda.</p>
        </div>
        <button className="h-8 text-xs px-4 font-bold bg-pln-darkBlue text-white rounded-[4px] shadow-sm flex items-center gap-1.5 active:scale-95 transition-all">
          <Plus className="h-3.5 w-3.5" /> Registrasi Kendaraan
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {vehicles.length > 0 ? (
          vehicles.map((vh: any) => (
            <InteractiveElement key={vh.id} className="bg-white border border-border rounded-[8px] p-4 flex flex-col justify-between hover:border-pln-cyan/40 transition-all shadow-sm group relative overflow-hidden">
              <div className="flex justify-between items-start mb-3 relative z-10">
                <div className="flex flex-col">
                  <span className="font-mono font-bold text-sm text-pln-darkBlue tracking-wide">{vh.license_plate}</span>
                  <span className="text-[11px] font-semibold text-muted-foreground uppercase">{vh.vehicle_type}</span>
                </div>
                <Badge className={vh.is_active ? 'bg-emerald-50 text-emerald-700 border-emerald-100 text-[9px] font-bold' : 'bg-muted text-muted-foreground border-border text-[9px] font-bold'}>
                  {vh.is_active ? 'TERVERIFIKASI' : 'NONAKTIF'}
                </Badge>
              </div>

              <div className="space-y-2 mb-4 relative z-10">
                <div className="flex items-center gap-2 text-[10px] text-muted-foreground font-bold uppercase">
                  <Building2 className="h-3 w-3 text-pln-cyan/60" />
                  <span>{vh.ul_nd || userProfile?.region}</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-slate-50 border border-border/50 p-2 rounded text-center">
                    <span className="block text-[8px] uppercase font-bold text-muted-foreground/60 mb-0.5">Kapasitas</span>
                    <span className="text-[11px] font-mono font-black text-foreground">{vh.fuel_tank_capacity} L</span>
                  </div>
                  <div className="bg-slate-50 border border-border/50 p-2 rounded text-center">
                    <span className="block text-[8px] uppercase font-bold text-muted-foreground/60 mb-0.5">Rasio BBM</span>
                    <span className="text-[11px] font-mono font-black text-pln-darkBlue">{vh.fuel_consumption_rate} KM/L</span>
                  </div>
                </div>
              </div>

              <button
                onClick={() => handlePrintQR(vh.license_plate)}
                className="w-full h-8 text-[10px] font-black rounded-[4px] border border-pln-cyan/20 bg-pln-iceBlue/40 text-pln-darkBlue hover:bg-pln-cyan hover:text-white transition-all flex items-center justify-center gap-2 uppercase tracking-wider"
              >
                <QrCode className="h-4 w-4" /> Cetak QR Driver
              </button>

              <Building2 className="absolute -right-4 -bottom-4 h-16 w-16 text-slate-100 opacity-20 -rotate-12 pointer-events-none" />
            </InteractiveElement>
          ))
        ) : (
          <div className="col-span-full h-64 flex flex-col items-center justify-center border-2 border-dashed border-border rounded-xl bg-slate-50/50">
            <Truck className="h-12 w-12 text-slate-200 mb-3" />
            <p className="text-xs font-bold text-slate-400 italic">Tidak ada armada terdaftar untuk wilayah {userProfile?.region}.</p>
            <p className="text-[10px] text-slate-400 mt-1">Gunakan tombol "Registrasi Kendaraan" untuk menambahkan armada baru.</p>
          </div>
        )}
      </div>
    </div>
  );
}
