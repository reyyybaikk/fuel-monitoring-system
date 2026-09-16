'use client';

import React, { useState, useEffect } from 'react';
import api from '@/services/api';
import { ImageIcon, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AuthenticatedImageProps {
  src: string;
  alt: string;
  className?: string;
}

export default function AuthenticatedImage({ src, alt, className }: AuthenticatedImageProps) {
  const [imgUrl, setImgUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let objectUrl: string | null = null;

    const fetchImage = async () => {
      setLoading(true);
      setError(false);
      try {
        // Mengunduh gambar melalui Axios yang sudah memiliki Header Authorization
        const response = await api.get(src, { responseType: 'blob' });
        objectUrl = URL.createObjectURL(response.data);
        setImgUrl(objectUrl);
      } catch (err) {
        console.error('Gagal memuat gambar terproteksi:', err);
        setError(true);
      } finally {
        setLoading(false);
      }
    };

    if (src) {
      fetchImage();
    }

    // Membersihkan memori saat komponen dilepas
    return () => {
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [src]);

  if (loading) {
    return (
      <div className={cn("flex flex-col items-center justify-center bg-muted/10", className)}>
        <Loader2 className="h-5 w-5 animate-spin text-pln-cyan opacity-40" />
      </div>
    );
  }

  if (error || !imgUrl) {
    return (
      <div className={cn("flex flex-col items-center justify-center bg-muted/20 text-muted-foreground", className)}>
        <ImageIcon className="h-6 w-6 opacity-20 mb-1" />
        <span className="text-[10px] font-medium italic">Gagal memuat bukti</span>
      </div>
    );
  }

  return (
    <img
      src={imgUrl}
      alt={alt}
      className={cn("object-contain", className)}
    />
  );
}
