'use client';

import React from 'react';
import Link from 'next/link';

interface LogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showTagline?: boolean;
  href?: string;
}

export function PrintBroLogo({
  className = '',
  size = 'md',
  showTagline = false,
  href = '/',
}: LogoProps) {
  let heightClass = 'h-9';
  if (size === 'sm') heightClass = 'h-7';
  if (size === 'lg') heightClass = 'h-12';
  if (size === 'xl') heightClass = 'h-16';

  const logoContent = (
    <div className={`inline-flex flex-col items-start select-none transition-transform duration-200 hover:scale-[1.02] ${className}`}>
      {/* Official Mascot Logo */}
      <div className="flex items-center">
        <img
          src="/images/printbro-logo.jpg"
          alt="PrintBro - Scan. Pay. Print."
          className={`${heightClass} w-auto object-contain drop-shadow-xs rounded-lg`}
          onError={(e) => {
            // Elegant fallback if image fails
            e.currentTarget.style.display = 'none';
          }}
        />
      </div>

      {showTagline && (
        <span className="text-[10px] font-bold tracking-widest text-slate-500 uppercase mt-0.5 ml-1">
          Scan <span className="text-blue-500">•</span> Pay <span className="text-blue-500">•</span> Print
        </span>
      )}
    </div>
  );

  if (href) {
    return (
      <Link href={href} className="inline-block cursor-pointer focus:outline-none">
        {logoContent}
      </Link>
    );
  }

  return logoContent;
}

