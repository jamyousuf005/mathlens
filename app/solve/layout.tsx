import React from 'react';
import SolveHeader from '@/components/solve-header';
import SolveFooter from '@/components/solve-footer';

export default function SolveLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="bg-canvas font-body-sm text-ink antialiased min-h-screen flex flex-col selection:bg-primary-fixed selection:text-on-primary-fixed">
      <SolveHeader />
      <main className="w-full pt-[112px] md:pt-16 bg-canvas flex-1 flex flex-col">
        {children}
      </main>
      <SolveFooter />
    </div>
  );
}
