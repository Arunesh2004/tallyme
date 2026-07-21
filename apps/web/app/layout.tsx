// apps/web/app/layout.tsx
import './globals.css';
import { Inter } from 'next/font/google';
import { QueryProvider } from '../providers/query-provider';
import { ThemeProvider } from 'next-themes';
import React from 'react';

const inter = Inter({ subsets: ['latin'] });

export const metadata = {
  title: 'TallyMe Enterprise',
  description: 'Enterprise Admin Portal for AI-driven ERP automation',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.className} bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 min-h-screen flex flex-col`}>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <QueryProvider>
            {/* Top Navigation & Sidebar layout wrappers would go here */}
            <main className="flex-grow">
              {children}
            </main>
          </QueryProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}