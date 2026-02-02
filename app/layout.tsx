import type { Metadata } from 'next';
import './globals.css';
import { ToastContainer } from '@/components/ui/toast-container';

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
      <body>
        {children}
        <ToastContainer />
      </body>
    </html>
  );
}
