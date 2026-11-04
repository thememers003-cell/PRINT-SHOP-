import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Print Bro | Xerox Shop Management & Online Printing Platform',
  description: 'Connect with local Xerox & print shops, upload documents, preview in real-time, pay and track your prints.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased bg-slate-50 text-slate-900">
        {children}
      </body>
    </html>
  );
}

