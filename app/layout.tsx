import type { Metadata } from 'next';
import './globals.css';
import { ToastContainer } from '@/components/ui/toast-container';
import { AutoProcessorProvider } from '@/components/AutoProcessorProvider';

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
        <AutoProcessorProvider />
        {children}
        <ToastContainer />
      </body>
    </html>
  );
}
