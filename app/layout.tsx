import '../styles/globals.css';
import type { ReactNode } from 'react';

export const metadata = {
  title: 'Agentic Forex Bot',
  description: 'AI-powered MT5 trading bot'
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
