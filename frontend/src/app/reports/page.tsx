'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '@/store/authStore';
import { getVehicles } from '@/services/vehicleService';
import api from '@/services/api';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  FileText,
  Calendar,
  Truck,
  Download,
  ShieldCheck,
  Loader2,
  Building2,
  Search,
  Image as ImageIcon,
  QrCode,
  UserCheck
} from 'lucide-react';
import toast from 'react-hot-toast';
import { cn } from '@/lib/utils';

export default function ReportsPage() {
  const { userProfile } = useAuthStore();
  const [selectedVehicleId, setSelectedVehicleId] = useState<string>('ALL');
  const [vehicleSearch, setVehicleSearch] = useState('');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [isDownloading, setIsDownloading] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const { data: vehicles, isLoading: isLoadingVehicles } = useQuery({
    queryKey: ['vehicles-report', userProfile?.region],
    queryFn: () => getVehicles(undefined, userProfile?.region),
    enabled: mounted && !!userProfile?.region,
  });

  const filteredVehicles = useMemo(() => {
    if (!vehicles) return [];
    if (!vehicleSearch.trim()) return vehicles;
    const search = vehicleSearch.toLowerCase();
    return vehicles.filter(v =>
      v.license_plate.toLowerCase().includes(search) ||
      v.vehicle_type.toLowerCase().includes(search)
    );
  }, [vehicles, vehicleSearch]);

  const activeVehicle = useMemo(() => {
    if (selectedVehicleId === 'ALL') return null;
    return vehicles?.find(v => v.id.toString() === selectedVehicleId);
  }, [vehicles, selectedVehicleId]);

  const handleExportPDF = async () => {
    setIsDownloading(true);
    const loadingToast = toast.loading('Menyusun Laporan & Mengunduh Bukti Visual...');

    try {
      const response = await api.get('/api/fuel-transactions/export-pdf', {
        params: {
          vehicle_id: selectedVehicleId,
          start_date: startDate,
          end_date: endDate,
        },
        responseType: 'blob',
      });

      const blob = new Blob([response.data], { type: 'application/pdf' });
      const downloadUrl = window.URL.createObjectURL(blob);

      const vehicleName = selectedVehicleId === 'ALL' ? 'Kolektif' : vehicles?.find(v => v.id.toString() === selectedVehicleId)?.license_plate;
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.setAttribute('download', `Laporan_Audit_BBM_${userProfile?.region}_${vehicleName}_${startDate}.pdf`);

      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);

      toast.success('Laporan PDF Berhasil Diunduh.', { id: loadingToast });
    } catch (error) {
      console.error('Gagal mengunduh PDF:', error);
      toast.error('Gagal menyusun laporan PDF. Periksa koneksi backend.', { id: loadingToast });
    } finally {
      setIsDownloading(false);
    }
  };

  if (!mounted) return null;

  return (
    <div className="space-y-4 font-sans select-none pb-12">
      <div className="bg-white p-4 rounded-[8px] border border-border shadow-sm flex items-center justify-between">
        <div>
          <h1 className="text-base font-bold text-foreground flex items-center gap-1.5 uppercase tracking-tight">
            <FileText className="h-4 w-4 text-pln-darkBlue" /> Pusat Laporan Resmi & Berita Acara
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5 font-medium">
            Ekspor log audit BBM otomatis terfilter berdasarkan wilayah otoritas Anda.
          </p>
        </div>
        <div className="flex items-center gap-3 text-right">
           <div className="flex flex-col">
             <span className="text-[10px] font-bold text-muted-foreground uppercase leading-none">Status Koneksi</span>
             <span className="text-[11px] font-black text-emerald-600 uppercase tracking-tighter">Database Terpusat</span>
           </div>
           <div className="w-1.5 h-8 bg-emerald-500 rounded-full shadow-[0_0_8px_rgba(16,185,129,0.4)]"></div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 items-start">

        {/* PANEL KIRI: KONFIGURASI PARAMETER */}
        <Card className="xl:col-span-4 rounded-[8px] border border-border bg-white shadow-sm p-4 space-y-4">
          <div className="border-b border-border/60 pb-2">
            <h2 className="text-xs font-bold text-pln-darkBlue uppercase tracking-wider">Konfigurasi Laporan</h2>
          </div>

          <div className="space-y-4">
            {/* Otoritas Wilayah */}
            <div className="p-3 bg-pln-iceBlue/40 border border-pln-cyan/10 rounded-[6px]">
              <span className="text-[9px] font-bold text-muted-foreground uppercase block mb-1">Unit Layanan Otoritas (UL ND)</span>
              <div className="flex items-center gap-2">
                <Building2 className="h-4 w-4 text-pln-cyan" />
                <span className="text-xs font-bold text-pln-darkBlue tracking-tight">{userProfile?.region || 'Sedang memuat...'}</span>
              </div>
            </div>

            {/* Pencarian & Pilihan Kendaraan */}
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-muted-foreground uppercase flex items-center gap-1.5 px-0.5">
                <Truck className="h-3.5 w-3.5 text-pln-darkBlue" /> Pilih Armada Kendaraan
              </label>

              <div className="flex flex-col gap-2 p-3 bg-slate-50 border border-border rounded-[8px]">
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground/60" />
                  <input
                    type="text"
                    placeholder="Cari pelat... (contoh: 8418)"
                    value={vehicleSearch}
                    onChange={(e) => setVehicleSearch(e.target.value)}
                    className="w-full h-9 pl-8 pr-3 text-xs bg-white border border-border rounded-[4px] focus:ring-1 focus:ring-pln-cyan outline-none font-mono font-bold"
                  />
                </div>

                {isLoadingVehicles ? (
                  <div className="h-9 flex items-center justify-center gap-2 text-muted-foreground italic text-[10px]">
                    <Loader2 className="h-3 w-3 animate-spin text-pln-cyan" /> Menyelaraskan armada...
                  </div>
                ) : (
                  <>
                    <select
                      value={selectedVehicleId}
                      onChange={(e) => setSelectedVehicleId(e.target.value)}
                      className="w-full h-9 px-2 text-xs bg-white border border-border rounded-[4px] text-foreground focus:border-pln-cyan outline-none font-sans font-bold shadow-sm"
                    >
                      <option value="ALL">-- Seluruh Armada ({filteredVehicles.length} Unit) --</option>
                      {filteredVehicles.map((vh: any) => (
                        <option key={vh.id} value={vh.id.toString()}>
                          {vh.license_plate} - {vh.vehicle_type}
                        </option>
                      ))}
                    </select>
                    {filteredVehicles.length === 0 && (
                      <div className="mt-2 p-2 bg-amber-50 border border-amber-200 rounded text-[9px] text-amber-700 leading-tight italic">
                        ⚠️ Tidak ada armada aktif yang terdaftar di database untuk wilayah "{userProfile?.region}". Pastikan data di tabel 'vehicles' sudah benar.
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>

            {/* Filter Tanggal */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-muted-foreground uppercase">Tanggal Mulai</label>
                <div className="relative">
                  <Calendar className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-pln-cyan opacity-40" />
                  <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-full h-9 pl-8 pr-2 text-xs border border-border rounded-[4px] font-mono outline-none focus:border-pln-cyan bg-white" />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-muted-foreground uppercase">Tanggal Selesai</label>
                <div className="relative">
                  <Calendar className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-pln-cyan opacity-40" />
                  <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-full h-9 pl-8 pr-2 text-xs border border-border rounded-[4px] font-mono outline-none focus:border-pln-cyan bg-white" />
                </div>
              </div>
            </div>

            <Button
              onClick={handleExportPDF}
              disabled={isDownloading || isLoadingVehicles}
              className="w-full h-11 text-xs font-black bg-pln-darkBlue text-white hover:bg-pln-darkBlue/90 rounded-[6px] shadow-lg flex items-center justify-center gap-2.5 active:scale-95 transition-all mt-4 tracking-widest"
            >
              {isDownloading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
              UNDUH LAPORAN PDF (A4)
            </Button>
          </div>
        </Card>

        {/* PANEL KANAN: REVISI TEMPLATE PREVIEW (SESUAI PERMINTAAN) */}
        <Card className="xl:col-span-8 rounded-[8px] border border-border bg-slate-100 shadow-sm p-8 overflow-y-auto max-h-[85vh] custom-scrollbar">

          <div className="w-full max-w-[210mm] mx-auto bg-white shadow-2xl p-[15mm] font-sans text-[#0b1c30] min-h-[297mm] flex flex-col relative overflow-hidden">

            {/* 1. HEADER REVISI (Hanya Unit, Periode, Model) */}
            <div className="space-y-1 mb-8 border-b border-slate-300 pb-4">
               <div className="flex text-xs">
                  <span className="w-36 font-bold text-slate-600 uppercase tracking-tight">Unit Layanan</span>
                  <span className="font-black uppercase">: {userProfile?.region || 'UPKAL2 REGIONAL'}</span>
               </div>
               <div className="flex text-xs">
                  <span className="w-36 font-bold text-slate-600 uppercase tracking-tight">Periode Audit</span>
                  <span className="font-black">: {startDate} s/d {endDate}</span>
               </div>
               <div className="flex text-xs">
                  <span className="w-36 font-bold text-slate-600 uppercase tracking-tight">Model Kendaraan</span>
                  <span className="font-black uppercase">: {selectedVehicleId === 'ALL' ? 'Seluruh Armada' : `${activeVehicle?.license_plate} - ${activeVehicle?.vehicle_type}`}</span>
               </div>
            </div>

            {/* 2. TABEL TRANSAKSI REVISI (Kolom Sesuai Permintaan) */}
            <div className="flex-1">
               <table className="w-full text-left border-collapse border border-slate-400 text-[9px]">
                  <thead>
                    <tr className="bg-slate-50 font-bold text-slate-800 uppercase border-b border-slate-400">
                      <th className="p-1.5 border-r border-slate-400 text-center">No</th>
                      <th className="p-1.5 border-r border-slate-400">Tanggal</th>
                      <th className="p-1.5 border-r border-slate-400">No. Pol / Pelat</th>
                      <th className="p-1.5 border-r border-slate-400">Stand Awal / Odometer</th>
                      <th className="p-1.5 border-r border-slate-400">Stand Bar Bensin</th>
                      <th className="p-1.5 border-r border-slate-400">Liter / Jenis BBM</th>
                      <th className="p-1.5">Total Rupiah</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-300">
                    {[1, 2].map((row) => (
                      <tr key={row}>
                        <td className="p-1.5 border-r border-slate-300 text-center">{row}</td>
                        <td className="p-1.5 border-r border-slate-300 font-mono">15/09/24</td>
                        <td className="p-1.5 border-r border-slate-300 font-bold">{activeVehicle?.license_plate || 'DA 8418 JK'}</td>
                        <td className="p-1.5 border-r border-slate-300 font-mono">145.280 Km</td>
                        <td className="p-1.5 border-r border-slate-300 font-mono">3/4 Bar</td>
                        <td className="p-1.5 border-r border-slate-300 font-bold">50.00 L / Solar HSD</td>
                        <td className="p-1.5 font-bold font-mono">Rp 500.000</td>
                      </tr>
                    ))}
                  </tbody>
               </table>
            </div>

            {/* 3. LAMPIRAN 3 FOTO PER TRANSAKSI */}
            <div className="mt-10 space-y-8">
               <h3 className="text-[10px] font-black text-slate-800 uppercase tracking-widest border-b-2 border-slate-800 pb-1 inline-block">
                 LAMPIRAN BUKTI FISIK TRANSAKSI
               </h3>

               {[1].map((tx) => (
                 <div key={tx} className="space-y-4 pt-2">
                    <div className="flex items-center gap-2 px-1">
                      <span className="text-[10px] font-black text-slate-800 bg-slate-100 px-2 py-0.5 rounded">DATA #{tx}</span>
                      <span className="text-[9px] font-bold text-muted-foreground uppercase">{activeVehicle?.license_plate || 'DA 8418 JK'} • 15 SEP 2024</span>
                    </div>

                    {/* GRID 3 FOTO (Sesuai Permintaan) */}
                    <div className="grid grid-cols-3 gap-4">
                       <div className="flex flex-col gap-2">
                          <span className="text-[8px] font-black text-slate-600 uppercase text-center bg-slate-50 py-1 border border-slate-200">1. Odo Sebelum</span>
                          <div className="w-full h-40 bg-white border border-slate-300 rounded-[2px] flex items-center justify-center shadow-inner">
                             <ImageIcon className="h-6 w-6 text-slate-200" />
                          </div>
                       </div>
                       <div className="flex flex-col gap-2">
                          <span className="text-[8px] font-black text-slate-600 uppercase text-center bg-slate-50 py-1 border border-slate-200">2. Odo Sesudah</span>
                          <div className="w-full h-40 bg-white border border-slate-300 rounded-[2px] flex items-center justify-center shadow-inner">
                             <ImageIcon className="h-6 w-6 text-slate-200" />
                          </div>
                       </div>
                       <div className="flex flex-col gap-2">
                          <span className="text-[8px] font-black text-slate-600 uppercase text-center bg-slate-50 py-1 border border-slate-200">3. Nota / Struk</span>
                          <div className="w-full h-40 bg-white border border-slate-300 rounded-[2px] flex items-center justify-center shadow-inner">
                             <ImageIcon className="h-6 w-6 text-slate-200" />
                          </div>
                       </div>
                    </div>
                 </div>
               ))}
            </div>

            {/* PENGESAHAN BAWAH */}
            <div className="mt-auto pt-16 grid grid-cols-2 gap-20">
               <div className="text-center space-y-20">
                  <p className="text-[10px] font-bold uppercase">Mengetahui,<br/>Manajer Unit Layanan</p>
                  <p className="text-[10px] font-black border-t border-slate-800 pt-1 uppercase">( ............................ )</p>
               </div>
               <div className="text-center space-y-20">
                  <p className="text-[10px] font-bold uppercase">Dibuat Oleh,<br/>Admin Pengawas</p>
                  <p className="text-[10px] font-black border-t border-slate-800 pt-1 uppercase">{userProfile?.name}</p>
               </div>
            </div>

          </div>
        </Card>

      </div>
    </div>
  );
}
