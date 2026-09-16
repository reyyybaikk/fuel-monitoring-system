'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { Users, UserPlus, Shield, Smartphone, Mail, MapPin, Key } from 'lucide-react';
import toast from 'react-hot-toast';

interface UserAccount {
  id: number;
  name: string;
  email: string;
  role: 'ADMIN' | 'DRIVER';
  region: string;
  phone: string;
  status: 'AKTIF' | 'PENDING';
}

export default function UsersManagementPage() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    phone: '',
    role: 'ADMIN',
    region: 'Depo Regional 04 Banjarbaru'
  });

  // Data tiruan pengemudi & admin terdaftar untuk visualisasi dashboard berkepadatan tinggi
  const [users, setUsers] = useState<UserAccount[]>([
    { id: 1, name: 'Bambang Pratama', email: 'bambang@perusahaan.co.id', role: 'ADMIN', region: 'Depo Regional 04 Banjarbaru', phone: '08123456789', status: 'AKTIF' },
    { id: 2, name: 'Ahmad Subarjo', email: 'ahmad.driver@perusahaan.co.id', role: 'DRIVER', region: 'Sektor Logistik Hulu', phone: '08529988771', status: 'AKTIF' },
    { id: 3, name: 'Siti Aminah', email: 'siti.admin@perusahaan.co.id', role: 'ADMIN', region: 'Depo Regional 02 Samarinda', phone: '08112233445', status: 'PENDING' },
    { id: 4, name: 'Dedi Kurniawan', email: 'dedi.driver@perusahaan.co.id', role: 'DRIVER', region: 'Sektor Logistik Hilir', phone: '08785544332', status: 'AKTIF' },
  ]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleRoleChange = (value: string) => {
    setFormData(prev => ({ ...prev, role: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name || !formData.email || !formData.password || !formData.phone) {
      toast.error('Silakan isi seluruh kolom formulir registrasi.');
      return;
    }

    // Simulasi respons pendaftaran ke endpoint POST /api/auth/register Node.js Render + Supabase
    const toastLoading = toast.loading('Memproses akun baru & menyiapkan token OTP WhatsApp...');

    setTimeout(() => {
      const newUser: UserAccount = {
        id: users.length + 1,
        name: formData.name,
        email: formData.email,
        role: formData.role as 'ADMIN' | 'DRIVER',
        region: formData.region,
        phone: formData.phone,
        status: formData.role === 'ADMIN' ? 'PENDING' : 'AKTIF'
      };

      setUsers(prev => [newUser, ...prev]);
      setIsDialogOpen(false);

      if (formData.role === 'ADMIN') {
        toast.success(
          'Registrasi Akun Admin Sukses! Instruksi verifikasi kode keamanan OTP telah dikirimkan ke nomor WhatsApp terdaftar.',
          { id: toastLoading, duration: 6000 }
        );
      } else {
        toast.success('Pendaftaran Driver Baru Berhasil disinkronisasikan ke Supabase DB.', { id: toastLoading });
      }

      // Bersihkan formulir kembali ke default
      setFormData({
        name: '',
        email: '',
        password: '',
        phone: '',
        role: 'ADMIN',
        region: 'Depo Regional 04 Banjarbaru'
      });
    }, 1500);
  };

  return (
    <div className="space-y-4 font-sans select-none">
      {/* Top action command bar */}
      <div className="bg-white p-4 rounded-[8px] border border-border flex flex-col sm:flex-row justify-between sm:items-center gap-3 shadow-sm">
        <div>
          <h1 className="text-base font-bold text-foreground flex items-center gap-1.5">
            <Users className="h-4 w-4 text-pln-darkBlue" /> Manajemen &amp; Otorisasi Pengguna
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Daftarkan akun operasional baru, kelola peran (Role), wilayah penugasan depo, serta pantau status otentikasi WhatsApp.
          </p>
        </div>

        {/* DIALOG MODAL FORM REGISTER DI WEB */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="h-8 text-xs font-semibold bg-pln-darkBlue text-white hover:bg-pln-darkBlue/90 rounded-[4px] shadow-sm flex items-center gap-1.5 pt-0.5">
              <UserPlus className="h-3.5 w-3.5" /> Registrasi Akun Baru
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[460px] rounded-[8px] border-border bg-white p-5 font-sans">
            <DialogHeader className="border-b border-border/60 pb-3 mb-4">
              <DialogTitle className="text-sm font-bold text-foreground flex items-center gap-1.5">
                <Shield className="h-4 w-4 text-pln-darkBlue" /> Formulir Pendaftaran Akun Resmi
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground mt-1">
                Isi data di bawah ini untuk mendaftarkan hak akses **ADMIN** atau **DRIVER** baru ke dalam ekosistem FuelGuard.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-3.5">
                {/* Input Nama */}
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">Nama Lengkap</label>
                  <Input
                    name="name"
                    placeholder="Contoh: Bambang Pratama"
                    value={formData.name}
                    onChange={handleInputChange}
                    className="h-9 text-xs rounded-[4px] bg-white border-border"
                  />
                </div>
                {/* Input Email */}
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5"><Mail className="h-3 w-3" /> Alamat Email</label>
                  <Input
                    type="email"
                    name="email"
                    placeholder="nama@perusahaan.co.id"
                    value={formData.email}
                    onChange={handleInputChange}
                    className="h-9 text-xs rounded-[4px] bg-white border-border"
                  />
                </div>
                {/* Input Sandi */}
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5"><Key className="h-3 w-3" /> Kata Sandi Akun</label>
                  <Input
                    type="password"
                    name="password"
                    placeholder="Minimal 6 karakter"
                    value={formData.password}
                    onChange={handleInputChange}
                    className="h-9 text-xs rounded-[4px] bg-white border-border"
                  />
                </div>
                {/* Input HP WhatsApp */}
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5"><Smartphone className="h-3 w-3" /> No. WhatsApp (Untuk OTP)</label>
                  <Input
                    name="phone"
                    placeholder="Contoh: 0812xxxxxxxx"
                    value={formData.phone}
                    onChange={handleInputChange}
                    className="h-9 text-xs rounded-[4px] bg-white border-border font-mono"
                  />
                </div>
                {/* Grid Pilihan Peran & Wilayah */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-muted-foreground">Hak Akses (Role)</label>
                    <Select value={formData.role} onValueChange={handleRoleChange}>
                      <SelectTrigger className="h-9 text-xs rounded-[4px] border-border bg-white text-foreground">
                        <SelectValue placeholder="Pilih Peran" />
                      </SelectTrigger>
                      <SelectContent className="bg-white border-border text-xs">
                        <SelectItem value="ADMIN">ADMIN (Web Monitor)</SelectItem>
                        <SelectItem value="DRIVER">DRIVER (Mobile App)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5"><MapPin className="h-3 w-3" /> Penugasan Depo</label>
                    <Input
                      name="region"
                      value={formData.region}
                      onChange={handleInputChange}
                      className="h-9 text-xs rounded-[4px] bg-white border-border"
                    />
                  </div>
                </div>
              </div>
              <DialogFooter className="pt-2 border-t border-border/40 mt-4 flex items-center gap-2 justify-end">
                <Button type="button" variant="outline" size="sm" onClick={() => setIsDialogOpen(false)} className="h-8 text-xs font-medium border-border rounded-[4px]">
                  Batal
                </Button>
                <Button type="submit" size="sm" className="h-8 text-xs font-bold bg-pln-darkBlue text-white hover:bg-pln-darkBlue/90 rounded-[4px] shadow-sm">
                  Simpan &amp; Daftarkan Akun
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Users Data List Presentation Table */}
      <Card className="rounded-[8px] border border-border bg-white shadow-sm p-4">
        <div className="overflow-x-auto rounded-lg">
          <Table>
            <TableHeader className="bg-muted/40 font-mono text-[10px] uppercase font-bold text-muted-foreground border-b border-border/80">
              <TableRow>
                <TableHead className="h-9 px-3">ID</TableHead>
                <TableHead className="h-9 px-3">Nama Pengguna</TableHead>
                <TableHead className="h-9 px-3">Email</TableHead>
                <TableHead className="h-9 px-3 font-mono">No. WhatsApp</TableHead>
                <TableHead className="h-9 px-3">Wilayah Depo / Sektor</TableHead>
                <TableHead className="h-9 px-3 text-center">Peran</TableHead>
                <TableHead className="h-9 px-3 text-center">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((usr) => (
                <TableRow key={usr.id} className="hover:bg-muted/20 border-b border-border/40 text-xs">
                  <TableCell className="p-3 font-mono text-muted-foreground">{usr.id}</TableCell>
                  <TableCell className="p-3 font-bold text-foreground">{usr.name}</TableCell>
                  <TableCell className="p-3 text-muted-foreground font-medium">{usr.email}</TableCell>
                  <TableCell className="p-3 font-mono text-foreground font-semibold">{usr.phone}</TableCell>
                  <TableCell className="p-3 text-foreground font-medium">{usr.region}</TableCell>
                  <TableCell className="p-3 text-center">
                    <Badge className={usr.role === 'ADMIN' ? 'bg-pln-darkBlue text-white rounded-[4px] text-[9px] font-bold' : 'bg-pln-iceBlue text-pln-darkBlue border border-pln-cyan/10 rounded-[4px] text-[9px] font-bold'}>
                      {usr.role}
                    </Badge>
                  </TableCell>
                  <TableCell className="p-3 text-center">
                    <Badge className={usr.status === 'AKTIF' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100 rounded-[4px] text-[9px] font-bold' : 'bg-amber-50 text-amber-700 border border-amber-100 rounded-[4px] text-[9px] font-bold'}>
                      {usr.status}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  );
}
