import './globals.css';
import type { Metadata } from 'next';
import ClientNav from '@/components/ClientNav';
import AuthFetchProvider from '@/components/AuthFetchProvider';

export const metadata: Metadata = {
  title: 'Cardiometrix Web Portal',
  description: 'Clinician and admin portal for Cardiometrix.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-cmx-bg text-cmx-text">
        <AuthFetchProvider>
          <ClientNav />
          <div className="max-w-5xl mx-auto px-4 py-4">{children}</div>
        </AuthFetchProvider>
      </body>
    </html>
  );
}
