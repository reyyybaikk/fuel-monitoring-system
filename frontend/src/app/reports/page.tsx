'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '@/store/authStore';
import { getVehicles } from '@/services/vehicleService';
import api from '@/services/api';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import AuthenticatedImage from '@/components/ui/AuthenticatedImage';
import {
  FileText,
  Calendar,
  Truck,
  Download,
  ShieldCheck,
  Loader2,
  Building2,
  Search,
  Image as ImageIcon
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

  const { data: reportTransactions, isLoading: isLoadingPreview } = useQuery({
    queryKey: ['report-preview', selectedVehicleId, startDate, endDate],
    queryFn: async () => {
      // Backend findAllForExport sekarang mengembalikan odometer_next via LEAD()
      const response = await api.get('/api/fuel-transactions/export-pdf-preview', {
        params: {
          vehicle_id: selectedVehicleId === 'ALL' ? undefined : selectedVehicleId,
          start_date: startDate,
          end_date: endDate
        }
      });
      return response.data.data;
    },
    enabled: mounted,
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
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Laporan_Audit_BBM_${startDate}.pdf`);
      document.body.appendChild(link);
      link.click();
      toast.success('Laporan PDF Berhasil Diunduh.', { id: loadingToast });
    } catch (err) {
      toast.error('Gagal mengunduh PDF.', { id: loadingToast });
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
          <p className="text-xs text-muted-foreground mt-0.5 font-medium italic">Data tersinkronisasi otomatis dengan Database Pusat.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 items-start">

        {/* PANEL FILTER (KIRI) */}
        <Card className="xl:col-span-4 rounded-[8px] border border-border bg-white shadow-sm p-4 space-y-4">
          <div className="space-y-4">
            <div className="p-3 bg-pln-iceBlue/40 border border-pln-cyan/10 rounded-[6px]">
              <span className="text-[9px] font-bold text-muted-foreground uppercase block mb-1">Otoritas Wilayah</span>
              <span className="text-xs font-black text-pln-darkBlue uppercase">UL {userProfile?.region?.replace('Unit Layanan ', '')}</span>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-tight">Cari & Pilih Armada</label>
              <div className="flex flex-col gap-2 p-3 bg-slate-50 border border-border rounded-[8px]">
                <div className="relative">
                  <Search className="absolute left-2 top-2.5 h-3.5 w-3.5 text-muted-foreground/60" />
                  <input
                    type="text"
                    placeholder="Ketik pelat..."
                    value={vehicleSearch}
                    onChange={(e) => setVehicleSearch(e.target.value)}
                    className="w-full h-9 pl-7 pr-2 text-xs bg-white border border-border rounded-[4px] font-mono outline-none"
                  />
                </div>
                <select
                  value={selectedVehicleId}
                  onChange={(e) => setSelectedVehicleId(e.target.value)}
                  className="w-full h-9 px-2 text-xs bg-white border border-border rounded-[4px] font-bold outline-none"
                >
                  <option value="ALL">-- Seluruh Armada --</option>
                  {filteredVehicles.map((vh: any) => (
                    <option key={vh.id} value={vh.id.toString()}>{vh.license_plate} - {vh.vehicle_type}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-muted-foreground uppercase">Mulai</label>
                <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-full h-9 px-2 text-xs border border-border rounded-[4px] font-mono outline-none" />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-muted-foreground uppercase">Selesai</label>
                <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-full h-9 px-2 text-xs border border-border rounded-[4px] font-mono outline-none" />
              </div>
            </div>

            <Button onClick={handleExportPDF} disabled={isDownloading || isLoadingVehicles} className="w-full h-11 text-xs font-black bg-pln-darkBlue text-white hover:bg-pln-darkBlue/90 rounded-[6px] shadow-lg">
              {isDownloading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
              UNDUH LAPORAN PDF (A4)
            </Button>
          </div>
        </Card>

        {/* PANEL KANAN: LIVE PREVIEW (DATA ASLI DARI DATABASE) */}
        <Card className="xl:col-span-8 rounded-[8px] border border-border bg-slate-100 shadow-sm p-8 overflow-y-auto max-h-[85vh] custom-scrollbar">

          <div className="w-full max-w-[210mm] mx-auto bg-white shadow-2xl p-[15mm] font-sans text-[#0b1c30] min-h-[297mm] flex flex-col relative overflow-hidden">

            {/* 1. HEADER PREVIEW */}
            <div className="space-y-1 mb-8 border-b border-slate-300 pb-4">
               <div className="flex text-xs">
                  <span className="w-36 font-bold text-slate-500 uppercase tracking-tight">Unit Layanan</span>
                  <span className="font-black uppercase">: UL {userProfile?.region?.replace('Unit Layanan ', '')}</span>
               </div>
               <div className="flex text-xs">
                  <span className="w-36 font-bold text-slate-500 uppercase tracking-tight">Periode Audit</span>
                  <span className="font-black">: {startDate} s/d {endDate}</span>
               </div>
               <div className="flex text-xs">
                  <span className="w-36 font-bold text-slate-500 uppercase tracking-tight">Model Kendaraan</span>
                  <span className="font-black uppercase">: {selectedVehicleId === 'ALL' ? 'Laporan Kolektif' : `${activeVehicle?.license_plate} - ${activeVehicle?.vehicle_type}`}</span>
               </div>
            </div>

            {/* 2. TABEL TRANSAKSI REVISI: STAND AKHIR */}
            <div className="mb-10">
               <h3 className="text-[10px] font-black text-slate-800 uppercase tracking-widest mb-3">LOG TRANSAKSI BAHAN BAKAR</h3>

               {isLoadingPreview ? (
                 <div className="h-20 flex items-center justify-center gap-2 border border-dashed rounded text-xs text-muted-foreground italic">
                   <Loader2 className="h-3 w-3 animate-spin" /> Mensinkronisasi data database...
                 </div>
               ) : reportTransactions && reportTransactions.length > 0 ? (
                 <table className="w-full text-left border-collapse border border-slate-400 text-[8px]">
                    <thead>
                      <tr className="bg-slate-50 font-bold text-slate-800 uppercase border-b-2 border-slate-400">
                        <th className="p-1.5 border-r border-slate-400 text-center">No</th>
                        <th className="p-1.5 border-r border-slate-400">Tanggal</th>
                        <th className="p-1.5 border-r border-slate-400">No. Pol / Pelat</th>
                        <th className="p-1.5 border-r border-slate-400">Stand Awal / Odo</th>
                        <th className="p-1.5 border-r border-slate-400">Stand Akhir / Odo</th>
                        <th className="p-1.5 border-r border-slate-400">Liter / Jenis</th>
                        <th className="p-1.5">Total Rupiah</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-300">
                      {reportTransactions.map((tx: any, index: number) => (
                        <tr key={tx.id}>
                          <td className="p-1.5 border-r border-slate-300 text-center font-mono">{index + 1}</td>
                          <td className="p-1.5 border-r border-slate-300">{new Date(tx.created_at).toLocaleDateString('id-ID')}</td>
                          <td className="p-1.5 border-r border-slate-300 font-black uppercase">{tx.license_plate}</td>
                          <td className="p-1.5 border-r border-slate-300 font-mono font-bold text-slate-600">{Number(tx.odometer).toLocaleString('id-ID')} Km</td>
                          <td className="p-1.5 border-r border-slate-300 font-mono font-black text-pln-darkBlue">
                            {tx.odometer_next ? `${Number(tx.odometer_next).toLocaleString('id-ID')} Km` : '-'}
                          </td>
                          <td className="p-1.5 border-r border-slate-300 font-bold">{tx.fuel_amount} L / {tx.fuel_type}</td>
                          <td className="p-1.5 font-black font-mono">Rp {Number(tx.total_cost).toLocaleString('id-ID')}</td>
                        </tr>
                      ))}
                    </tbody>
                 </table>
               ) : (
                 <div className="p-10 text-center border rounded-md border-dashed text-xs text-muted-foreground italic bg-slate-50">
                    Tidak ditemukan data transaksi.
                 </div>
               )}
            </div>

            {/* 3. LAMPIRAN FOTO ASLI (3 FOTO PER TRANSAKSI) */}
            <div className="space-y-8">
               <h3 className="text-[10px] font-black text-slate-800 uppercase tracking-widest border-b border-slate-800 pb-1 inline-block">
                 LAMPIRAN BUKTI FISIK TRANSAKSI
               </h3>

               {!isLoadingPreview && reportTransactions?.slice(0, 5).map((tx: any, index: number) => (
                 <div key={tx.id} className="space-y-3 pt-2">
                    <div className="flex items-center gap-2 px-1">
                      <span className="text-[10px] font-black text-slate-800 bg-slate-100 px-2 py-0.5 rounded">DATA #{index + 1}</span>
                      <span className="text-[9px] font-bold text-muted-foreground uppercase">{tx.license_plate} • {new Date(tx.created_at).toLocaleString('id-ID')}</span>
                    </div>

                    <div className="grid grid-cols-3 gap-3">
                       <div className="flex flex-col gap-1.5">
                          <span className="text-[7px] font-black text-slate-500 uppercase text-center bg-slate-50 border border-slate-200 py-1">1. Odo Sebelum</span>
                          <div className="w-full h-32 bg-slate-50 border border-slate-300 rounded-[2px] flex items-center justify-center overflow-hidden">
                             {tx.odometer_photo_path ? (
                               <AuthenticatedImage src={`/api/fuel-transactions/${tx.id}/photo/odometer`} alt="Odo Awal" className="max-h-full w-full" />
                             ) : <ImageIcon className="h-5 w-5 text-slate-200" />}
                          </div>
                       </div>
                       <div className="flex flex-col gap-1.5">
                          <span className="text-[7px] font-black text-slate-500 uppercase text-center bg-slate-50 border border-slate-200 py-1">2. Odo Sesudah</span>
                          <div className="w-full h-32 bg-slate-50 border border-slate-300 rounded-[2px] flex items-center justify-center overflow-hidden">
                             {tx.odometer_after_photo_path ? (
                               <AuthenticatedImage src={`/api/fuel-transactions/${tx.id}/photo/odometer_after`} alt="Odo Akhir" className="max-h-full w-full" />
                             ) : <ImageIcon className="h-5 w-5 text-slate-200" />}
                          </div>
                       </div>
                       <div className="flex flex-col gap-1.5">
                          <span className="text-[7px] font-black text-slate-500 uppercase text-center bg-slate-50 border border-slate-200 py-1">3. Nota / Struk</span>
                          <div className="w-full h-32 bg-slate-50 border border-slate-300 rounded-[2px] flex items-center justify-center overflow-hidden">
                             {tx.receipt_photo_path ? (
                               <AuthenticatedImage src={`/api/fuel-transactions/${tx.id}/photo/receipt`} alt="Struk" className="max-h-full w-full" />
                             ) : <ImageIcon className="h-5 w-5 text-slate-200" />}
                          </div>
                       </div>
                    </div>
                 </div>
               ))}
            </div>

            {/* PENGESAHAN */}
            <div className="mt-auto pt-20 grid grid-cols-2 gap-10">
               <div className="text-center space-y-16">
                  <p className="text-[9px] font-bold uppercase italic">Mengetahui,<br/>Manajer Unit Layanan</p>
                  <p className="text-[10px] font-black border-t border-slate-800 pt-1 uppercase">( ............................ )</p>
               </div>
               <div className="text-center space-y-16">
                  <p className="text-[9px] font-bold uppercase italic">Dibuat Oleh,<br/>Admin Pengawas Wilayah</p>
                  <p className="text-[10px] font-black border-t border-slate-800 pt-1 uppercase">{userProfile?.name}</p>
               </div>
            </div>

          </div>
        </Card>

      </div>
    </div>
  );
}
