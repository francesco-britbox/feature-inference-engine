import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Feature Inference Engine',
  description: 'AI-powered feature inference for OTT platforms',
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
