'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function RootIndexPage() {
  const router = useRouter();

  useEffect(() => {
    // Alur otomatis mengarahkan akar index menuju portal masuk utama /login
    router.replace('/login');
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#e6f4f8]">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 rounded-full border-2 border-pln-cyan border-t-transparent animate-spin"></div>
        <p className="font-sans text-xs font-medium text-pln-darkBlue">Mengalihkan Sesi Portal...</p>
      </div>
    </div>
  );
}
