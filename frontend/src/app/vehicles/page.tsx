'use client';

import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getVehicles, createVehicle, Vehicle } from '@/services/vehicleService';
import { useAuthStore } from '@/store/authStore';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import InteractiveElement from '@/components/ui/InteractiveElement';
import { Truck, QrCode, Plus, Loader2, Building2, MapPin, X, Save, Info } from 'lucide-react';
import { cn } from '@/lib/utils';
import toast from 'react-hot-toast';

export default function VehiclesPage() {
  const queryClient = useQueryClient();
  const { userProfile } = useAuthStore();
  const [mounted, setMounted] = useState(false);
  const [selectedRegion, setSelectedRegion] = useState<string>('ALL');

  // Modal State
  const [showRegModal, setShowRegModal] = useState(false);
  const [formData, setFormData] = useState<Partial<Vehicle>>({
    license_plate: '',
    vehicle_type: '',
    fuel_tank_capacity: 0,
    fuel_consumption_rate: 0,
    fuel_type: 'DIESEL',
    usage_purpose: '',
    project_name: '',
    ul_nd: '',
    ul_pln: 'PLN NUSA DAYA',
    is_active: true
  });

  useEffect(() => {
    setMounted(true);
    if (userProfile?.region) {
        setFormData(prev => ({ ...prev, ul_nd: userProfile.region }));
    }
  }, [userProfile]);

  const isPusat = userProfile?.role === 'ADMIN_PUSAT';

  // 1. Ambil data kendaraan
  const { data: serverVehicles, isLoading, isRefetching } = useQuery({
    queryKey: ['vehicles', userProfile?.region, userProfile?.role, selectedRegion],
    queryFn: () => {
      const regionFilter = isPusat
        ? (selectedRegion === 'ALL' ? undefined : selectedRegion)
        : userProfile?.region;
      return getVehicles(undefined, regionFilter);
    },
    enabled: mounted && !!userProfile,
  });

  // 2. Mutasi Registrasi Baru
  const registrationMutation = useMutation({
    mutationFn: (data: Partial<Vehicle>) => createVehicle(data),
    onSuccess: () => {
      toast.success('Kendaraan berhasil didaftarkan ke sistem.');
      queryClient.invalidateQueries({ queryKey: ['vehicles'] });
      setShowRegModal(false);
      // Reset form
      setFormData({
        license_plate: '',
        vehicle_type: '',
        fuel_tank_capacity: 0,
        fuel_consumption_rate: 0,
        ul_nd: userProfile?.region || '',
        ul_pln: 'PLN NUSA DAYA',
        is_active: true
      });
    },
    onError: (error: any) => {
      const msg = error.response?.data?.message || 'Gagal mendaftarkan kendaraan.';
      toast.error(msg);
    }
  });

  const handlePrintQR = (plate: string) => {
    toast.success(`Menyiapkan cetak QR untuk armada ${plate}`);
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://fuel-monitoring-backend.onrender.com';
    window.open(`${apiUrl}/api/vehicles/qrcode/${encodeURIComponent(plate)}`, '_blank');
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: (name === 'fuel_tank_capacity' || name === 'fuel_consumption_rate') ? Number(value) : value
    }));
  };

  if (isLoading && !isRefetching) {
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
      {/* Header & Filter */}
      <div className="bg-white p-4 rounded-[8px] border border-border flex flex-col lg:flex-row justify-between lg:items-center gap-4 shadow-sm">
        <div className="flex-1">
          <h1 className="text-base font-bold text-foreground flex items-center gap-1.5 uppercase tracking-tight">
            <Truck className="h-4 w-4 text-pln-darkBlue" /> Master Data Armada
            {!isPusat && <span className="text-pln-cyan ml-1"> - {userProfile?.region?.replace('Unit Layanan ', '')}</span>}
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5 font-medium">
            {isPusat ? 'Pantau dan kelola seluruh aset kendaraan operasional lintas wilayah.' : 'Pengelolaan aset kendaraan operasional.'}
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          {isPusat && (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-pln-iceBlue/40 border border-pln-cyan/20 rounded-[4px]">
              <MapPin className="h-3.5 w-3.5 text-pln-cyan" />
              <select
                value={selectedRegion}
                onChange={(e) => setSelectedRegion(e.target.value)}
                className="bg-transparent text-xs font-black text-pln-darkBlue uppercase outline-none focus:ring-0 min-w-[150px]"
              >
                <option value="ALL">SEMUA WILAYAH (GLOBAL)</option>
                <option value="Banjarmasin">UL Banjarmasin</option>
                <option value="Barabai">UL Barabai</option>
                <option value="Palangkaraya">UL Palangkaraya</option>
                <option value="Pangkalan Bun">UL Pangkalan Bun</option>
                <option value="Kapuas">UL Kapuas</option>
              </select>
            </div>
          )}

          <button
            onClick={() => setShowRegModal(true)}
            className="h-9 text-xs px-4 font-black bg-pln-darkBlue text-white rounded-[4px] shadow-md flex items-center justify-center gap-1.5 active:scale-95 transition-all uppercase tracking-wider border-b-2 border-black/20"
          >
            <Plus className="h-4 w-4" /> Registrasi Kendaraan
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {vehicles.length > 0 ? (
          vehicles.map((vh: any) => (
            <InteractiveElement key={vh.id} className="bg-white border border-border rounded-[8px] p-4 flex flex-col hover:border-pln-cyan/40 transition-all shadow-sm group relative overflow-hidden min-h-[240px]">
              <div className="flex-1 space-y-3 relative z-10">
                <div className="flex justify-between items-start">
                  <div className="flex flex-col max-w-[70%]">
                    <span className="font-mono font-bold text-sm text-pln-darkBlue tracking-wide truncate" title={vh.license_plate}>{vh.license_plate}</span>
                    <span className="text-[11px] font-semibold text-muted-foreground uppercase truncate" title={vh.vehicle_type}>{vh.vehicle_type}</span>
                  </div>
                  <Badge className={vh.is_active ? 'bg-emerald-50 text-emerald-700 border-emerald-100 text-[9px] font-bold shrink-0' : 'bg-muted text-muted-foreground border-border text-[9px] font-bold shrink-0'}>
                    {vh.is_active ? 'TERVERIFIKASI' : 'NONAKTIF'}
                  </Badge>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between text-[10px] text-muted-foreground font-bold uppercase gap-2">
                    <div className="flex items-center gap-1.5 truncate">
                      <Building2 className="h-3.5 w-3.5 text-pln-cyan/60 shrink-0" />
                      <span className="truncate">{vh.ul_nd || vh.ul_pln}</span>
                    </div>
                    {vh.fuel_type && (
                      <Badge variant="outline" className="text-[8px] h-4 border-pln-cyan/30 text-pln-cyan bg-pln-iceBlue/20 shrink-0">{vh.fuel_type}</Badge>
                    )}
                  </div>

                  {vh.project_name && (
                    <div className="flex items-center gap-1.5 text-[9px] font-bold text-pln-darkBlue/70 bg-pln-iceBlue/30 p-1.5 rounded border border-pln-cyan/5">
                      <span className="uppercase tracking-tighter opacity-60 shrink-0">Project:</span>
                      <span className="truncate" title={vh.project_name}>{vh.project_name}</span>
                    </div>
                  )}

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
              </div>

              <div className="mt-4 relative z-10">
                <button
                  onClick={() => handlePrintQR(vh.license_plate)}
                  className="w-full h-9 text-[10px] font-black rounded-[4px] border border-pln-cyan/20 bg-pln-iceBlue/40 text-pln-darkBlue hover:bg-pln-cyan hover:text-white transition-all flex items-center justify-center gap-2 uppercase tracking-wider shadow-sm active:scale-[0.98]"
                >
                  <QrCode className="h-4 w-4" /> Cetak QR Driver
                </button>
              </div>

              <Building2 className="absolute -right-4 -bottom-4 h-16 w-16 text-slate-100 opacity-20 -rotate-12 pointer-events-none" />
            </InteractiveElement>
          ))
        ) : (
          <div className="col-span-full h-64 flex flex-col items-center justify-center border-2 border-dashed border-border rounded-xl bg-slate-50/50">
            <Truck className="h-12 w-12 text-slate-200 mb-3" />
            <p className="text-xs font-bold text-slate-400 italic">
              Tidak ada armada terdaftar {isPusat && selectedRegion !== 'ALL' ? `untuk wilayah ${selectedRegion}` : ''}.
            </p>
          </div>
        )}
      </div>

      {/* MODAL REGISTRASI KENDARAAN */}
      {showRegModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <Card className="w-full max-w-lg bg-white shadow-2xl rounded-xl border-none overflow-hidden animate-in zoom-in-95 duration-200">
                <div className="bg-pln-darkBlue px-6 py-4 flex items-center justify-between text-white">
                    <div className="flex items-center gap-2">
                        <Truck className="h-5 w-5 text-pln-cyan" />
                        <h2 className="text-sm font-bold uppercase tracking-wider">Registrasi Armada Baru</h2>
                    </div>
                    <button onClick={() => setShowRegModal(false)} className="hover:bg-white/10 p-1.5 rounded-full transition-colors">
                        <X className="h-5 w-5" />
                    </button>
                </div>

                <div className="p-6 space-y-5">
                    {/* Aler Otoritas Wilayah */}
                    <div className="flex items-start gap-3 p-3 bg-pln-iceBlue/30 border border-pln-cyan/20 rounded-[8px]">
                        <Info className="h-4 w-4 text-pln-cyan shrink-0 mt-0.5" />
                        <p className="text-[10px] text-pln-darkBlue font-medium leading-relaxed">
                            Kendaraan ini akan secara otomatis didaftarkan ke unit layanan
                            <strong className="mx-1 uppercase font-bold">{formData.ul_nd || userProfile?.region}</strong>
                            sesuai dengan otoritas admin wilayah Anda.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-muted-foreground uppercase">Nomor Polisi (Pelat)</label>
                            <Input
                                name="license_plate"
                                value={formData.license_plate}
                                onChange={handleInputChange}
                                placeholder="Contoh: DA 1234 XX"
                                className="h-10 text-xs font-mono font-bold uppercase tracking-widest focus:ring-pln-cyan"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-muted-foreground uppercase">Model / Tipe Unit</label>
                            <Input
                                name="vehicle_type"
                                value={formData.vehicle_type}
                                onChange={handleInputChange}
                                placeholder="Contoh: Mitsubishi Triton"
                                className="h-10 text-xs font-bold focus:ring-pln-cyan"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-muted-foreground uppercase">Kapasitas Tangki (L)</label>
                            <Input
                                name="fuel_tank_capacity"
                                type="number"
                                value={formData.fuel_tank_capacity}
                                onChange={handleInputChange}
                                placeholder="0"
                                className="h-10 text-xs font-mono font-bold focus:ring-pln-cyan"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-muted-foreground uppercase">Rasio Konsumsi (KM/L)</label>
                            <Input
                                name="fuel_consumption_rate"
                                type="number"
                                step="0.1"
                                value={formData.fuel_consumption_rate}
                                onChange={handleInputChange}
                                placeholder="0.0"
                                className="h-10 text-xs font-mono font-bold focus:ring-pln-cyan"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-muted-foreground uppercase">Jenis BBM (Tipe Mesin)</label>
                            <select
                                name="fuel_type"
                                value={formData.fuel_type}
                                onChange={(e: any) => handleInputChange(e)}
                                className="w-full h-10 border rounded-[6px] px-3 text-xs font-bold focus:ring-1 focus:ring-pln-cyan outline-none"
                            >
                                <option value="DIESEL">DIESEL (SOLAR)</option>
                                <option value="BENSIN">BENSIN (GASOLINE)</option>
                            </select>
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-muted-foreground uppercase">Project</label>
                            <Input
                                name="project_name"
                                value={formData.project_name}
                                onChange={handleInputChange}
                                placeholder="Nama Project..."
                                className="h-10 text-xs font-bold focus:ring-pln-cyan"
                            />
                        </div>
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-muted-foreground uppercase">Kegunaan / Peruntukan</label>
                        <Input
                            name="usage_purpose"
                            value={formData.usage_purpose}
                            onChange={handleInputChange}
                            placeholder="Contoh: Operasional Distribusi"
                            className="h-10 text-xs font-bold focus:ring-pln-cyan"
                        />
                    </div>

                    {/* Khusus Admin Pusat bisa ganti Region saat Input */}
                    {isPusat && (
                        <div className="space-y-1.5 pt-2">
                            <label className="text-[10px] font-bold text-muted-foreground uppercase">Tujuan Unit Layanan (UL)</label>
                            <select
                                name="ul_nd"
                                value={formData.ul_nd}
                                onChange={(e: any) => handleInputChange(e)}
                                className="w-full h-10 border rounded-[6px] px-3 text-xs font-black text-pln-darkBlue uppercase focus:ring-1 focus:ring-pln-cyan outline-none"
                            >
                                <option value="Banjarmasin">UL Banjarmasin</option>
                                <option value="Barabai">UL Barabai</option>
                                <option value="Palangkaraya">UL Palangkaraya</option>
                                <option value="Pangkalan Bun">UL Pangkalan Bun</option>
                                <option value="Kapuas">UL Kapuas</option>
                            </select>
                        </div>
                    )}

                    <div className="pt-4 border-t border-border flex gap-3">
                        <Button
                            variant="outline"
                            onClick={() => setShowRegModal(false)}
                            className="flex-1 h-11 text-xs font-bold border-border text-muted-foreground"
                        >
                            BATAL
                        </Button>
                        <Button
                            onClick={() => registrationMutation.mutate(formData)}
                            disabled={registrationMutation.isPending || !formData.license_plate}
                            className="flex-[2] h-11 text-xs font-black bg-pln-darkBlue text-white hover:bg-pln-darkBlue/90 shadow-lg flex items-center justify-center gap-2"
                        >
                            {registrationMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                            SIMPAN ASET KENDARAAN
                        </Button>
                    </div>
                </div>
            </Card>
        </div>
      )}
    </div>
  );
}
