'use client';

import React, { useRef } from 'react';
import { cn } from '@/lib/utils';

interface InteractiveElementProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

export default function InteractiveElement({ children, className, ...props }: InteractiveElementProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;

    const { left, top } = containerRef.current.getBoundingClientRect();
    const x = e.clientX - left;
    const y = e.clientY - top;

    containerRef.current.style.setProperty('--mouse-x', `${x}px`);
    containerRef.current.style.setProperty('--mouse-y', `${y}px`);
  };

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      className={cn("smooth-hover-spotlight", className)}
      {...props}
    >
      <div className="relative z-10">
        {children}
      </div>
    </div>
  );
}
