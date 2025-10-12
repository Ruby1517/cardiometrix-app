import './globals.css';
import type { Metadata } from 'next';
import ClientNav from '@/components/ClientNav';

export const metadata: Metadata = {
  title: 'Cardiometrix',
  description: 'Wellness & clinician decision-support for cardiometabolic health.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-cmx-bg text-cmx-text">
        <ClientNav />
        <div className="max-w-5xl mx-auto px-4 py-4">{children}</div>
      </body>
    </html>
  );
}