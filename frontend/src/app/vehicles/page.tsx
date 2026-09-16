'use client';

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { getVehicles } from '@/services/vehicleService';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import InteractiveElement from '@/components/ui/InteractiveElement';
import { Truck, QrCode, Plus, Loader2, Building2 } from 'lucide-react';
import toast from 'react-hot-toast';

export default function VehiclesPage() {
  const { data: serverVehicles, isLoading } = useQuery({
    queryKey: ['vehicles'],
    queryFn: () => getVehicles(),
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

  return (
    <div className="space-y-4 font-sans select-none">
      <div className="bg-white p-4 rounded-[8px] border border-border flex flex-col sm:flex-row justify-between sm:items-center gap-3 shadow-sm">
        <div>
          <h1 className="text-base font-bold text-foreground flex items-center gap-1.5">
            <Truck className="h-4 w-4 text-pln-darkBlue" /> Master Data Armada
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">Kelola aset dan cetak identitas digital (QR Code) kendaraan.</p>
        </div>
        <button className="h-8 text-xs px-4 font-bold bg-pln-darkBlue text-white rounded-[4px] shadow-sm flex items-center gap-1.5">
          <Plus className="h-3.5 w-3.5" /> Registrasi Baru
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {vehicles.length > 0 ? (
          vehicles.map((vh: any) => (
            <InteractiveElement key={vh.id} className="bg-white border border-border rounded-[8px] p-4 flex flex-col justify-between hover:border-pln-cyan/40 transition-all shadow-sm group">
              <div className="flex justify-between items-start mb-3">
                <div className="flex flex-col">
                  <span className="font-mono font-bold text-sm text-pln-darkBlue tracking-wide">{vh.license_plate}</span>
                  <span className="text-[11px] font-semibold text-muted-foreground">{vh.vehicle_type}</span>
                </div>
                <Badge className={vh.is_active ? 'bg-emerald-50 text-emerald-700 border-emerald-100 text-[9px] font-bold' : 'bg-muted text-muted-foreground border-border text-[9px] font-bold'}>
                  {vh.is_active ? 'AKTIF' : 'NONAKTIF'}
                </Badge>
              </div>

              <div className="space-y-2 mb-4">
                <div className="flex items-center gap-2 text-[10px] text-muted-foreground font-medium">
                  <Building2 className="h-3 w-3 text-pln-cyan/60" />
                  <span>{vh.ul_nd || 'Regional Banjarmasin'}</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-muted/30 p-1.5 rounded text-center">
                    <span className="block text-[8px] uppercase font-bold text-muted-foreground/60">Tangki</span>
                    <span className="text-[11px] font-mono font-bold text-foreground">{vh.fuel_tank_capacity}L</span>
                  </div>
                  <div className="bg-muted/30 p-1.5 rounded text-center">
                    <span className="block text-[8px] uppercase font-bold text-muted-foreground/60">Rasio</span>
                    <span className="text-[11px] font-mono font-bold text-pln-darkBlue">{vh.fuel_consumption_rate} K/L</span>
                  </div>
                </div>
              </div>

              <button
                onClick={() => handlePrintQR(vh.license_plate)}
                className="w-full h-8 text-[10px] font-bold rounded-[4px] border border-pln-cyan/20 bg-pln-iceBlue/40 text-pln-darkBlue hover:bg-pln-cyan hover:text-white transition-all flex items-center justify-center gap-1.5"
              >
                <QrCode className="h-3.5 w-3.5" /> Cetak Stiker QR
              </button>
            </InteractiveElement>
          ))
        ) : (
          <div className="col-span-full h-40 flex items-center justify-center border-2 border-dashed border-border rounded-xl opacity-40 italic text-xs">
            Tidak ada data armada terdaftar.
          </div>
        )}
      </div>
    </div>
  );
}
