'use client';

import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getTransactions, updateTransactionStatus } from '@/services/transactionService';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import InteractiveElement from '@/components/ui/InteractiveElement';
import { FileText, Image as ImageIcon, AlertTriangle, Loader2, SearchX, User, Calendar, ExternalLink } from 'lucide-react';
import AuthenticatedImage from '@/components/ui/AuthenticatedImage';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import toast from 'react-hot-toast';

export default function TransactionsPage() {
  const queryClient = useQueryClient();
  const searchParams = useSearchParams();
  const searchQuery = searchParams.get('q') || '';
  const [mounted, setMounted] = useState(false);

  const [selectedTxId, setSelectedTxId] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const { data: serverTransactions, isLoading } = useQuery({
    queryKey: ['transactions', searchQuery],
    queryFn: () => getTransactions(searchQuery),
    enabled: mounted,
  });

  const mutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: 'APPROVED' | 'REJECTED' }) =>
      updateTransactionStatus(id, status),
    onSuccess: () => {
      toast.success(`Verifikasi berhasil diperbarui.`);
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
    },
  });

  const transactions = serverTransactions || [];

  useEffect(() => {
    if (transactions.length > 0 && !selectedTxId) {
      setSelectedTxId(transactions[0].id);
    }
  }, [transactions, selectedTxId]);

  const activeTx = transactions.find(tx => tx.id === selectedTxId) || (transactions.length > 0 ? transactions[0] : null);

  if (!mounted || isLoading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-2 text-center font-sans">
        <Loader2 className="h-10 w-10 text-pln-cyan animate-spin" />
        <p className="text-sm font-bold text-pln-darkBlue">Menyelaraskan Data Audit...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 font-sans select-none">
      <div className="bg-white p-4 rounded-[8px] border border-border flex flex-col sm:flex-row justify-between sm:items-center gap-3 shadow-sm">
        <div className="flex flex-col gap-0.5">
          <div className="flex items-center gap-2">
            <h1 className="text-base font-bold text-foreground">Log Transaksi & Audit BBM</h1>
            <Badge className="bg-red-50 text-anomaly-red border border-red-100 text-[9px] font-bold uppercase rounded-[4px] px-1.5 pt-0.5 h-4">Audit Aktif</Badge>
          </div>
          <p className="text-xs text-muted-foreground">Otorisasi klaim BBM dan verifikasi telemetri berbasis AI.</p>
        </div>
        <button className="h-8 text-xs px-4 font-bold bg-pln-darkBlue text-white rounded-[4px] shadow-sm active:scale-95 transition-all">
          Ekspor CSV
        </button>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 items-start">

        {/* PANEL KIRI: Antrean Klaim */}
        <Card className="xl:col-span-5 rounded-[8px] border border-border bg-white shadow-sm p-3 min-h-[550px]">
          <div className="flex items-center justify-between border-b border-border/60 pb-2.5 mb-3 px-1">
            <h2 className="text-[11px] font-bold text-pln-darkBlue uppercase tracking-widest">Antrean Klaim</h2>
            <Badge variant="outline" className="text-[9px] font-mono text-muted-foreground font-bold border-none">Live Database</Badge>
          </div>

          {transactions.length > 0 ? (
            <div className="space-y-2">
              {transactions.map((tx) => (
                <InteractiveElement
                  key={tx.id}
                  onClick={() => setSelectedTxId(tx.id)}
                  className={cn(
                    "relative overflow-hidden rounded-[8px] border transition-all cursor-pointer group shadow-sm",
                    activeTx?.id === tx.id
                      ? "bg-pln-iceBlue/50 border-pln-cyan/40 shadow-sm"
                      : "bg-white border-border/60 hover:border-pln-cyan/20 hover:bg-slate-50/30"
                  )}
                >
                  <div className={cn(
                    "absolute left-0 top-0 bottom-0 w-1.5 transition-all z-20",
                    activeTx?.id === tx.id ? "bg-pln-cyan shadow-[2px_0_8px_rgba(24,164,197,0.3)]" : tx.ml_is_anomaly ? "bg-anomaly-red" : "bg-transparent"
                  )} />

                  <div className="py-3 pr-3 pl-6 flex flex-col gap-1.5">
                    <div className="flex justify-between items-center gap-4">
                      <span className="font-mono font-bold text-pln-darkBlue text-[10px] bg-pln-darkBlue/5 px-1.5 py-0.5 rounded">#{tx.id}</span>
                      {tx.ml_is_anomaly ? (
                        <Badge className="bg-anomaly-red text-white text-[8px] font-bold rounded-[3px] px-1.5 h-4 border-none shadow-sm">RISIKO: {tx.ml_anomaly_score}</Badge>
                      ) : (
                        <Badge variant="outline" className="text-emerald-600 border-emerald-200 bg-emerald-50 text-[8px] font-bold rounded-[3px] px-1.5 h-4">NORMAL</Badge>
                      )}
                    </div>

                    <div className="flex justify-between items-end gap-2">
                      <span className="font-mono font-bold text-foreground text-sm tracking-tight">{tx.license_plate}</span>
                      <span className="font-mono font-bold text-pln-darkBlue text-sm">{Number(tx.fuel_amount).toLocaleString('id-ID')} <small className="text-[9px] font-sans font-medium text-muted-foreground uppercase">L</small></span>
                    </div>

                    <div className="flex justify-between items-center pt-1 border-t border-dashed border-border/60 mt-0.5">
                      <span className="text-[9px] text-muted-foreground font-semibold truncate max-w-[150px] uppercase tracking-tighter">
                        {tx.vehicle_type || 'Unit Armada UPKAL2'}
                      </span>
                      <span className="text-[9px] text-muted-foreground/70 font-medium italic">
                        {new Date(tx.created_at).toLocaleDateString('id-ID', {day:'2-digit', month:'short'})}
                      </span>
                    </div>
                  </div>
                </InteractiveElement>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-80 gap-3 opacity-50 text-center">
              <SearchX className="h-10 w-10 text-muted-foreground" />
              <p className="text-xs font-medium text-muted-foreground">Tidak ada data transaksi.</p>
            </div>
          )}
        </Card>

        {/* PANEL KANAN: Detail Inspeksi Berbasis Data Asli */}
        <Card className="xl:col-span-7 rounded-[8px] border border-border bg-white shadow-sm p-5 space-y-5 sticky top-[80px]">
          {activeTx ? (
            <>
              <div className="bg-pln-darkBlue/[0.03] border border-pln-darkBlue/10 p-4 rounded-[8px] flex justify-between items-start gap-4">
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold text-pln-darkBlue font-mono">ID: #{activeTx.id}</h3>
                    <Badge className="bg-pln-darkBlue text-white text-[9px] font-bold rounded-[4px] pt-0.5">{activeTx.fuel_type || 'SOLAR HSD'}</Badge>
                    <Link href={`/transactions/${activeTx.id}/review`}>
                      <Button variant="outline" size="sm" className="h-6 px-2 text-[9px] font-bold bg-white hover:bg-pln-iceBlue/40 border-pln-cyan/20 text-pln-darkBlue">
                        <ExternalLink className="h-3 w-3 mr-1" /> REVIEW & KOREKSI
                      </Button>
                    </Link>
                  </div>
                  <div className="flex flex-col gap-1 text-[11px] font-medium text-foreground">
                    <div className="flex items-center gap-2">
                       <span className="font-mono font-bold bg-white px-2 py-0.5 rounded border border-border">{activeTx.license_plate}</span>
                       <span className="text-muted-foreground">({activeTx.vehicle_type || 'Unit UPKAL2'})</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-muted-foreground mt-0.5">
                       <User className="h-3 w-3" /> {activeTx.driver_name}
                       <span className="mx-1">•</span>
                       <Calendar className="h-3 w-3" /> {new Date(activeTx.created_at).toLocaleString('id-ID', { hour: '2-digit', minute: '2-digit' })} WIB
                    </div>
                  </div>
                </div>
                <div className="text-right flex flex-col items-end gap-1.5">
                   <Badge className={cn(
                     "text-[10px] font-bold uppercase rounded-[4px] px-2.5 py-1 border shadow-sm",
                     activeTx.status === 'PENDING' ? "bg-amber-50 text-amber-700 border-amber-200" :
                     activeTx.status === 'APPROVED' ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-red-50 text-red-700 border-red-200"
                   )}>
                    {activeTx.status}
                  </Badge>
                </div>
              </div>

              {/* SEKSI BUKTI VISUAL */}
              <div className="space-y-3">
                <h4 className="text-[11px] font-bold text-foreground uppercase tracking-wider flex items-center gap-2">
                  <ImageIcon className="h-4 w-4 text-pln-cyan" /> Lampiran Bukti Visual Otentik
                </h4>
                <div className="grid grid-cols-3 gap-2">
                  {/* FOTO STRUK */}
                  <div className="group relative border border-border p-2 rounded-[6px] bg-muted/20 text-center hover:bg-muted/30 transition-colors shadow-inner">
                    <span className="text-[8px] font-mono font-bold text-muted-foreground block mb-1 uppercase tracking-tight">STRUK BBM</span>
                    <div className="w-full h-32 bg-white rounded border border-border/60 flex items-center justify-center overflow-hidden">
                      {activeTx.receipt_photo_path ? (
                        <AuthenticatedImage
                          src={`/api/fuel-transactions/${activeTx.id}/photo/receipt`}
                          alt="Struk BBM"
                          className="max-h-full w-full"
                        />
                      ) : (
                        <div className="flex flex-col items-center gap-1 opacity-30">
                          <FileText className="h-6 w-6" />
                          <span className="text-[8px] font-bold uppercase tracking-tighter">Tanpa Berkas</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* FOTO ODOMETER AWAL */}
                  <div className="group relative border border-border p-2 rounded-[6px] bg-muted/20 text-center hover:bg-muted/30 transition-colors shadow-inner">
                    <span className="text-[8px] font-mono font-bold text-muted-foreground block mb-1 uppercase tracking-tight">ODO AWAL</span>
                    <div className="w-full h-32 bg-white rounded border border-border/60 flex items-center justify-center overflow-hidden">
                      {activeTx.odometer_photo_path ? (
                        <AuthenticatedImage
                          src={`/api/fuel-transactions/${activeTx.id}/photo/odometer`}
                          alt="Odometer"
                          className="max-h-full w-full"
                        />
                      ) : (
                        <div className="flex flex-col items-center gap-1 opacity-30">
                          <FileText className="h-6 w-6" />
                          <span className="text-[8px] font-bold uppercase tracking-tighter">Tanpa Berkas</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* FOTO ODOMETER AKHIR */}
                  <div className="group relative border border-border p-2 rounded-[6px] bg-muted/20 text-center hover:bg-muted/30 transition-colors shadow-inner">
                    <span className="text-[8px] font-mono font-bold text-muted-foreground block mb-1 uppercase tracking-tight">ODO AKHIR</span>
                    <div className="w-full h-32 bg-white rounded border border-border/60 flex items-center justify-center overflow-hidden">
                      {activeTx.odometer_after_photo_path ? (
                        <AuthenticatedImage
                          src={`/api/fuel-transactions/${activeTx.id}/photo/odometer_after`}
                          alt="Odometer Akhir"
                          className="max-h-full w-full"
                        />
                      ) : (
                        <div className="flex flex-col items-center gap-1 opacity-30">
                          <FileText className="h-6 w-6" />
                          <span className="text-[8px] font-bold uppercase tracking-tighter">Tanpa Berkas</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Analisis AI */}
              <div className={cn(
                "p-4 rounded-[8px] border-l-4 shadow-sm",
                activeTx.ml_is_anomaly ? "bg-red-50/50 border-anomaly-red" : "bg-emerald-50/30 border-emerald-500"
              )}>
                <h4 className="text-[11px] font-bold flex items-center gap-2 mb-1.5 text-foreground uppercase tracking-tight">
                  <AlertTriangle className={cn("h-4 w-4", activeTx.ml_is_anomaly ? "text-anomaly-red" : "text-emerald-600")} />
                  Kesimpulan Intelegensia AI
                </h4>
                <p className={cn(
                  "text-xs leading-relaxed font-medium",
                  activeTx.ml_is_anomaly ? "text-red-800" : "text-emerald-800"
                )}>
                  {activeTx.notes || 'Transaksi sesuai dengan profil historis armada ini.'}
                </p>
              </div>

              {/* Tombol Aksi */}
              {activeTx.status === 'PENDING' && (
                <div className="grid grid-cols-2 gap-3 pt-3 border-t border-border/60">
                  <button
                    onClick={() => mutation.mutate({ id: activeTx.id, status: 'REJECTED' })}
                    disabled={mutation.isPending}
                    className="h-10 text-xs font-bold text-anomaly-red border border-red-200 rounded-[6px] bg-white hover:bg-red-50 transition-all flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50"
                  >
                    Tolak Klaim Fraud
                  </button>
                  <button
                    onClick={() => mutation.mutate({ id: activeTx.id, status: 'APPROVED' })}
                    disabled={mutation.isPending}
                    className="h-10 text-xs font-bold bg-pln-darkBlue text-white rounded-[6px] shadow-md hover:bg-pln-darkBlue/90 transition-all flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50"
                  >
                    Setujui Audit
                  </button>
                </div>
              )}
            </>
          ) : (
            <div className="h-96 flex flex-col items-center justify-center opacity-40 text-center p-6">
              <FileText className="h-12 w-12 text-muted-foreground mb-3" />
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest leading-loose">Pilih klaim transaksi pada tabel kiri<br/>untuk meninjau detail audit secara mendalam.</p>
            </div>
          )}
        </Card>

      </div>
    </div>
  );
}
