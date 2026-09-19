import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'ABER Admin | لوحة إدارة عابر',
  description: 'لوحة الإدارة الداخلية لمنصة عابر',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#1e3a5f',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ar" dir="rtl">
      <body>{children}</body>
    </html>
  );
}
