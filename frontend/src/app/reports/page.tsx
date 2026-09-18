'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
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
  Image as ImageIcon,
  X,
  Check
} from 'lucide-react';
import toast from 'react-hot-toast';
import { cn } from '@/lib/utils';

export default function ReportsPage() {
  const { userProfile, isAuthenticated } = useAuthStore();
  const [selectedVehicleId, setSelectedVehicleId] = useState<string>('ALL');
  const [selectedRegion, setSelectedRegion] = useState<string>(userProfile?.region || 'ALL');
  const [vehicleSearch, setVehicleSearch] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [isDownloading, setIsDownloading] = useState(false);
  const [mounted, setMounted] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  const isPusat = userProfile?.role === 'ADMIN_PUSAT';

  useEffect(() => {
    setMounted(true);

    // Inisialisasi tanggal hanya di sisi klien (mencegah mismatch server vs lokal)
    const today = new Date().toISOString().split('T')[0];
    setStartDate(today);
    setEndDate(today);

    if (userProfile?.region) setSelectedRegion(userProfile.region);

    // Close search dropdown when clicking outside
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsSearchOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [userProfile]);

  const { data: vehicles, isLoading: isLoadingVehicles } = useQuery({
    queryKey: ['vehicles-report', isPusat ? selectedRegion : userProfile?.region],
    queryFn: () => {
      const regionFilter = isPusat
        ? (selectedRegion === 'ALL' ? undefined : selectedRegion)
        : userProfile?.region;
      return getVehicles(undefined, regionFilter);
    },
    enabled: mounted && isAuthenticated && (isPusat || !!userProfile?.region),
  });

  const { data: reportTransactions, isLoading: isLoadingPreview } = useQuery({
    queryKey: ['report-preview', selectedVehicleId, selectedRegion, startDate, endDate],
    queryFn: async () => {
      const response = await api.get('/api/fuel-transactions/export-pdf-preview', {
        params: {
          vehicle_id: selectedVehicleId === 'ALL' ? undefined : selectedVehicleId,
          ul_nd: isPusat ? (selectedRegion === 'ALL' ? undefined : selectedRegion) : userProfile?.region,
          start_date: startDate,
          end_date: endDate
        }
      });
      return response.data.data;
    },
    enabled: mounted && isAuthenticated,
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

  const handleSelectVehicle = (v: any) => {
    setSelectedVehicleId(v.id.toString());
    setVehicleSearch(v.license_plate);
    setIsSearchOpen(false);
  };

  const handleClearSelection = () => {
    setSelectedVehicleId('ALL');
    setVehicleSearch('');
    setIsSearchOpen(false);
  };

  const handleExportPDF = async () => {
    setIsDownloading(true);
    const loadingToast = toast.loading('Menyusun Laporan & Mengunduh Bukti Visual...');
    try {
      const response = await api.get('/api/fuel-transactions/export-pdf', {
        params: {
          vehicle_id: selectedVehicleId === 'ALL' ? undefined : selectedVehicleId,
          ul_nd: isPusat ? (selectedRegion === 'ALL' ? undefined : selectedRegion) : userProfile?.region,
          start_date: startDate,
          end_date: endDate,
        },
        responseType: 'blob',
      });
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const plateLabel = selectedVehicleId !== 'ALL' && activeVehicle ? `_${activeVehicle.license_plate}` : '_Kolektif';
      link.setAttribute('download', `Laporan_Audit_BBM${plateLabel}_${startDate}.pdf`);
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

            {/* 1. FILTER WILAYAH (Khusus Pusat) */}
            <div className="p-3 bg-pln-iceBlue/40 border border-pln-cyan/10 rounded-[6px]">
              <span className="text-[9px] font-bold text-muted-foreground uppercase block mb-1">
                {isPusat ? 'Filter Wilayah Operasional' : 'Otoritas Wilayah'}
              </span>
              {isPusat ? (
                <select
                  value={selectedRegion}
                  onChange={(e) => {
                    setSelectedRegion(e.target.value);
                    handleClearSelection();
                  }}
                  className="w-full bg-transparent text-xs font-black text-pln-darkBlue uppercase outline-none"
                >
                  <option value="ALL">SEMUA WILAYAH (GLOBAL)</option>
                  <option value="Banjarmasin">UL Banjarmasin</option>
                  <option value="Barabai">UL Barabai</option>
                  <option value="Palangkaraya">UL Palangkaraya</option>
                  <option value="Pangkalan Bun">UL Pangkalan Bun</option>
                  <option value="Kapuas">UL Kapuas</option>
                </select>
              ) : (
                <span className="text-xs font-black text-pln-darkBlue uppercase">
                  UL {userProfile?.region?.replace('Unit Layanan ', '')}
                </span>
              )}
            </div>

            {/* 2. SMART SEARCH KENDARAAN */}
            <div className="space-y-2 relative" ref={searchRef}>
              <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-tight flex items-center gap-1.5">
                <Truck className="h-3.5 w-3.5 text-pln-darkBlue" /> Pilih Armada Kendaraan
              </label>

              <div className="relative group">
                <div className="absolute left-2.5 top-2.5 flex items-center">
                   {isLoadingVehicles ? <Loader2 className="h-3.5 w-3.5 animate-spin text-pln-cyan" /> : <Search className="h-3.5 w-3.5 text-muted-foreground" />}
                </div>

                <input
                  type="text"
                  placeholder="Ketik nomor pelat... (contoh: 8418)"
                  value={vehicleSearch}
                  onFocus={() => setIsSearchOpen(true)}
                  onChange={(e) => {
                    setVehicleSearch(e.target.value);
                    if (selectedVehicleId !== 'ALL') setSelectedVehicleId('ALL');
                    setIsSearchOpen(true);
                  }}
                  className={cn(
                    "w-full h-9 pl-8 pr-8 text-xs bg-slate-50 border rounded-[4px] outline-none transition-all font-mono font-bold tracking-widest",
                    selectedVehicleId !== 'ALL' ? "border-pln-cyan bg-pln-iceBlue/20 text-pln-darkBlue" : "border-border focus:border-pln-cyan focus:bg-white"
                  )}
                />

                {/* Clear Button */}
                { (vehicleSearch || selectedVehicleId !== 'ALL') && (
                  <button
                    onClick={handleClearSelection}
                    className="absolute right-2 top-2.5 text-muted-foreground hover:text-anomaly-red transition-colors"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}

                {/* DROPDOWN HASIL PENCARIAN */}
                {isSearchOpen && (
                  <div className="absolute top-10 left-0 right-0 z-50 bg-white border border-border rounded-md shadow-2xl max-h-60 overflow-y-auto animate-in fade-in slide-in-from-top-2 duration-200">
                    <div
                      onClick={handleClearSelection}
                      className="px-3 py-2 text-[10px] font-bold text-muted-foreground hover:bg-slate-50 cursor-pointer border-b border-slate-100 flex items-center justify-between"
                    >
                      -- SELURUH ARMADA WILAYAH --
                      {selectedVehicleId === 'ALL' && <Check className="h-3 w-3 text-pln-cyan" />}
                    </div>
                    {filteredVehicles.length > 0 ? (
                      filteredVehicles.map((v: any) => (
                        <div
                          key={v.id}
                          onClick={() => handleSelectVehicle(v)}
                          className={cn(
                            "px-3 py-2.5 hover:bg-pln-iceBlue/30 cursor-pointer flex items-center justify-between transition-colors border-b border-slate-50 last:border-none",
                            selectedVehicleId === v.id.toString() && "bg-pln-iceBlue/50"
                          )}
                        >
                          <div className="flex flex-col">
                            <span className="font-mono font-black text-pln-darkBlue text-[11px] tracking-widest">{v.license_plate}</span>
                            <span className="text-[9px] text-muted-foreground font-bold uppercase">{v.vehicle_type}</span>
                          </div>
                          {selectedVehicleId === v.id.toString() && <Check className="h-4 w-4 text-pln-cyan" />}
                        </div>
                      ))
                    ) : (
                      <div className="p-4 text-center text-[10px] text-muted-foreground italic font-medium">
                        Pelat nomor tidak ditemukan.
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* 3. FILTER TANGGAL */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-muted-foreground uppercase">Tanggal Mulai</label>
                <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-full h-9 px-2 text-xs border border-border rounded-[4px] font-mono outline-none focus:border-pln-cyan" />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-muted-foreground uppercase">Tanggal Selesai</label>
                <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-full h-9 px-2 text-xs border border-border rounded-[4px] font-mono outline-none focus:border-pln-cyan" />
              </div>
            </div>

            <Button onClick={handleExportPDF} disabled={isDownloading || isLoadingVehicles} className="w-full h-11 text-xs font-black bg-pln-darkBlue text-white hover:bg-pln-darkBlue/90 rounded-[6px] shadow-lg flex items-center justify-center gap-2 mt-4 tracking-widest border-b-4 border-black/20">
              {isDownloading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
              EKSPOR PDF RESMI
            </Button>
          </div>
        </Card>

        {/* PANEL KANAN: LIVE PREVIEW */}
        <Card className="xl:col-span-8 rounded-[8px] border border-border bg-slate-100 shadow-sm p-8 overflow-y-auto max-h-[85vh] custom-scrollbar">

          <div className="w-full max-w-[210mm] mx-auto bg-white shadow-2xl p-[15mm] font-sans text-[#0b1c30] min-h-[297mm] flex flex-col relative overflow-hidden">

            {/* HEADER PREVIEW */}
            <div className="space-y-1 mb-8 border-b border-slate-300 pb-4">
               <div className="flex text-xs">
                  <span className="w-36 font-bold text-slate-500 uppercase tracking-tight">Unit Layanan</span>
                  <span className="font-black uppercase">: {isPusat ? (selectedRegion === 'ALL' ? 'PUSAT UPKAL2 REGIONAL' : `UL ${selectedRegion}`) : `UL ${userProfile?.region?.replace('Unit Layanan ', '')}`}</span>
               </div>
               <div className="flex text-xs">
                  <span className="w-36 font-bold text-slate-500 uppercase tracking-tight">Periode Audit</span>
                  <span className="font-black">: {startDate} s/d {endDate}</span>
               </div>
               <div className="flex text-xs">
                  <span className="w-36 font-bold text-slate-500 uppercase tracking-tight">Model Kendaraan</span>
                  <span className="font-black uppercase">: {selectedVehicleId === 'ALL' ? 'Laporan Kolektif Wilayah' : `${activeVehicle?.license_plate} - ${activeVehicle?.vehicle_type}`}</span>
               </div>
            </div>

            {/* TABEL TRANSAKSI */}
            <div className="mb-10">
               <h3 className="text-[10px] font-black text-slate-800 uppercase tracking-widest mb-3">LOG TRANSAKSI BAHAN BAKAR</h3>

               {isLoadingPreview ? (
                 <div className="h-20 flex items-center justify-center gap-2 border border-dashed rounded text-xs text-muted-foreground italic">
                   <Loader2 className="h-3 w-3 animate-spin" /> Menghubungkan database...
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
                      <tr className="bg-slate-50 font-black">
                        <td colSpan={5} className="p-1.5 border-r border-slate-400 text-right uppercase tracking-tighter text-[7px]">SUBTOTAL</td>
                        <td className="p-1.5 border-r border-slate-400 text-center">
                          {reportTransactions.reduce((sum: number, tx: any) => sum + Number(tx.fuel_amount || 0), 0).toFixed(2)} L
                        </td>
                        <td className="p-1.5 text-right font-mono text-[9px]">
                          Rp {reportTransactions.reduce((sum: number, tx: any) => sum + Number(tx.total_cost || 0), 0).toLocaleString('id-ID')}
                        </td>
                      </tr>
                    </tbody>
                 </table>
               ) : (
                 <div className="p-10 text-center border rounded-md border-dashed text-xs text-muted-foreground italic bg-slate-50">
                    Tidak ditemukan data transaksi untuk filter ini.
                 </div>
               )}
            </div>

            {/* LAMPIRAN FOTO */}
            <div className="space-y-8">
               <h3 className="text-[10px] font-black text-slate-800 uppercase tracking-widest border-b border-slate-800 pb-1 inline-block">
                 LAMPIRAN BUKTI FISIK TRANSAKSI
               </h3>

               {!isLoadingPreview && reportTransactions?.slice(0, 3).map((tx: any, index: number) => (
                 <div key={tx.id} className="space-y-3 pt-2">
                    <div className="flex items-center gap-2 px-1">
                      <span className="text-[10px] font-black text-slate-800 bg-slate-100 px-2 py-0.5 rounded">BUKTI #{index + 1}</span>
                      <span className="text-[9px] font-bold text-muted-foreground uppercase">{tx.license_plate} • {new Date(tx.created_at).toLocaleString('id-ID')}</span>
                    </div>

                    <div className="grid grid-cols-3 gap-3">
                       {[
                         { key: 'odometer_photo_path', label: '1. Odo Sebelum' },
                         { key: 'odometer_after_photo_path', label: '2. Odo Sesudah' },
                         { key: 'receipt_photo_path', label: '3. Nota / Struk' }
                       ].map((photo) => (
                         <div key={photo.key} className="flex flex-col gap-1.5">
                            <span className="text-[7px] font-black text-slate-500 uppercase text-center bg-slate-50 border border-slate-200 py-1">{photo.label}</span>
                            <div className="w-full h-32 bg-slate-50 border border-slate-300 rounded-[2px] flex items-center justify-center overflow-hidden">
                               {tx[photo.key] ? (
                                 <AuthenticatedImage src={`/api/fuel-transactions/${tx.id}/photo/${photo.key.replace('_path', '')}`} alt={photo.label} className="max-h-full w-full" />
                               ) : <ImageIcon className="h-5 w-5 text-slate-200" />}
                            </div>
                         </div>
                       ))}
                    </div>
                 </div>
               ))}

               {reportTransactions && reportTransactions.length > 3 && (
                 <p className="text-[8px] text-muted-foreground italic text-center pt-4">-- {reportTransactions.length - 3} bukti lainnya akan terlampir otomatis pada file PDF --</p>
               )}
            </div>

            {/* PENGESAHAN */}
            <div className="mt-auto pt-20 grid grid-cols-2 gap-10">
               <div className="text-center space-y-16">
                  <p className="text-[9px] font-bold uppercase italic text-slate-600">Mengetahui,<br/>Manajer Unit Layanan</p>
                  <p className="text-[10px] font-black border-t border-slate-800 pt-1 uppercase">( ............................ )</p>
               </div>
               <div className="text-center space-y-16">
                  <p className="text-[9px] font-bold uppercase italic text-slate-600">Dibuat Oleh,<br/>Admin Pengawas Wilayah</p>
                  <p className="text-[10px] font-black border-t border-slate-800 pt-1 uppercase">{userProfile?.name}</p>
               </div>
            </div>

          </div>
        </Card>

      </div>
    </div>
  );
}
