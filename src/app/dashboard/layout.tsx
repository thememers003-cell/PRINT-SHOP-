import React from 'react';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[#eef2f6] text-slate-900 font-sans antialiased">
      {children}
    </div>
  );
}
