'use client';

import React, { useRef, useState, useCallback } from 'react';

interface SpatialCardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
  glowColor?: string;
}

export function SpatialCard({
  children,
  className = '',
  glowColor = 'rgba(201, 242, 107, 0.08)',
  ...props
}: SpatialCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [glareStyle, setGlareStyle] = useState<React.CSSProperties>({ opacity: 0 });

  const handlePointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      const card = cardRef.current;
      if (!card) return;
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

      const rect = card.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      setGlareStyle({
        opacity: 1,
        background: `radial-gradient(circle 350px at ${x}px ${y}px, ${glowColor}, transparent 80%)`,
        transition: 'opacity 150ms ease-out',
      });
    },
    [glowColor]
  );

  const handlePointerLeave = useCallback(() => {
    setGlareStyle({
      opacity: 0,
      transition: 'opacity 350ms ease-out',
    });
  }, []);

  return (
    <div
      ref={cardRef}
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
      className={`panel group transition-shadow duration-300 hover:shadow-panel-hover ${className}`}
      {...props}
    >
      {/* Specular Edge Highlight */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-white/20 dark:via-white/20 to-transparent" />

      {/* Dynamic Cursor Spotlight Glare (Flat, No Card Tilting) */}
      <div
        className="pointer-events-none absolute inset-0 z-10 transition-opacity"
        style={glareStyle}
        aria-hidden="true"
      />

      {children}
    </div>
  );
}
