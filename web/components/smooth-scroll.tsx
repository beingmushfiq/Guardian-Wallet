'use client';

import React from 'react';

export function SmoothScrollProvider({ children }: { children: React.ReactNode }) {
  // Use native smooth scrolling across all devices without hijacking scroll containers
  return <>{children}</>;
}
