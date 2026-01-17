import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'NanoDrive',
  description: 'File upload and storage',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
