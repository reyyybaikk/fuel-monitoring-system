'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getTransactionById, updateTransactionData, FuelTransaction } from '@/services/transactionService';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import AuthenticatedImage from '@/components/ui/AuthenticatedImage';
import { cn } from '@/lib/utils';
import {
  ChevronLeft,
  MessageCircle,
  Save,
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  Smartphone,
  Info,
  Fuel as FuelIcon,
  Gauge,
  Image as ImageIcon
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function TransactionReviewPage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const txId = params.id as string;

  const [formData, setFormData] = useState<Partial<FuelTransaction>>({});
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // 1. Fetch Detail Transaksi
  const { data: transaction, isLoading, isError } = useQuery({
    queryKey: ['transaction', txId],
    queryFn: () => getTransactionById(txId),
    enabled: mounted,
  });

  // Sync data ke form saat data berhasil dimuat
  useEffect(() => {
    if (transaction) {
      setFormData({
        fuel_amount: transaction.fuel_amount,
        odometer: transaction.odometer,
        total_cost: transaction.total_cost,
        fuel_type: transaction.fuel_type,
        notes: transaction.notes
      });
    }
  }, [transaction]);

  // 2. Mutasi Update Data
  const mutation = useMutation({
    mutationFn: (data: Partial<FuelTransaction>) => updateTransactionData(txId, data),
    onSuccess: () => {
      toast.success('Data transaksi berhasil diperbarui dan disinkronkan ke database.');
      queryClient.invalidateQueries({ queryKey: ['transaction', txId] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      router.push('/transactions');
    },
    onError: () => {
      toast.error('Gagal memperbarui data. Periksa koneksi backend.');
    }
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'notes' ? value : Number(value) || value
    }));
  };

  const handleWhatsAppConfirm = () => {
    if (!transaction?.whatsapp_number) {
      toast.error('Nomor WhatsApp pengemudi tidak ditemukan di database.');
      return;
    }

    const message = `Halo Bapak/Ibu ${transaction.driver_name},\n\nKami dari Admin FuelGuard AI ingin mengonfirmasi transaksi pengisian BBM Anda (ID: #${transaction.id}) pada armada ${transaction.license_plate}.\n\nSistem kami mendeteksi indikasi anomali: "${transaction.notes}".\n\nMohon penjelasan atau klarifikasi mengenai data tersebut. Terima kasih.`;

    // Bersihkan nomor (harus diawali 62)
    let phone = transaction.whatsapp_number.replace(/[^0-9]/g, '');
    if (phone.startsWith('0')) phone = '62' + phone.slice(1);

    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`, '_blank');
  };

  if (!mounted || isLoading) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center gap-3 text-center">
        <Loader2 className="h-10 w-10 text-pln-cyan animate-spin" />
        <p className="font-sans text-sm font-bold text-pln-darkBlue">Mempersiapkan Lembar Review Audit...</p>
      </div>
    );
  }

  if (isError || !transaction) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center gap-4">
        <AlertCircle className="h-12 w-12 text-anomaly-red" />
        <p className="text-sm font-medium text-muted-foreground">Data transaksi tidak ditemukan atau akses ditolak.</p>
        <Button onClick={() => router.back()} variant="outline">Kembali</Button>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6 font-sans pb-12">
      {/* Top Navigation */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-xs font-bold text-muted-foreground hover:text-pln-darkBlue transition-colors group"
        >
          <div className="w-7 h-7 rounded-full border border-border flex items-center justify-center group-hover:border-pln-cyan transition-colors">
            <ChevronLeft className="h-4 w-4" />
          </div>
          KEMBALI KE DAFTAR
        </button>
        <div className="flex items-center gap-2">
          <Badge className="bg-pln-iceBlue text-pln-darkBlue border border-pln-cyan/20 h-7 px-3 font-mono font-bold">
            TRX-ID: #{transaction.id}
          </Badge>
          <Badge className={cn(
            "h-7 px-3 font-bold uppercase",
            transaction.ml_is_anomaly ? "bg-red-50 text-anomaly-red border-red-200" : "bg-emerald-50 text-emerald-700 border-emerald-200"
          )}>
            {transaction.ml_is_anomaly ? '⚠️ Terdeteksi Anomali' : 'Normal'}
          </Badge>
        </div>
      </div>

      {/* Main Grid: Images & Edit Form */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

        {/* LEFT COLUMN: VISUAL EVIDENCE (Sticky) */}
        <div className="lg:col-span-7 space-y-4">
          <Card className="border-border shadow-sm overflow-hidden rounded-[12px] bg-white sticky top-24">
            <div className="bg-muted/30 px-4 py-3 border-b flex items-center justify-between">
              <h2 className="text-xs font-bold text-foreground uppercase tracking-widest flex items-center gap-2">
                <ImageIcon className="h-4 w-4 text-pln-cyan" /> Inspeksi Bukti Visual Otentik
              </h2>
            </div>
            <CardContent className="p-5 space-y-6">
              {/* Image Group 1: Struk */}
              <div className="space-y-2">
                <div className="flex items-center justify-between px-1">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">A. Foto Struk SPBU / Pembelian</span>
                  <Badge variant="outline" className="text-[9px] font-mono opacity-60">ORIGINAL RESOLUTION</Badge>
                </div>
                <div className="w-full bg-slate-100 rounded-[8px] border border-border/60 overflow-hidden flex items-center justify-center min-h-[350px] shadow-inner">
                  {transaction.receipt_photo_path ? (
                    <AuthenticatedImage
                      src={`/api/fuel-transactions/${transaction.id}/photo/receipt`}
                      alt="Struk BBM"
                      className="max-h-[600px] w-full"
                    />
                  ) : (
                    <div className="text-center opacity-40">
                       <FileText className="h-12 w-12 mx-auto mb-2" />
                       <p className="text-xs font-bold uppercase">Foto Struk Tidak Tersedia</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Grid for Odometer Before and After */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Image Group 2: Odometer Before */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between px-1">
                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">B. Foto Odometer Awal (Sebelum)</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-[8px] border border-border/60 overflow-hidden flex items-center justify-center min-h-[300px] shadow-inner">
                    {transaction.odometer_photo_path ? (
                      <AuthenticatedImage
                        src={`/api/fuel-transactions/${transaction.id}/photo/odometer`}
                        alt="Odometer Awal"
                        className="max-h-[500px] w-full"
                      />
                    ) : (
                      <div className="text-center opacity-40">
                         <Gauge className="h-10 w-10 mx-auto mb-2" />
                         <p className="text-[10px] font-bold uppercase">Odometer Awal Tidak Ada</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Image Group 3: Odometer After */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between px-1">
                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">C. Foto Odometer Akhir (Sesudah)</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-[8px] border border-border/60 overflow-hidden flex items-center justify-center min-h-[300px] shadow-inner">
                    {transaction.odometer_after_photo_path ? (
                      <AuthenticatedImage
                        src={`/api/fuel-transactions/${transaction.id}/photo/odometer_after`}
                        alt="Odometer Akhir"
                        className="max-h-[500px] w-full"
                      />
                    ) : (
                      <div className="text-center opacity-40">
                         <Gauge className="h-10 w-10 mx-auto mb-2" />
                         <p className="text-[10px] font-bold uppercase">Odometer Akhir Tidak Ada</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* RIGHT COLUMN: CORRECTION FORM & WHATSAPP */}
        <div className="lg:col-span-5 space-y-6">

          {/* Section 1: AI Result Recall */}
          <Card className={cn(
            "border-l-4 shadow-sm",
            transaction.ml_is_anomaly ? "bg-red-50 border-anomaly-red" : "bg-emerald-50 border-emerald-600"
          )}>
            <CardContent className="p-4 space-y-2">
              <div className="flex items-center gap-2">
                <AlertTriangle className={cn("h-4 w-4", transaction.ml_is_anomaly ? "text-anomaly-red" : "text-emerald-600")} />
                <h3 className="text-xs font-bold uppercase tracking-tight">Analisis AI: {transaction.ml_anomaly_score}/100</h3>
              </div>
              <p className="text-xs font-medium leading-relaxed">
                {transaction.notes || 'Seluruh parameter sesuai dengan profil operasional armada.'}
              </p>
            </CardContent>
          </Card>

          {/* Section 2: WhatsApp Confirmation */}
          <Card className="border-border shadow-sm bg-white overflow-hidden rounded-[12px]">
             <div className="bg-emerald-600 px-4 py-3 border-b flex items-center gap-2 text-white">
                <Smartphone className="h-4 w-4" />
                <h2 className="text-xs font-bold uppercase tracking-widest">Konfirmasi Driver</h2>
             </div>
             <CardContent className="p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-foreground">{transaction.driver_name}</span>
                    <span className="text-[10px] font-mono text-muted-foreground">{transaction.whatsapp_number || 'Nomer tidak tersedia'}</span>
                  </div>
                  <Button
                    onClick={handleWhatsAppConfirm}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-[6px] text-[10px] font-bold h-8 px-4"
                  >
                    <MessageCircle className="h-3.5 w-3.5 mr-2" /> KIRIM WHATSAPP
                  </Button>
                </div>
                <p className="text-[10px] text-muted-foreground leading-relaxed bg-slate-50 p-2 rounded border italic">
                  "Klik tombol di atas untuk mengirim pesan konfirmasi otomatis mengenai anomali data transaksi ke nomor WhatsApp pengemudi."
                </p>
             </CardContent>
          </Card>

          {/* Section 3: Data Correction Form */}
          <Card className="border-border shadow-sm bg-white overflow-hidden rounded-[12px]">
             <div className="bg-pln-darkBlue px-4 py-3 border-b flex items-center gap-2 text-white">
                <CheckCircle2 className="h-4 w-4 text-pln-cyan" />
                <h2 className="text-xs font-bold uppercase tracking-widest">Koreksi & Pembenahan Data</h2>
             </div>
             <CardContent className="p-5 space-y-5">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-muted-foreground uppercase">Volume BBM (L)</label>
                    <div className="relative">
                       <Input
                        name="fuel_amount"
                        type="number"
                        step="0.01"
                        value={formData.fuel_amount}
                        onChange={handleInputChange}
                        className="h-9 font-mono text-xs pl-8 focus:ring-pln-cyan"
                       />
                       <FuelIcon className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground/50" />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-muted-foreground uppercase">Angka Odometer (Km)</label>
                    <div className="relative">
                       <Input
                        name="odometer"
                        type="number"
                        value={formData.odometer}
                        onChange={handleInputChange}
                        className="h-9 font-mono text-xs pl-8 focus:ring-pln-cyan"
                       />
                       <Gauge className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground/50" />
                    </div>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase">Total Biaya (Rp)</label>
                  <div className="relative font-mono">
                    <span className="absolute left-3 top-2.5 text-[11px] font-bold text-muted-foreground">Rp</span>
                    <Input
                      name="total_cost"
                      type="number"
                      value={formData.total_cost}
                      onChange={handleInputChange}
                      className="h-9 pl-10 text-xs focus:ring-pln-cyan font-bold"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase">Jenis Bahan Bakar</label>
                  <select
                    name="fuel_type"
                    value={formData.fuel_type}
                    onChange={(e: any) => handleInputChange(e)}
                    className="w-full h-9 border rounded-[4px] px-2 text-xs focus:outline-none focus:ring-1 focus:ring-pln-cyan bg-white font-medium"
                  >
                    <option value="Solar HSD">Solar HSD</option>
                    <option value="Biosolar">Biosolar</option>
                    <option value="Dexlite">Dexlite</option>
                    <option value="Pertamina Dex">Pertamina Dex</option>
                    <option value="Pertamax">Pertamax</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase text-pln-cyan">Catatan Koreksi Admin</label>
                  <textarea
                    name="notes"
                    value={formData.notes}
                    onChange={handleInputChange}
                    className="w-full min-h-[80px] border border-pln-cyan/30 rounded-[4px] p-2 text-xs focus:outline-none focus:ring-1 focus:ring-pln-cyan bg-pln-iceBlue/10 font-medium"
                    placeholder="Tulis alasan pembenahan data di sini..."
                  />
                </div>

                <div className="pt-4 flex flex-col gap-3">
                  <Button
                    onClick={() => mutation.mutate(formData)}
                    disabled={mutation.isPending}
                    className="w-full bg-pln-darkBlue hover:bg-pln-darkBlue/90 text-white font-bold text-xs h-10 rounded-[6px] shadow-md flex items-center justify-center gap-2"
                  >
                    {mutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                    KONFIRMASI & KIRIM DATA KOREKSI
                  </Button>
                  <div className="flex items-start gap-2 p-2.5 bg-pln-iceBlue/30 rounded border border-pln-cyan/20">
                    <Info className="h-3.5 w-3.5 text-pln-cyan shrink-0 mt-0.5" />
                    <p className="text-[9px] text-pln-darkBlue/70 font-medium leading-normal">
                      Data yang Anda kirim akan langsung memperbarui record di database Supabase dan status anomali akan dihitung ulang secara manual oleh sistem.
                    </p>
                  </div>
                </div>
             </CardContent>
          </Card>
        </div>

      </div>
    </div>
  );
}
