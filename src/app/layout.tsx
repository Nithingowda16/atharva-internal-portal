import type { Metadata } from 'next';
import './globals.css';
import { getCurrentUser } from '@/lib/auth';
import Sidebar from '@/components/Sidebar';
import LayoutShell from '@/components/LayoutShell';

export const metadata: Metadata = {
  title: 'ATHARVA TRAVELS – Finance Management Portal',
  description: 'Enterprise internal finance, vehicle billing, deductions and settlement portal',
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();

  return (
    <html lang="en" className="h-full">
      <body className="h-full bg-slate-50 text-slate-900 antialiased font-sans">
        <LayoutShell user={user}>{children}</LayoutShell>
      </body>
    </html>
  );
}

