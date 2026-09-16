'use client';

import React, { useState } from 'react';
import { usePathname } from 'next/navigation';
import Sidebar from '@/components/layout/Sidebar';
import Topbar from '@/components/layout/Topbar';
import { Toaster } from 'react-hot-toast';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import './globals.css';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        refetchOnWindowFocus: false,
        retry: 1,
      },
    },
  }));

  const isLoginPage = pathname === '/login';

  // Layout untuk Halaman Login (Tanpa Sidebar/Topbar)
  if (isLoginPage) {
    return (
      <html lang="id" className="h-full" suppressHydrationWarning>
        <body className="h-full bg-[#e6f4f8] text-[#0b1c30] antialiased" suppressHydrationWarning>
          <QueryClientProvider client={queryClient}>
            {children}
          </QueryClientProvider>
        </body>
      </html>
    );
  }

  // Layout untuk Dashboard Utama
  return (
    <html lang="id" className="h-full" suppressHydrationWarning>
      <body className="h-full bg-[#e6f4f8] text-[#0b1c30] antialiased" suppressHydrationWarning>
        <QueryClientProvider client={queryClient}>
          <Toaster position="top-right" reverseOrder={false} />

          <Sidebar />

          <div className="pl-64 flex flex-col min-h-screen">
            <Topbar />

            <main className="w-full pt-16 px-6 py-6 flex-1 bg-background">
              {children}
            </main>
          </div>
        </QueryClientProvider>
      </body>
    </html>
  );
}
