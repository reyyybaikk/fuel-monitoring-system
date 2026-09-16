'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuthStore } from '@/store/authStore';
import { loginToBackend } from '@/services/authService';
import toast, { Toaster } from 'react-hot-toast';
import { Fuel, Lock, Mail, ShieldAlert, Loader2 } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const loginStore = useAuthStore((state) => state.login);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleCredentialLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error('Silakan isi seluruh kolom email dan kata sandi.');
      return;
    }

    setIsLoading(true);
    try {
      console.log('Mencoba login ke Render dengan:', email);
      const response: any = await loginToBackend(email, password);

      // DEBUG: Lihat isi data dari Render di Console Browser (F12)
      console.log('Respon dari Backend Render:', response);

      // Cek variasi nama kolom (Kadang backend kirim 'accessToken' atau 'data.token')
      const token = response.token || response.accessToken || response.data?.token;
      const user = response.user || response.data?.user || { name: 'Admin User', role: 'ADMIN' };

      if (!token) {
        throw new Error('Token tidak ditemukan dalam respon server.');
      }

      // Simpan ke Zustand & LocalStorage
      loginStore(user, token);

      toast.success(`Selamat datang! Mengalihkan ke sistem...`);

      setTimeout(() => {
        router.push('/dashboard');
      }, 500);

    } catch (error: any) {
      console.error('Login Error Detail:', error);

      // Ambil pesan error asli dari backend jika ada
      const serverMessage = error.response?.data?.message || error.message;

      if (serverMessage === 'Network Error') {
        toast.error('Gagal terhubung ke Render. Pastikan backend sudah aktif.');
      } else {
        toast.error(`Gagal Masuk: ${serverMessage || 'Periksa kembali email/sandi.'}`);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLoginClick = () => {
    toast.error('Akun Google belum terdaftar. Silakan registrasi terlebih dahulu.');
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background font-sans select-none">
      <Toaster position="top-right" reverseOrder={false} />
      <div className="w-full max-w-[420px]">
        <div className="flex items-center justify-center gap-2 mb-6">
          <div className="w-10 h-10 rounded-lg bg-pln-darkBlue flex items-center justify-center text-white shadow-sm">
            <Fuel className="h-5 w-5" />
          </div>
          <div className="flex flex-col">
            <span className="font-sans font-bold text-lg text-pln-darkBlue tracking-tight leading-tight">FuelGuard AI</span>
            <span className="font-mono text-[10px] text-pln-cyan font-bold uppercase tracking-wider leading-none">Audit BBM &amp; Anti-Fraud</span>
          </div>
        </div>

        <Card className="border border-border shadow-sm rounded-lg overflow-hidden bg-card">
          <CardHeader className="space-y-1 bg-muted/30 pb-4 border-b border-border/60">
            <CardTitle className="text-base font-bold text-foreground">Portal Masuk Admin</CardTitle>
            <CardDescription className="text-xs text-muted-foreground">Sistem terhubung ke Database Live Render/Supabase.</CardDescription>
          </CardHeader>
          <form onSubmit={handleCredentialLogin}>
            <CardContent className="space-y-3.5 pt-5 pb-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground">Alamat Email</label>
                <Input
                  type="email"
                  placeholder="admin@fuelguard.id"
                  className="h-9 text-xs"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isLoading}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground">Kata Sandi</label>
                <Input
                  type="password"
                  placeholder="••••••••"
                  className="h-9 text-xs"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isLoading}
                />
              </div>
            </CardContent>
            <CardFooter className="flex flex-col gap-2.5 pt-2 pb-5">
              <Button
                type="submit"
                className="w-full h-9 text-xs font-semibold bg-pln-darkBlue text-white"
                disabled={isLoading}
              >
                {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                {isLoading ? 'Menghubungkan ke Render...' : 'Masuk Portal'}
              </Button>
              <Button
                type="button"
                variant="outline"
                className="w-full h-9 text-xs"
                onClick={handleGoogleLoginClick}
                disabled={isLoading}
              >
                Masuk dengan Google
              </Button>
            </CardFooter>
          </form>
        </Card>
      </div>
    </div>
  );
}
